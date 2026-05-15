// Notificaciones para el admin cuando llega una orden nueva
// Soporta: Email (Resend) + WhatsApp (CallMeBot) + Push (web-push)

import { Resend } from 'resend';
import { formatCOP } from './format.js';

const RESEND_API_KEY = process.env.RESEND_API_KEY || '';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || '';
const FROM_EMAIL = process.env.FROM_EMAIL || 'ScentualBliss <onboarding@resend.dev>';

const CALLMEBOT_PHONE = process.env.CALLMEBOT_PHONE || '';
const CALLMEBOT_APIKEY = process.env.CALLMEBOT_APIKEY || '';

const resend = RESEND_API_KEY ? new Resend(RESEND_API_KEY) : null;

// === Email vía Resend ===
export async function sendOrderEmail(order, items = []) {
  if (!resend || !ADMIN_EMAIL) {
    console.log('[notify] Email no configurado (falta RESEND_API_KEY o ADMIN_EMAIL)');
    return { sent: false, reason: 'not_configured' };
  }

  const itemsList = items.map(i =>
    `<tr>
      <td style="padding:8px;border-bottom:1px solid #eee">${escapeHtml(i.product_name)}${i.selected_size ? ` (${i.selected_size})` : ''}</td>
      <td style="padding:8px;border-bottom:1px solid #eee;text-align:center">×${i.quantity}</td>
      <td style="padding:8px;border-bottom:1px solid #eee;text-align:right">${formatCOP(Number(i.total_price))}</td>
    </tr>`
  ).join('');

  const html = `
    <div style="font-family:system-ui,-apple-system,sans-serif;max-width:600px;margin:0 auto;color:#1f2937">
      <div style="background:linear-gradient(135deg,#C9A96E,#A8895A);padding:24px;text-align:center;color:#fff">
        <h1 style="margin:0;font-size:22px;font-weight:600">💰 Nueva orden aprobada</h1>
        <p style="margin:6px 0 0;opacity:.9;font-size:14px">${escapeHtml(order.reference)}</p>
      </div>

      <div style="padding:24px;background:#fff">
        <div style="background:#f9fafb;border-radius:8px;padding:16px;margin-bottom:20px">
          <h2 style="margin:0 0 12px;font-size:14px;color:#6b7280;text-transform:uppercase;letter-spacing:.06em">Cliente</h2>
          <p style="margin:0;font-weight:600">${escapeHtml(order.customer_name || '—')}</p>
          <p style="margin:4px 0;font-size:14px;color:#6b7280">${escapeHtml(order.customer_email || '—')}</p>
          <p style="margin:4px 0;font-size:14px;color:#6b7280">📱 ${escapeHtml(order.customer_phone || '—')}</p>
        </div>

        <div style="background:#f9fafb;border-radius:8px;padding:16px;margin-bottom:20px">
          <h2 style="margin:0 0 12px;font-size:14px;color:#6b7280;text-transform:uppercase;letter-spacing:.06em">Envío</h2>
          <p style="margin:0">${escapeHtml(order.shipping_address || '—')}</p>
          <p style="margin:4px 0;font-size:14px">${escapeHtml(order.shipping_city || '')}, ${escapeHtml(order.shipping_department || '')}</p>
        </div>

        <h2 style="margin:0 0 12px;font-size:14px;color:#6b7280;text-transform:uppercase;letter-spacing:.06em">Productos</h2>
        <table style="width:100%;border-collapse:collapse;margin-bottom:20px">
          <tbody>${itemsList || '<tr><td style="padding:8px;color:#6b7280">(sin items)</td></tr>'}</tbody>
        </table>

        <div style="background:#f0fdf4;border:1px solid #86efac;border-radius:8px;padding:16px;text-align:right">
          <p style="margin:0;font-size:14px;color:#059669">Total cobrado</p>
          <p style="margin:4px 0 0;font-size:24px;font-weight:700;color:#059669">${formatCOP(Number(order.total))}</p>
        </div>

        <a href="https://scentualbliss.com.co/admin/orders/${order.id}"
          style="display:block;margin:24px 0 0;background:#1f2937;color:#fff;text-align:center;padding:12px;border-radius:8px;text-decoration:none;font-weight:600">
          Ver detalle de la orden
        </a>
      </div>

      <div style="padding:16px;text-align:center;color:#9ca3af;font-size:12px">
        ScentualBliss · Notificación automática
      </div>
    </div>
  `;

  try {
    const result = await resend.emails.send({
      from: FROM_EMAIL,
      to: ADMIN_EMAIL,
      subject: `🎉 Nueva orden ${formatCOP(Number(order.total))} — ${order.reference}`,
      html,
    });
    return { sent: true, id: result.data?.id };
  } catch (err) {
    console.error('[notify] Error enviando email:', err);
    return { sent: false, error: err.message };
  }
}

// === WhatsApp vía CallMeBot ===
// Setup: https://www.callmebot.com/blog/free-api-whatsapp-messages/
export async function sendOrderWhatsApp(order, items = []) {
  if (!CALLMEBOT_PHONE || !CALLMEBOT_APIKEY) {
    console.log('[notify] WhatsApp no configurado (falta CALLMEBOT_PHONE o CALLMEBOT_APIKEY)');
    return { sent: false, reason: 'not_configured' };
  }

  const itemsText = items.length
    ? items.map(i => `• ${i.product_name}${i.selected_size ? ` (${i.selected_size})` : ''} ×${i.quantity}`).join('\n')
    : '(sin items)';

  const message =
    `🎉 *NUEVA ORDEN APROBADA*\n\n` +
    `📦 Ref: ${order.reference}\n` +
    `👤 ${order.customer_name || '—'}\n` +
    `📧 ${order.customer_email || '—'}\n` +
    `📱 ${order.customer_phone || '—'}\n\n` +
    `🛍️ *Productos:*\n${itemsText}\n\n` +
    `📍 ${order.shipping_address || '—'}\n` +
    `${order.shipping_city || ''}, ${order.shipping_department || ''}\n\n` +
    `💰 *Total: ${formatCOP(Number(order.total))}*\n\n` +
    `🔗 https://scentualbliss.com.co/admin/orders/${order.id}`;

  const url = `https://api.callmebot.com/whatsapp.php?phone=${encodeURIComponent(CALLMEBOT_PHONE)}&text=${encodeURIComponent(message)}&apikey=${encodeURIComponent(CALLMEBOT_APIKEY)}`;

  try {
    const res = await fetch(url);
    const text = await res.text();
    if (!res.ok) throw new Error(`CallMeBot ${res.status}: ${text.slice(0, 200)}`);
    return { sent: true };
  } catch (err) {
    console.error('[notify] Error enviando WhatsApp:', err);
    return { sent: false, error: err.message };
  }
}

// === Envío unificado ===
// Llamado desde el webhook de Wompi cuando una orden es aprobada.
// No throws: cualquier canal puede fallar individualmente sin bloquear los otros.
export async function notifyAdminNewOrder(order, items = []) {
  const [email, whatsapp] = await Promise.all([
    sendOrderEmail(order, items).catch(e => ({ sent: false, error: e.message })),
    sendOrderWhatsApp(order, items).catch(e => ({ sent: false, error: e.message })),
  ]);
  console.log(`[notify] ${order.reference} — email:${email.sent} whatsapp:${whatsapp.sent}`);
  return { email, whatsapp };
}

function escapeHtml(s) {
  return String(s ?? '').replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}
