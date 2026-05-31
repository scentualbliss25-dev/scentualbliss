import { NextResponse } from 'next/server';
import { validateWebhookSignature } from '@/lib/wompi';
import { supabaseAdmin } from '@/lib/supabase';
import { notifyAdminNewOrder } from '@/lib/notifications';
import { sendOrderPush } from '@/lib/push';

export async function POST(req) {
  try {
    const payload = await req.json();

    if (!validateWebhookSignature(payload)) {
      console.warn('[Wompi webhook] Firma inválida');
      return NextResponse.json({ error: 'invalid signature' }, { status: 401 });
    }

    const { event, data } = payload;
    const tx = data?.transaction;

    if (event !== 'transaction.updated' || !tx) {
      console.log(`[Wompi webhook] Evento ignorado: ${event}`);
      return NextResponse.json({ ok: true, ignored: event });
    }

    const status = tx.status?.toLowerCase(); // approved, declined, voided, error, pending
    console.log(`[Wompi] ${tx.reference} → ${status} (txId: ${tx.id})`);

    if (!supabaseAdmin) {
      console.error('[Wompi webhook] supabaseAdmin no disponible — saltando persistencia');
      return NextResponse.json({ ok: true, persisted: false });
    }

    // Actualizar orden
    const { data: updated, error: updateErr } = await supabaseAdmin
      .from('orders')
      .update({
        status,
        wompi_tx_id: tx.id,
        updated_at: new Date().toISOString(),
      })
      .eq('reference', tx.reference)
      .select('id, status')
      .single();

    if (updateErr || !updated) {
      console.warn(`[Wompi webhook] No se encontró orden con reference=${tx.reference}`, updateErr?.message);
      return NextResponse.json({ ok: true, found: false });
    }

    // Si la transacción quedó aprobada: notificar admin/cliente + decrementar inventario.
    //
    // IMPORTANTE: usamos `await` (NO fire-and-forget). En Vercel Functions, apenas
    // retornamos la respuesta al webhook, el container muere y las promesas en
    // background se cancelan a mitad — antes incluso de que se haga la llamada
    // HTTP a Resend. Por eso los emails automáticos no llegaban. Wompi tolera
    // webhooks lentos (hasta 30s), así que esperar 1-2s extra es aceptable.
    //
    // Las 3 tareas corren en paralelo (Promise.allSettled) para que el fallo de
    // una no aborte las otras — los emails de cliente, admin, y la decrementación
    // de inventario son independientes.
    if (status === 'approved') {
      const { data: fullOrder } = await supabaseAdmin
        .from('orders')
        .select('*, order_items(*)')
        .eq('id', updated.id)
        .single();

      if (fullOrder) {
        const items = fullOrder.order_items || [];
        const [notifyRes, pushRes, invRes] = await Promise.allSettled([
          notifyAdminNewOrder(fullOrder, items),
          sendOrderPush(fullOrder),
          decrementInventory(updated.id),
        ]);
        if (notifyRes.status === 'rejected') console.error('[notify]', notifyRes.reason);
        if (pushRes.status === 'rejected')   console.error('[push]',   pushRes.reason);
        if (invRes.status === 'rejected')    console.error('[inv]',    invRes.reason);
      } else {
        // fullOrder vino null — extraño pero no fatal; al menos decrementamos.
        await decrementInventory(updated.id).catch(e => console.error('[inv]', e));
      }
    }

    return NextResponse.json({ ok: true, orderId: updated.id, status });
  } catch (err) {
    console.error('[Wompi webhook error]', err);
    return NextResponse.json({ error: 'internal error' }, { status: 500 });
  }
}

async function decrementInventory(orderId) {
  try {
    const { data: items } = await supabaseAdmin
      .from('order_items')
      .select('product_id, product_name, product_slug, quantity')
      .eq('order_id', orderId);

    if (!items?.length) return;

    for (const item of items) {
      // Lee fila actual (si no existe, la creamos en 0 — el admin tendrá que poblar el inventario inicial)
      const { data: inv } = await supabaseAdmin
        .from('inventory')
        .select('stock')
        .eq('product_id', item.product_id)
        .single();

      if (inv) {
        const newStock = Math.max(0, inv.stock - item.quantity);
        await supabaseAdmin
          .from('inventory')
          .update({ stock: newStock, updated_at: new Date().toISOString() })
          .eq('product_id', item.product_id);
        console.log(`[Inventory] ${item.product_id} ${inv.stock} → ${newStock} (-${item.quantity})`);
      } else {
        // Crear con stock 0 (negativo si vendiste sin stock registrado)
        await supabaseAdmin
          .from('inventory')
          .insert({
            product_id: item.product_id,
            product_name: item.product_name,
            product_slug: item.product_slug,
            stock: -item.quantity,
          });
        console.log(`[Inventory] ${item.product_id} creado con stock=${-item.quantity} (sin registro previo)`);
      }
    }
  } catch (err) {
    console.error('[Inventory decrement error]', err);
  }
}
