// API: gestiona suscripciones a notificaciones push del admin
// POST: agregar suscripción nueva (idempotente por endpoint)
// DELETE: eliminar suscripción por endpoint

import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function POST(req) {
  try {
    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'DB no configurada' }, { status: 503 });
    }
    const sub = await req.json();
    if (!sub?.endpoint || !sub?.keys?.p256dh || !sub?.keys?.auth) {
      return NextResponse.json({ error: 'payload inválido' }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from('push_subscriptions')
      .upsert(
        {
          endpoint: sub.endpoint,
          p256dh: sub.keys.p256dh,
          auth: sub.keys.auth,
          user_agent: req.headers.get('user-agent')?.slice(0, 200) || null,
        },
        { onConflict: 'endpoint' }
      )
      .select('id')
      .single();

    if (error) throw error;
    return NextResponse.json({ ok: true, id: data?.id });
  } catch (err) {
    console.error('[push subscribe]', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(req) {
  try {
    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'DB no configurada' }, { status: 503 });
    }
    const { endpoint } = await req.json();
    if (!endpoint) {
      return NextResponse.json({ error: 'endpoint requerido' }, { status: 400 });
    }
    await supabaseAdmin.from('push_subscriptions').delete().eq('endpoint', endpoint);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
