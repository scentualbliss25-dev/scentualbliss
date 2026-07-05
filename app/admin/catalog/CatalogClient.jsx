'use client';

import { useMemo, useState } from 'react';
import { formatCOP } from '@/lib/format';
import { productTypeLabels } from '@/lib/products-constants';

/**
 * Catálogo descargable para clientes.
 *
 * Pantalla: toolbar de filtros (tipo, sexo, rango de precio, marcas) +
 * vista previa en vivo del documento.
 *
 * Descarga: window.print() con CSS @media print — el navegador genera el
 * PDF (Guardar como PDF). El documento usa <table> con <thead> para que
 * el encabezado de marca (logo + nombre) se repita en TODAS las páginas.
 */

const TYPE_OPTIONS = [
  ['', 'Todos los tipos'],
  ['arabe', 'Árabes'],
  ['disenador', 'Diseñador'],
  ['nicho', 'Nicho'],
];

const GENDER_OPTIONS = [
  ['', 'Todos'],
  ['Hombre', 'Hombre'],
  ['Mujer', 'Mujer'],
  ['Unisex', 'Unisex'],
];

const SORT_OPTIONS = [
  ['brand', 'Marca (A–Z)'],
  ['price-asc', 'Precio: menor a mayor'],
  ['price-desc', 'Precio: mayor a menor'],
  ['name', 'Nombre (A–Z)'],
];

