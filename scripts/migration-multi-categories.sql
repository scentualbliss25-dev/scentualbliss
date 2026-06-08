-- ============================================================================
-- Migración: convertir products.category (string) en products.categories (text[])
-- ============================================================================
-- Permite que un producto pertenezca a VARIAS familias olfativas
-- (ej. "floral" + "dulce" + "amaderado" en lugar de solo una).
--
-- Estrategia de compat:
--   - AÑADIMOS columna `categories` text[] nueva
--   - DEJAMOS `category` (singular, string) por compat hacia atrás temporal
--   - El código nuevo escribe AMBAS: `category` = primera de `categories`
--   - El código viejo sigue leyendo `category` sin enterarse
-- ============================================================================

-- 1. Añadir columna categories como array vacío por default
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS categories text[] NOT NULL DEFAULT '{}';

-- 2. Backfill: copiar el valor actual de category al array categories
--    Solo para productos que tienen category pero categories vacío
UPDATE products
SET categories = ARRAY[category]
WHERE category IS NOT NULL
  AND category <> ''
  AND (categories IS NULL OR cardinality(categories) = 0);

-- 3. Index GIN para que los filtros por familia sean rápidos
--    (búsqueda "tiene tal categoría" usa este index)
CREATE INDEX IF NOT EXISTS idx_products_categories
  ON products USING GIN (categories);

-- 4. CHECK constraint: máximo 5 familias olfativas por perfume.
--    Defensa a nivel DB en caso de que el admin envíe más por error.
ALTER TABLE products
  DROP CONSTRAINT IF EXISTS products_categories_max_5;
ALTER TABLE products
  ADD CONSTRAINT products_categories_max_5
  CHECK (cardinality(categories) <= 5);

-- 5. Verificación (debe mostrar el array)
SELECT id, name, category, categories
FROM products
ORDER BY id
LIMIT 5;
