import { products, productTypes, collections } from '@/lib/products';
import ProductCard from '@/components/ui/ProductCard';
import ShopFilters from '@/components/pages/ShopFilters';
import ShopLoadMore, { ShopEmptyState } from '@/components/ui/ShopLoadMore';
import QuickViewModal from '@/components/ui/QuickViewModal';

export const metadata = {
  title: 'Tienda — Todos los Perfumes de Lujo',
  description: 'Explora nuestra colección completa de fragancias exclusivas. Filtra por categoría, precio y bestsellers. Envío gratis en pedidos mayores a $100.',
};

const PAGE_SIZE = 24;

const aromaCats = [
  { id: 'Todos', label: 'Todos' },
  ...collections.map(c => ({ id: c.id, label: c.name })),
];

const typeCats = [
  { id: 'Todos', label: 'Todos' },
  ...productTypes.map(t => ({ id: t.id, label: t.name })),
];

const allBrands = [...new Set(products.map(p => p.brand))].sort((a, b) =>
  a.localeCompare(b, 'es', { sensitivity: 'base' })
);

function filterAndSort({ cat, type, sort, brand, q }) {
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

export default async function TiendaPage({ searchParams }) {
  const sp = await searchParams;
  const cat = sp.cat || 'Todos';
  const type = sp.type || 'Todos';
  const sort = sp.sort || 'featured';
  const brand = sp.brand || 'Todos';
  const q = sp.q || '';
  const page = Math.max(1, parseInt(sp.page || '1', 10) || 1);

  const filtered = filterAndSort({ cat, type, sort, brand, q });
  const limit = page * PAGE_SIZE;
  const visible = filtered.slice(0, limit);
  const hasMore = filtered.length > visible.length;

  const heading = brand !== 'Todos'
    ? brand
    : type !== 'Todos'
      ? productTypes.find(t => t.id === type)?.name
      : cat !== 'Todos'
        ? collections.find(c => c.id === cat)?.name
        : null;

  const activeFilters = [
    type !== 'Todos' && { key: 'type', value: type, label: productTypes.find(t => t.id === type)?.name || type },
    cat !== 'Todos' && { key: 'cat', value: cat, label: collections.find(c => c.id === cat)?.name || cat },
    brand !== 'Todos' && { key: 'brand', value: brand, label: brand },
  ].filter(Boolean);

  return (
    <main style={{ minHeight: '80vh' }}>
      {/* Shop header */}
      <div style={{ borderBottom: '1px solid rgba(26,22,16,.07)', padding: '52px 0 36px', background: '#F6F3EE' }}>
        <div className="container">
          <p style={{ fontSize: '.7rem', letterSpacing: '.32em', textTransform: 'uppercase', color: 'var(--gold-dark)', marginBottom: 14, fontWeight: 600 }}>ScentualBliss · Tienda</p>
          <h1 style={{ fontFamily: 'var(--font-serif)', fontWeight: 300, color: 'var(--white)', lineHeight: 1.1, fontSize: 'clamp(2.2rem, 5vw, 4rem)' }}>
            {heading
              ? brand !== 'Todos'
                ? <em style={{ fontStyle: 'italic', color: 'var(--gold)' }}>{heading}</em>
                : heading.startsWith('Perfumes')
                  ? <em style={{ fontStyle: 'italic' }}>{heading}</em>
                  : <>Perfumes <em style={{ fontStyle: 'italic', color: 'var(--gold)' }}>{heading}</em></>
              : <>La <em style={{ fontStyle: 'italic', color: 'var(--gold)' }}>Colección</em></>}
          </h1>
          <p style={{ color: 'var(--gray-light)', fontSize: '.9rem', marginTop: 8, letterSpacing: '.04em' }}>{filtered.length} fragancias</p>
        </div>
      </div>

      <div className="container" style={{ padding: '36px 24px' }}>
        <ShopFilters
          cat={cat}
          type={type}
          sort={sort}
          brand={brand}
          q={q}
          typeCats={typeCats}
          aromaCats={aromaCats}
          allBrands={allBrands}
          activeFilters={activeFilters}
        />

        {filtered.length === 0 ? (
          <ShopEmptyState hasFilters={activeFilters.length > 0 || !!q} />
        ) : (
          <>
            <div className="grid-4">
              {visible.map(p => <ProductCard key={p.id} product={p} />)}
            </div>
            {hasMore && (
              <ShopLoadMore
                shown={visible.length}
                total={filtered.length}
                nextPage={page + 1}
              />
            )}
          </>
        )}
      </div>

      <QuickViewModal />
    </main>
  );
}
