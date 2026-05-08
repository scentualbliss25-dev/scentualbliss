import { NextResponse } from 'next/server';
import { validateWebhookSignature } from '@/lib/wompi';
import { supabaseAdmin } from '@/lib/supabase';

export async function POST(req) {
  try {
    const payload = await req.json();

    if (!validateWebhookSignature(payload)) {
      console.warn('[Wompi webhook] Firma inválida');
      return NextResponse.json({ error: 'invalid signature' }, { status: 401 });
    }

    const { event, data } = payload;
    const tx = data?.transaction;

    if (event === 'transaction.updated' && tx) {
      const status = tx.status?.toLowerCase(); // approved, declined, voided, error, pending

      console.log(`[Wompi] ${tx.reference} → ${tx.status}`);

      if (supabaseAdmin) {
        await supabaseAdmin
          .from('orders')
          .update({
            status,
            wompi_tx_id: tx.id,
            updated_at: new Date().toISOString(),
          })
          .eq('reference', tx.reference);
      }
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[Wompi webhook error]', err);
    return NextResponse.json({ error: 'internal error' }, { status: 500 });
  }
}
