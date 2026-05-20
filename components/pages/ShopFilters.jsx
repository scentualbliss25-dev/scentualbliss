'use client';
import { useState, useEffect } from 'react';
import { X, ChevronDown, Search, SlidersHorizontal } from 'lucide-react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';

const sortOptions = [
  { value: 'featured', label: 'Destacados' },
  { value: 'bestseller', label: 'Más Vendidos' },
  { value: 'price-asc', label: 'Precio: Menor a Mayor' },
  { value: 'price-desc', label: 'Precio: Mayor a Menor' },
  { value: 'rating', label: 'Mejor Valorados' },
];

// Pill button para Tipo / Aroma
function PillButton({ active, onClick, children, ariaPressed }) {
  return (
    <button
      onClick={onClick}
      aria-pressed={ariaPressed ?? active}
      style={{
        padding: '8px 16px', fontSize: '.72rem', fontWeight: 500, letterSpacing: '.1em',
        textTransform: 'uppercase',
        border: '1px solid',
        borderColor: active ? 'var(--gold)' : 'rgba(26,22,16,.15)',
        background: active ? 'var(--gold)' : 'transparent',
        color: active ? 'var(--cream-soft)' : 'var(--gray-light)',
        transition: 'all .2s', cursor: 'pointer',
        borderRadius: 0,
        fontFamily: 'var(--font-sans)',
        minHeight: 36,
      }}
    >
      {children}
    </button>
  );
}

