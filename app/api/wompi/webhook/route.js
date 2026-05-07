// API route: recibe eventos webhook de Wompi
// POST /api/wompi/webhook
// Wompi llama acá cuando una transacción cambia de estado.
// IMPORTANTE: validar firma antes de actuar.

import { NextResponse } from 'next/server';
import { validateWebhookSignature } from '@/lib/wompi';

export async function POST(req) {
  try {
    const payload = await req.json();

    // Validación de firma (anti-spoofing)
    if (!validateWebhookSignature(payload)) {
      console.warn('[Wompi webhook] Firma inválida');
      return NextResponse.json({ error: 'invalid signature' }, { status: 401 });
    }

    const { event, data } = payload;
    const tx = data?.transaction;

    if (event === 'transaction.updated' && tx) {
      // Estados: APPROVED, DECLINED, VOIDED, ERROR, PENDING
      console.log(`[Wompi] tx ${tx.reference} → ${tx.status}`);

      // En producción: actualizar order en DB por reference
      //   if (tx.status === 'APPROVED') marcar pagado, enviar email, etc.
      //   if (tx.status === 'DECLINED') notificar al usuario
      //   if (tx.status === 'VOIDED') reembolsar/cancelar
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[Wompi webhook error]', err);
    return NextResponse.json({ error: 'internal error' }, { status: 500 });
  }
}

// Wompi requiere que el endpoint responda 200 rápido (<3s)
// Si necesitas trabajo pesado, encólalo en background
