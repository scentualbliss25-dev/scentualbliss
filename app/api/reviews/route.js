import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { rateLimit, clientIp } from '@/lib/rate-limit';

function getClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

// GET /api/reviews?slug=dior-sauvage-edt
// GET /api/reviews?limit=10  -> últimas N reseñas across todos los productos (para el home)
export async function GET(req) {
  const supabase = getClient();
  if (!supabase) return NextResponse.json([]);

  const { searchParams } = new URL(req.url);
  const slug = searchParams.get('slug');
  const limit = Number(searchParams.get('limit')) || null;

  if (!slug && !limit) {
    return NextResponse.json({ error: 'slug o limit requerido' }, { status: 400 });
  }

  let query = supabase
    .from('reviews')
    .select('*')
    .eq('approved', true)
    .order('created_at', { ascending: false });

  if (slug) query = query.eq('product_slug', slug);
  if (limit) query = query.limit(Math.min(limit, 50));

  const { data, error } = await query;

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

// POST /api/reviews
export async function POST(req) {
  const supabase = getClient();
  if (!supabase) return NextResponse.json({ error: 'Reseñas no configuradas' }, { status: 503 });

  // Anti-spam: máximo 3 reseñas por IP cada 5 minutos.
  if (!rateLimit(`reviews:${clientIp(req)}`, { max: 3, windowMs: 5 * 60_000 })) {
    return NextResponse.json({ error: 'Demasiadas reseñas seguidas. Intenta más tarde.' }, { status: 429 });
  }

  try {
    const body = await req.json();
    const { product_slug, author_name, rating, title, text } = body;

    if (!product_slug || !author_name || !rating || !text) {
      return NextResponse.json({ error: 'Faltan campos requeridos' }, { status: 400 });
    }
    // El slug es un identificador controlado por nosotros — mismo formato
    // que genera el admin (minúsculas, números, guiones).
    if (!/^[a-z0-9-]{1,120}$/.test(String(product_slug))) {
      return NextResponse.json({ error: 'Producto inválido' }, { status: 400 });
    }
    const ratingInt = Number(rating);
    if (!Number.isInteger(ratingInt) || ratingInt < 1 || ratingInt > 5) {
      return NextResponse.json({ error: 'Rating debe ser un entero entre 1 y 5' }, { status: 400 });
    }
    const cleanText = String(text).trim();
    if (cleanText.length < 10) {
      return NextResponse.json({ error: 'La reseña es muy corta' }, { status: 400 });
    }
    if (cleanText.length > 1500) {
      return NextResponse.json({ error: 'La reseña es demasiado larga (máx. 1500 caracteres)' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('reviews')
      .insert([{
        product_slug,
        author_name: String(author_name).trim().slice(0, 60),
        rating: ratingInt,
        title: String(title || '').trim().slice(0, 120),
        text: cleanText,
        approved: true,
      }])
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true, id: data.id }, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Error procesando la reseña' }, { status: 500 });
  }
}
