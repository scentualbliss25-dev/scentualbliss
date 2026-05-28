import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

// POST /api/newsletter  { email }
export async function POST(req) {
  if (!supabaseAdmin) {
    return NextResponse.json({ error: 'Servicio no configurado' }, { status: 503 });
  }

  try {
    const { email } = await req.json();

    if (!email || !email.includes('@')) {
      return NextResponse.json({ error: 'Email inválido' }, { status: 400 });
    }

    const normalized = email.trim().toLowerCase();

    const { error } = await supabaseAdmin
      .from('newsletter_subs')
      .insert([{ email: normalized }]);

    if (error) {
      // código 23505 = unique_violation (email ya suscrito)
      if (error.code === '23505') {
        return NextResponse.json({ already: true });
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true }, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
