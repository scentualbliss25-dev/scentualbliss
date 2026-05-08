'use client';
import { useState, useMemo } from 'react';
import { SlidersHorizontal, X, ChevronDown, Search } from 'lucide-react';
import { useSearchParams, useRouter } from 'next/navigation';
import { products, productTypes, collections, productTypeLabels, categoryLabels } from '@/lib/products';
import ProductCard from '@/components/ui/ProductCard';
import QuickView from '@/components/ui/QuickView';
import { PageTransition } from '@/components/ui/ScrollAnimations';

// Aromas (familias olfativas) — cat=floral|frutal|fresco|citrico|dulce|amaderado
const aromaCats = [
  { id: 'Todos', label: 'Todos' },
  ...collections.map(c => ({ id: c.id, label: c.name })),
];

// Tipos de producto — type=nicho|disenador|arabe
const typeCats = [
  { id: 'Todos', label: 'Todos' },
  ...productTypes.map(t => ({ id: t.id, label: t.name })),
];

const sortOptions = [
  { value: 'featured', label: 'Destacados' },
  { value: 'bestseller', label: 'Más Vendidos' },
  { value: 'price-asc', label: 'Precio: Menor a Mayor' },
  { value: 'price-desc', label: 'Precio: Mayor a Menor' },
  { value: 'rating', label: 'Mejor Valorados' },
];

