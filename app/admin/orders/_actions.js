'use server';

import { revalidatePath } from 'next/cache';
import { fetchTransactionByReference } from '@/lib/wompi';
import { supabaseAdmin } from '@/lib/supabase';
import { sendOrderEmail, sendCustomerOrderConfirmation } from '@/lib/notifications';

// === Sync con Wompi ===
export async function syncOrderAction(orderId) {
  if (!supabaseAdmin) return { ok: false, error: 'Supabase no configurado' };

  const { data: order, error: fetchErr } = await supabaseAdmin
    .from('orders')
    .select('id, reference, status')
    .eq('id', orderId)
    .single();

  if (fetchErr || !order) return { ok: false, error: 'Orden no encontrada' };

  let tx;
  try {
    tx = await fetchTransactionByReference(order.reference);
  } catch (e) {
    return { ok: false, error: `Wompi API: ${e.message}` };
  }

  if (!tx) {
    return { ok: false, error: 'Sin transacciones registradas en Wompi para esta referencia' };
  }

  const newStatus = tx.status?.toLowerCase();
  const { error: updateErr } = await supabaseAdmin
    .from('orders')
    .update({
      status: newStatus,
      wompi_tx_id: tx.id,
      updated_at: new Date().toISOString(),
    })
    .eq('id', orderId);

  if (updateErr) return { ok: false, error: updateErr.message };

  if (newStatus === 'approved' && order.status !== 'approved') {
    await decrementInventoryForOrder(orderId);
  }

  revalidatePath('/admin/orders');
  revalidatePath(`/admin/orders/${orderId}`);
  return { ok: true, oldStatus: order.status, newStatus, txId: tx.id };
}

export async function syncAllPendingAction() {
  if (!supabaseAdmin) return { ok: false, error: 'Supabase no configurado' };

  const { data: orders } = await supabaseAdmin
    .from('orders')
    .select('id, reference, status')
    .in('status', ['pending', 'PENDING'])
    .order('created_at', { ascending: false })
    .limit(50);

  if (!orders?.length) return { ok: true, synced: 0, results: [] };

  const results = [];
  for (const o of orders) {
    try {
      const tx = await fetchTransactionByReference(o.reference);
      if (!tx) {
        results.push({ ref: o.reference, status: 'sin_tx' });
        continue;
      }
      const newStatus = tx.status?.toLowerCase();
      await supabaseAdmin
        .from('orders')
        .update({ status: newStatus, wompi_tx_id: tx.id, updated_at: new Date().toISOString() })
        .eq('id', o.id);
      if (newStatus === 'approved' && o.status !== 'approved') {
        await decrementInventoryForOrder(o.id);
      }
      results.push({ ref: o.reference, status: newStatus });
    } catch (e) {
      results.push({ ref: o.reference, status: `error: ${e.message}` });
    }
  }

  revalidatePath('/admin/orders');
  return { ok: true, synced: results.length, results };
}

// === Editar orden (estado, notas, tracking) ===
// Las columnas admin_notes / tracking_carrier / tracking_number son opcionales.
// Si no existen aún en la DB, Supabase ignora silenciosamente esos campos.
export async function updateOrderAction(orderId, updates) {
  if (!supabaseAdmin) return { ok: false, error: 'Supabase no configurado' };

  const allowed = {};
  if (updates.status !== undefined) allowed.status = updates.status;
  if (updates.admin_notes !== undefined) allowed.admin_notes = updates.admin_notes;
  if (updates.tracking_carrier !== undefined) allowed.tracking_carrier = updates.tracking_carrier;
  if (updates.tracking_number !== undefined) allowed.tracking_number = updates.tracking_number;
  allowed.updated_at = new Date().toISOString();

  const { error } = await supabaseAdmin
    .from('orders')
    .update(allowed)
    .eq('id', orderId);

  if (error) {
    // Si falla por columna inexistente, intentar solo con status
    if (error.message?.includes('column') && updates.status !== undefined) {
      const { error: e2 } = await supabaseAdmin
        .from('orders')
        .update({ status: updates.status, updated_at: new Date().toISOString() })
        .eq('id', orderId);
      if (e2) return { ok: false, error: e2.message };
      revalidatePath('/admin/orders');
      revalidatePath(`/admin/orders/${orderId}`);
      return { ok: true, warning: 'Solo se actualizó status. Ejecuta el SQL de migración para habilitar notas/tracking.' };
    }
    return { ok: false, error: error.message };
  }

  revalidatePath('/admin/orders');
  revalidatePath(`/admin/orders/${orderId}`);
  return { ok: true };
}

