// Cron de Vercel — corre cada hora (config en vercel.json).
//
// Busca ordenes en status 'pending' que llevan entre 2h y 72h sin completar
// y no tienen recovery_email_sent_at, y les envia un email de recordatorio
// "olvidaste algo en tu carrito".
//
// La ventana 2h-72h evita:
//   - <2h: el cliente todavia puede estar terminando de pagar
//   - >72h: ya esta frio, mejor dejarlo morir que parecer desesperados
//
// Marca recovery_email_sent_at al enviar para no enviar dos veces.

import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { sendAbandonedCartEmail } from '@/lib/notifications';

// Ventana de tiempo en horas
const HOURS_MIN = 2;
const HOURS_MAX = 72;

export async function GET(req) {
  // Auth: Vercel manda Authorization: Bearer <CRON_SECRET>
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = req.headers.get('authorization');
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    }
  }

  if (!supabaseAdmin) {
    return NextResponse.json({ error: 'supabase not configured' }, { status: 503 });
  }

  const now = Date.now();
  const minDate = new Date(now - HOURS_MAX * 60 * 60 * 1000).toISOString();
  const maxDate = new Date(now - HOURS_MIN * 60 * 60 * 1000).toISOString();

  // Buscar ordenes elegibles + sus items en una sola query
  const { data: orders, error } = await supabaseAdmin
    .from('orders')
    .select('*, order_items(*)')
    .eq('status', 'pending')
    .is('recovery_email_sent_at', null)
    .gte('created_at', minDate)
    .lte('created_at', maxDate)
    .not('customer_email', 'is', null);

  if (error) {
    console.error('[recover-carts] Error consultando ordenes', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!orders?.length) {
    console.log('[recover-carts] No hay carritos abandonados para recuperar');
    return NextResponse.json({
      ok: true,
      timestamp: new Date().toISOString(),
      total: 0,
      sent: 0,
    });
  }

  let sent = 0;
  let failed = 0;
  const results = [];

  for (const order of orders) {
    const items = order.order_items || [];
    const result = await sendAbandonedCartEmail(order, items).catch(e => ({
      sent: false, error: e.message,
    }));

    if (result.sent) {
      sent++;
      // Marcar como enviado para no repetir
      await supabaseAdmin
        .from('orders')
        .update({ recovery_email_sent_at: new Date().toISOString() })
        .eq('id', order.id);
    } else {
      failed++;
    }

    results.push({
      reference: order.reference,
      email: order.customer_email,
      sent: result.sent,
      reason: result.reason || result.error || 'ok',
    });
  }

  console.log(`[recover-carts] ${sent}/${orders.length} emails enviados`);

  return NextResponse.json({
    ok: true,
    timestamp: new Date().toISOString(),
    total: orders.length,
    sent,
    failed,
    results,
  });
}