export default function ShopPageClient() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [cat, setCat] = useState(searchParams.get('cat') || 'Todos');
  const [type, setType] = useState(searchParams.get('type') || 'Todos');
  const [sort, setSort] = useState(searchParams.get('sort') || 'featured');
  const [priceMax, setPriceMax] = useState(500);
  const [filterOpen, setFilterOpen] = useState(false);
  const [qvProduct, setQvProduct] = useState(null);
  const q = searchParams.get('q') || '';

  const filtered = useMemo(() => {
    let list = [...products];
    if (q) list = list.filter(p =>
      p.name.toLowerCase().includes(q.toLowerCase()) ||
      p.brand.toLowerCase().includes(q.toLowerCase()) ||
      p.description.toLowerCase().includes(q.toLowerCase()) ||
      p.notes.top.toLowerCase().includes(q.toLowerCase()) ||
      p.notes.heart.toLowerCase().includes(q.toLowerCase()) ||
      p.notes.base.toLowerCase().includes(q.toLowerCase())
    );
    if (type !== 'Todos') list = list.filter(p => p.productType === type);
    if (cat !== 'Todos') list = list.filter(p => p.category === cat);
    list = list.filter(p => !p.price || p.price <= priceMax);
    if (sort === 'bestseller') list = list.filter(p => p.bestseller).concat(list.filter(p => !p.bestseller));
    else if (sort === 'price-asc') list.sort((a, b) => a.price - b.price);
    else if (sort === 'price-desc') list.sort((a, b) => b.price - a.price);
    else if (sort === 'rating') list.sort((a, b) => b.rating - a.rating);
    return list;
  }, [cat, type, sort, priceMax, q]);

  const heading = type !== 'Todos'
    ? productTypes.find(t => t.id === type)?.name
    : cat !== 'Todos'
      ? collections.find(c => c.id === cat)?.name
      : null;

  return (
    <PageTransition>
    <main style={{ minHeight: '80vh' }}>
      {/* Shop header */}
      <div style={{ borderBottom: '1px solid rgba(26,22,16,.07)', padding: '52px 0 36px', background: '#F6F3EE' }}>
        <div className="container">
          <p style={{ fontSize: '.62rem', letterSpacing: '.32em', textTransform: 'uppercase', color: 'var(--gold)', marginBottom: 14, fontWeight: 500 }}>ScentualBliss · Tienda</p>
          <h1 style={{ fontFamily: 'var(--font-serif)', fontWeight: 300, color: 'var(--white)', lineHeight: 1.1, fontSize: 'clamp(2.2rem, 5vw, 4rem)' }}>
            {heading
              ? heading.startsWith('Perfumes')
                ? <em style={{ fontStyle: 'italic' }}>{heading}</em>
                : <>Perfumes <em style={{ fontStyle: 'italic', color: 'var(--gold)' }}>{heading}</em></>
              : <>La <em style={{ fontStyle: 'italic', color: 'var(--gold)' }}>Colección</em></>}
          </h1>
          <p style={{ color: 'var(--gray)', fontSize: '.85rem', marginTop: 8, letterSpacing: '.04em' }}>{filtered.length} fragancias</p>
        </div>
      </div>

      <div className="container" style={{ padding: '36px 24px' }}>
        {/* Filters row */}
        <div style={{ display: 'flex', gap: 24, alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 28, flexWrap: 'wrap' }}>
          <div style={{ flex: '1 1 auto' }}>
            {/* Tipo */}
            <div style={{ marginBottom: 16 }}>
              <p style={{ fontSize: '.6rem', letterSpacing: '.28em', textTransform: 'uppercase', color: 'var(--gold)', fontWeight: 500, marginBottom: 10 }}>Tipo</p>
              <div className="shop-filter-row">
                {typeCats.map(t => (
                  <button key={t.id} onClick={() => setType(t.id)} style={{
                    padding: '6px 16px', fontSize: '.72rem', fontWeight: 500, letterSpacing: '.1em',
                    textTransform: 'uppercase',
                    border: '1px solid',
                    borderColor: type === t.id ? 'var(--white)' : 'rgba(26,22,16,.15)',
                    background: type === t.id ? 'var(--white)' : 'transparent',
                    color: type === t.id ? '#F6F3EE' : 'var(--gray)',
                    transition: 'all .2s', cursor: 'pointer',
                    borderRadius: 0,
                    fontFamily: 'var(--font-sans)',
                  }}>{t.label}</button>
                ))}
              </div>
            </div>
            {/* Aroma */}
            <div>
              <p style={{ fontSize: '.6rem', letterSpacing: '.28em', textTransform: 'uppercase', color: 'var(--gold)', fontWeight: 500, marginBottom: 10 }}>Familia Olfativa</p>
              <div className="shop-filter-row">
                {aromaCats.map(c => (
                  <button key={c.id} onClick={() => setCat(c.id)} style={{
                    padding: '6px 16px', fontSize: '.72rem', fontWeight: 500, letterSpacing: '.1em',
                    textTransform: 'uppercase',
                    border: '1px solid',
                    borderColor: cat === c.id ? 'var(--gold)' : 'rgba(26,22,16,.15)',
                    background: cat === c.id ? 'var(--gold)' : 'transparent',
                    color: cat === c.id ? '#F6F3EE' : 'var(--gray)',
                    transition: 'all .2s', cursor: 'pointer',
                    borderRadius: 0,
                    fontFamily: 'var(--font-sans)',
                  }}>{c.label}</button>
                ))}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexShrink: 0 }}>
            <div style={{ position: 'relative' }}>
              <select value={sort} onChange={e => setSort(e.target.value)} style={{
                padding: '9px 32px 9px 12px',
                background: 'transparent',
                border: '1px solid rgba(26,22,16,.2)',
                color: 'var(--gray)', fontSize: '.78rem', letterSpacing: '.06em',
                appearance: 'none', cursor: 'pointer', outline: 'none',
                fontFamily: 'var(--font-sans)',
                borderRadius: 0,
              }}>
                {sortOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
              <ChevronDown size={12} style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', color: 'var(--gray)', pointerEvents: 'none' }} />
            </div>
          </div>
        </div>

        {/* Active search */}
        {q && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 16px', background: 'rgba(184,144,92,.06)', borderLeft: '2px solid var(--gold)', marginBottom: 20 }}>
            <Search size={13} style={{ color: 'var(--gold)', flexShrink: 0 }} />
            <span style={{ fontSize: '.82rem', color: 'var(--gray)', flex: 1 }}>
              Resultados para <strong style={{ color: 'var(--white)' }}>"{q}"</strong>
            </span>
            <button onClick={() => router.push('/tienda')} style={{ color: 'var(--gray)' }}>
              <X size={15} />
            </button>
          </div>
        )}

        {filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '100px 0' }}>
            <p style={{ fontFamily: 'var(--font-serif)', fontSize: '1.5rem', color: 'var(--gray)', fontWeight: 300, marginBottom: 20, fontStyle: 'italic' }}>Sin resultados</p>
            <button onClick={() => { setCat('Todos'); setType('Todos'); setPriceMax(300); }} className="btn btn-outline btn-sm">Limpiar filtros</button>
          </div>
        ) : (
          <div className="grid-4">
            {filtered.map(p => <ProductCard key={p.id} product={p} onQuickView={setQvProduct} />)}
          </div>
        )}
      </div>

      <QuickView product={qvProduct} isOpen={!!qvProduct} onClose={() => setQvProduct(null)} />
    </main>
    </PageTransition>
  );
}
