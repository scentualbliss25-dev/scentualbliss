import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { rateLimit, clientIp } from '@/lib/rate-limit';

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]{2,}$/;

// POST /api/newsletter  { email }
export async function POST(req) {
  if (!supabaseAdmin) {
    return NextResponse.json({ error: 'Servicio no configurado' }, { status: 503 });
  }

  // Anti-spam: sin esto cualquiera puede llenar la tabla con basura.
  if (!rateLimit(`newsletter:${clientIp(req)}`, { max: 5, windowMs: 60_000 })) {
    return NextResponse.json({ error: 'Demasiados intentos. Espera un minuto.' }, { status: 429 });
  }

  try {
    const { email } = await req.json();

    const normalized = String(email || '').trim().toLowerCase();
    if (!normalized || normalized.length > 254 || !EMAIL_RE.test(normalized)) {
      return NextResponse.json({ error: 'Email inválido' }, { status: 400 });
    }

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
