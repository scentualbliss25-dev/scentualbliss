// === Catálogo de productos (SERVER-ONLY async access) ===
//
// Antes este archivo exportaba un array hardcoded de 155 productos.
// Ahora los productos viven en Supabase y se acceden con las funciones
// async de lib/products-db.js.
//
// IMPORTANTE: este archivo es SERVER-ONLY porque re-exporta desde
// products-db.js que crea el client de Supabase. Si necesitas constantes
// (collections, productTypes, getImagePath, deriveMomento, etc.) desde
// un Client Component, importa de lib/products-constants.js.
//
// Uso típico (Server Components, route handlers, server actions):
//   import { getAllProducts, getProductBySlug } from '@/lib/products';
//   const products = await getAllProducts();
//
// Cache: 5 min en memoria del server. El admin invalida con
// revalidateTag('products') al editar.

// Re-exports de la capa de acceso a datos (server-only)
export {
  getAllProducts,
  getProductBySlug,
  getProductById,
  getBestsellers,
  getFeatured,
  getProductsByBrand,
  getProductsByCategory,
  getProductsByType,
  getAllBrands,
  PRODUCTS_CACHE_TAG,
} from './products-db.js';

// Re-exports de constantes/helpers síncronos (compat hacia atrás).
// Idealmente los client components importan directo de products-constants.js
// para no arrastrar este archivo (que sigue trayendo products-db.js).
export {
  getImagePath,
  productTypes,
  collections,
  testimonials,
  categoryLabels,
  productTypeLabels,
  momentoOptions,
  climaOptions,
  deriveMomento,
  deriveClima,
} from './products-constants.js';
