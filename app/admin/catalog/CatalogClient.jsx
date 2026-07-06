'use client';

import { useMemo, useState } from 'react';
import { formatCOP } from '@/lib/format';
import CatalogDocument from './CatalogDocument';

/**
 * Catálogo descargable para clientes.
 *
 * Pantalla: toolbar de filtros (tipo, sexo, rango de precio, marcas) +
 * vista previa en vivo del documento (CatalogDocument, compartido con la
 * página pública /catalogo).
 *
 * Descarga: window.print() con CSS @media print — el navegador genera el
 * PDF (Guardar como PDF).
 *
 * Enlace en vivo: botón "Copiar enlace" arma /catalogo?<filtros> y lo copia
 * al portapapeles — esa página pública lee los mismos filtros y siempre
 * muestra precios/stock actuales (no es un archivo fijo).
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
  const [linkCopied, setLinkCopied] = useState(false);

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

  function buildShareUrl() {
    const sp = new URLSearchParams();
    if (type) sp.set('type', type);
    if (gender) sp.set('gender', gender);
    if (priceMin !== '') sp.set('min', priceMin);
    if (priceMax !== '') sp.set('max', priceMax);
    if (brandSel.size > 0) sp.set('brands', [...brandSel].join(','));
    if (includeNoPrice) sp.set('noPrice', '1');
    if (sort !== 'brand') sp.set('sort', sort);
    const qs = sp.toString();
    return `${window.location.origin}/catalogo${qs ? '?' + qs : ''}`;
  }

  async function onCopyLink() {
    const url = buildShareUrl();
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      // Fallback si el navegador bloquea la Clipboard API (ej. http no seguro)
      window.prompt('Copia el enlace:', url);
      return;
    }
    setLinkCopied(true);
    setTimeout(() => setLinkCopied(false), 2500);
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
        <div className="cat-head-actions">
          <button type="button" className="cat-link" onClick={onCopyLink} disabled={filtered.length === 0}>
            <LinkIcon /> {linkCopied ? '¡Enlace copiado!' : 'Copiar enlace'}
          </button>
          <button type="button" className="cat-download" onClick={onDownload} disabled={filtered.length === 0}>
            <DownloadIcon /> Descargar PDF
          </button>
        </div>
      </header>

      <p className="cat-share-hint no-print">
        El enlace es <strong>en vivo</strong>: cualquiera que lo abra ve el catálogo actual con estos mismos filtros
        (precios y stock se actualizan solos, no es un archivo fijo).
      </p>

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

      <CatalogDocument products={filtered} filterSummary={filterSummary} todayLabel={today} sort={sort} />

      <CatalogStyles />
    </div>
  );
}

function LinkIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
         strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M10 13a5 5 0 007.07 0l2.83-2.83a5 5 0 00-7.07-7.07l-1.5 1.5" />
      <path d="M14 11a5 5 0 00-7.07 0L4.1 13.83a5 5 0 007.07 7.07l1.5-1.5" />
    </svg>
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
        margin-bottom: 0.6rem;
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
      .cat-head-actions { display: flex; flex-wrap: wrap; gap: 0.6rem; }
      @media (max-width: 480px) {
        .cat-head-actions { width: 100%; }
        .cat-head-actions .cat-link,
        .cat-head-actions .cat-download {
          flex: 1 1 auto;
          justify-content: center;
        }
      }
      .cat-share-hint {
        margin: 0 0 1.4rem;
        font-size: 0.78rem;
        color: rgba(28, 22, 17, 0.55);
      }
      .cat-download,
      .cat-link {
        display: inline-flex;
        align-items: center;
        gap: 0.5rem;
        padding: 0.8rem 1.4rem;
        border-radius: 10px;
        font-size: 0.9rem;
        font-weight: 600;
        letter-spacing: 0.04em;
        font-family: inherit;
        cursor: pointer;
        transition: box-shadow 0.18s, transform 0.15s, background 0.18s, border-color 0.18s, color 0.18s;
        white-space: nowrap;
      }
      .cat-download {
        background: linear-gradient(135deg, #c09a5a, #8a6936);
        color: #1c1611;
        border: none;
      }
      .cat-download:hover:not(:disabled) {
        box-shadow: 0 12px 26px -12px rgba(192, 154, 90, 0.6);
        transform: translateY(-1px);
      }
      .cat-link {
        background: transparent;
        color: #6b4f24;
        border: 1px solid rgba(192, 154, 90, 0.5);
      }
      .cat-link:hover:not(:disabled) {
        background: rgba(192, 154, 90, 0.08);
        border-color: rgba(192, 154, 90, 0.8);
      }
      .cat-download:disabled,
      .cat-link:disabled { opacity: 0.5; cursor: not-allowed; }

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
      @media (max-width: 420px)  { .cat-toolbar { grid-template-columns: 1fr; } }

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
    `}</style>
  );
}
