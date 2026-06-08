'use server';

import { revalidateTag, revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { supabaseAdmin } from '@/lib/supabase';
import { PRODUCTS_CACHE_TAG } from '@/lib/products';
import { parseImportFile, validateRow } from '@/lib/products-import';

// Nombre del bucket público de Supabase Storage para imágenes de producto.
// Tiene que existir antes de que el upload funcione — ver instrucciones de
// setup al final del Paso 4.
const STORAGE_BUCKET = 'product-images';

// ─── Helpers compartidos ────────────────────────────────────────────────

/**
 * Invalida el data cache de unstable_cache + el Full Route Cache de las
 * páginas estáticas que dependen del catálogo. Llamar tras toda mutación
 * (create/update/delete).
 */
function revalidateAllProductRoutes() {
  revalidateTag(PRODUCTS_CACHE_TAG);
  revalidatePath('/');
  revalidatePath('/tienda');
  revalidatePath('/perfume/[slug]', 'page');
  revalidatePath('/admin/products');
}

/**
 * Convierte un nombre arbitrario en un slug url-safe.
 *   "Lattafa Khamrah EDP" → "lattafa-khamrah-edp"
 */
function slugify(input) {
  return String(input || '')
    .toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '') // quita acentos
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

/**
 * Parsea los campos planos + sizes + images de un FormData del form de
 * producto. Devuelve { data, sizes, images } con la shape lista para
 * INSERT o UPDATE en Supabase. Hace validación mínima (name+slug
 * requeridos) y normaliza tipos.
 */
function parseProductForm(formData, { productId } = {}) {
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
  let slug = str('slug') || slugify(name);
  if (!name) return { error: 'El nombre es obligatorio' };
  if (!slug)  return { error: 'El slug es obligatorio (no se pudo derivar del nombre)' };

  // Familias olfativas: el form envía 0..N values con name="category".
  // Filtra vacíos, deduplica, valida máximo 5 (limit de UX + CHECK constraint
  // en Supabase). La primera queda como `category` (singular) para compat
  // hacia atrás temporal con código que aún lee `p.category`.
  const categories = [...new Set(formData.getAll('category')
    .map(v => String(v || '').trim())
    .filter(Boolean))];
  if (categories.length > 5) {
    return { error: `Máximo 5 familias olfativas por producto (recibimos ${categories.length})` };
  }

  const data = {
    name,
    slug,
    brand: str('brand'),
    product_type: str('product_type'),
    category: categories[0] || null,  // compat con código viejo
    categories,                        // todas las familias (text[] en DB)
    type: str('type'),
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

  const occasionRaw = str('occasion');
  if (occasionRaw != null) {
    data.occasion = occasionRaw.split(',').map((s) => s.trim()).filter(Boolean);
  }

  // ─── Sizes (arrays paralelos) ────────────────────────────────────────
  const mls    = formData.getAll('sizes_ml');
  const prices = formData.getAll('sizes_price');
  const sizes = [];
  for (let i = 0; i < Math.max(mls.length, prices.length); i++) {
    const ml = String(mls[i] ?? '').trim();
    const price = Number(prices[i]);
    if (!ml || !Number.isFinite(price) || price <= 0) continue;
    const row = { ml, price, order_index: i };
    if (productId != null) row.product_id = productId;
    sizes.push(row);
  }

  // ─── Images (array de URLs ya subidas o externas) ────────────────────
  const imgUrls = formData.getAll('image_url')
    .map((u) => String(u || '').trim())
    .filter(Boolean);
  const images = imgUrls.map((url, i) => {
    const row = { url, order_index: i };
    if (productId != null) row.product_id = productId;
    return row;
  });

  return { data, sizes, images };
}

// ─── Server Actions ─────────────────────────────────────────────────────

/**
 * Actualiza un producto existente.
 */
export async function updateProduct(formData) {
  if (!supabaseAdmin) return { ok: false, error: 'Supabase no configurado en el servidor' };

  const id = Number(formData.get('id'));
  if (!Number.isFinite(id) || id <= 0) return { ok: false, error: 'ID de producto inválido' };

  const parsed = parseProductForm(formData, { productId: id });
  if (parsed.error) return { ok: false, error: parsed.error };
  const { data, sizes, images } = parsed;

  const { error: updErr } = await supabaseAdmin.from('products').update(data).eq('id', id);
  if (updErr) return { ok: false, error: `Actualizando producto: ${updErr.message}` };

  // Sizes: delete-then-insert.
  {
    const { error } = await supabaseAdmin.from('product_sizes').delete().eq('product_id', id);
    if (error) return { ok: false, error: `Borrando sizes: ${error.message}` };
    if (sizes.length) {
      const { error: insErr } = await supabaseAdmin.from('product_sizes').insert(sizes);
      if (insErr) return { ok: false, error: `Insertando sizes: ${insErr.message}` };
    }
  }

  // Images: idem.
  {
    const { error } = await supabaseAdmin.from('product_images').delete().eq('product_id', id);
    if (error) return { ok: false, error: `Borrando imágenes: ${error.message}` };
    if (images.length) {
      const { error: insErr } = await supabaseAdmin.from('product_images').insert(images);
      if (insErr) return { ok: false, error: `Insertando imágenes: ${insErr.message}` };
    }
  }

  revalidateAllProductRoutes();
  redirect(`/admin/products?updated=${id}`);
}

/**
 * Crea un producto nuevo. Si el slug ya existe → falla; el front debe
 * sugerir uno distinto.
 */
export async function createProduct(formData) {
  if (!supabaseAdmin) return { ok: false, error: 'Supabase no configurado en el servidor' };

  const parsed = parseProductForm(formData);
  if (parsed.error) return { ok: false, error: parsed.error };
  const { data, sizes, images } = parsed;

  // INSERT del producto principal, recuperando el id generado.
  const { data: inserted, error: insErr } = await supabaseAdmin
    .from('products')
    .insert(data)
    .select('id')
    .single();
  if (insErr) {
    // Postgres 23505 = unique violation. El campo más probable es slug.
    if (insErr.code === '23505') {
      return { ok: false, error: `Ya existe un producto con el slug "${data.slug}". Elige otro.` };
    }
    return { ok: false, error: `Creando producto: ${insErr.message}` };
  }
  const newId = inserted.id;

  // Insert sizes con el product_id recién obtenido.
  if (sizes.length) {
    const rows = sizes.map((s) => ({ ...s, product_id: newId }));
    const { error } = await supabaseAdmin.from('product_sizes').insert(rows);
    if (error) return { ok: false, error: `Insertando sizes: ${error.message}` };
  }

  if (images.length) {
    const rows = images.map((img) => ({ ...img, product_id: newId }));
    const { error } = await supabaseAdmin.from('product_images').insert(rows);
    if (error) return { ok: false, error: `Insertando imágenes: ${error.message}` };
  }

  revalidateAllProductRoutes();
  redirect(`/admin/products?created=${newId}`);
}

/**
 * Elimina un producto. Borra primero sizes/images (por si las FK no
 * tienen ON DELETE CASCADE) y luego el producto. Limpia el caché.
 *
 * IMPORTANTE: no borra las imágenes del Storage — quedan huérfanas
 * intencionalmente para poder recuperarlas si fue un borrado accidental.
 * Limpieza de huérfanas la hacemos en un cron aparte si crece.
 */
export async function deleteProduct(formData) {
  if (!supabaseAdmin) return { ok: false, error: 'Supabase no configurado en el servidor' };

  const id = Number(formData.get('id'));
  if (!Number.isFinite(id) || id <= 0) return { ok: false, error: 'ID inválido' };

  // Hijos primero por si las FK no tienen CASCADE configurado.
  await supabaseAdmin.from('product_sizes').delete().eq('product_id', id);
  await supabaseAdmin.from('product_images').delete().eq('product_id', id);

  const { error } = await supabaseAdmin.from('products').delete().eq('id', id);
  if (error) return { ok: false, error: `Eliminando producto: ${error.message}` };

  revalidateAllProductRoutes();
  redirect('/admin/products?deleted=' + id);
}

/**
 * Sube UNA imagen a Supabase Storage y retorna la URL pública.
 *
 * Recibe FormData con:
 *   file        — el archivo (Blob)
 *   slugHint?   — opcional, para nombrar el archivo (ej: slug del producto)
 *
 * Devuelve { ok: true, url } o { ok: false, error }.
 *
 * No revalida caché — la imagen no aparece en la tienda hasta que el
 * usuario guarde el producto que la referencia.
 */
export async function uploadProductImage(formData) {
  if (!supabaseAdmin) return { ok: false, error: 'Supabase no configurado en el servidor' };

  const file = formData.get('file');
  if (!file || typeof file === 'string') {
    return { ok: false, error: 'No se recibió ningún archivo' };
  }

  // Validación de tipo y tamaño en el server (defensa adicional al client).
  const mime = file.type || '';
  if (!/^image\/(jpeg|jpg|png|webp|avif)$/i.test(mime)) {
    return { ok: false, error: `Tipo no soportado (${mime}). Usa JPG, PNG, WebP o AVIF.` };
  }
  if (file.size > 5 * 1024 * 1024) {
    return { ok: false, error: 'La imagen pesa más de 5MB. Comprímela antes de subir.' };
  }

  // Nombre único: <slugHint?>-<timestamp>-<rand>.<ext>
  const ext = (mime.split('/')[1] || 'jpg').replace('jpeg', 'jpg');
  const slugHint = slugify(String(formData.get('slugHint') || '')) || 'product';
  const stamp = Date.now().toString(36);
  const rand = Math.random().toString(36).slice(2, 7);
  const path = `${slugHint}-${stamp}-${rand}.${ext}`;

  const { error: upErr } = await supabaseAdmin.storage
    .from(STORAGE_BUCKET)
    .upload(path, file, {
      contentType: mime,
      cacheControl: '31536000, immutable', // 1 año — el path cambia con cada upload
      upsert: false,
    });

  if (upErr) {
    // Bucket inexistente → mensaje útil para el admin.
    if (/not found/i.test(upErr.message)) {
      return {
        ok: false,
        error: `El bucket "${STORAGE_BUCKET}" no existe en Supabase. Créalo desde Storage → New bucket (público).`,
      };
    }
    return { ok: false, error: `Upload a Storage: ${upErr.message}` };
  }

  const { data: pub } = supabaseAdmin.storage.from(STORAGE_BUCKET).getPublicUrl(path);
  return { ok: true, url: pub?.publicUrl, path };
}

// ─── Import masivo de productos (CSV/XLSX) ──────────────────────────────

/**
 * Paso 1 del flujo de import: parsea el archivo, valida cada fila, y
 * cruza con la DB para marcar cuáles serán CREATE vs UPDATE.
 *
 * NO escribe nada en la DB. Solo devuelve el preview para que el usuario
 * revise antes de confirmar.
 *
 * Entrada FormData: file (Blob)
 * Salida: { ok, rows: [{ rowNumber, action, ok, errors[], data, sizes, images, slug, name }] }
 */
export async function previewImportAction(formData) {
  if (!supabaseAdmin) return { ok: false, error: 'Supabase no configurado en el servidor' };

  const file = formData.get('file');
  if (!file || typeof file === 'string') {
    return { ok: false, error: 'No se recibió ningún archivo' };
  }

  let raws;
  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    raws = await parseImportFile(buffer, file.name);
  } catch (err) {
    return { ok: false, error: `No se pudo leer el archivo: ${err.message}` };
  }

  if (!raws.length) {
    return { ok: false, error: 'El archivo no tiene filas con datos' };
  }
  if (raws.length > 500) {
    return { ok: false, error: `Demasiadas filas (${raws.length}). Máximo 500 por lote.` };
  }

  // Valida cada fila localmente (detecta duplicados intra-archivo).
  const slugsInFile = new Set();
  const validated = raws.map((raw, i) => {
    const result = validateRow(raw, { rowNumber: i + 2, slugsInFile });
    if (result.slug) slugsInFile.add(result.slug);
    return { rowNumber: i + 2, ...result };
  });

  // Cruzar con la DB: por cada slug válido, ¿existe ya?
  const validSlugs = [...new Set(validated.filter(r => r.ok && r.slug).map(r => r.slug))];
  let existingMap = new Map();
  if (validSlugs.length) {
    const { data: existing } = await supabaseAdmin
      .from('products')
      .select('id, slug')
      .in('slug', validSlugs);
    existingMap = new Map((existing || []).map(p => [p.slug, p.id]));
  }

  const rows = validated.map(r => ({
    ...r,
    action: !r.ok ? 'error' : existingMap.has(r.slug) ? 'update' : 'create',
    existingId: existingMap.get(r.slug) || null,
  }));

  const summary = rows.reduce((acc, r) => {
    acc[r.action] = (acc[r.action] || 0) + 1;
    return acc;
  }, { create: 0, update: 0, error: 0 });

  return { ok: true, rows, summary, total: rows.length };
}

/**
 * Paso 2: ejecuta el import sobre las filas válidas. Recibe el archivo
 * de nuevo (más simple que pasar el JSON enorme entre cliente y server,
 * y re-valida en el servidor por seguridad).
 *
 * Hace UPSERT manual: INSERT si no existe el slug, UPDATE si sí.
 * Para sizes/images hace delete-then-insert por producto.
 *
 * Si una fila falla, las demás continúan. Reporte detallado al final.
 *
 * Tras terminar invalida el caché completo para que los cambios se vean
 * inmediatamente en la tienda.
 */
export async function executeImportAction(formData) {
  if (!supabaseAdmin) return { ok: false, error: 'Supabase no configurado en el servidor' };

  // Reusa el preview para parsear/validar (DRY).
  const preview = await previewImportAction(formData);
  if (!preview.ok) return preview;

  const results = [];
  let createdCount = 0;
  let updatedCount = 0;
  let errorCount = 0;

  for (const row of preview.rows) {
    if (!row.ok) {
      errorCount++;
      results.push({
        rowNumber: row.rowNumber,
        name: row.name,
        slug: row.slug,
        action: 'error',
        ok: false,
        error: row.errors.join('; '),
      });
      continue;
    }

    try {
      let productId = row.existingId;

      if (productId) {
        // UPDATE
        const { error } = await supabaseAdmin
          .from('products')
          .update(row.data)
          .eq('id', productId);
        if (error) throw new Error(`UPDATE: ${error.message}`);
      } else {
        // INSERT
        const { data: inserted, error } = await supabaseAdmin
          .from('products')
          .insert(row.data)
          .select('id')
          .single();
        if (error) {
          if (error.code === '23505') throw new Error(`Slug "${row.slug}" ya existe (carrera)`);
          throw new Error(`INSERT: ${error.message}`);
        }
        productId = inserted.id;
      }

      // Sizes (delete-then-insert)
      await supabaseAdmin.from('product_sizes').delete().eq('product_id', productId);
      if (row.sizes?.length) {
        const sizeRows = row.sizes.map((s, i) => ({
          product_id: productId, ml: s.ml, price: s.price, order_index: i,
        }));
        const { error } = await supabaseAdmin.from('product_sizes').insert(sizeRows);
        if (error) throw new Error(`sizes: ${error.message}`);
      }

      // Images (delete-then-insert)
      await supabaseAdmin.from('product_images').delete().eq('product_id', productId);
      if (row.images?.length) {
        const imgRows = row.images.map((url, i) => ({
          product_id: productId, url, order_index: i,
        }));
        const { error } = await supabaseAdmin.from('product_images').insert(imgRows);
        if (error) throw new Error(`images: ${error.message}`);
      }

      if (row.action === 'create') createdCount++;
      else updatedCount++;

      results.push({
        rowNumber: row.rowNumber,
        name: row.name,
        slug: row.slug,
        action: row.action,
        ok: true,
        id: productId,
      });
    } catch (err) {
      errorCount++;
      results.push({
        rowNumber: row.rowNumber,
        name: row.name,
        slug: row.slug,
        action: 'error',
        ok: false,
        error: err.message,
      });
    }
  }

  // Invalidar caché completo
  revalidateTag(PRODUCTS_CACHE_TAG);
  revalidatePath('/');
  revalidatePath('/tienda');
  revalidatePath('/perfume/[slug]', 'page');
  revalidatePath('/admin/products');

  return {
    ok: true,
    summary: { created: createdCount, updated: updatedCount, errors: errorCount, total: results.length },
    results,
  };
}
