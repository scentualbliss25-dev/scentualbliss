import { NextResponse } from 'next/server';
import {
  WOMPI_CONFIGURED, WOMPI_IS_TEST,
  generateReference, generateSignature, toAmountInCents, buildCheckoutUrl,
} from '@/lib/wompi';
import { supabaseAdmin } from '@/lib/supabase';
import { FREE_SHIPPING_THRESHOLD, SHIPPING_COST, COUPONS } from '@/lib/checkout-rules';
import { rateLimit, clientIp } from '@/lib/rate-limit';
import { SITE_URL } from '@/lib/site';

// Tolerancia en COP para comparaciones de montos (redondeos de floats
// como el 15% de descuento sobre subtotales no divisibles).
const EPSILON = 5;

const str = (v, max) => String(v ?? '').trim().slice(0, max);

export async function POST(req) {
  try {
    if (!WOMPI_CONFIGURED) {
      return NextResponse.json({
        error: 'Wompi no está configurado. Define NEXT_PUBLIC_WOMPI_PUBLIC_KEY y WOMPI_INTEGRITY_SECRET en .env.local',
      }, { status: 503 });
    }

    // Anti-spam: crear checkouts inserta filas en customers/orders.
    if (!rateLimit(`checkout:${clientIp(req)}`, { max: 8, windowMs: 60_000 })) {
      return NextResponse.json({ error: 'Demasiados intentos. Espera un minuto.' }, { status: 429 });
    }

    const body = await req.json();
    const { amountUsd, customer = {}, shipping = {}, paymentMethod, items = [], discount = 0, shippingCost = 0 } = body;

    if (!amountUsd || typeof amountUsd !== 'number' || amountUsd <= 0) {
      return NextResponse.json({ error: 'amountUsd inválido' }, { status: 400 });
    }
    if (!customer.email) {
      return NextResponse.json({ error: 'customer.email requerido' }, { status: 400 });
    }
    if (!Array.isArray(items) || items.length === 0 || items.length > 50) {
      return NextResponse.json({ error: 'items inválidos' }, { status: 400 });
    }

    // ─── Validación server-side de precios ─────────────────────────────
    // NUNCA confiar en los montos que manda el navegador: el total que se
    // firma para Wompi y se guarda en la orden se recalcula aquí contra
    // los precios reales de la base de datos. Sin esto, cualquiera podría
    // editar el request y pagar $1.000 por un perfume de $1.000.000.
    if (!supabaseAdmin) {
      // Sin DB no podemos validar precios → fail closed.
      return NextResponse.json({ error: 'Servicio no disponible, intenta más tarde' }, { status: 503 });
    }

    const ids = [...new Set(items.map((i) => Number(i.id)).filter(Number.isFinite))];
    const { data: prods, error: prodErr } = await supabaseAdmin
      .from('products')
      .select('id, base_price, product_sizes ( ml, price )')
      .in('id', ids);
    if (prodErr) {
      console.error('[Checkout] error leyendo productos:', prodErr.message);
      return NextResponse.json({ error: 'Servicio no disponible, intenta más tarde' }, { status: 503 });
    }
    const prodById = new Map((prods || []).map((p) => [p.id, p]));

    let serverSubtotal = 0;
    const pricedItems = [];
    for (const item of items) {
      const qty = Number(item.quantity);
      if (!Number.isInteger(qty) || qty < 1 || qty > 20) {
        return NextResponse.json({ error: 'Cantidad inválida en el carrito' }, { status: 400 });
      }
      const prod = prodById.get(Number(item.id));
      if (!prod) {
        return NextResponse.json({ error: `Producto ${item.id} no existe` }, { status: 400 });
      }
      const sizes = (prod.product_sizes || []).filter((s) => Number(s.price) > 0);
      const matched = item.selectedSize
        ? sizes.find((s) => String(s.ml).trim().toLowerCase() === String(item.selectedSize).trim().toLowerCase())
        : null;
      const realPrice = matched
        ? Number(matched.price)
        : (Number(prod.base_price) > 0
            ? Number(prod.base_price)
            : (sizes.length ? Math.min(...sizes.map((s) => Number(s.price))) : 0));
      if (!(realPrice > 0)) {
        return NextResponse.json({ error: `El producto ${item.id} no tiene precio disponible` }, { status: 400 });
      }
      // El precio que el cliente vio debe coincidir con el actual — si el
      // admin cambió precios con el carrito armado, se le pide recargar.
      if (Math.abs(Number(item.price) - realPrice) > 1) {
        return NextResponse.json({
          error: 'Los precios cambiaron desde que armaste el carrito. Recarga la página e intenta de nuevo.',
        }, { status: 400 });
      }
      serverSubtotal += realPrice * qty;
      pricedItems.push({ ...item, realPrice, qty });
    }

    // Descuento: solo 0 o exactamente la tasa de un cupón vigente.
    const validRates = [0, ...Object.values(COUPONS)];
    const clientDiscount = Number(discount) || 0;
    const discountOk = validRates.some((r) => Math.abs(clientDiscount - serverSubtotal * r) <= EPSILON);
    if (!discountOk || clientDiscount < 0) {
      return NextResponse.json({ error: 'Descuento inválido' }, { status: 400 });
    }

    // Envío: recalculado con las mismas reglas del cliente.
    const afterDiscount = serverSubtotal - clientDiscount;
    const serverShipping = afterDiscount >= FREE_SHIPPING_THRESHOLD ? 0 : SHIPPING_COST;
    if (Math.abs((Number(shippingCost) || 0) - serverShipping) > 1) {
      return NextResponse.json({ error: 'Costo de envío inválido' }, { status: 400 });
    }

    const serverTotal = afterDiscount + serverShipping;
    if (Math.abs(amountUsd - serverTotal) > EPSILON) {
      return NextResponse.json({
        error: 'El total no coincide con los precios actuales. Recarga la página e intenta de nuevo.',
      }, { status: 400 });
    }

    // ─── A partir de aquí, SOLO montos calculados en el servidor ───────
    const reference = generateReference();
    const amountInCents = toAmountInCents(serverTotal);
    const currency = 'COP';
    const signature = generateSignature({ reference, amountInCents, currency });

    // Wompi requiere teléfono solo con dígitos, sin +, espacios ni guiones
    const cleanPhone = (customer.phone || '').replace(/\D/g, '').slice(-10);

    // redirect-url: el header Origin lo controla el cliente — solo lo
    // aceptamos si es exactamente nuestro dominio (o localhost en dev).
    const rawOrigin = req.headers.get('origin') || '';
    const allowedOrigins = new Set([SITE_URL, 'http://localhost:3000']);
    const origin = allowedOrigins.has(rawOrigin) ? rawOrigin : SITE_URL;
    const redirectUrl = `${origin}/order-confirm?reference=${encodeURIComponent(reference)}`;

    const safeCustomer = {
      email: str(customer.email, 254),
      name: str(customer.name, 120),
      phone: str(customer.phone, 30),
    };
    const safeShipping = {
      address: str(shipping.address, 300),
      city: str(shipping.city, 100),
      department: str(shipping.department, 100),
      country: str(shipping.country, 2) || 'CO',
    };

    const checkoutUrl = buildCheckoutUrl({
      reference,
      amountInCents,
      signature,
      redirectUrl,
      currency,
      customerEmail: safeCustomer.email,
      customerFullName: safeCustomer.name,
      customerPhoneNumber: cleanPhone,
      shippingLine1: safeShipping.address,
      shippingCity: safeShipping.city,
      shippingRegion: safeShipping.department,
      shippingCountry: safeShipping.country,
    });

    // Guardar orden en Supabase
    try {
      // Upsert cliente
      const { data: savedCustomer } = await supabaseAdmin
        .from('customers')
        .upsert(
          { email: safeCustomer.email, name: safeCustomer.name, phone: safeCustomer.phone, city: safeShipping.city, department: safeShipping.department, country: safeShipping.country },
          { onConflict: 'email' }
        )
        .select('id')
        .single();

      // Insertar orden — montos del servidor, no del cliente.
      const { data: order } = await supabaseAdmin
        .from('orders')
        .insert({
          reference,
          customer_id: savedCustomer?.id ?? null,
          customer_email: safeCustomer.email,
          customer_name: safeCustomer.name,
          customer_phone: safeCustomer.phone,
          shipping_address: safeShipping.address,
          shipping_city: safeShipping.city,
          shipping_department: safeShipping.department,
          shipping_country: safeShipping.country,
          subtotal: serverSubtotal,
          discount: clientDiscount,
          shipping_cost: serverShipping,
          total: serverTotal,
          currency,
          payment_method: paymentMethod,
          status: 'pending',
        })
        .select('id')
        .single();

      // Insertar items con el precio REAL verificado contra la DB.
      if (order?.id && pricedItems.length > 0) {
        await supabaseAdmin.from('order_items').insert(
          pricedItems.map((item) => ({
            order_id: order.id,
            product_id: String(item.id),
            product_name: str(item.name, 200),
            product_slug: item.slug ? str(item.slug, 120) : null,
            selected_size: item.selectedSize ? str(item.selectedSize, 40) : null,
            quantity: item.qty,
            unit_price: item.realPrice,
            total_price: item.realPrice * item.qty,
          }))
        );
      }
    } catch (dbErr) {
      // No bloquear el checkout si falla la persistencia (los precios ya
      // se validaron arriba; sin fila de orden el webhook la reportará
      // como not-found y el admin puede reconciliar con Wompi).
      console.error('[Checkout DB error]', dbErr);
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
