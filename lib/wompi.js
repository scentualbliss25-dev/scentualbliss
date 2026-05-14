// Helpers de integración con Wompi (pasarela de pago de Bancolombia)
// Docs: https://docs.wompi.co/docs/colombia/widget-checkout-web/

import crypto from 'node:crypto';

// === Variables de entorno ===
// Configurar en .env.local:
//   NEXT_PUBLIC_WOMPI_PUBLIC_KEY = pub_test_xxx (o pub_prod_xxx)
//   WOMPI_INTEGRITY_SECRET       = xxx (server-side only)
//   WOMPI_EVENTS_SECRET          = xxx (para validar webhooks)
//   NEXT_PUBLIC_SITE_URL         = https://scentualbliss.com (o localhost en dev)

export const WOMPI_PUBLIC_KEY = process.env.NEXT_PUBLIC_WOMPI_PUBLIC_KEY || '';
export const WOMPI_PRIVATE_KEY = process.env.WOMPI_PRIVATE_KEY || '';
export const WOMPI_INTEGRITY_SECRET = process.env.WOMPI_INTEGRITY_SECRET || '';
export const WOMPI_EVENTS_SECRET = process.env.WOMPI_EVENTS_SECRET || '';

export const WOMPI_IS_TEST = WOMPI_PUBLIC_KEY.startsWith('pub_test_');
export const WOMPI_IS_PROD = WOMPI_PUBLIC_KEY.startsWith('pub_prod_');
export const WOMPI_CONFIGURED = !!WOMPI_PUBLIC_KEY && !!WOMPI_INTEGRITY_SECRET;

export const WOMPI_API_URL = WOMPI_IS_PROD
  ? 'https://production.wompi.co/v1'
  : 'https://sandbox.wompi.co/v1';

export const WOMPI_CHECKOUT_URL = 'https://checkout.wompi.co/p/';

// Genera referencia única por orden
export function generateReference() {
  const ts = Date.now().toString(36).toUpperCase();
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `SB-${ts}-${rand}`;
}

// Firma de integridad SHA256 (server-side)
// String: reference + amount-in-cents + currency + integrity-secret
export function generateSignature({ reference, amountInCents, currency = 'COP' }) {
  if (!WOMPI_INTEGRITY_SECRET) {
    throw new Error('WOMPI_INTEGRITY_SECRET not configured');
  }
  const concatenated = `${reference}${amountInCents}${currency}${WOMPI_INTEGRITY_SECRET}`;
  return crypto.createHash('sha256').update(concatenated).digest('hex');
}

// Convierte un monto COP a centavos. Wompi requiere amount-in-cents.
// Los precios en products.js están en COP (ej: 205000 = $205.000 COP)
export function toAmountInCents(copAmount) {
  return Math.round(copAmount) * 100;
}

// formatCOP movido a lib/format.js para evitar pull-in de node:crypto en client bundles
export { formatCOP } from './format.js';

// Construye URL preservando los colones (`:`) literales en las keys.
// URLSearchParams los encodea como %3A, lo que en algunos casos hace que Wompi
// rechace la request en CloudFront.
function buildQueryPreservingColons(entries) {
  const parts = [];
  for (const [k, v] of entries) {
    if (v == null || v === '') continue;
    // Solo escapamos el value, NO la key (porque queremos colones literales).
    parts.push(`${k}=${encodeURIComponent(String(v))}`);
  }
  return parts.join('&');
}

export function buildCheckoutUrl({
  reference,
  amountInCents,
  signature,
  redirectUrl,
  currency = 'COP',
  customerEmail,
  customerFullName,
  customerPhoneNumber,
  shippingLine1,
  shippingCity,
  shippingRegion,
  shippingCountry = 'CO',
}) {
  // Wompi necesita el teléfono como prefix (+57) separado del número (10 dígitos).
  // Si no se separa, el campo no se pre-rellena y el usuario tiene que volver a tipearlo.
  const phoneDigits = (customerPhoneNumber || '').toString().replace(/\D/g, '').slice(-10);
  const hasPhone = phoneDigits.length === 10;

  const entries = [
    ['public-key', WOMPI_PUBLIC_KEY],
    ['currency', currency],
    ['amount-in-cents', String(amountInCents)],
    ['reference', reference],
    ['signature:integrity', signature],
    ['redirect-url', redirectUrl],
    ['customer-data:email', customerEmail],
    ['customer-data:full-name', customerFullName],
    ['customer-data:phone-number', hasPhone ? phoneDigits : null],
    ['customer-data:phone-number-prefix', hasPhone ? '+57' : null],
    ['customer-data:legal-id', null],
    ['customer-data:legal-id-type', null],
    ['shipping-address:address-line-1', shippingLine1],
    ['shipping-address:city', shippingCity],
    ['shipping-address:region', shippingRegion],
    ['shipping-address:country', shippingLine1 ? shippingCountry : null],
    ['shipping-address:phone-number', hasPhone ? phoneDigits : null],
    ['shipping-address:phone-number-prefix', hasPhone ? '+57' : null],
  ];
  return `${WOMPI_CHECKOUT_URL}?${buildQueryPreservingColons(entries)}`;
}

// Wompi requiere la private key (no la public) para consultas server-side de transacciones.
const wompiAuthKey = () => WOMPI_PRIVATE_KEY || WOMPI_PUBLIC_KEY;

// Consulta el estado de una transacción usando el ID que Wompi devuelve en el callback
export async function fetchTransaction(id) {
  const res = await fetch(`${WOMPI_API_URL}/transactions/${id}`, {
    cache: 'no-store',
    headers: { 'Authorization': `Bearer ${wompiAuthKey()}` },
  });
  if (!res.ok) throw new Error(`Wompi API error: ${res.status}`);
  const json = await res.json();
  return json.data;
}

// Consulta transacciones por reference (la que generamos al iniciar el checkout).
// Devuelve la más reciente o null si no hay ninguna.
export async function fetchTransactionByReference(reference) {
  const url = `${WOMPI_API_URL}/transactions?reference=${encodeURIComponent(reference)}`;
  const res = await fetch(url, {
    cache: 'no-store',
    headers: { 'Authorization': `Bearer ${wompiAuthKey()}` },
  });
  if (!res.ok) throw new Error(`Wompi API error: ${res.status}`);
  const json = await res.json();
  const txs = Array.isArray(json.data) ? json.data : [];
  if (txs.length === 0) return null;
  txs.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  return txs[0];
}

// Valida la firma de un evento webhook de Wompi
// Wompi firma con SHA256(properties + timestamp + events-secret)
export function validateWebhookSignature(payload) {
  if (!WOMPI_EVENTS_SECRET) return false;
  const { signature, timestamp, data } = payload;
  if (!signature?.checksum || !signature?.properties) return false;
  // Reconstruir el string firmado
  const concatenated = signature.properties
    .map(p => p.split('.').reduce((obj, k) => obj?.[k], data))
    .join('') + timestamp + WOMPI_EVENTS_SECRET;
  const expected = crypto.createHash('sha256').update(concatenated).digest('hex');
  return expected === signature.checksum;
}
