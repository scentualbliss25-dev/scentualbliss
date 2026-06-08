import { deriveMomento, deriveClima } from '@/lib/products-constants';

export const PAGE_SIZE = 24;

// Divide un parámetro de URL (puede ser comma-separated o 'Todos') en array
function vals(v) {
  if (!v || v === 'Todos') return [];
  return v.split(',').filter(Boolean);
}

// Recibe el array de productos como argumento (antes lo importaba de
// lib/products.js, pero ahora ese export es async — el consumidor hace
// `const all = await getAllProducts()` y luego `filterAndSort(all, f)`).
export function filterAndSort(products, {
  cat = 'Todos', type = 'Todos', sort = 'featured',
  brand = 'Todos', q = '', momento = 'Todos', clima = 'Todos',
  gender = 'Todos', conc = 'Todos',
} = {}) {
  let list = Array.isArray(products) ? [...products] : [];

  if (q) {
    const ql = q.toLowerCase();
    list = list.filter(p =>
      p.name.toLowerCase().includes(ql) ||
      p.brand.toLowerCase().includes(ql) ||
      p.description.toLowerCase().includes(ql) ||
      p.notes.top.toLowerCase().includes(ql) ||
      p.notes.heart.toLowerCase().includes(ql) ||
      p.notes.base.toLowerCase().includes(ql)
    );
  }

  const types   = vals(type);
  const cats    = vals(cat);
  const brands  = vals(brand);
  const genders = vals(gender);
  const concs   = vals(conc);
  const momentos = vals(momento);
  const climas  = vals(clima);

  if (types.length)    list = list.filter(p => types.includes(p.productType));
  // categories: un producto puede tener varias familias olfativas. Coincide
  // si CUALQUIERA de las del producto está en el filtro elegido (OR lógico).
  // Fallback a [p.category] si por algún motivo categories viene vacío.
  if (cats.length) list = list.filter(p => {
    const productCats = Array.isArray(p.categories) && p.categories.length
      ? p.categories
      : (p.category ? [p.category] : []);
    return productCats.some(c => cats.includes(c));
  });
  if (brands.length)   list = list.filter(p => brands.includes(p.brand));
  if (genders.length)  list = list.filter(p => genders.includes(p.gender));
  if (concs.length)    list = list.filter(p => {
    return concs.some(c => {
      if (c === 'EDT')    return p.type === 'EDT' || p.type.startsWith('EDT ');
      if (c === 'Parfum') return p.type === 'Parfum' || p.type.startsWith('Parfum ');
      return p.type === c;
    });
  });
  if (momentos.length) list = list.filter(p => momentos.includes(deriveMomento(p)));
  if (climas.length)   list = list.filter(p => climas.includes(deriveClima(p)));

  if (sort === 'bestseller') {
    list = list.filter(p => p.bestseller).concat(list.filter(p => !p.bestseller));
  } else if (sort === 'price-asc') {
    list.sort((a, b) => a.price - b.price);
  } else if (sort === 'price-desc') {
    list.sort((a, b) => b.price - a.price);
  } else if (sort === 'rating') {
    list.sort((a, b) => b.rating - a.rating);
  }
  return list;
}
