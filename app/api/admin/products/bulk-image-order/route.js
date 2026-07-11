import { NextResponse } from 'next/server';
import { revalidateTag, revalidatePath } from 'next/cache';
import { supabaseAdmin } from '@/lib/supabase';
import { PRODUCTS_CACHE_TAG } from '@/lib/products';
import { verifySession, ADMIN_COOKIE_NAME } from '@/lib/admin-auth';

// Endpoint interno: reordena las imágenes (product_images.order_index) de un
// lote de productos, SIN tocar precios, sizes ni nada más. Uso puntual para
// dejar el frasco solo de primero y el frasco-con-caja de segundo.
//
// Body: { updates: [{ id, urls: [urlOrdenada0, urlOrdenada1, ...] }] }
// Cada url recibe order_index = su posición en el array.
//
// Protegido: el middleware ya cubre /api/admin/*, pero verificamos la sesión
// aquí también por defensa en profundidad.

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
    const urls = Array.isArray(u?.urls) ? u.urls : [];
    if (!Number.isFinite(id) || id <= 0 || !urls.length) {
      results.push({ id: u?.id, ok: false, error: 'payload inválido' });
      continue;
    }

    // Actualiza order_index de cada imagen según su posición en `urls`.
    let failed = null;
    for (let i = 0; i < urls.length; i++) {
      const { error } = await supabaseAdmin
        .from('product_images')
        .update({ order_index: i })
        .eq('product_id', id)
        .eq('url', urls[i]);
      if (error) { failed = error.message; break; }
    }
    results.push(failed ? { id, ok: false, error: failed } : { id, ok: true });
  }

  revalidateTag(PRODUCTS_CACHE_TAG);
  revalidatePath('/');
  revalidatePath('/tienda');
  revalidatePath('/perfume/[slug]', 'page');
  revalidatePath('/admin/products');

  const okCount = results.filter((r) => r.ok).length;
  return NextResponse.json({ ok: true, total: results.length, updated: okCount, results });
}
