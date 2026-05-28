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

// === Email de confirmación AL CLIENTE ===
// Diseño premium minimalista — paleta marfil/oro de la marca.
// Compatibilidad: HTML basado en tablas con CSS inline (Gmail, Apple Mail, Outlook).
export async function sendCustomerOrderConfirmation(order, items = []) {
  if (!resend) {
    console.log('[notify] Cliente email no enviado (falta RESEND_API_KEY)');
    return { sent: false, reason: 'not_configured' };
  }
  if (!order.customer_email) {
    console.log('[notify] Cliente email no enviado (orden sin customer_email)');
    return { sent: false, reason: 'no_customer_email' };
  }

  const firstName = (order.customer_name || '').split(' ')[0] || 'Cliente';
  const subtotal = Number(order.subtotal) || items.reduce((s, i) => s + Number(i.total_price || 0), 0);
  const shippingCost = Number(order.shipping_cost) || 0;
  const total = Number(order.total) || subtotal + shippingCost;
  const orderDate = new Date(order.created_at || Date.now()).toLocaleDateString('es-CO', {
    day: 'numeric', month: 'long', year: 'numeric',
  });

  const itemsRows = items.map(i => `
    <tr>
      <td style="padding:18px 0;border-bottom:1px solid #EFEAE0;vertical-align:top">
        <div style="font-family:Georgia,'Times New Roman',serif;font-size:15px;color:#1F1A14;font-weight:400;line-height:1.35;margin-bottom:4px">
          ${escapeHtml(i.product_name)}
        </div>
        <div style="font-size:12px;color:#7A6E5E;letter-spacing:.04em">
          ${i.selected_size ? `${escapeHtml(i.selected_size)} · ` : ''}Cantidad ${i.quantity}
        </div>
      </td>
      <td style="padding:18px 0;border-bottom:1px solid #EFEAE0;text-align:right;vertical-align:top;font-size:14px;color:#1F1A14;font-weight:500;white-space:nowrap">
        ${formatCOP(Number(i.total_price))}
      </td>
    </tr>
  `).join('');

  const html = `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Pedido confirmado · ScentualBliss</title>
</head>
<body style="margin:0;padding:0;background:#F5EFE3;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif">

  <!-- Preheader (oculto, se muestra en preview de bandeja) -->
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent">
    Hemos recibido tu pedido ${escapeHtml(order.reference)} por ${formatCOP(total)}. Te confirmaremos el despacho muy pronto.
  </div>

  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#F5EFE3;padding:32px 12px">
    <tr>
      <td align="center">

        <!-- Container principal -->
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="600" style="max-width:600px;background:#FFFFFF;border-radius:14px;overflow:hidden;box-shadow:0 4px 24px rgba(31,26,20,.06)">

          <!-- Header con monograma -->
          <tr>
            <td style="background:linear-gradient(135deg,#1F1A14 0%,#2A2218 100%);padding:48px 32px;text-align:center">
              <div style="display:inline-block;padding:14px 22px;border:1px solid rgba(201,169,110,.4);border-radius:4px">
                <div style="font-family:Georgia,'Times New Roman',serif;font-size:11px;letter-spacing:.45em;color:#C9A96E;text-transform:uppercase">ScentualBliss</div>
                <div style="font-family:Georgia,'Times New Roman',serif;font-size:9px;letter-spacing:.32em;color:rgba(212,182,138,.6);text-transform:uppercase;margin-top:3px">Perfumería original</div>
              </div>
            </td>
          </tr>

          <!-- Hero -->
          <tr>
            <td style="padding:56px 48px 32px;text-align:center">
              <div style="font-size:11px;letter-spacing:.32em;text-transform:uppercase;color:#C9A96E;font-weight:600;margin-bottom:18px">
                Pedido confirmado
              </div>
              <h1 style="font-family:Georgia,'Times New Roman',serif;font-size:30px;line-height:1.25;color:#1F1A14;margin:0 0 14px;font-weight:400">
                Gracias, ${escapeHtml(firstName)}.
              </h1>
              <p style="font-size:15px;color:#4A3F33;line-height:1.65;margin:0;max-width:420px;display:inline-block">
                Hemos recibido tu pedido y tu pago fue procesado correctamente. Estamos preparando tu fragancia con el cuidado que merece.
              </p>
            </td>
          </tr>

          <!-- Stat row: # pedido + fecha -->
          <tr>
            <td style="padding:0 48px">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#FAF6EE;border-radius:10px">
                <tr>
                  <td style="padding:20px 24px;border-right:1px solid #EFEAE0;width:50%">
                    <div style="font-size:10px;letter-spacing:.2em;text-transform:uppercase;color:#7A6E5E;font-weight:600;margin-bottom:6px">N° Pedido</div>
                    <div style="font-family:'SF Mono',Menlo,Consolas,monospace;font-size:14px;color:#1F1A14;font-weight:600;letter-spacing:.02em">${escapeHtml(order.reference)}</div>
                  </td>
                  <td style="padding:20px 24px;width:50%">
                    <div style="font-size:10px;letter-spacing:.2em;text-transform:uppercase;color:#7A6E5E;font-weight:600;margin-bottom:6px">Fecha</div>
                    <div style="font-size:14px;color:#1F1A14;font-weight:500">${orderDate}</div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Productos -->
          <tr>
            <td style="padding:40px 48px 16px">
              <div style="font-size:11px;letter-spacing:.32em;text-transform:uppercase;color:#7A6E5E;font-weight:600;margin-bottom:8px;border-bottom:1px solid #1F1A14;padding-bottom:14px">
                Tu pedido
              </div>
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
                ${itemsRows}
              </table>
            </td>
          </tr>

          <!-- Resumen pago -->
          <tr>
            <td style="padding:8px 48px 0">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
                <tr>
                  <td style="padding:10px 0;font-size:14px;color:#4A3F33">Subtotal</td>
                  <td style="padding:10px 0;font-size:14px;color:#4A3F33;text-align:right">${formatCOP(subtotal)}</td>
                </tr>
                <tr>
                  <td style="padding:10px 0;font-size:14px;color:#4A3F33">Envío a toda Colombia</td>
                  <td style="padding:10px 0;font-size:14px;text-align:right;${shippingCost === 0 ? 'color:#6B8E7A;font-weight:600' : 'color:#4A3F33'}">${shippingCost === 0 ? 'Gratis' : formatCOP(shippingCost)}</td>
                </tr>
                <tr>
                  <td colspan="2" style="padding:8px 0 0;border-top:1px solid #EFEAE0"></td>
                </tr>
                <tr>
                  <td style="padding:14px 0 0;font-family:Georgia,'Times New Roman',serif;font-size:16px;color:#1F1A14;font-weight:600">Total pagado</td>
                  <td style="padding:14px 0 0;font-family:Georgia,'Times New Roman',serif;font-size:22px;color:#C9A96E;text-align:right;font-weight:600">${formatCOP(total)}</td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Dirección de envío -->
          <tr>
            <td style="padding:48px 48px 16px">
              <div style="font-size:11px;letter-spacing:.32em;text-transform:uppercase;color:#7A6E5E;font-weight:600;margin-bottom:14px;border-bottom:1px solid #1F1A14;padding-bottom:14px">
                Dirección de envío
              </div>
              <div style="font-size:14px;color:#1F1A14;line-height:1.7">
                <div style="font-weight:600;margin-bottom:4px">${escapeHtml(order.customer_name || '')}</div>
                <div>${escapeHtml(order.shipping_address || '—')}</div>
                <div>${escapeHtml(order.shipping_city || '')}${order.shipping_department ? ', ' + escapeHtml(order.shipping_department) : ''}</div>
                <div style="color:#7A6E5E;margin-top:6px">${escapeHtml(order.customer_phone || '')}</div>
              </div>
            </td>
          </tr>

          <!-- Timeline próximos pasos -->
          <tr>
            <td style="padding:32px 48px">
              <div style="font-size:11px;letter-spacing:.32em;text-transform:uppercase;color:#7A6E5E;font-weight:600;margin-bottom:18px;border-bottom:1px solid #1F1A14;padding-bottom:14px">
                Qué sigue
              </div>
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
                <tr>
                  <td style="padding-bottom:18px;vertical-align:top;width:36px">
                    <div style="width:28px;height:28px;border-radius:50%;background:#C9A96E;text-align:center;line-height:28px;color:#fff;font-weight:600;font-size:13px">1</div>
                  </td>
                  <td style="padding-bottom:18px;padding-left:16px;vertical-align:top">
                    <div style="font-size:14px;color:#1F1A14;font-weight:600;margin-bottom:3px">Preparamos tu pedido</div>
                    <div style="font-size:13px;color:#7A6E5E;line-height:1.5">Validamos stock y empacamos tu fragancia con material protector.</div>
                  </td>
                </tr>
                <tr>
                  <td style="padding-bottom:18px;vertical-align:top">
                    <div style="width:28px;height:28px;border-radius:50%;background:#FAF6EE;border:1px solid #E5DCC7;text-align:center;line-height:28px;color:#7A6E5E;font-weight:600;font-size:13px">2</div>
                  </td>
                  <td style="padding-bottom:18px;padding-left:16px;vertical-align:top">
                    <div style="font-size:14px;color:#1F1A14;font-weight:600;margin-bottom:3px">Despachamos a la transportadora</div>
                    <div style="font-size:13px;color:#7A6E5E;line-height:1.5">Te enviaremos un correo con el número de guía cuando tu pedido salga.</div>
                  </td>
                </tr>
                <tr>
                  <td style="vertical-align:top">
                    <div style="width:28px;height:28px;border-radius:50%;background:#FAF6EE;border:1px solid #E5DCC7;text-align:center;line-height:28px;color:#7A6E5E;font-weight:600;font-size:13px">3</div>
                  </td>
                  <td style="padding-left:16px;vertical-align:top">
                    <div style="font-size:14px;color:#1F1A14;font-weight:600;margin-bottom:3px">Llega a tu puerta</div>
                    <div style="font-size:13px;color:#7A6E5E;line-height:1.5">Envío gratis a toda Colombia. Recibirás tu pedido en pocos días hábiles.</div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- CTA contacto -->
          <tr>
            <td style="padding:24px 48px 48px">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#FAF6EE;border-radius:10px;border:1px solid #EFEAE0">
                <tr>
                  <td style="padding:24px;text-align:center">
                    <div style="font-family:Georgia,'Times New Roman',serif;font-size:16px;color:#1F1A14;margin-bottom:6px">¿Tienes alguna duda?</div>
                    <div style="font-size:13px;color:#7A6E5E;line-height:1.6;margin-bottom:18px">Nuestro equipo está disponible para ayudarte.</div>
                    <a href="https://wa.me/573169376436?text=${encodeURIComponent('Hola! Tengo una consulta sobre mi pedido ' + order.reference)}"
                       style="display:inline-block;background:#1F1A14;color:#FAF6EE;padding:13px 28px;border-radius:6px;text-decoration:none;font-size:13px;font-weight:600;letter-spacing:.06em;margin-right:8px">
                      WhatsApp
                    </a>
                    <a href="mailto:ventas@scentualbliss.com.co?subject=${encodeURIComponent('Consulta pedido ' + order.reference)}"
                       style="display:inline-block;background:transparent;color:#1F1A14;padding:13px 28px;border:1px solid #1F1A14;border-radius:6px;text-decoration:none;font-size:13px;font-weight:600;letter-spacing:.06em">
                      Escríbenos
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer marca -->
          <tr>
            <td style="background:#1F1A14;padding:36px 48px;text-align:center">
              <div style="font-family:Georgia,'Times New Roman',serif;font-size:12px;letter-spacing:.42em;color:#C9A96E;text-transform:uppercase;margin-bottom:14px">ScentualBliss</div>
              <div style="font-size:11px;color:rgba(250,246,238,.55);line-height:1.7;letter-spacing:.04em">
                Perfumería original · Medellín, Colombia<br/>
                <a href="https://scentualbliss.com.co" style="color:rgba(250,246,238,.7);text-decoration:none">scentualbliss.com.co</a>
              </div>
              <div style="margin-top:20px;padding-top:20px;border-top:1px solid rgba(250,246,238,.08);font-size:10px;color:rgba(250,246,238,.35);line-height:1.6">
                Recibiste este correo porque realizaste un pedido en ScentualBliss.<br/>
                Este es un mensaje transaccional, no requiere respuesta.
              </div>
            </td>
          </tr>

        </table>

      </td>
    </tr>
  </table>

</body>
</html>`;

  try {
    const result = await resend.emails.send({
      from: FROM_EMAIL,
      to: order.customer_email,
      subject: `Tu pedido está confirmado · ScentualBliss`,
      html,
    });
    return { sent: true, id: result.data?.id };
  } catch (err) {
    console.error('[notify] Error enviando email al cliente:', err);
    return { sent: false, error: err.message };
  }
}

