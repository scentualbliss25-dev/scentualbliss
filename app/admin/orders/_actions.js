'use server';

import { revalidatePath } from 'next/cache';
import { fetchTransactionByReference } from '@/lib/wompi';
import { supabaseAdmin } from '@/lib/supabase';

// Sincroniza una orden contra Wompi por su `reference`. Útil cuando el webhook
// no llegó (por config, red, etc.). Actualiza status + wompi_tx_id en la DB.
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

  // Decrementar inventario si la transacción quedó aprobada (idempotente — solo si cambió)
  if (newStatus === 'approved' && order.status !== 'approved') {
    await decrementInventoryForOrder(orderId);
  }

  revalidatePath('/admin/orders');
  revalidatePath(`/admin/orders/${orderId}`);

  return { ok: true, oldStatus: order.status, newStatus, txId: tx.id };
}

// Sincroniza TODAS las órdenes pendientes (status='pending' o sin status)
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
