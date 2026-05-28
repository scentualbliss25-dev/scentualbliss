'use client';
import { useState, useEffect } from 'react';
import { X, SlidersHorizontal, Search, ChevronDown } from 'lucide-react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';

const sortOptions = [
  { value: 'featured',   label: 'Destacados' },
  { value: 'bestseller', label: 'Más Vendidos' },
  { value: 'price-asc',  label: 'Precio: Menor a Mayor' },
  { value: 'price-desc', label: 'Precio: Mayor a Menor' },
  { value: 'rating',     label: 'Mejor Valorados' },
];

const CONC_OPTS = [
  { id: 'EDP',     label: 'Eau de Parfum' },
  { id: 'EDT',     label: 'Eau de Toilette' },
  { id: 'Extrait', label: 'Extrait de Parfum' },
  { id: 'Parfum',  label: 'Parfum' },
  { id: 'Elixir',  label: 'Elixir' },
];

const GENDER_OPTS = [
  { id: 'Masculino', label: 'Masculino' },
  { id: 'Femenino',  label: 'Femenino' },
  { id: 'Unisex',    label: 'Unisex' },
];

function Pill({ active, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      style={{
        padding: '7px 14px',
        fontSize: '.72rem', fontWeight: active ? 700 : 500,
        letterSpacing: '.08em', textTransform: 'uppercase',
        border: '1px solid',
        borderColor: active ? 'var(--gold)' : 'rgba(26,22,16,.2)',
        background: active ? 'var(--gold)' : 'transparent',
        color: active ? '#1A1612' : 'var(--gray-light)',
        transition: 'all .18s', cursor: 'pointer', borderRadius: 4,
        fontFamily: 'var(--font-sans)', minHeight: 36,
        whiteSpace: 'nowrap',
      }}
    >{children}</button>
  );
}

function FilterGroup({ label, children }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <p style={{ fontSize: '.62rem', letterSpacing: '.28em', textTransform: 'uppercase', color: 'var(--gold-dark)', fontWeight: 700, marginBottom: 10 }}>{label}</p>
      {children}
    </div>
  );
}