export default function ShopFilters({
  cat, type, sort, brand, q,
  typeCats, aromaCats, allBrands, activeFilters,
  totalResults = 0,
}) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const [searchInput, setSearchInput] = useState(q);
  const [sheetOpen, setSheetOpen] = useState(false);

  // Sincronizar input con URL cuando la URL cambia externamente (back/forward)
  useEffect(() => { setSearchInput(q); }, [q]);

  // Debounce de búsqueda: 350 ms tras el último keystroke
  useEffect(() => {
    if (searchInput === q) return;
    const id = setTimeout(() => {
      const params = new URLSearchParams(searchParams.toString());
      if (searchInput.trim()) params.set('q', searchInput.trim());
      else params.delete('q');
      params.delete('page');
      const qs = params.toString();
      router.push(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    }, 350);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchInput]);

  // Bloquear scroll del body cuando el bottom sheet está abierto
  useEffect(() => {
    if (sheetOpen) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => { document.body.style.overflow = prev; };
    }
  }, [sheetOpen]);

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

  const currentSortLabel = sortOptions.find(o => o.value === sort)?.label || 'Destacados';

  // Selectores reutilizables (se renderizan idénticos en desktop inline y en mobile sheet)
  const Selectors = () => (
    <>
      <div role="group" aria-labelledby="filter-type-label" style={{ marginBottom: 16 }}>
        <p id="filter-type-label" style={{ fontSize: '.68rem', letterSpacing: '.28em', textTransform: 'uppercase', color: 'var(--gold-dark)', fontWeight: 600, marginBottom: 10 }}>Tipo</p>
        <div className="shop-filter-row">
          {typeCats.map(t => (
            <PillButton key={t.id} active={type === t.id} onClick={() => updateParam('type', t.id)}>
              {t.label}
            </PillButton>
          ))}
        </div>
      </div>
      <div role="group" aria-labelledby="filter-aroma-label" style={{ marginBottom: 16 }}>
        <p id="filter-aroma-label" style={{ fontSize: '.68rem', letterSpacing: '.28em', textTransform: 'uppercase', color: 'var(--gold-dark)', fontWeight: 600, marginBottom: 10 }}>Familia Olfativa</p>
        <div className="shop-filter-row">
          {aromaCats.map(c => (
            <PillButton key={c.id} active={cat === c.id} onClick={() => updateParam('cat', c.id)}>
              {c.label}
            </PillButton>
          ))}
        </div>
      </div>
      <div>
        <label htmlFor="filter-brand" style={{ display: 'block', fontSize: '.68rem', letterSpacing: '.28em', textTransform: 'uppercase', color: 'var(--gold-dark)', fontWeight: 600, marginBottom: 10 }}>Marca</label>
        <div style={{ position: 'relative', maxWidth: 360 }}>
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
    </>
  );

  const SortSelect = ({ id = 'filter-sort' }) => (
    <div style={{ position: 'relative' }}>
      <label htmlFor={id} className="sr-only">Ordenar por</label>
      <select
        id={id}
        value={sort}
        onChange={e => updateParam('sort', e.target.value)}
        aria-label="Ordenar productos"
        style={{
          width: '100%',
          minHeight: 44,
          padding: '10px 32px 10px 12px',
          background: 'transparent',
          border: '1px solid rgba(26,22,16,.2)',
          color: 'var(--gray-light)', fontSize: '.85rem', letterSpacing: '.06em',
          appearance: 'none', cursor: 'pointer',
          fontFamily: 'var(--font-sans)',
          borderRadius: 0,
        }}
      >
        {sortOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
      <ChevronDown size={14} style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', color: 'var(--gray-light)', pointerEvents: 'none' }} />
    </div>
  );

  return (
    <>
      {/* Search input visible */}
      <div className="shop-search-wrap">
        <Search size={16} aria-hidden="true" className="shop-search-icon" />
        <input
          type="search"
          inputMode="search"
          value={searchInput}
          onChange={e => setSearchInput(e.target.value)}
          placeholder="Buscar por nombre, marca o nota olfativa…"
          aria-label="Buscar fragancias"
          className="shop-search-input"
        />
        {searchInput && (
          <button
            type="button"
            onClick={() => setSearchInput('')}
            aria-label="Borrar búsqueda"
            className="shop-search-clear"
          >
            <X size={14} aria-hidden="true" />
          </button>
        )}
      </div>

      {/* MOBILE: trigger bar — abre bottom sheet */}
      <div className="shop-filters-mobile-trigger">
        <button
          type="button"
          onClick={() => setSheetOpen(true)}
          className="shop-mobile-trigger-btn"
          aria-haspopup="dialog"
          aria-expanded={sheetOpen}
        >
          <SlidersHorizontal size={16} aria-hidden="true" />
          <span>Filtros</span>
          {activeFilters.length > 0 && (
            <span className="shop-mobile-trigger-badge">{activeFilters.length}</span>
          )}
        </button>
        <div className="shop-mobile-trigger-sort">
          <SortSelect id="filter-sort-mobile-bar" />
        </div>
      </div>

      {/* DESKTOP: bloque completo de filtros inline */}
      <div className="shop-filters-desktop" style={{ display: 'flex', gap: 24, alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 28, flexWrap: 'wrap' }}>
        <div style={{ flex: '1 1 auto', minWidth: 0 }}>
          <Selectors />
        </div>
        <div style={{ flexShrink: 0 }}>
          <SortSelect />
        </div>
      </div>

      {/* Filtros activos consolidados (ambos modos) */}
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

      {/* MOBILE bottom sheet */}
      {sheetOpen && (
        <>
          <div
            className="shop-sheet-overlay"
            onClick={() => setSheetOpen(false)}
            aria-hidden="true"
          />
          <div
            className="shop-sheet"
            role="dialog"
            aria-modal="true"
            aria-label="Filtros"
          >
            <div className="shop-sheet-handle" aria-hidden="true" />
            <div className="shop-sheet-header">
              <h2 className="shop-sheet-title">Filtros</h2>
              <button
                type="button"
                onClick={() => setSheetOpen(false)}
                className="shop-sheet-close"
                aria-label="Cerrar filtros"
              >
                <X size={20} aria-hidden="true" />
              </button>
            </div>
            <div className="shop-sheet-body">
              <Selectors />
              <div style={{ marginTop: 24 }}>
                <p style={{ fontSize: '.68rem', letterSpacing: '.28em', textTransform: 'uppercase', color: 'var(--gold-dark)', fontWeight: 600, marginBottom: 10 }}>Orden</p>
                <SortSelect id="filter-sort-mobile-sheet" />
              </div>
            </div>
            <div className="shop-sheet-footer">
              {activeFilters.length > 0 && (
                <button
                  type="button"
                  onClick={() => { clearAll(); setSheetOpen(false); }}
                  className="btn btn-outline"
                  style={{ flex: 1 }}
                >
                  Limpiar
                </button>
              )}
              <button
                type="button"
                onClick={() => setSheetOpen(false)}
                className="btn btn-primary"
                style={{ flex: 2 }}
              >
                Ver {totalResults} {totalResults === 1 ? 'fragancia' : 'fragancias'}
              </button>
            </div>
          </div>
        </>
      )}
    </>
  );
}

export { sortOptions };