// === Email de recuperación de carrito abandonado ===
// Lo dispara el cron /api/cron/recover-abandoned-carts cuando una orden
// lleva entre 2h y 72h en status 'pending'. Tono gentil sin descuento
// (decisión consciente: no entrenar a los clientes a abandonar para
// recibir cupones).
export async function sendAbandonedCartEmail(order, items = []) {
  if (!resend) {
    console.log('[abandoned-cart] Email no enviado (falta RESEND_API_KEY)');
    return { sent: false, reason: 'not_configured' };
  }
  if (!order.customer_email) {
    return { sent: false, reason: 'no_customer_email' };
  }

  const firstName = (order.customer_name || '').split(' ')[0] || '';
  const itemCount = items.reduce((s, i) => s + Number(i.quantity || 0), 0);
  const total = Number(order.total) || items.reduce((s, i) => s + Number(i.total_price || 0), 0);
  const checkoutUrl = `https://scentualbliss.com.co/checkout`;

  const itemsRows = items.map(i => `
    <tr>
      <td style="padding:16px 0;border-bottom:1px solid #EFEAE0;vertical-align:top">
        <div style="font-family:Georgia,serif;font-size:15px;color:#1F1A14;line-height:1.35;margin-bottom:4px">
          ${escapeHtml(i.product_name)}
        </div>
        <div style="font-size:12px;color:#7A6E5E;letter-spacing:.04em">
          ${i.selected_size ? `${escapeHtml(i.selected_size)} · ` : ''}Cantidad ${i.quantity}
        </div>
      </td>
      <td style="padding:16px 0;border-bottom:1px solid #EFEAE0;text-align:right;vertical-align:top;font-size:14px;color:#1F1A14;font-weight:500;white-space:nowrap">
        ${formatCOP(Number(i.total_price))}
      </td>
    </tr>
  `).join('');

  const html = `<!DOCTYPE html>
<html><head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/></head>
<body style="margin:0;padding:0;background:#F5EFE3;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif">

  <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent">
    Dejaste ${itemCount} ${itemCount === 1 ? 'fragancia' : 'fragancias'} en tu carrito por ${formatCOP(total)}. Te las guardamos.
  </div>

  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#F5EFE3;padding:32px 12px">
    <tr><td align="center">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="600" style="max-width:600px;background:#FFFFFF;border-radius:14px;overflow:hidden;box-shadow:0 4px 24px rgba(31,26,20,.06)">

        <tr>
          <td style="background:linear-gradient(135deg,#1F1A14 0%,#2A2218 100%);padding:48px 32px;text-align:center">
            <div style="display:inline-block;padding:14px 22px;border:1px solid rgba(201,169,110,.4);border-radius:4px">
              <div style="font-family:Georgia,serif;font-size:11px;letter-spacing:.45em;color:#C9A96E;text-transform:uppercase">ScentualBliss</div>
              <div style="font-family:Georgia,serif;font-size:9px;letter-spacing:.32em;color:rgba(212,182,138,.6);text-transform:uppercase;margin-top:3px">Perfumería Original</div>
            </div>
          </td>
        </tr>

        <tr>
          <td style="padding:56px 48px 28px;text-align:center">
            <div style="font-size:11px;letter-spacing:.32em;text-transform:uppercase;color:#C9A96E;font-weight:600;margin-bottom:18px">
              Tu carrito te espera
            </div>
            <h1 style="font-family:Georgia,serif;font-size:30px;line-height:1.25;color:#1F1A14;margin:0 0 16px;font-weight:400">
              ¿Olvidaste algo${firstName ? ', ' + escapeHtml(firstName) : ''}?
            </h1>
            <p style="font-size:15px;color:#4A3F33;line-height:1.65;margin:0;max-width:440px;display:inline-block">
              Dejaste ${itemCount} ${itemCount === 1 ? 'fragancia preparada' : 'fragancias preparadas'} para llevar. La guardamos por si quieres completar tu compra cuando estés listo.
            </p>
          </td>
        </tr>

        <tr>
          <td style="padding:24px 48px 8px">
            <div style="font-size:11px;letter-spacing:.32em;text-transform:uppercase;color:#7A6E5E;font-weight:600;margin-bottom:6px;border-bottom:1px solid #1F1A14;padding-bottom:14px">
              Lo que dejaste
            </div>
            <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
              ${itemsRows}
            </table>
          </td>
        </tr>

        <tr>
          <td style="padding:24px 48px 0">
            <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
              <tr>
                <td style="padding:14px 0 0;font-family:Georgia,serif;font-size:16px;color:#1F1A14;font-weight:600">Total</td>
                <td style="padding:14px 0 0;font-family:Georgia,serif;font-size:22px;color:#C9A96E;text-align:right;font-weight:600">${formatCOP(total)}</td>
              </tr>
            </table>
          </td>
        </tr>

        <tr>
          <td style="padding:40px 48px;text-align:center">
            <a href="${checkoutUrl}"
               style="display:inline-block;background:#1F1A14;color:#FAF6EE;padding:16px 44px;border-radius:6px;text-decoration:none;font-size:14px;font-weight:600;letter-spacing:.08em;text-transform:uppercase">
              Completar mi compra
            </a>
            <p style="font-size:13px;color:#7A6E5E;line-height:1.6;margin:24px 0 0">
              Envío gratis a toda Colombia · Productos 100% originales
            </p>
          </td>
        </tr>

        <tr>
          <td style="padding:0 48px 48px">
            <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#FAF6EE;border-radius:10px;border:1px solid #EFEAE0">
              <tr>
                <td style="padding:20px 24px;text-align:center">
                  <div style="font-size:13px;color:#4A3F33;line-height:1.6">
                    ¿Tienes alguna pregunta sobre tu pedido?
                  </div>
                  <a href="https://wa.me/573169376436?text=${encodeURIComponent('Hola! Tengo dudas sobre mi carrito en ScentualBliss')}"
                     style="display:inline-block;margin-top:10px;color:#C9A96E;text-decoration:underline;font-size:13px;font-weight:600">
                    Escríbenos por WhatsApp
                  </a>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <tr>
          <td style="background:#1F1A14;padding:36px 48px;text-align:center">
            <div style="font-family:Georgia,serif;font-size:12px;letter-spacing:.42em;color:#C9A96E;text-transform:uppercase;margin-bottom:14px">ScentualBliss</div>
            <div style="font-size:11px;color:rgba(250,246,238,.55);line-height:1.7;letter-spacing:.04em">
              Perfumería original · Medellín, Colombia<br/>
              <a href="https://scentualbliss.com.co" style="color:rgba(250,246,238,.7);text-decoration:none">scentualbliss.com.co</a>
            </div>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>

</body></html>`;

  try {
    const result = await resend.emails.send({
      from: FROM_EMAIL,
      to: order.customer_email,
      subject: `¿Olvidaste algo${firstName ? ', ' + firstName : ''}? · ScentualBliss`,
      html,
    });
    return { sent: true, id: result.data?.id };
  } catch (err) {
    console.error('[abandoned-cart] Error enviando email:', err);
    return { sent: false, error: err.message };
  }
}

// === Envío unificado ===
// Llamado desde el webhook de Wompi cuando una orden es aprobada.
// No throws: cualquier canal puede fallar individualmente sin bloquear los otros.
export async function notifyAdminNewOrder(order, items = []) {
  const [email, whatsapp, customer] = await Promise.all([
    sendOrderEmail(order, items).catch(e => ({ sent: false, error: e.message })),
    sendOrderWhatsApp(order, items).catch(e => ({ sent: false, error: e.message })),
    sendCustomerOrderConfirmation(order, items).catch(e => ({ sent: false, error: e.message })),
  ]);
  console.log(`[notify] ${order.reference} — admin-email:${email.sent} whatsapp:${whatsapp.sent} customer-email:${customer.sent}`);
  return { email, whatsapp, customer };
}

function escapeHtml(s) {
  return String(s ?? '').replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}
