// Reglas de negocio del checkout — ÚNICA fuente de verdad, compartida
// entre el cliente (UI del checkout) y el servidor (validación
// anti-manipulación en /api/wompi/checkout). Si cambias un valor aquí,
// cambia en ambos lados a la vez.

export const FREE_SHIPPING_THRESHOLD = 350000; // COP — envío gratis desde este subtotal (tras descuento)
export const SHIPPING_COST = 15000;            // COP — costo de envío estándar

// Cupones vigentes: código → fracción de descuento sobre el subtotal.
export const COUPONS = {
  BLISS15: 0.15,
};
