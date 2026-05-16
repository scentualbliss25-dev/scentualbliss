-- Agregar columnas para gestión avanzada de órdenes en el admin
-- Ejecutar en Supabase Dashboard → SQL Editor
--
-- El código maneja graciosamente si estas columnas no existen aún, pero
-- ejecutar este SQL habilita: notas internas y tracking de envío.

ALTER TABLE orders ADD COLUMN IF NOT EXISTS admin_notes text;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS tracking_carrier text;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS tracking_number text;

-- Índice opcional para búsqueda rápida por tracking
CREATE INDEX IF NOT EXISTS idx_orders_tracking_number ON orders(tracking_number) WHERE tracking_number IS NOT NULL;
