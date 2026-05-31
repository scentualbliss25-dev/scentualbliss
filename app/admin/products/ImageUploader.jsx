'use client';

import { useState, useRef, useTransition } from 'react';
import { uploadProductImage } from './_actions';

/**
 * Editor de galería de imágenes para producto.
 *
 * Props:
 *   - initialUrls: string[]  — URLs ya guardadas (al editar)
 *   - slugHint?: string      — para nombrar los archivos en Storage
 *
 * Renderiza hidden inputs `name="image_url"` por cada URL → el form
 * padre las recoge en FormData con `formData.getAll('image_url')`.
 *
 * Soporta:
 *   - Click + file picker (selección múltiple)
 *   - Drag & drop sobre la zona
 *   - Reorder con flechas ▲▼
 *   - Eliminar individual
 *   - URL externa (pegar manualmente)
 */
export default function ImageUploader({ initialUrls = [], slugHint = '' }) {
  // Cada item: { url, status: 'ok'|'uploading'|'error', error?, key }
  const [items, setItems] = useState(() =>
    initialUrls.filter(Boolean).map((url, i) => ({ url, status: 'ok', key: `init-${i}` }))
  );
  const [isPending, startTransition] = useTransition();
  const [globalError, setGlobalError] = useState('');
  const inputRef = useRef(null);
  const dragOverRef = useRef(false);
  const [isDragging, setIsDragging] = useState(false);
  const [pasteUrl, setPasteUrl] = useState('');

  function addPlaceholder() {
    const key = `pending-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    return { key, url: '', status: 'uploading' };
  }

  async function uploadOne(file, placeholderKey) {
    const fd = new FormData();
    fd.append('file', file);
    fd.append('slugHint', slugHint || '');
    const res = await uploadProductImage(fd);
    setItems((arr) =>
      arr.map((it) => {
        if (it.key !== placeholderKey) return it;
        if (res.ok) return { ...it, url: res.url, status: 'ok' };
        return { ...it, status: 'error', error: res.error || 'Error subiendo' };
      })
    );
  }

  function onFilesChosen(fileList) {
    if (!fileList || !fileList.length) return;
    setGlobalError('');
    // Agrega N placeholders y dispara N uploads paralelos.
    const newItems = [];
    const tasks = [];
    for (const file of fileList) {
      const placeholder = addPlaceholder();
      newItems.push(placeholder);
      tasks.push(() => uploadOne(file, placeholder.key));
    }
    setItems((arr) => [...arr, ...newItems]);
    startTransition(() => {
      tasks.forEach((t) => t());
    });
  }

  function onAddExternalUrl() {
    const u = pasteUrl.trim();
    if (!u) return;
    if (!/^https?:\/\//i.test(u) && !u.startsWith('/')) {
      setGlobalError('La URL debe empezar con http(s):// o /');
      return;
    }
    setItems((arr) => [...arr, { url: u, status: 'ok', key: `ext-${Date.now()}` }]);
    setPasteUrl('');
    setGlobalError('');
  }

  function removeAt(idx) {
    setItems((arr) => arr.filter((_, i) => i !== idx));
  }

  function moveUp(idx) {
    if (idx === 0) return;
    setItems((arr) => {
      const next = arr.slice();
      [next[idx - 1], next[idx]] = [next[idx], next[idx - 1]];
      return next;
    });
  }
  function moveDown(idx) {
    setItems((arr) => {
      if (idx === arr.length - 1) return arr;
      const next = arr.slice();
      [next[idx + 1], next[idx]] = [next[idx], next[idx + 1]];
      return next;
    });
  }

  function onDragOver(e) {
    e.preventDefault();
    if (!dragOverRef.current) { dragOverRef.current = true; setIsDragging(true); }
  }
  function onDragLeave(e) {
    e.preventDefault();
    if (dragOverRef.current) { dragOverRef.current = false; setIsDragging(false); }
  }
  function onDrop(e) {
    e.preventDefault();
    dragOverRef.current = false;
    setIsDragging(false);
    const files = [...(e.dataTransfer?.files || [])].filter((f) => f.type.startsWith('image/'));
    if (files.length) onFilesChosen(files);
  }

  const okUrls = items.filter((i) => i.status === 'ok').map((i) => i.url);

  return (
    <div className="iu">
      {/* Hidden inputs que el form padre lee en FormData */}
      {okUrls.map((url, i) => (
        <input key={`hidden-${i}`} type="hidden" name="image_url" value={url} />
      ))}

      {/* Dropzone */}
      <div
        className={`iu-drop ${isDragging ? 'is-drag' : ''}`}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        onClick={() => inputRef.current?.click()}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') inputRef.current?.click(); }}
      >
        <UploadIcon />
        <div className="iu-drop-text">
          <strong>Arrastra imágenes aquí</strong>
          <span>o click para elegir archivos · JPG, PNG, WebP, AVIF · máx. 5MB c/u</span>
        </div>
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/jpg,image/png,image/webp,image/avif"
          multiple
          hidden
          onChange={(e) => { onFilesChosen(e.target.files); e.target.value = ''; }}
        />
      </div>

      {/* URL externa */}
      <div className="iu-paste">
        <input
          type="url"
          placeholder="…o pega una URL externa (https://… o /img/…)"
          value={pasteUrl}
          onChange={(e) => setPasteUrl(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); onAddExternalUrl(); } }}
        />
        <button type="button" onClick={onAddExternalUrl} disabled={!pasteUrl.trim()}>
          Añadir URL
        </button>
      </div>

      {globalError && <p className="iu-error">{globalError}</p>}

      {/* Grid de previews */}
      {items.length > 0 && (
        <ul className="iu-grid" aria-label="Imágenes del producto">
          {items.map((item, i) => (
            <li key={item.key} className={`iu-tile iu-tile--${item.status}`}>
              <div className="iu-tile-num">{i + 1}</div>
              {item.status === 'uploading' && (
                <div className="iu-tile-spinner" aria-label="Subiendo">
                  <div className="spinner" />
                </div>
              )}
              {item.status === 'ok' && item.url && (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img src={item.url} alt={`Imagen ${i + 1}`} loading="lazy" />
              )}
              {item.status === 'error' && (
                <div className="iu-tile-err">
                  <span>!</span>
                  <p>{item.error}</p>
                </div>
              )}

              <div className="iu-tile-actions">
                <button
                  type="button"
                  className="iu-btn"
                  onClick={() => moveUp(i)}
                  disabled={i === 0}
                  title="Subir"
                  aria-label="Mover arriba"
                >▲</button>
                <button
                  type="button"
                  className="iu-btn"
                  onClick={() => moveDown(i)}
                  disabled={i === items.length - 1}
                  title="Bajar"
                  aria-label="Mover abajo"
                >▼</button>
                <button
                  type="button"
                  className="iu-btn iu-btn--del"
                  onClick={() => removeAt(i)}
                  title="Eliminar"
                  aria-label="Eliminar imagen"
                >×</button>
              </div>

              {i === 0 && <div className="iu-tile-main">Principal</div>}
            </li>
          ))}
        </ul>
      )}

      {items.length === 0 && (
        <p className="iu-empty">Aún no hay imágenes. Sube al menos una para que se vea en la tienda.</p>
      )}

      <style jsx>{`
        .iu {
          display: flex;
          flex-direction: column;
          gap: 0.85rem;
        }
        .iu-drop {
          display: flex;
          align-items: center;
          gap: 1rem;
          padding: 1.4rem 1.25rem;
          background: rgba(192, 154, 90, 0.06);
          border: 2px dashed rgba(192, 154, 90, 0.35);
          border-radius: 12px;
          cursor: pointer;
          transition: background 0.2s, border-color 0.2s;
        }
        .iu-drop:hover { background: rgba(192, 154, 90, 0.1); border-color: rgba(192, 154, 90, 0.55); }
        .iu-drop.is-drag {
          background: rgba(192, 154, 90, 0.18);
          border-color: rgba(192, 154, 90, 0.8);
          transform: scale(1.005);
        }
        .iu-drop-text {
          display: flex;
          flex-direction: column;
          gap: 0.2rem;
          line-height: 1.4;
        }
        .iu-drop-text strong {
          font-size: 0.92rem;
          color: #1c1611;
          font-weight: 500;
        }
        .iu-drop-text span {
          font-size: 0.76rem;
          color: rgba(28, 22, 17, 0.55);
        }

        .iu-paste {
          display: flex;
          gap: 0.5rem;
        }
        .iu-paste input {
          flex: 1;
          padding: 0.55rem 0.8rem;
          background: #fff;
          border: 1px solid rgba(28, 22, 17, 0.15);
          border-radius: 8px;
          font-size: 0.83rem;
          font-family: inherit;
          color: #1c1611;
        }
        .iu-paste input:focus {
          outline: none;
          border-color: rgba(192, 154, 90, 0.55);
          box-shadow: 0 0 0 3px rgba(192, 154, 90, 0.12);
        }
        .iu-paste button {
          padding: 0.55rem 0.95rem;
          background: rgba(28, 22, 17, 0.04);
          color: rgba(28, 22, 17, 0.7);
          border: 1px solid rgba(28, 22, 17, 0.15);
          border-radius: 8px;
          font-size: 0.82rem;
          cursor: pointer;
          font-family: inherit;
        }
        .iu-paste button:hover:not(:disabled) {
          background: rgba(28, 22, 17, 0.07);
          color: #1c1611;
        }
        .iu-paste button:disabled { opacity: 0.45; cursor: not-allowed; }

        .iu-error {
          margin: 0;
          padding: 0.6rem 0.85rem;
          background: rgba(170, 50, 50, 0.08);
          border: 1px solid rgba(170, 50, 50, 0.25);
          border-radius: 8px;
          font-size: 0.8rem;
          color: #7a2424;
        }

        .iu-empty {
          margin: 0.3rem 0 0;
          font-size: 0.78rem;
          color: rgba(28, 22, 17, 0.45);
          font-style: italic;
        }

        .iu-grid {
          list-style: none;
          padding: 0;
          margin: 0;
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
          gap: 0.7rem;
        }
        .iu-tile {
          position: relative;
          aspect-ratio: 1;
          background: rgba(28, 22, 17, 0.05);
          border: 1px solid rgba(28, 22, 17, 0.1);
          border-radius: 10px;
          overflow: hidden;
        }
        .iu-tile img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
        }
        .iu-tile--error {
          background: rgba(170, 50, 50, 0.05);
          border-color: rgba(170, 50, 50, 0.3);
        }
        .iu-tile--uploading {
          background: rgba(192, 154, 90, 0.08);
          border-style: dashed;
        }
        .iu-tile-num {
          position: absolute;
          top: 0.4rem;
          left: 0.4rem;
          z-index: 2;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 22px;
          height: 22px;
          background: rgba(0, 0, 0, 0.55);
          color: #fff;
          font-size: 0.7rem;
          border-radius: 5px;
          backdrop-filter: blur(4px);
        }
        .iu-tile-main {
          position: absolute;
          bottom: 0.4rem;
          left: 0.4rem;
          z-index: 2;
          padding: 0.15rem 0.45rem;
          background: linear-gradient(135deg, #c09a5a, #8a6936);
          color: #1c1611;
          font-size: 0.62rem;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          font-weight: 500;
          border-radius: 4px;
        }
        .iu-tile-actions {
          position: absolute;
          top: 0.4rem;
          right: 0.4rem;
          z-index: 2;
          display: flex;
          gap: 0.2rem;
          opacity: 0;
          transition: opacity 0.18s;
        }
        .iu-tile:hover .iu-tile-actions { opacity: 1; }
        .iu-tile--error .iu-tile-actions { opacity: 1; }
        .iu-btn {
          width: 24px;
          height: 24px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          background: rgba(0, 0, 0, 0.65);
          color: #fff;
          border: none;
          border-radius: 5px;
          font-size: 0.7rem;
          cursor: pointer;
          backdrop-filter: blur(4px);
          transition: background 0.15s;
        }
        .iu-btn:hover:not(:disabled) { background: rgba(0, 0, 0, 0.85); }
        .iu-btn:disabled { opacity: 0.3; cursor: not-allowed; }
        .iu-btn--del:hover:not(:disabled) {
          background: rgba(170, 50, 50, 0.95);
        }

        .iu-tile-spinner {
          position: absolute;
          inset: 0;
          display: grid;
          place-items: center;
        }
        .spinner {
          width: 22px;
          height: 22px;
          border: 2px solid rgba(192, 154, 90, 0.25);
          border-top-color: #8a6936;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }
        @keyframes spin { to { transform: rotate(360deg); } }

        .iu-tile-err {
          position: absolute;
          inset: 0;
          padding: 0.5rem;
          display: flex;
          flex-direction: column;
          gap: 0.3rem;
          align-items: center;
          justify-content: center;
          text-align: center;
        }
        .iu-tile-err span {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 28px;
          height: 28px;
          border-radius: 50%;
          background: rgba(170, 50, 50, 0.18);
          color: #7a2424;
          font-weight: 700;
        }
        .iu-tile-err p {
          margin: 0;
          font-size: 0.68rem;
          line-height: 1.3;
          color: #7a2424;
        }
      `}</style>
    </div>
  );
}

function UploadIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor"
         strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: '#8a6936', flexShrink: 0 }}>
      <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
      <polyline points="17 8 12 3 7 8" />
      <line x1="12" y1="3" x2="12" y2="15" />
    </svg>
  );
}
