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
 * La barra queda `position: fixed` (no sticky): el navbar del sitio
 * declara sticky pero un overflow-x:hidden preexistente en <body> lo
 * rompe en la práctica, así que no podemos apoyarnos en "quedar debajo
 * de un sticky que funciona". Fixed + spacer propio es más confiable.
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
      {/* Reserva el espacio de la barra fija para que el contenido de
          abajo no arranque tapado por ella. */}
      <div className="pubcat-bar-spacer no-print" aria-hidden />

      <div className="pubcat-bar no-print">
        <div className="pubcat-search">
          <SearchIcon />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Busca por nombre o marca…"
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
        <DownloadButton count={filtered.length} />
      </div>

      {loadError && <p className="pubcat-error no-print">Error: {loadError}</p>}

      {query && filtered.length === 0 ? (
        <p className="pubcat-empty no-print">
          Ningún perfume coincide con &quot;{query}&quot;. Intenta con otro nombre o marca.
        </p>
      ) : (
        <CatalogDocument products={filtered} filterSummary={filterSummary} todayLabel={todayLabel} sort={sort} />
      )}

      <style jsx>{`
        /* Altura total reservada por la barra fija (para el spacer). */
        .pubcat-bar-spacer { height: calc(64px + var(--nav-h, 72px) + var(--announce-h, 40px) + 1.5rem); }

        .pubcat-bar {
          position: fixed;
          /* En scroll=0 el navbar + la barra de anuncios todavía están ahí
             (en flujo normal, no sticky) con z-index más alto — si la
             barra quedara más arriba que eso quedaría tapada. Se ubica
             debajo de ambos usando las mismas variables que definen sus
             alturas en globals.css. */
          top: calc(var(--nav-h, 72px) + var(--announce-h, 40px) + 0.6rem);
          left: 50%;
          transform: translateX(-50%);
          width: calc(100% - 2.5rem);
          max-width: calc(1280px - 2.5rem);
          box-sizing: border-box;
          z-index: 40;
          display: flex;
          align-items: center;
          flex-wrap: wrap;
          gap: 0.6rem;
          padding: 0.6rem;
          background: #fff;
          border: 1px solid rgba(192, 154, 90, 0.35);
          border-radius: 12px;
          box-shadow: 0 12px 30px -16px rgba(28, 22, 17, 0.35);
          font-family: var(--font-montserrat), ui-sans-serif, system-ui, sans-serif;
        }
        .pubcat-search {
          flex: 1 1 260px;
          display: flex;
          align-items: center;
          gap: 0.55rem;
          min-width: 0;
          padding: 0 0.5rem;
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
          font-size: 0.9rem;
          font-family: inherit;
          color: #1c1611;
          background: transparent;
        }
        .pubcat-search input::placeholder { color: rgba(28, 22, 17, 0.4); }
        /* Oculta el botón nativo de "limpiar" de type=search — usamos
           el nuestro (mismo estilo en todos los navegadores). */
        .pubcat-search input::-webkit-search-cancel-button { display: none; }
        .pubcat-search-clear {
          flex-shrink: 0;
          width: 20px;
          height: 20px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border: none;
          border-radius: 50%;
          background: rgba(28, 22, 17, 0.08);
          color: #1c1611;
          font-size: 0.95rem;
          line-height: 1;
          cursor: pointer;
        }
        .pubcat-search-clear:hover { background: rgba(28, 22, 17, 0.15); }
        .pubcat-search-count {
          flex-shrink: 0;
          font-size: 0.72rem;
          letter-spacing: 0.04em;
          color: rgba(28, 22, 17, 0.45);
          white-space: nowrap;
          border-left: 1px solid rgba(28, 22, 17, 0.1);
          padding-left: 0.6rem;
        }
        .pubcat-error {
          margin: 0 0 1rem;
          padding: 0.7rem 1rem;
          background: rgba(170, 50, 50, 0.08);
          border: 1px solid rgba(170, 50, 50, 0.25);
          border-radius: 10px;
          font-size: 0.82rem;
          color: #7a2424;
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
        @media (max-width: 560px) {
          .pubcat-bar { padding: 0.5rem; }
          .pubcat-search { flex-basis: 100%; padding: 0 0.35rem; }
          .pubcat-search-count { display: none; }
          .pubcat-bar :global(.pubcat-download) { flex: 1; }
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
