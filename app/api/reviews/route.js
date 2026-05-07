import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function getClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

// GET /api/reviews?slug=dior-sauvage-edt
export async function GET(req) {
  const supabase = getClient();
  if (!supabase) return NextResponse.json([]);

  const { searchParams } = new URL(req.url);
  const slug = searchParams.get('slug');
  if (!slug) return NextResponse.json({ error: 'slug requerido' }, { status: 400 });

  const { data, error } = await supabase
    .from('reviews')
    .select('*')
    .eq('product_slug', slug)
    .eq('approved', true)
    .order('created_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

// POST /api/reviews
export async function POST(req) {
  const supabase = getClient();
  if (!supabase) return NextResponse.json({ error: 'Reseñas no configuradas' }, { status: 503 });
  try {
    const body = await req.json();
    const { product_slug, author_name, rating, title, text } = body;

    if (!product_slug || !author_name || !rating || !text) {
      return NextResponse.json({ error: 'Faltan campos requeridos' }, { status: 400 });
    }
    if (rating < 1 || rating > 5) {
      return NextResponse.json({ error: 'Rating debe ser entre 1 y 5' }, { status: 400 });
    }
    if (text.trim().length < 10) {
      return NextResponse.json({ error: 'La reseña es muy corta' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('reviews')
      .insert([{
        product_slug,
        author_name: author_name.trim(),
        rating: Number(rating),
        title: title?.trim() || '',
        text: text.trim(),
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
