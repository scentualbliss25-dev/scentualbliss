'use client';
import { X, ChevronDown, Search } from 'lucide-react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';

const sortOptions = [
  { value: 'featured', label: 'Destacados' },
  { value: 'bestseller', label: 'Más Vendidos' },
  { value: 'price-asc', label: 'Precio: Menor a Mayor' },
  { value: 'price-desc', label: 'Precio: Mayor a Menor' },
  { value: 'rating', label: 'Mejor Valorados' },
];

export default function ShopFilters({
  cat, type, sort, brand, q,
  typeCats, aromaCats, allBrands, activeFilters,
}) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  // Cualquier cambio de filtro/orden resetea la paginación
  const updateParam = (key, value) => {
    const params = new URLSearchParams(searchParams.toString());
    if (!value || value === 'Todos' || (key === 'sort' && value === 'featured')) {
      params.delete(key);
    } else {
      params.set(key, value);
    }
    params.delete('page');
    const qs = params.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  };

  const clearAll = () => router.push(pathname, { scroll: false });
  const clearSearch = () => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete('q');
    params.delete('page');
    const qs = params.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  };

  return (
    <>
      {/* Filters row */}
      <div style={{ display: 'flex', gap: 24, alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 28, flexWrap: 'wrap' }}>
        <div style={{ flex: '1 1 auto' }}>
          {/* Tipo */}
          <div role="group" aria-labelledby="filter-type-label" style={{ marginBottom: 16 }}>
            <p id="filter-type-label" style={{ fontSize: '.68rem', letterSpacing: '.28em', textTransform: 'uppercase', color: 'var(--gold-dark)', fontWeight: 600, marginBottom: 10 }}>Tipo</p>
            <div className="shop-filter-row">
              {typeCats.map(t => (
                <button
                  key={t.id}
                  onClick={() => updateParam('type', t.id)}
                  aria-pressed={type === t.id}
                  style={{
                    padding: '8px 16px', fontSize: '.72rem', fontWeight: 500, letterSpacing: '.1em',
                    textTransform: 'uppercase',
                    border: '1px solid',
                    borderColor: type === t.id ? 'var(--gold)' : 'rgba(26,22,16,.15)',
                    background: type === t.id ? 'var(--gold)' : 'transparent',
                    color: type === t.id ? '#F6F3EE' : 'var(--gray-light)',
                    transition: 'all .2s', cursor: 'pointer',
                    borderRadius: 0,
                    fontFamily: 'var(--font-sans)',
                    minHeight: 36,
                  }}>{t.label}</button>
              ))}
            </div>
          </div>
          {/* Aroma */}
          <div role="group" aria-labelledby="filter-aroma-label" style={{ marginBottom: 16 }}>
            <p id="filter-aroma-label" style={{ fontSize: '.68rem', letterSpacing: '.28em', textTransform: 'uppercase', color: 'var(--gold-dark)', fontWeight: 600, marginBottom: 10 }}>Familia Olfativa</p>
            <div className="shop-filter-row">
              {aromaCats.map(c => (
                <button
                  key={c.id}
                  onClick={() => updateParam('cat', c.id)}
                  aria-pressed={cat === c.id}
                  style={{
                    padding: '8px 16px', fontSize: '.72rem', fontWeight: 500, letterSpacing: '.1em',
                    textTransform: 'uppercase',
                    border: '1px solid',
                    borderColor: cat === c.id ? 'var(--gold)' : 'rgba(26,22,16,.15)',
                    background: cat === c.id ? 'var(--gold)' : 'transparent',
                    color: cat === c.id ? '#F6F3EE' : 'var(--gray-light)',
                    transition: 'all .2s', cursor: 'pointer',
                    borderRadius: 0,
                    fontFamily: 'var(--font-sans)',
                    minHeight: 36,
                  }}>{c.label}</button>
              ))}
            </div>
          </div>
          {/* Marca */}
          <div>
            <label htmlFor="filter-brand" style={{ display: 'block', fontSize: '.68rem', letterSpacing: '.28em', textTransform: 'uppercase', color: 'var(--gold-dark)', fontWeight: 600, marginBottom: 10 }}>Marca</label>
            <div style={{ position: 'relative', maxWidth: 280 }}>
              <select
                id="filter-brand"
                value={brand}
                onChange={e => updateParam('brand', e.target.value)}
                style={{
                  width: '100%',
                  minHeight: 44,
                  padding: '10px 32px 10px 12px',
                  background: brand !== 'Todos' ? 'rgba(184,144,92,.08)' : 'transparent',
                  border: '1px solid',
                  borderColor: brand !== 'Todos' ? 'var(--gold)' : 'rgba(26,22,16,.15)',
                  color: brand !== 'Todos' ? 'var(--gold-dark)' : 'var(--gray-light)',
                  fontSize: '.85rem', letterSpacing: '.06em',
                  appearance: 'none', cursor: 'pointer',
                  fontFamily: 'var(--font-sans)',
                  borderRadius: 0,
                  fontWeight: brand !== 'Todos' ? 600 : 400,
                }}
              >
                <option value="Todos">Todas las marcas</option>
                {allBrands.map(b => (
                  <option key={b} value={b}>{b}</option>
                ))}
              </select>
              <ChevronDown size={14} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--gold-dark)', pointerEvents: 'none' }} />
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexShrink: 0 }}>
          <div style={{ position: 'relative' }}>
            <label htmlFor="filter-sort" className="sr-only">Ordenar por</label>
            <select
              id="filter-sort"
              value={sort}
              onChange={e => updateParam('sort', e.target.value)}
              aria-label="Ordenar productos"
              style={{
                minHeight: 44,
                padding: '10px 32px 10px 12px',
                background: 'transparent',
                border: '1px solid rgba(26,22,16,.2)',
                color: 'var(--gray-light)', fontSize: '.85rem', letterSpacing: '.06em',
                appearance: 'none', cursor: 'pointer',
                fontFamily: 'var(--font-sans)',
                borderRadius: 0,
              }}>
              {sortOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
            <ChevronDown size={14} style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', color: 'var(--gray-light)', pointerEvents: 'none' }} />
          </div>
        </div>
      </div>

      {/* Active search */}
      {q && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 16px', background: 'rgba(184,144,92,.06)', borderLeft: '2px solid var(--gold-dark)', marginBottom: 20 }}>
          <Search size={14} style={{ color: 'var(--gold-dark)', flexShrink: 0 }} aria-hidden="true" />
          <span style={{ fontSize: '.85rem', color: 'var(--gray-light)', flex: 1 }}>
            Resultados para <strong style={{ color: 'var(--white)' }}>"{q}"</strong>
          </span>
          <button
            onClick={clearSearch}
            aria-label="Limpiar búsqueda"
            style={{
              width: 44, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'var(--gray-light)', background: 'transparent', border: 'none', cursor: 'pointer',
            }}
          >
            <X size={16} aria-hidden="true" />
          </button>
        </div>
      )}

      {/* Filtros activos consolidados */}
      {activeFilters.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8, marginBottom: 20 }}>
          <span style={{ fontSize: '.7rem', letterSpacing: '.2em', textTransform: 'uppercase', color: 'var(--gold-dark)', fontWeight: 600, marginRight: 4 }}>
            Filtros
          </span>
          {activeFilters.map(f => (
            <button
              key={f.key}
              onClick={() => updateParam(f.key, 'Todos')}
              aria-label={`Quitar filtro ${f.label}`}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                padding: '6px 10px 6px 12px', minHeight: 32,
                fontSize: '.75rem', letterSpacing: '.04em',
                background: 'rgba(184,144,92,.1)',
                color: 'var(--gold-dark)',
                border: '1px solid rgba(184,144,92,.35)',
                borderRadius: 2, cursor: 'pointer',
                fontFamily: 'var(--font-sans)', fontWeight: 500,
              }}
            >
              {f.label}
              <X size={13} aria-hidden="true" />
            </button>
          ))}
          {activeFilters.length >= 2 && (
            <button
              onClick={clearAll}
              style={{
                padding: '6px 10px', minHeight: 32,
                fontSize: '.7rem', letterSpacing: '.12em', textTransform: 'uppercase',
                background: 'transparent', color: 'var(--gray-light)',
                border: '1px solid transparent', borderRadius: 2, cursor: 'pointer',
                fontFamily: 'var(--font-sans)', fontWeight: 600,
                textDecoration: 'underline', textUnderlineOffset: 3,
              }}
            >
              Limpiar todo
            </button>
          )}
        </div>
      )}
    </>
  );
}

export { sortOptions };
