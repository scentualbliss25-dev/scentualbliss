'use client';

import { useMemo, useState } from 'react';
import CatalogDocument from '../admin/catalog/CatalogDocument';
import DownloadButton from './DownloadButton';

function stripAccents(s) {
  return String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '');
}
function norm(s) {
  return stripAccents(s).toLowerCase().trim();
}

/**
 * Envuelve el documento del catálogo con un buscador en vivo (nombre o
 * marca, sin recargar la página). Filtra sobre la lista que YA vino
 * filtrada por el servidor (los query params del enlace compartido) —
 * la búsqueda solo acota más, no reemplaza esos filtros.
 */
export default function CatalogSearchClient({ products, filterSummary, todayLabel, sort, loadError }) {
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const q = norm(query);
    if (!q) return products;
    return products.filter((p) => norm(p.name).includes(q) || norm(p.brand).includes(q));
  }, [products, query]);

  return (
    <>
      <div className="pubcat-bar no-print">
        <p>Catálogo compartido de ScentualBliss{loadError ? ` · Error: ${loadError}` : ''}</p>
        <DownloadButton count={filtered.length} />
      </div>

      <div className="pubcat-search no-print">
        <SearchIcon />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Busca por nombre o marca… (ej. Sauvage, Lattafa)"
          aria-label="Buscar perfume por nombre o marca"
        />
        {query && (
          <button type="button" className="pubcat-search-clear" onClick={() => setQuery('')} aria-label="Limpiar búsqueda">
            ×
          </button>
        )}
        <span className="pubcat-search-count">
          {filtered.length} {filtered.length === 1 ? 'resultado' : 'resultados'}
        </span>
      </div>

      {query && filtered.length === 0 ? (
        <p className="pubcat-empty no-print">
          Ningún perfume coincide con &quot;{query}&quot;. Intenta con otro nombre o marca.
        </p>
      ) : (
        <CatalogDocument products={filtered} filterSummary={filterSummary} todayLabel={todayLabel} sort={sort} />
      )}

      <style jsx>{`
        .pubcat-search {
          position: sticky;
          /* Justo debajo del navbar del sitio (sticky, --nav-h), para que
             no quede tapado por él ni le compita el sticky. */
          top: calc(var(--nav-h, 72px) + 0.6rem);
          z-index: 20;
          display: flex;
          align-items: center;
          gap: 0.65rem;
          margin-bottom: 1.25rem;
          padding: 0.75rem 1rem;
          background: #fff;
          border: 1px solid rgba(192, 154, 90, 0.35);
          border-radius: 12px;
          box-shadow: 0 12px 30px -16px rgba(28, 22, 17, 0.25);
          font-family: var(--font-montserrat), ui-sans-serif, system-ui, sans-serif;
        }
        .pubcat-search :global(svg) {
          flex-shrink: 0;
          color: #8a6936;
        }
        .pubcat-search input {
          flex: 1;
          min-width: 0;
          border: none;
          outline: none;
          font-size: 0.92rem;
          font-family: inherit;
          color: #1c1611;
          background: transparent;
        }
        .pubcat-search input::placeholder { color: rgba(28, 22, 17, 0.4); }
        .pubcat-search-clear {
          flex-shrink: 0;
          width: 22px;
          height: 22px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border: none;
          border-radius: 50%;
          background: rgba(28, 22, 17, 0.08);
          color: #1c1611;
          font-size: 1rem;
          line-height: 1;
          cursor: pointer;
        }
        .pubcat-search-clear:hover { background: rgba(28, 22, 17, 0.15); }
        .pubcat-search-count {
          flex-shrink: 0;
          font-size: 0.74rem;
          letter-spacing: 0.04em;
          color: rgba(28, 22, 17, 0.45);
          white-space: nowrap;
          border-left: 1px solid rgba(28, 22, 17, 0.1);
          padding-left: 0.65rem;
        }
        .pubcat-empty {
          padding: 3rem 1rem;
          text-align: center;
          background: #fff;
          border: 1px solid rgba(28, 22, 17, 0.08);
          border-radius: 12px;
          color: rgba(28, 22, 17, 0.55);
          font-size: 0.9rem;
        }
        @media (max-width: 480px) {
          .pubcat-search { flex-wrap: wrap; top: calc(var(--nav-h, 72px) + 0.4rem); }
          .pubcat-search-count { border-left: none; padding-left: 0; width: 100%; }
        }
      `}</style>
    </>
  );
}

function SearchIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
         strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <circle cx="11" cy="11" r="7" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  );
}