export default function CatalogClient({ products = [], loadError = null }) {
  const [type, setType] = useState('');
  const [gender, setGender] = useState('');
  const [priceMin, setPriceMin] = useState('');
  const [priceMax, setPriceMax] = useState('');
  const [brandSel, setBrandSel] = useState(() => new Set());
  const [includeNoPrice, setIncludeNoPrice] = useState(false);
  const [sort, setSort] = useState('brand');

  const brands = useMemo(
    () => [...new Set(products.map((p) => p.brand).filter(Boolean))].sort((a, b) => a.localeCompare(b)),
    [products],
  );

  const filtered = useMemo(() => {
    const min = priceMin === '' ? null : Number(priceMin);
    const max = priceMax === '' ? null : Number(priceMax);
    const list = products.filter((p) => {
      if (type && p.productType !== type) return false;
      if (gender && p.gender !== gender) return false;
      if (brandSel.size > 0 && !brandSel.has(p.brand)) return false;
      if (p.fromPrice <= 0) return includeNoPrice;
      if (min != null && Number.isFinite(min) && p.fromPrice < min) return false;
      if (max != null && Number.isFinite(max) && p.fromPrice > max) return false;
      return true;
    });
    list.sort((a, b) => {
      if (sort === 'price-asc') return (a.fromPrice || Infinity) - (b.fromPrice || Infinity);
      if (sort === 'price-desc') return (b.fromPrice || 0) - (a.fromPrice || 0);
      if (sort === 'name') return a.name.localeCompare(b.name);
      return (a.brand || '').localeCompare(b.brand || '') || a.name.localeCompare(b.name);
    });
    return list;
  }, [products, type, gender, priceMin, priceMax, brandSel, includeNoPrice, sort]);

  function toggleBrand(b) {
    setBrandSel((prev) => {
      const next = new Set(prev);
      next.has(b) ? next.delete(b) : next.add(b);
      return next;
    });
  }

  function onDownload() {
    const prev = document.title;
    document.title = `Catalogo-ScentualBliss-${new Date().toISOString().slice(0, 10)}`;
    window.print();
    document.title = prev;
  }

  // Resumen de filtros activos para la portada del documento.
  const filterSummary = [];
  if (type) filterSummary.push(`Perfumes ${TYPE_OPTIONS.find(([v]) => v === type)?.[1] || type}`);
  if (gender) filterSummary.push(gender);
  if (brandSel.size > 0) filterSummary.push([...brandSel].join(' · '));
  if (priceMin !== '' || priceMax !== '') {
    const minTxt = priceMin !== '' ? formatCOP(Number(priceMin)) : '';
    const maxTxt = priceMax !== '' ? formatCOP(Number(priceMax)) : '';
    filterSummary.push(minTxt && maxTxt ? `${minTxt} – ${maxTxt}` : minTxt ? `Desde ${minTxt}` : `Hasta ${maxTxt}`);
  }

  const today = new Date().toLocaleDateString('es-CO', { day: 'numeric', month: 'long', year: 'numeric' });

  return (
    <div className="cat">
      {/* ── Toolbar (solo pantalla) ─────────────────────────────────── */}
      <header className="cat-head no-print">
        <div>
          <p className="cat-eyebrow">Catálogo</p>
          <h1 className="cat-title">Catálogo descargable</h1>
          <p className="cat-sub">
            {filtered.length} perfume{filtered.length !== 1 ? 's' : ''} en el documento
            {loadError ? ` · Error: ${loadError}` : ''}
          </p>
        </div>
        <button type="button" className="cat-download" onClick={onDownload} disabled={filtered.length === 0}>
          <DownloadIcon /> Descargar PDF
        </button>
      </header>

      <div className="cat-toolbar no-print">
        <div className="cat-field">
          <label htmlFor="cat-type">Tipo</label>
          <select id="cat-type" value={type} onChange={(e) => setType(e.target.value)}>
            {TYPE_OPTIONS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </div>

        <div className="cat-field">
          <label htmlFor="cat-gender">Sexo</label>
          <select id="cat-gender" value={gender} onChange={(e) => setGender(e.target.value)}>
            {GENDER_OPTIONS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </div>

        <div className="cat-field">
          <label htmlFor="cat-min">Precio desde (COP)</label>
          <input id="cat-min" type="number" min="0" step="10000" placeholder="0"
                 value={priceMin} onChange={(e) => setPriceMin(e.target.value)} />
        </div>

        <div className="cat-field">
          <label htmlFor="cat-max">Precio hasta (COP)</label>
          <input id="cat-max" type="number" min="0" step="10000" placeholder="Sin límite"
                 value={priceMax} onChange={(e) => setPriceMax(e.target.value)} />
        </div>

        <div className="cat-field">
          <label>Marcas</label>
          <details className="cat-brands">
            <summary>
              {brandSel.size === 0 ? 'Todas las marcas' : `${brandSel.size} seleccionada${brandSel.size !== 1 ? 's' : ''}`}
            </summary>
            <div className="cat-brands-panel">
              {brandSel.size > 0 && (
                <button type="button" className="cat-brands-clear" onClick={() => setBrandSel(new Set())}>
                  Limpiar selección
                </button>
              )}
              {brands.map((b) => (
                <label key={b} className="cat-brand-check">
                  <input type="checkbox" checked={brandSel.has(b)} onChange={() => toggleBrand(b)} />
                  <span>{b}</span>
                </label>
              ))}
            </div>
          </details>
        </div>

        <div className="cat-field">
          <label htmlFor="cat-sort">Ordenar por</label>
          <select id="cat-sort" value={sort} onChange={(e) => setSort(e.target.value)}>
            {SORT_OPTIONS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </div>

        <label className="cat-toggle">
          <input type="checkbox" checked={includeNoPrice} onChange={(e) => setIncludeNoPrice(e.target.checked)} />
          <span>Incluir perfumes sin precio (aparecen como &quot;Consultar&quot;)</span>
        </label>
      </div>

      {/* ── Documento imprimible ─────────────────────────────────────── */}
      <table className="doc">
        <thead>
          <tr>
            <td className="doc-pagehead-cell">
              <div className="doc-pagehead">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/img/logo-transparent.svg" alt="ScentualBliss" className="doc-pagehead-logo" />
                <span className="doc-pagehead-right">Catálogo de perfumes · {today}</span>
              </div>
            </td>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>
              {/* Portada */}
              <section className="doc-cover">
                <div className="doc-cover-center">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src="/img/logo-transparent.svg" alt="ScentualBliss" className="doc-cover-logo" />
                  <div className="doc-cover-rule" aria-hidden />
                  <h2 className="doc-cover-title">Catálogo de Perfumes</h2>
                  <p className="doc-cover-tag">Perfumería original</p>
                  <div className="doc-cover-bottlewrap" aria-hidden>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src="/img/placeholder-perfume.png" alt="" className="doc-cover-bottle" />
                  </div>
                  <p className="doc-cover-meta">
                    {filterSummary.length ? filterSummary.join('  ·  ') : 'Colección completa'}
                  </p>
                  <p className="doc-cover-meta doc-cover-meta--soft">
                    {filtered.length} fragancia{filtered.length !== 1 ? 's' : ''} · {today}
                  </p>
                  <p className="doc-cover-web">scentualbliss.com.co</p>
                </div>
              </section>

              {/* Grid de productos, agrupado por marca cuando el orden es por marca */}
              {sort === 'brand' ? (
                groupByBrand(filtered).map(([brand, items]) => (
                  <div key={brand} className="doc-brandgroup">
                    <h3 className="doc-brand-heading">{brand}</h3>
                    <div className="doc-grid">
                      {items.map((p) => <ProductCard key={p.id} p={p} />)}
                    </div>
                  </div>
                ))
              ) : (
                <div className="doc-grid">
                  {filtered.map((p) => <ProductCard key={p.id} p={p} />)}
                </div>
              )}

              {filtered.length === 0 && (
                <p className="doc-empty no-print">
                  Ningún perfume coincide con los filtros. Ajusta los filtros para armar el catálogo.
                </p>
              )}
            </td>
          </tr>
        </tbody>
      </table>

      <CatalogStyles />
    </div>
  );
}

// Agrupa una lista ya ordenada (por marca) en [[marca, items[]], ...]
// preservando el orden — no reordena, solo detecta cambios de marca.
function groupByBrand(list) {
  const groups = [];
  for (const p of list) {
    const key = p.brand || 'Otras marcas';
    const last = groups[groups.length - 1];
    if (last && last[0] === key) last[1].push(p);
    else groups.push([key, [p]]);
  }
  return groups;
}

function ProductCard({ p }) {
  return (
    <article className="doc-card">
      <div className="doc-card-imgwrap">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={p.thumb} alt={`${p.brand} ${p.name}`} loading="eager" />
      </div>
      <div className="doc-card-body">
        <p className="doc-card-brand">{p.brand || '—'}</p>
        <h3 className="doc-card-name">{p.name}</h3>
        <div className="doc-card-meta">
          {p.conc && <span className="doc-chip doc-chip--gold">{p.conc}</span>}
          {p.productType && <span className="doc-chip">{productTypeLabels[p.productType] || p.productType}</span>}
          {p.gender && <span className="doc-chip">{p.gender}</span>}
        </div>
        {p.displaySizes.length > 0 ? (
          <ul className="doc-card-prices">
            {p.displaySizes.map((s, i) => (
              <li key={i}>
                <span className="doc-price-ml">{s.ml || 'Precio'}</span>
                <span className="doc-price-dots" aria-hidden />
                <strong className="doc-price-val">{formatCOP(s.price)}</strong>
              </li>
            ))}
          </ul>
        ) : (
          <p className="doc-card-consult">Consultar precio</p>
        )}
      </div>
    </article>
  );
}

function DownloadIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
         strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="3" x2="12" y2="15" />
    </svg>
  );
}

function CatalogStyles() {
  return (
    <style>{`
      .cat {
        padding: 2.5rem 2.25rem 3rem;
        max-width: 1280px;
        margin: 0 auto;
        font-family: var(--font-montserrat), ui-sans-serif, system-ui, sans-serif;
        color: #2a1f15;
      }

      /* ── Toolbar (pantalla) ─────────────────────────────────────── */
      .cat-head {
        display: flex;
        justify-content: space-between;
        align-items: flex-end;
        flex-wrap: wrap;
        gap: 1.25rem;
        margin-bottom: 1.5rem;
      }
      .cat-eyebrow {
        margin: 0 0 0.3rem;
        font-size: 0.7rem;
        letter-spacing: 0.2em;
        text-transform: uppercase;
        color: #8a6936;
      }
      .cat-title {
        margin: 0 0 0.35rem;
        font-size: 1.85rem;
        font-weight: 500;
        letter-spacing: -0.01em;
        color: #1c1611;
      }
      .cat-sub {
        margin: 0;
        font-size: 0.83rem;
        color: rgba(28, 22, 17, 0.55);
      }
      .cat-download {
        display: inline-flex;
        align-items: center;
        gap: 0.5rem;
        padding: 0.8rem 1.4rem;
        background: linear-gradient(135deg, #c09a5a, #8a6936);
        color: #1c1611;
        border: none;
        border-radius: 10px;
        font-size: 0.9rem;
        font-weight: 600;
        letter-spacing: 0.04em;
        font-family: inherit;
        cursor: pointer;
        transition: box-shadow 0.18s, transform 0.15s;
      }
      .cat-download:hover:not(:disabled) {
        box-shadow: 0 12px 26px -12px rgba(192, 154, 90, 0.6);
        transform: translateY(-1px);
      }
      .cat-download:disabled { opacity: 0.5; cursor: not-allowed; }

      .cat-toolbar {
        display: grid;
        grid-template-columns: repeat(6, minmax(0, 1fr));
        gap: 0.75rem;
        padding: 1rem 1.1rem;
        background: #fff;
        border: 1px solid rgba(28, 22, 17, 0.08);
        border-radius: 14px;
        margin-bottom: 1.75rem;
        align-items: start;
      }
      @media (max-width: 1000px) { .cat-toolbar { grid-template-columns: repeat(3, 1fr); } }
      @media (max-width: 640px)  { .cat-toolbar { grid-template-columns: repeat(2, 1fr); } }

      .cat-field { display: flex; flex-direction: column; gap: 0.3rem; min-width: 0; }
      .cat-field label,
      .cat-field > label {
        font-size: 0.66rem;
        letter-spacing: 0.14em;
        text-transform: uppercase;
        color: rgba(28, 22, 17, 0.5);
      }
      .cat-field input,
      .cat-field select {
        width: 100%;
        padding: 0.55rem 0.75rem;
        background: #fff;
        border: 1px solid rgba(28, 22, 17, 0.15);
        border-radius: 8px;
        font-size: 0.86rem;
        color: #1c1611;
        font-family: inherit;
      }
      .cat-field input:focus,
      .cat-field select:focus {
        outline: none;
        border-color: rgba(192, 154, 90, 0.55);
        box-shadow: 0 0 0 3px rgba(192, 154, 90, 0.12);
      }

      .cat-brands { position: relative; }
      .cat-brands summary {
        list-style: none;
        padding: 0.55rem 0.75rem;
        border: 1px solid rgba(28, 22, 17, 0.15);
        border-radius: 8px;
        font-size: 0.86rem;
        cursor: pointer;
        user-select: none;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        background: #fff;
      }
      .cat-brands summary::-webkit-details-marker { display: none; }
      .cat-brands[open] summary {
        border-color: rgba(192, 154, 90, 0.55);
        box-shadow: 0 0 0 3px rgba(192, 154, 90, 0.12);
      }
      .cat-brands-panel {
        position: absolute;
        z-index: 30;
        top: calc(100% + 6px);
        left: 0;
        min-width: 230px;
        max-height: 300px;
        overflow-y: auto;
        background: #fff;
        border: 1px solid rgba(28, 22, 17, 0.12);
        border-radius: 10px;
        box-shadow: 0 18px 40px -18px rgba(28, 22, 17, 0.35);
        padding: 0.5rem;
        display: flex;
        flex-direction: column;
        gap: 0.1rem;
      }
      .cat-brands-clear {
        margin-bottom: 0.35rem;
        padding: 0.4rem 0.6rem;
        background: rgba(192, 154, 90, 0.1);
        color: #6b4f24;
        border: none;
        border-radius: 6px;
        font-size: 0.75rem;
        font-family: inherit;
        cursor: pointer;
        text-align: left;
      }
      .cat-brand-check {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        padding: 0.32rem 0.5rem;
        border-radius: 6px;
        font-size: 0.84rem;
        cursor: pointer;
      }
      .cat-brand-check:hover { background: rgba(192, 154, 90, 0.07); }
      .cat-brand-check input { accent-color: #8a6936; }

      .cat-toggle {
        grid-column: 1 / -1;
        display: flex;
        align-items: center;
        gap: 0.5rem;
        font-size: 0.8rem;
        color: rgba(28, 22, 17, 0.65);
        cursor: pointer;
      }
      .cat-toggle input { accent-color: #8a6936; }

      /* ── Documento (tema negro + dorado) ────────────────────────── */
      .doc {
        width: 100%;
        border-collapse: collapse;
        background: #0e0a07;
        border: 1px solid rgba(192, 154, 90, 0.35);
        border-radius: 14px;
        overflow: hidden;
        font-family: var(--font-montserrat), 'Montserrat', ui-sans-serif, system-ui, sans-serif;
      }
      .doc-pagehead-cell { padding: 0; }
      .doc-pagehead {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 1rem;
        padding: 0.8rem 1.4rem;
        border-bottom: 2px solid #c09a5a;
        background: #0e0a07;
      }
      .doc-pagehead-logo { height: 40px; width: auto; }
      .doc-pagehead-right {
        font-size: 0.7rem;
        letter-spacing: 0.14em;
        text-transform: uppercase;
        color: #c09a5a;
        white-space: nowrap;
      }

      .doc tbody td { padding: 0 1.4rem 1.6rem; background: #0e0a07; }

      /* Portada — ocupa toda la página para centrar el contenido en
         el medio real de la hoja, no solo horizontalmente. */
      .doc-cover {
        display: flex;
        justify-content: center;
        min-height: calc(100vh - 6rem);
        padding: 1rem;
      }
      .doc-cover-center {
        display: flex;
        flex-direction: column;
        align-items: center;
        text-align: center;
      }
      .doc-cover-logo {
        width: min(430px, 78%);
        height: auto;
        margin-bottom: 0.6rem;
      }
      .doc-cover-rule {
        width: 110px;
        height: 2px;
        margin: 1.5rem 0;
        background: linear-gradient(90deg, transparent, #c09a5a, transparent);
      }
      .doc-cover-title {
        margin: 0 0 0.5rem;
        font-size: 2.05rem;
        font-weight: 400;
        letter-spacing: 0.08em;
        color: #f3ead7;
        font-family: inherit;
      }
      .doc-cover-tag {
        margin: 0 0 2.2rem;
        font-size: 0.8rem;
        letter-spacing: 0.3em;
        text-transform: uppercase;
        color: #c09a5a;
      }
      /* La imagen fuente trae "ScentualBliss / Perfumería de lujo"
         impreso en la parte baja — la recortamos para no repetir el
         nombre de la marca (ya está arriba, en grande). */
      .doc-cover-bottlewrap {
        width: min(260px, 55%);
        height: min(260px, 41vh);
        overflow: hidden;
        margin-bottom: 2.2rem;
      }
      .doc-cover-bottle {
        width: 100%;
        height: auto;
        display: block;
        transform: scale(1.55) translateY(-6%);
        transform-origin: top center;
      }
      .doc-cover-meta {
        margin: 0 0 0.3rem;
        font-size: 0.85rem;
        letter-spacing: 0.06em;
        color: #f3ead7;
      }
      .doc-cover-meta--soft { color: rgba(243, 234, 215, 0.55); font-size: 0.78rem; }
      .doc-cover-web {
        margin: 1.7rem 0 0;
        font-size: 0.75rem;
        letter-spacing: 0.22em;
        text-transform: uppercase;
        color: #c09a5a;
      }

      /* Agrupación por marca */
      .doc-brandgroup { margin-bottom: 1.1rem; }
      .doc-brand-heading {
        margin: 0 0 0.6rem;
        padding-bottom: 0.35rem;
        font-size: 1rem;
        font-weight: 700;
        letter-spacing: 0.14em;
        text-transform: uppercase;
        color: #e8cfa0;
        border-bottom: 1.5px solid #c09a5a;
        font-family: inherit;
      }

      /* Grid de cards */
      .doc-grid {
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        gap: 0.9rem;
      }
      @media (max-width: 900px) { .doc-grid { grid-template-columns: repeat(2, 1fr); } }

      .doc-card {
        display: flex;
        flex-direction: column;
        border: 1.5px solid #c09a5a;
        border-radius: 12px;
        overflow: hidden;
        background: #14100c;
      }
      .doc-card-imgwrap {
        aspect-ratio: 1 / 1;
        background: #fff;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 10px;
      }
      .doc-card-imgwrap img {
        max-width: 100%;
        max-height: 100%;
        object-fit: contain;
        display: block;
      }
      .doc-card-body {
        display: flex;
        flex-direction: column;
        flex: 1;
        padding: 0.65rem 0.7rem 0.75rem;
        border-top: 1.5px solid #c09a5a;
      }
      .doc-card-brand {
        margin: 0 0 0.35rem;
        font-size: 0.62rem;
        font-weight: 600;
        letter-spacing: 0.18em;
        text-transform: uppercase;
        color: #c09a5a;
      }
      .doc-card-name {
        margin: 0 0 0.5rem;
        padding: 0.35rem 0.55rem;
        font-size: 0.84rem;
        font-weight: 700;
        line-height: 1.25;
        color: #1c1611;
        background: linear-gradient(135deg, #e8cfa0, #c09a5a 55%, #a07840);
        border-radius: 7px;
        font-family: inherit;
      }
      .doc-card-meta {
        display: flex;
        flex-wrap: wrap;
        gap: 0.25rem;
        margin-bottom: 0.55rem;
      }
      .doc-chip {
        display: inline-flex;
        padding: 0.12rem 0.45rem;
        border-radius: 4px;
        font-size: 0.6rem;
        letter-spacing: 0.06em;
        text-transform: uppercase;
        background: rgba(243, 234, 215, 0.08);
        border: 1px solid rgba(192, 154, 90, 0.3);
        color: rgba(243, 234, 215, 0.8);
      }
      .doc-chip--gold {
        background: rgba(192, 154, 90, 0.22);
        color: #e8cfa0;
        font-weight: 600;
      }
      .doc-card-prices {
        list-style: none;
        margin: auto 0 0;
        padding: 0.5rem 0 0;
        border-top: 1px dashed rgba(192, 154, 90, 0.4);
        display: flex;
        flex-direction: column;
        gap: 0.22rem;
      }
      .doc-card-prices li {
        display: flex;
        align-items: baseline;
        gap: 0.4rem;
        font-size: 0.78rem;
      }
      .doc-price-ml { color: rgba(243, 234, 215, 0.65); white-space: nowrap; }
      .doc-price-dots {
        flex: 1;
        border-bottom: 1px dotted rgba(192, 154, 90, 0.45);
        transform: translateY(-3px);
      }
      .doc-price-val { color: #e8cfa0; white-space: nowrap; font-weight: 700; }
      .doc-card-consult {
        margin: auto 0 0;
        padding-top: 0.5rem;
        border-top: 1px dashed rgba(192, 154, 90, 0.4);
        font-size: 0.75rem;
        font-style: italic;
        color: rgba(243, 234, 215, 0.5);
      }

      .doc-empty {
        padding: 3rem 1rem;
        text-align: center;
        color: rgba(243, 234, 215, 0.6);
        font-size: 0.9rem;
      }

      /* ── Impresión / PDF ────────────────────────────────────────── */
      @media print {
        /* Margen 0: el negro llega hasta el borde de la hoja. El aire
           interior lo dan los paddings del propio documento. */
        @page { size: A4; margin: 0; }

        * {
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }

        /* Fondo negro pleno en TODAS las páginas (el body pinta el lienzo
           completo, incluso donde el contenido no llega). */
        html, body { background: #0e0a07 !important; }
        /* La textura de ruido del sitio (overlay fijo) se repite en cada
           página impresa y ensucia el PDF con un velo. */
        body::after { display: none !important; }
        .no-print { display: none !important; }
        .admin-sidebar { display: none !important; }
        .admin-shell { display: block !important; background: #0e0a07 !important; }
        .admin-content { background: #0e0a07 !important; }
        .admin-content-inner { min-height: 0 !important; }

        .cat { padding: 0 !important; max-width: none !important; }

        .doc { border: none; border-radius: 0; }
        .doc-pagehead { padding: 6mm 8mm 3mm; }
        .doc tbody td { padding: 4mm 8mm 6mm; }

        /* El centrado con flex/align-items no se respeta de forma fiable
           dentro de un <td> con salto de página forzado en la impresión
           de Chromium (probado: min-height y height + margin:auto
           fallan). Se usa padding calculado a mano para que el bloque
           de contenido (~185mm de alto) quede centrado en la hoja A4
           útil (~277mm bajo el encabezado repetido). */
        .doc-cover {
          display: block;
          break-after: page;
          min-height: 0;
          padding: 46mm 0 0;
        }

        .doc-brandgroup { break-before: auto; }
        .doc-brand-heading { break-after: avoid; }
        .doc-grid { grid-template-columns: repeat(3, 1fr) !important; gap: 4mm !important; }
        .doc-card { break-inside: avoid; page-break-inside: avoid; }
        /* Imagen más compacta en papel → caben 3 filas (9 perfumes) por página */
        .doc-card-imgwrap { aspect-ratio: auto; height: 36mm; }
        .doc-card-imgwrap img { max-height: 32mm; }
      }
    `}</style>
  );
}
