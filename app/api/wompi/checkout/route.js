import { NextResponse } from 'next/server';
import {
  WOMPI_CONFIGURED, WOMPI_PUBLIC_KEY, WOMPI_IS_TEST,
  generateReference, generateSignature, toAmountInCents, buildCheckoutUrl,
} from '@/lib/wompi';
import { supabaseAdmin } from '@/lib/supabase';

export async function POST(req) {
  try {
    if (!WOMPI_CONFIGURED) {
      return NextResponse.json({
        error: 'Wompi no está configurado. Define NEXT_PUBLIC_WOMPI_PUBLIC_KEY y WOMPI_INTEGRITY_SECRET en .env.local',
      }, { status: 503 });
    }

    const body = await req.json();
    const { amountUsd, customer = {}, shipping = {}, paymentMethod, items = [], discount = 0, shippingCost = 0 } = body;

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

    // Wompi requiere teléfono solo con dígitos, sin +, espacios ni guiones
    const cleanPhone = (customer.phone || '').replace(/\D/g, '').slice(-10);

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
      customerPhoneNumber: cleanPhone,
      shippingLine1: shipping.address,
      shippingCity: shipping.city,
      shippingRegion: shipping.department,
      shippingCountry: shipping.country || 'CO',
    });

    // Guardar orden en Supabase
    if (supabaseAdmin) {
      try {
        // Upsert cliente
        const { data: savedCustomer } = await supabaseAdmin
          .from('customers')
          .upsert(
            { email: customer.email, name: customer.name, phone: customer.phone, city: shipping.city, department: shipping.department, country: shipping.country || 'CO' },
            { onConflict: 'email' }
          )
          .select('id')
          .single();

        // Insertar orden
        const { data: order } = await supabaseAdmin
          .from('orders')
          .insert({
            reference,
            customer_id: savedCustomer?.id ?? null,
            customer_email: customer.email,
            customer_name: customer.name,
            customer_phone: customer.phone,
            shipping_address: shipping.address,
            shipping_city: shipping.city,
            shipping_department: shipping.department,
            shipping_country: shipping.country || 'CO',
            subtotal: amountUsd + discount - shippingCost,
            discount,
            shipping_cost: shippingCost,
            total: amountUsd,
            currency,
            payment_method: paymentMethod,
            status: 'pending',
          })
          .select('id')
          .single();

        // Insertar items
        if (order?.id && items.length > 0) {
          await supabaseAdmin.from('order_items').insert(
            items.map(item => ({
              order_id: order.id,
              product_id: String(item.id),
              product_name: item.name,
              product_slug: item.slug || null,
              selected_size: item.selectedSize || null,
              quantity: item.quantity,
              unit_price: item.price,
              total_price: item.price * item.quantity,
            }))
          );
        }
      } catch (dbErr) {
        // No bloquear el checkout si falla la DB
        console.error('[Checkout DB error]', dbErr);
      }
    }

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
