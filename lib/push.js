// Web Push Notifications (PWA)
// Envía notificaciones push a los browsers/celulares suscritos del admin.

import webpush from 'web-push';
import { supabaseAdmin } from './supabase.js';
import { formatCOP } from './format.js';

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || '';
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || '';
const VAPID_SUBJECT = process.env.VAPID_SUBJECT || 'mailto:admin@scentualbliss.com.co';

if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
}

export const PUSH_CONFIGURED = !!(VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY);

// Envía una notificación push a TODOS los admins suscritos.
// Limpia automáticamente las suscripciones que ya no son válidas (410 Gone).
export async function sendOrderPush(order) {
  if (!PUSH_CONFIGURED) {
    console.log('[push] VAPID no configurado, saltando');
    return { sent: 0 };
  }
  if (!supabaseAdmin) return { sent: 0 };

  const { data: subs } = await supabaseAdmin
    .from('push_subscriptions')
    .select('id, endpoint, p256dh, auth');

  if (!subs?.length) {
    console.log('[push] No hay suscripciones activas');
    return { sent: 0 };
  }

  const payload = JSON.stringify({
    title: `💰 Nueva orden ${formatCOP(Number(order.total))}`,
    body: `${order.customer_name || 'Cliente'} — ${order.reference}`,
    url: `/admin/orders/${order.id}`,
    tag: order.reference,
  });

  let sent = 0;
  const expiredIds = [];

  await Promise.all(subs.map(async (sub) => {
    try {
      await webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        payload,
      );
      sent++;
    } catch (err) {
      // 410 Gone o 404 Not Found = suscripción expirada
      if (err.statusCode === 410 || err.statusCode === 404) {
        expiredIds.push(sub.id);
      } else {
        console.error('[push] Error en suscripción', sub.id, err.statusCode, err.body);
      }
    }
  }));

  // Limpiar suscripciones expiradas
  if (expiredIds.length) {
    await supabaseAdmin.from('push_subscriptions').delete().in('id', expiredIds);
    console.log(`[push] Eliminadas ${expiredIds.length} suscripciones expiradas`);
  }

  console.log(`[push] Enviado a ${sent}/${subs.length} suscriptores`);
  return { sent, total: subs.length };
}
