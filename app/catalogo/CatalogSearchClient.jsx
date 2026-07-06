'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
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
 * UX: NO es una barra fija arriba (tapaba contenido al scrollear). Es
 * una burbuja flotante (como la de WhatsApp, en la esquina opuesta)
 * que se abre/cierra bajo demanda — no ocupa espacio ni estorba
 * mientras no se usa.
 */
export default function CatalogSearchClient({ products, filterSummary, todayLabel, sort, loadError }) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const inputRef = useRef(null);

  const filtered = useMemo(() => {
    const q = norm(query);
    if (!q) return products;
    return products.filter((p) => norm(p.name).includes(q) || norm(p.brand).includes(q));
  }, [products, query]);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  function onClose() {
    setOpen(false);
  }

  return (
    <>
      <div className="pubcat-bar no-print">
        <p>Catálogo compartido de ScentualBliss{loadError ? ` · Error: ${loadError}` : ''}</p>
        <DownloadButton count={filtered.length} />
      </div>

      {query && filtered.length === 0 ? (
        <p className="pubcat-empty no-print">
          Ningún perfume coincide con &quot;{query}&quot;. Intenta con otro nombre o marca.
        </p>
      ) : (
        <CatalogDocument products={filtered} filterSummary={filterSummary} todayLabel={todayLabel} sort={sort} />
      )}

      {/* ── Burbuja flotante de búsqueda (esquina opuesta al bubble de WhatsApp) ── */}
      <div className="pubcat-fab-wrap no-print">
        {open && (
          <div className="pubcat-fab-panel">
            <div className="pubcat-fab-row">
              <SearchIcon />
              <input
                ref={inputRef}
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Busca por nombre o marca…"
                aria-label="Buscar perfume por nombre o marca"
                onKeyDown={(e) => { if (e.key === 'Escape') onClose(); }}
              />
            </div>
            <div className="pubcat-fab-foot">
              <span>{filtered.length} {filtered.length === 1 ? 'resultado' : 'resultados'}</span>
              {query && (
                <button type="button" onClick={() => setQuery('')}>Limpiar</button>
              )}
            </div>
          </div>
        )}

        <button
          type="button"
          className={`pubcat-fab ${open ? 'is-open' : ''}`}
          onClick={() => setOpen((v) => !v)}
          aria-label={open ? 'Cerrar buscador' : 'Buscar en el catálogo'}
          aria-expanded={open}
        >
          {open ? <CloseIcon /> : <SearchIcon />}
          {!open && query && <span className="pubcat-fab-dot" aria-hidden />}
        </button>
      </div>

      <style jsx>{`
        .pubcat-bar {
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 1rem;
          margin-bottom: 1.25rem;
          padding: 0.9rem 1.1rem;
          background: #fff;
          border: 1px solid rgba(28, 22, 17, 0.08);
          border-radius: 12px;
          font-family: var(--font-montserrat), ui-sans-serif, system-ui, sans-serif;
        }
        .pubcat-bar p {
          margin: 0;
          font-size: 0.85rem;
          color: rgba(28, 22, 17, 0.6);
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

        /* Burbuja — misma esquina/escala que el bubble de WhatsApp (que
           vive en left:24px, bottom:24px, z-index:250), reflejada en la
           derecha para no chocar con él. */
        .pubcat-fab-wrap {
          position: fixed;
          right: 24px;
          bottom: 24px;
          z-index: 240;
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          gap: 0.75rem;
          font-family: var(--font-montserrat), ui-sans-serif, system-ui, sans-serif;
        }
        .pubcat-fab {
          width: 56px;
          height: 56px;
          border-radius: 50%;
          border: none;
          display: flex;
          align-items: center;
          justify-content: center;
          background: linear-gradient(135deg, #c09a5a, #8a6936);
          color: #1c1611;
          cursor: pointer;
          box-shadow: 0 10px 28px -8px rgba(28, 22, 17, 0.45);
          transition: transform 0.18s, box-shadow 0.18s;
          position: relative;
        }
        .pubcat-fab:hover { transform: scale(1.06); box-shadow: 0 14px 32px -8px rgba(28, 22, 17, 0.55); }
        .pubcat-fab.is-open { background: #1c1611; color: #f3ead7; }
        .pubcat-fab-dot {
          position: absolute;
          top: 4px;
          right: 4px;
          width: 10px;
          height: 10px;
          border-radius: 50%;
          background: #aa3232;
          border: 2px solid #fff;
        }

        .pubcat-fab-panel {
          width: min(320px, calc(100vw - 48px));
          background: #fff;
          border: 1px solid rgba(192, 154, 90, 0.4);
          border-radius: 14px;
          box-shadow: 0 20px 45px -16px rgba(28, 22, 17, 0.4);
          padding: 0.9rem;
          animation: pubcat-fab-in 0.16s ease-out;
        }
        @keyframes pubcat-fab-in {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .pubcat-fab-row {
          display: flex;
          align-items: center;
          gap: 0.6rem;
          padding-bottom: 0.6rem;
          border-bottom: 1px solid rgba(28, 22, 17, 0.08);
        }
        .pubcat-fab-row :global(svg) { flex-shrink: 0; color: #8a6936; }
        .pubcat-fab-row input {
          flex: 1;
          min-width: 0;
          border: none;
          outline: none;
          font-size: 0.92rem;
          font-family: inherit;
          color: #1c1611;
          background: transparent;
        }
        .pubcat-fab-row input::placeholder { color: rgba(28, 22, 17, 0.4); }
        .pubcat-fab-row input::-webkit-search-cancel-button { display: none; }
        .pubcat-fab-foot {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding-top: 0.55rem;
          font-size: 0.76rem;
          color: rgba(28, 22, 17, 0.5);
        }
        .pubcat-fab-foot button {
          border: none;
          background: none;
          color: #8a6936;
          font-family: inherit;
          font-size: 0.76rem;
          font-weight: 600;
          cursor: pointer;
          padding: 0;
        }
        .pubcat-fab-foot button:hover { color: #5d4724; text-decoration: underline; }

        @media (max-width: 480px) {
          .pubcat-fab-wrap { right: 16px; bottom: 16px; }
          .pubcat-fab { width: 50px; height: 50px; }
        }
      `}</style>
    </>
  );
}

function SearchIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor"
         strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <circle cx="11" cy="11" r="7" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor"
         strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}