export default function ShopFilters({
  cat, type, sort, brand, q, momento, clima, gender, conc,
  typeCats, aromaCats, allBrands, momentoCats, climaCats,
  activeFilters, totalResults = 0,
}) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const [searchInput, setSearchInput] = useState(q);
  const [sheetOpen, setSheetOpen] = useState(false);

  useEffect(() => { setSearchInput(q); }, [q]);

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

  useEffect(() => {
    if (sheetOpen) {
      document.body.style.overflow = 'hidden';
      return () => { document.body.style.overflow = ''; };
    }
  }, [sheetOpen]);

  // Multi-select: agrega o quita un valor del param comma-separated
  const toggleMulti = (key, value) => {
    const params = new URLSearchParams(searchParams.toString());
    const current = params.get(key) || '';
    const values = current.split(',').filter(Boolean);
    const idx = values.indexOf(value);
    if (idx >= 0) values.splice(idx, 1);
    else values.push(value);
    if (values.length === 0) params.delete(key);
    else params.set(key, values.join(','));
    params.delete('page');
    const qs = params.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  };

  const isActive = (key, value) => {
    const raw = searchParams.get(key) || '';
    return raw.split(',').includes(value);
  };

  const updateSort = (value) => {
    const params = new URLSearchParams(searchParams.toString());
    if (!value || value === 'featured') params.delete('sort');
    else params.set('sort', value);
    params.delete('page');
    const qs = params.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  };

  const clearAll = () => router.push(pathname, { scroll: false });

  const SortSelect = ({ id = 'filter-sort' }) => (
    <div style={{ position: 'relative' }}>
      <label htmlFor={id} className="sr-only">Ordenar por</label>
      <select
        id={id}
        value={sort}
        onChange={e => updateSort(e.target.value)}
        aria-label="Ordenar productos"
        style={{
          width: '100%', minHeight: 44,
          padding: '10px 32px 10px 12px',
          background: 'transparent',
          border: '1px solid rgba(26,22,16,.2)',
          color: 'var(--gray-light)', fontSize: '.85rem', letterSpacing: '.06em',
          appearance: 'none', cursor: 'pointer',
          fontFamily: 'var(--font-sans)', borderRadius: 4,
        }}
      >
        {sortOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
      <ChevronDown size={14} style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', color: 'var(--gray-light)', pointerEvents: 'none' }} />
    </div>
  );

  const Selectors = () => (
    <>
      <FilterGroup label="Tipo de Perfume">
        <div className="shop-filter-row">
          {(typeCats || []).filter(t => t.id !== 'Todos').map(t => (
            <Pill key={t.id} active={isActive('type', t.id)} onClick={() => toggleMulti('type', t.id)}>{t.label}</Pill>
          ))}
        </div>
      </FilterGroup>

      <FilterGroup label="Concentración">
        <div className="shop-filter-row">
          {CONC_OPTS.map(c => (
            <Pill key={c.id} active={isActive('conc', c.id)} onClick={() => toggleMulti('conc', c.id)}>{c.label}</Pill>
          ))}
        </div>
      </FilterGroup>

      <FilterGroup label="Familia Olfativa">
        <div className="shop-filter-row">
          {(aromaCats || []).filter(c => c.id !== 'Todos').map(c => (
            <Pill key={c.id} active={isActive('cat', c.id)} onClick={() => toggleMulti('cat', c.id)}>{c.label}</Pill>
          ))}
        </div>
      </FilterGroup>

      <FilterGroup label="Género">
        <div className="shop-filter-row">
          {GENDER_OPTS.map(g => (
            <Pill key={g.id} active={isActive('gender', g.id)} onClick={() => toggleMulti('gender', g.id)}>{g.label}</Pill>
          ))}
        </div>
      </FilterGroup>

      <FilterGroup label="Momento del Día">
        <div className="shop-filter-row">
          {(momentoCats || []).filter(m => m.id !== 'Todos').map(m => (
            <Pill key={m.id} active={isActive('momento', m.id)} onClick={() => toggleMulti('momento', m.id)}>
              {m.icon ? `${m.icon} ` : ''}{m.label}
            </Pill>
          ))}
        </div>
      </FilterGroup>

      <FilterGroup label="Clima">
        <div className="shop-filter-row">
          {(climaCats || []).filter(c => c.id !== 'Todos').map(c => (
            <Pill key={c.id} active={isActive('clima', c.id)} onClick={() => toggleMulti('clima', c.id)}>
              {c.icon ? `${c.icon} ` : ''}{c.label}
            </Pill>
          ))}
        </div>
      </FilterGroup>

      <FilterGroup label="Marca">
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, maxHeight: 180, overflowY: 'auto', paddingRight: 4 }}>
          {(allBrands || []).map(b => (
            <Pill key={b} active={isActive('brand', b)} onClick={() => toggleMulti('brand', b)}>{b}</Pill>
          ))}
        </div>
      </FilterGroup>

      <FilterGroup label="Ordenar por">
        <SortSelect id="filter-sort-sheet" />
      </FilterGroup>
    </>
  );

  return (
    <>
      {/* Barra superior: búsqueda + botón filtros + sort */}
      <div className="shop-topbar">
        <div className="shop-search-wrap" style={{ marginBottom: 0, flex: '1 1 auto', minWidth: 0, maxWidth: 'none' }}>
          <Search size={16} aria-hidden="true" className="shop-search-icon" />
          <input
            type="search"
            inputMode="search"
            value={searchInput}
            onChange={e => setSearchInput(e.target.value)}
            placeholder="Buscar por nombre, marca o nota…"
            aria-label="Buscar fragancias"
            className="shop-search-input"
          />
          {searchInput && (
            <button type="button" onClick={() => setSearchInput('')} aria-label="Borrar búsqueda" className="shop-search-clear">
              <X size={14} aria-hidden="true" />
            </button>
          )}
        </div>

        <button
          type="button"
          className="shop-filter-btn"
          onClick={() => setSheetOpen(true)}
          aria-haspopup="dialog"
          aria-expanded={sheetOpen}
        >
          <SlidersHorizontal size={15} aria-hidden="true" />
          <span>Filtros</span>
          {activeFilters.length > 0 && (
            <span className="shop-filter-badge">{activeFilters.length}</span>
          )}
        </button>

        <div className="shop-sort-desktop">
          <SortSelect />
        </div>
      </div>

      {/* Chips de filtros activos */}
      {activeFilters.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8, marginBottom: 20 }}>
          <span style={{ fontSize: '.68rem', letterSpacing: '.2em', textTransform: 'uppercase', color: 'var(--gold-dark)', fontWeight: 700, marginRight: 4 }}>
            Activos
          </span>
          {activeFilters.map(f => (
            <button
              key={`${f.key}-${f.value}`}
              onClick={() => toggleMulti(f.key, f.value)}
              aria-label={`Quitar ${f.label}`}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                padding: '5px 10px 5px 12px', minHeight: 30,
                fontSize: '.74rem', letterSpacing: '.04em',
                background: 'rgba(184,144,92,.12)',
                color: 'var(--gold-dark)',
                border: '1px solid rgba(184,144,92,.4)',
                borderRadius: 4, cursor: 'pointer',
                fontFamily: 'var(--font-sans)', fontWeight: 600,
              }}
            >
              {f.label}
              <X size={12} aria-hidden="true" />
            </button>
          ))}
          {activeFilters.length >= 2 && (
            <button
              onClick={clearAll}
              style={{
                padding: '5px 10px', minHeight: 30,
                fontSize: '.68rem', letterSpacing: '.12em', textTransform: 'uppercase',
                background: 'transparent', color: 'var(--gray-light)',
                border: 'none', cursor: 'pointer',
                fontFamily: 'var(--font-sans)', fontWeight: 600,
                textDecoration: 'underline', textUnderlineOffset: 3,
              }}
            >
              Limpiar todo
            </button>
          )}
        </div>
      )}

      {/* Panel de filtros (bottom-sheet en mobile, side-panel en desktop) */}
      {sheetOpen && (
        <>
          <div className="shop-sheet-overlay" onClick={() => setSheetOpen(false)} aria-hidden="true" />
          <div className="shop-sheet" role="dialog" aria-modal="true" aria-label="Filtros">
            <div className="shop-sheet-handle" aria-hidden="true" />
            <div className="shop-sheet-header">
              <h2 className="shop-sheet-title">Filtros</h2>
              <button type="button" onClick={() => setSheetOpen(false)} className="shop-sheet-close" aria-label="Cerrar filtros">
                <X size={20} aria-hidden="true" />
              </button>
            </div>
            <div className="shop-sheet-body">
              <Selectors />
            </div>
            <div className="shop-sheet-footer">
              {activeFilters.length > 0 && (
                <button type="button" onClick={() => { clearAll(); setSheetOpen(false); }} className="btn btn-outline" style={{ flex: 1 }}>
                  Limpiar
                </button>
              )}
              <button type="button" onClick={() => setSheetOpen(false)} className="btn btn-primary" style={{ flex: 2 }}>
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
