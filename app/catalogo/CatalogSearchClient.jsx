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
 *
 * Decisión de diseño (tras iterar con barra fija y burbuja flotante,
 * ninguna terminó de funcionar bien): buscador simple integrado en el
 * flujo normal de la página, arriba de todo. Sin sticky ni fixed — es
 * el patrón que cualquiera ya conoce de una tienda online, no compite
 * con el navbar ni tapa contenido en ningún momento.
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
      <div className="pubcat-hero no-print">
        <p className="pubcat-eyebrow">Catálogo compartido de ScentualBliss{loadError ? ` · Error: ${loadError}` : ''}</p>
        <div className="pubcat-searchrow">
          <div className="pubcat-search">
            <SearchIcon />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Busca tu fragancia por nombre o marca…"
              aria-label="Buscar perfume por nombre o marca"
            />
            {query && (
              <button type="button" className="pubcat-search-clear" onClick={() => setQuery('')} aria-label="Limpiar búsqueda">
                ×
              </button>
            )}
          </div>
          <DownloadButton count={filtered.length} />
        </div>
        <p className="pubcat-count">
          {filtered.length} {filtered.length === 1 ? 'fragancia' : 'fragancias'}
          {query ? ` para "${query}"` : ' en el catálogo'}
        </p>
      </div>

      {query && filtered.length === 0 ? (
        <p className="pubcat-empty no-print">
          Ningún perfume coincide con &quot;{query}&quot;. Intenta con otro nombre o marca.
        </p>
      ) : (
        <CatalogDocument products={filtered} filterSummary={filterSummary} todayLabel={todayLabel} sort={sort} />
      )}

      <style jsx>{`
        .pubcat-hero {
          margin-bottom: 1.5rem;
          padding: 1.4rem 1.5rem;
          background: #14100c;
          border: 1px solid rgba(192, 154, 90, 0.3);
          border-radius: 16px;
          font-family: var(--font-montserrat), ui-sans-serif, system-ui, sans-serif;
        }
        .pubcat-eyebrow {
          margin: 0 0 1rem;
          font-size: 0.7rem;
          letter-spacing: 0.18em;
          text-transform: uppercase;
          color: #c09a5a;
        }
        .pubcat-searchrow {
          display: flex;
          gap: 0.75rem;
          align-items: stretch;
        }
        .pubcat-search {
          flex: 1;
          min-width: 0;
          display: flex;
          align-items: center;
          gap: 0.65rem;
          padding: 0 1rem;
          background: #fff;
          border-radius: 10px;
        }
        .pubcat-search :global(svg) { flex-shrink: 0; color: #8a6936; }
        .pubcat-search input {
          flex: 1;
          min-width: 0;
          border: none;
          outline: none;
          padding: 0.85rem 0;
          font-size: 0.95rem;
          font-family: inherit;
          color: #1c1611;
          background: transparent;
        }
        .pubcat-search input::placeholder { color: rgba(28, 22, 17, 0.4); }
        .pubcat-search input::-webkit-search-cancel-button { display: none; }
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
        .pubcat-count {
          margin: 0.75rem 0 0;
          font-size: 0.78rem;
          color: rgba(243, 234, 215, 0.55);
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
        @media (max-width: 600px) {
          .pubcat-hero { padding: 1.1rem; }
          .pubcat-searchrow { flex-direction: column; }
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
