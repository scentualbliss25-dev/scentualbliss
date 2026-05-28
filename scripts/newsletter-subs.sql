-- Tabla de suscriptores al newsletter
-- Ejecutar en Supabase Dashboard → SQL Editor

CREATE TABLE IF NOT EXISTS newsletter_subs (
  id          bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  email       text NOT NULL UNIQUE,
  created_at  timestamptz NOT NULL DEFAULT now(),
  source      text DEFAULT 'home'
);

-- Índice ya cubre el UNIQUE, pero esto lo hace explícito para búsquedas
CREATE INDEX IF NOT EXISTS idx_newsletter_subs_email ON newsletter_subs(email);

-- Row Level Security: solo service_role puede leer/escribir
ALTER TABLE newsletter_subs ENABLE ROW LEVEL SECURITY;

-- La API route usa supabaseAdmin (service role) que bypasea RLS
-- No se necesitan políticas adicionales para lectura pública
