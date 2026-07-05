import { NextResponse } from 'next/server';
import { revalidateTag, revalidatePath } from 'next/cache';
import { supabaseAdmin } from '@/lib/supabase';
import { PRODUCTS_CACHE_TAG } from '@/lib/products';
import { ALLOWED_CATEGORIES } from '@/lib/products-import';

// Endpoint interno de uso puntual: actualiza SOLO `categories`/`category`/`gender`
// de un lote de productos por id. A diferencia del form de edición completo,
// NO toca sizes/images — evita el efecto secundario de que un guardado normal
// descarta (delete) cualquier size con price <= 0.
//
// Protegido por el middleware admin (todo /api/admin/* requiere cookie de sesión).
//
// Body: { updates: [{ id, categories: string[], gender: string|null }] }
const ALLOWED_GENDERS = ['Hombre', 'Mujer', 'Unisex'];

export async function POST(req) {
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
    if (!Number.isFinite(id) || id <= 0) {
      results.push({ id: u?.id, ok: false, error: 'ID inválido' });
      continue;
    }
    const categories = Array.isArray(u.categories) ? u.categories : [];
    const invalid = categories.filter((c) => !ALLOWED_CATEGORIES.includes(c));
    if (invalid.length) {
      results.push({ id, ok: false, error: `Categoría(s) inválida(s): ${invalid.join(', ')}` });
      continue;
    }
    if (categories.length > 5) {
      results.push({ id, ok: false, error: 'Máximo 5 categorías' });
      continue;
    }
    const gender = u.gender ?? null;
    if (gender && !ALLOWED_GENDERS.includes(gender)) {
      results.push({ id, ok: false, error: `Género inválido: ${gender}` });
      continue;
    }

    const { error } = await supabaseAdmin
      .from('products')
      .update({
        categories,
        category: categories[0] || null,
        gender,
      })
      .eq('id', id);

    if (error) {
      results.push({ id, ok: false, error: error.message });
    } else {
      results.push({ id, ok: true });
    }
  }

  revalidateTag(PRODUCTS_CACHE_TAG);
  revalidatePath('/');
  revalidatePath('/tienda');
  revalidatePath('/perfume/[slug]', 'page');
  revalidatePath('/admin/products');

  const okCount = results.filter((r) => r.ok).length;
  return NextResponse.json({ ok: true, total: results.length, updated: okCount, results });
}
