-- =====================================================
-- ScentualBliss — Schema Supabase
-- Ejecutar en: Supabase Dashboard → SQL Editor
-- =====================================================

-- Extensión UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- CLIENTES
-- =====================================================
CREATE TABLE IF NOT EXISTS customers (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email        TEXT UNIQUE NOT NULL,
  name         TEXT NOT NULL,
  phone        TEXT,
  city         TEXT,
  department   TEXT,
  country      TEXT DEFAULT 'CO',
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- ÓRDENES
-- =====================================================
CREATE TABLE IF NOT EXISTS orders (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  reference           TEXT UNIQUE NOT NULL,
  customer_id         UUID REFERENCES customers(id),
  customer_email      TEXT NOT NULL,
  customer_name       TEXT NOT NULL,
  customer_phone      TEXT,
  shipping_address    TEXT,
  shipping_city       TEXT,
  shipping_department TEXT,
  shipping_country    TEXT DEFAULT 'CO',
  subtotal            NUMERIC(12,2) NOT NULL,
  discount            NUMERIC(12,2) DEFAULT 0,
  shipping_cost       NUMERIC(12,2) DEFAULT 0,
  total               NUMERIC(12,2) NOT NULL,
  currency            TEXT DEFAULT 'COP',
  payment_method      TEXT,
  status              TEXT DEFAULT 'pending',
  wompi_tx_id         TEXT,
  notes               TEXT,
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- ITEMS DE ÓRDENES
-- =====================================================
CREATE TABLE IF NOT EXISTS order_items (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id      UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id    TEXT NOT NULL,
  product_name  TEXT NOT NULL,
  product_slug  TEXT,
  selected_size TEXT,
  quantity      INTEGER NOT NULL,
  unit_price    NUMERIC(12,2) NOT NULL,
  total_price   NUMERIC(12,2) NOT NULL
);

-- =====================================================
-- INVENTARIO
-- =====================================================
CREATE TABLE IF NOT EXISTS inventory (
  product_id    TEXT PRIMARY KEY,
  product_name  TEXT NOT NULL,
  product_slug  TEXT,
  stock         INTEGER DEFAULT 0,
  reserved      INTEGER DEFAULT 0,
  reorder_point INTEGER DEFAULT 5,
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- CONVERSACIONES WHATSAPP (Fase 1)
-- =====================================================
CREATE TABLE IF NOT EXISTS whatsapp_conversations (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  phone_number    TEXT NOT NULL,
  customer_id     UUID REFERENCES customers(id),
  status          TEXT DEFAULT 'active',
  messages        JSONB DEFAULT '[]',
  last_message_at TIMESTAMPTZ DEFAULT NOW(),
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- ÍNDICES
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_orders_reference     ON orders(reference);
CREATE INDEX IF NOT EXISTS idx_orders_email         ON orders(customer_email);
CREATE INDEX IF NOT EXISTS idx_orders_status        ON orders(status);
CREATE INDEX IF NOT EXISTS idx_order_items_order    ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_phone       ON whatsapp_conversations(phone_number);

-- =====================================================
-- TRIGGER: updated_at automático
-- =====================================================
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER orders_updated_at
  BEFORE UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE OR REPLACE TRIGGER customers_updated_at
  BEFORE UPDATE ON customers
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE OR REPLACE TRIGGER whatsapp_updated_at
  BEFORE UPDATE ON whatsapp_conversations
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- =====================================================
-- RLS: deshabilitar para operaciones server-side
-- (habilitar y configurar cuando agregues auth de usuario)
-- =====================================================
ALTER TABLE customers                DISABLE ROW LEVEL SECURITY;
ALTER TABLE orders                   DISABLE ROW LEVEL SECURITY;
ALTER TABLE order_items              DISABLE ROW LEVEL SECURITY;
ALTER TABLE inventory                DISABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_conversations   DISABLE ROW LEVEL SECURITY;
