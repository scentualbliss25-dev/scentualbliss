// API: gestiona suscripciones a notificaciones push del admin
// POST: agregar suscripción nueva (idempotente por endpoint)
// DELETE: eliminar suscripción por endpoint
//
// SOLO ADMIN: estas suscripciones reciben las notificaciones de nuevas
// órdenes (nombre del cliente, total, referencia). El middleware no cubre
// /api/push/*, así que la sesión se verifica aquí mismo — sin esto,
// cualquier visitante podría suscribir su navegador y recibir los datos
// de cada venta.

import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { verifySession, ADMIN_COOKIE_NAME } from '@/lib/admin-auth';

function getCookie(req, name) {
  const fromNext = req.cookies?.get?.(name)?.value;
  if (fromNext) return fromNext;
  const header = req.headers.get('cookie') || '';
  const m = header.match(new RegExp(`(?:^|;\\s*)${name}=([^;]+)`));
  return m ? decodeURIComponent(m[1]) : null;
}

async function requireAdmin(req) {
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected) return false;
  const cookie = getCookie(req, ADMIN_COOKIE_NAME);
  return verifySession(cookie, expected);
}

export async function POST(req) {
  try {
    if (!(await requireAdmin(req))) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }
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
    if (!(await requireAdmin(req))) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }
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