// === Eliminar orden ===
export async function deleteOrderAction(orderId) {
  if (!supabaseAdmin) return { ok: false, error: 'Supabase no configurado' };

  // Eliminar items primero (FK constraint); luego la orden
  await supabaseAdmin.from('order_items').delete().eq('order_id', orderId);
  const { error } = await supabaseAdmin.from('orders').delete().eq('id', orderId);
  if (error) return { ok: false, error: error.message };

  revalidatePath('/admin/orders');
  return { ok: true };
}

export async function bulkDeleteOrdersAction(orderIds) {
  if (!supabaseAdmin) return { ok: false, error: 'Supabase no configurado' };
  if (!orderIds?.length) return { ok: false, error: 'Sin órdenes seleccionadas' };

  await supabaseAdmin.from('order_items').delete().in('order_id', orderIds);
  const { error } = await supabaseAdmin.from('orders').delete().in('id', orderIds);
  if (error) return { ok: false, error: error.message };

  revalidatePath('/admin/orders');
  return { ok: true, deleted: orderIds.length };
}

/**
 * Reenvía emails de notificación de una orden.
 *
 * target:
 *   - 'admin'    → solo a ADMIN_EMAIL ("nueva orden aprobada")
 *   - 'customer' → solo al cliente ("tu pedido está confirmado")
 *   - 'both'     → ambos en paralelo
 *
 * Útil cuando una orden quedó sin notificar (porque RESEND_API_KEY estaba
 * vacía cuando llegó el webhook, o por algún error transitorio). Lee la
 * orden fresca de Supabase y dispara los emails con los datos actuales.
 */
export async function resendOrderNotificationsAction(orderId, target = 'both') {
  if (!supabaseAdmin) return { ok: false, error: 'Supabase no configurado' };
  if (!['admin', 'customer', 'both'].includes(target)) {
    return { ok: false, error: `Target inválido: ${target}` };
  }

  // Cargar orden + items en una sola query.
  const { data: order, error } = await supabaseAdmin
    .from('orders')
    .select('*, order_items(*)')
    .eq('id', orderId)
    .single();

  if (error || !order) return { ok: false, error: 'Orden no encontrada' };

  const items = order.order_items || [];

  // Ejecuta en paralelo lo que aplique. Cada función ya hace catch interno
  // y retorna { sent, reason?/error? } sin throw.
  const tasks = [];
  if (target === 'admin' || target === 'both') {
    tasks.push(sendOrderEmail(order, items).then(r => ({ kind: 'admin', ...r })));
  }
  if (target === 'customer' || target === 'both') {
    tasks.push(sendCustomerOrderConfirmation(order, items).then(r => ({ kind: 'customer', ...r })));
  }

  const results = await Promise.all(tasks);
  const anyFailed = results.some(r => !r.sent);
  const allReasons = results
    .filter(r => !r.sent)
    .map(r => `${r.kind}: ${r.reason || r.error || 'falló'}`)
    .join(' · ');

  console.log(
    `[resend-notif] order=${order.reference} target=${target}`,
    results.map(r => `${r.kind}:${r.sent}`).join(' '),
  );

  return {
    ok: !anyFailed,
    error: anyFailed ? allReasons : null,
    results,
  };
}

async function decrementInventoryForOrder(orderId) {
  try {
    const { data: items } = await supabaseAdmin
      .from('order_items')
      .select('product_id, product_name, product_slug, quantity')
      .eq('order_id', orderId);
    if (!items?.length) return;

    for (const item of items) {
      const { data: inv } = await supabaseAdmin
        .from('inventory')
        .select('stock')
        .eq('product_id', item.product_id)
        .single();

      if (inv) {
        await supabaseAdmin
          .from('inventory')
          .update({ stock: Math.max(0, inv.stock - item.quantity), updated_at: new Date().toISOString() })
          .eq('product_id', item.product_id);
      } else {
        await supabaseAdmin.from('inventory').insert({
          product_id: item.product_id,
          product_name: item.product_name,
          product_slug: item.product_slug,
          stock: -item.quantity,
        });
      }
    }
  } catch (err) {
    console.error('[Inventory decrement (sync)]', err);
  }
}
