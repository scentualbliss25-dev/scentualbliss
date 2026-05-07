// API route: genera la firma de integridad y la URL de Wompi Web Checkout
// POST /api/wompi/checkout
// Body: { amountUsd, customer, shipping, paymentMethod }

import { NextResponse } from 'next/server';
import {
  WOMPI_CONFIGURED, WOMPI_PUBLIC_KEY, WOMPI_IS_TEST,
  generateReference, generateSignature, toAmountInCents, buildCheckoutUrl,
} from '@/lib/wompi';

export async function POST(req) {
  try {
    if (!WOMPI_CONFIGURED) {
      return NextResponse.json({
        error: 'Wompi no está configurado. Define NEXT_PUBLIC_WOMPI_PUBLIC_KEY y WOMPI_INTEGRITY_SECRET en .env.local',
      }, { status: 503 });
    }

    const body = await req.json();
    const { amountUsd, customer = {}, shipping = {}, paymentMethod } = body;

    if (!amountUsd || typeof amountUsd !== 'number' || amountUsd <= 0) {
      return NextResponse.json({ error: 'amountUsd inválido' }, { status: 400 });
    }
    if (!customer.email) {
      return NextResponse.json({ error: 'customer.email requerido' }, { status: 400 });
    }

    const reference = generateReference();
    const amountInCents = toAmountInCents(amountUsd);
    const currency = 'COP';
    const signature = generateSignature({ reference, amountInCents, currency });

    // URL absoluta de redirect tras pago
    const origin = req.headers.get('origin')
      || process.env.NEXT_PUBLIC_SITE_URL
      || 'http://localhost:3000';
    const redirectUrl = `${origin}/order-confirm?reference=${encodeURIComponent(reference)}`;

    const checkoutUrl = buildCheckoutUrl({
      reference,
      amountInCents,
      signature,
      redirectUrl,
      currency,
      customerEmail: customer.email,
      customerFullName: customer.name,
      customerPhoneNumber: customer.phone,
      shippingLine1: shipping.address,
      shippingCity: shipping.city,
      shippingRegion: shipping.department,
      shippingCountry: shipping.country || 'CO',
    });

    // En producción acá guardarías el order en DB con status 'pending'
    // y reference. Cuando llegue el webhook actualizas a 'approved'/'declined'.

    return NextResponse.json({
      reference,
      amountInCents,
      currency,
      checkoutUrl,
      isTest: WOMPI_IS_TEST,
      paymentMethod,
    });
  } catch (err) {
    console.error('[Wompi checkout error]', err);
    return NextResponse.json({ error: err.message || 'Error interno' }, { status: 500 });
  }
}
