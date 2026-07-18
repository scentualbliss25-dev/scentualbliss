import { NextResponse } from 'next/server';
import { revalidateTag, revalidatePath } from 'next/cache';
import { supabaseAdmin } from '@/lib/supabase';
import { PRODUCTS_CACHE_TAG } from '@/lib/products';
import { verifySession, ADMIN_COOKIE_NAME } from '@/lib/admin-auth';

// Endpoint interno: FIJA la lista completa de imágenes de un producto
// (delete-then-insert sobre product_images), sin tocar precios ni sizes.
//
// A diferencia de bulk-image-order (que solo reordena filas existentes),
// este permite AGREGAR o QUITAR imágenes. Útil cuando un producto pasa de
// 1 a 2 fotos, o cuando hay que sustituir la galería completa.
//
// Body: { updates: [{ id, urls: [url0, url1, ...] }] }
// El orden del array define order_index (0 = principal).

function getCookie(req, name) {
  const fromNext = req.cookies?.get?.(name)?.value;
  if (fromNext) return fromNext;
  const header = req.headers.get('cookie') || '';
  const m = header.match(new RegExp(`(?:^|;\\s*)${name}=([^;]+)`));
  return m ? decodeURIComponent(m[1]) : null;
}

export async function POST(req) {
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected || !(await verifySession(getCookie(req, ADMIN_COOKIE_NAME), expected))) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }
  if (!supabaseAdmin) {
    return NextResponse.json({ error: 'Supabase no configurado' }, { status: 503 });
  }

  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Body inválido' }, { status: 400 });
  }

  const updates = Array.isArray(body?.updates) ? body.updates : [];
  if (!updates.length) {
    return NextResponse.json({ error: 'Sin actualizaciones' }, { status: 400 });
  }

  const results = [];
  for (const u of updates) {
    const id = Number(u?.id);
    const urls = (Array.isArray(u?.urls) ? u.urls : [])
      .map((s) => String(s || '').trim())
      .filter((s) => s && (s.startsWith('/') || s.startsWith('http://') || s.startsWith('https://')));

    if (!Number.isFinite(id) || id <= 0) {
      results.push({ id: u?.id, ok: false, error: 'ID inválido' });
      continue;
    }
    if (!urls.length) {
      // Evita dejar un producto sin ninguna imagen por un payload vacío.
      results.push({ id, ok: false, error: 'Se requiere al menos una URL' });
      continue;
    }
    if (urls.length > 10) {
      results.push({ id, ok: false, error: 'Máximo 10 imágenes' });
      continue;
    }

    const { error: delErr } = await supabaseAdmin
      .from('product_images')
      .delete()
      .eq('product_id', id);
    if (delErr) {
      results.push({ id, ok: false, error: `borrando: ${delErr.message}` });
      continue;
    }

    const rows = urls.map((url, i) => ({ product_id: id, url, order_index: i }));
    const { error: insErr } = await supabaseAdmin.from('product_images').insert(rows);
    results.push(insErr ? { id, ok: false, error: `insertando: ${insErr.message}` } : { id, ok: true, count: rows.length });
  }

  revalidateTag(PRODUCTS_CACHE_TAG);
  revalidatePath('/');
  revalidatePath('/tienda');
  revalidatePath('/perfume/[slug]', 'page');
  revalidatePath('/admin/products');

  const okCount = results.filter((r) => r.ok).length;
  return NextResponse.json({ ok: true, total: results.length, updated: okCount, results });
}
