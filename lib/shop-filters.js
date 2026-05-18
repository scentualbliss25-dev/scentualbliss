import { products } from '@/lib/products';

export const PAGE_SIZE = 24;

export function filterAndSort({ cat = 'Todos', type = 'Todos', sort = 'featured', brand = 'Todos', q = '' }) {
  let list = [...products];
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
  if (type !== 'Todos') list = list.filter(p => p.productType === type);
  if (cat !== 'Todos') list = list.filter(p => p.category === cat);
  if (brand !== 'Todos') list = list.filter(p => p.brand === brand);
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
