'use client';

import { useState, useRef, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { previewImportAction, executeImportAction } from '../_actions';

/**
 * Flujo de import en 3 fases UI:
 *
 *   IDLE       → muestra dropzone para subir archivo
 *   PREVIEW    → preview rows con summary, botones Confirmar/Descartar
 *   RESULT     → reporte de filas creadas/actualizadas/con-error
 *
 * El archivo se mantiene en memoria del cliente (ref) para reutilizarlo
 * en executeImport, así no obligamos al usuario a re-subirlo tras
 * confirmar.
 */
export default function ImportClient() {
  const router = useRouter();
  const [phase, setPhase] = useState('idle'); // 'idle' | 'preview' | 'result'
  const [preview, setPreview] = useState(null);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [isPending, startTransition] = useTransition();
  const fileRef = useRef(null);
  const cachedFileRef = useRef(null);
  const [isDrag, setIsDrag] = useState(false);

  function onFileChosen(file) {
    if (!file) return;
    setError('');
    cachedFileRef.current = file;
    const fd = new FormData();
    fd.append('file', file);
    startTransition(async () => {
      const res = await previewImportAction(fd);
      if (!res.ok) {
        setError(res.error || 'Error al leer el archivo');
        cachedFileRef.current = null;
        return;
      }
      setPreview(res);
      setPhase('preview');
    });
  }

  function onConfirm() {
    if (!cachedFileRef.current) return;
    const fd = new FormData();
    fd.append('file', cachedFileRef.current);
    startTransition(async () => {
      const res = await executeImportAction(fd);
      if (!res.ok) {
        setError(res.error || 'Error al ejecutar el import');
        return;
      }
      setResult(res);
      setPhase('result');
    });
  }

  function onReset() {
    setPhase('idle');
    setPreview(null);
    setResult(null);
    setError('');
    cachedFileRef.current = null;
    if (fileRef.current) fileRef.current.value = '';
  }

  return (
    <div className="imc">
      {/* PHASE: idle */}
      {phase === 'idle' && (
        <div
          className={`imc-drop ${isDrag ? 'is-drag' : ''}`}
          onDragOver={(e) => { e.preventDefault(); setIsDrag(true); }}
          onDragLeave={(e) => { e.preventDefault(); setIsDrag(false); }}
          onDrop={(e) => {
            e.preventDefault();
            setIsDrag(false);
            const f = e.dataTransfer?.files?.[0];
            if (f) onFileChosen(f);
          }}
          onClick={() => fileRef.current?.click()}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') fileRef.current?.click(); }}
        >
          <DocIcon />
          <div className="imc-drop-text">
            <strong>Arrastra tu archivo CSV o Excel aquí</strong>
            <span>o click para elegir · máximo 500 filas · 5MB</span>
          </div>
          <input
            ref={fileRef}
            type="file"
            accept=".csv,.xlsx,.xls,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            hidden
            onChange={(e) => { onFileChosen(e.target.files?.[0]); e.target.value = ''; }}
          />
          {isPending && <p className="imc-loading">Analizando…</p>}
        </div>
      )}

      {/* PHASE: preview */}
      {phase === 'preview' && preview && (
        <>
          <div className="imc-summary">
            <SummaryPill label="Crear" value={preview.summary.create} tone="ok" />
            <SummaryPill label="Actualizar" value={preview.summary.update} tone="info" />
            <SummaryPill label="Con error" value={preview.summary.error} tone={preview.summary.error > 0 ? 'err' : 'mute'} />
            <span className="imc-summary-total">{preview.total} filas totales</span>
          </div>

          <div className="imc-preview-tablewrap">
            <table className="imc-table">
              <thead>
                <tr>
                  <th style={{ width: 50 }}>#</th>
                  <th style={{ width: 90 }}>Acción</th>
                  <th>Nombre / Slug</th>
                  <th>Detalle / Error</th>
                </tr>
              </thead>
              <tbody>
                {preview.rows.map((r) => (
                  <tr key={r.rowNumber} className={`row row--${r.action}`}>
                    <td className="imc-rownum">{r.rowNumber}</td>
                    <td>
                      <ActionChip action={r.action} />
                    </td>
                    <td>
                      <div className="imc-name">{r.name || <em>sin nombre</em>}</div>
                      {r.slug && <div className="imc-slug">/{r.slug}</div>}
                    </td>
                    <td className="imc-detail">
                      {r.ok ? (
                        <span className="imc-detail-ok">
                          {r.data?.brand && <span>· {r.data.brand}</span>}
                          {r.sizes?.length > 0 && <span>· {r.sizes.length} tamaños</span>}
                          {r.images?.length > 0 && <span>· {r.images.length} img</span>}
                        </span>
                      ) : (
                        <ul className="imc-errors">
                          {r.errors.map((e, i) => <li key={i}>{e}</li>)}
                        </ul>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="imc-actions">
            <button type="button" onClick={onReset} className="imc-btn imc-btn--ghost" disabled={isPending}>
              Descartar y volver a empezar
            </button>
            <button
              type="button"
              onClick={onConfirm}
              className="imc-btn imc-btn--primary"
              disabled={isPending || (preview.summary.create + preview.summary.update) === 0}
            >
              {isPending
                ? 'Importando…'
                : `Importar ${preview.summary.create + preview.summary.update} filas`}
            </button>
          </div>
        </>
      )}

      {/* PHASE: result */}
      {phase === 'result' && result && (
        <>
          <div className="imc-summary">
            <SummaryPill label="Creados" value={result.summary.created} tone="ok" />
            <SummaryPill label="Actualizados" value={result.summary.updated} tone="info" />
            <SummaryPill label="Fallaron" value={result.summary.errors} tone={result.summary.errors > 0 ? 'err' : 'mute'} />
            <span className="imc-summary-total">{result.summary.total} filas procesadas</span>
          </div>

          <div className="imc-preview-tablewrap">
            <table className="imc-table">
              <thead>
                <tr>
                  <th style={{ width: 50 }}>#</th>
                  <th style={{ width: 100 }}>Resultado</th>
                  <th>Nombre / Slug</th>
                  <th>Detalle</th>
                </tr>
              </thead>
              <tbody>
                {result.results.map((r, i) => (
                  <tr key={i} className={`row row--${r.action}`}>
                    <td className="imc-rownum">{r.rowNumber}</td>
                    <td>
                      <ActionChip action={r.ok ? r.action : 'error'} />
                    </td>
                    <td>
                      <div className="imc-name">{r.name || <em>—</em>}</div>
                      {r.slug && <div className="imc-slug">/{r.slug}</div>}
                    </td>
                    <td className="imc-detail">
                      {r.ok ? <span className="imc-detail-ok">#{r.id}</span> : <span className="imc-detail-err">{r.error}</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="imc-actions">
            <button type="button" onClick={onReset} className="imc-btn imc-btn--ghost">
              Importar otro archivo
            </button>
            <button
              type="button"
              onClick={() => router.push('/admin/products')}
              className="imc-btn imc-btn--primary"
            >
              Ir al listado
            </button>
          </div>
        </>
      )}

      {error && <div className="imc-error">{error}</div>}

      <ImportStyles />
    </div>
  );
}

function SummaryPill({ label, value, tone }) {
  return (
    <div className={`pill pill--${tone}`}>
      <span className="pill-val">{value}</span>
      <span className="pill-lbl">{label}</span>
    </div>
  );
}

function ActionChip({ action }) {
  const labels = {
    create: { text: 'Crear', cls: 'chip--ok' },
    update: { text: 'Actualizar', cls: 'chip--info' },
    error:  { text: 'Error', cls: 'chip--err' },
  };
  const { text, cls } = labels[action] || { text: action, cls: 'chip--mute' };
  return <span className={`chip ${cls}`}>{text}</span>;
}

function DocIcon() {
  return (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#8a6936" strokeWidth="1.4"
         strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="9" y1="13" x2="15" y2="13" />
      <line x1="9" y1="17" x2="15" y2="17" />
    </svg>
  );
}

function ImportStyles() {
  return (
    <style>{`
      .imc {
        display: flex;
        flex-direction: column;
        gap: 1.25rem;
      }

      /* Dropzone */
      .imc-drop {
        display: flex;
        align-items: center;
        gap: 1.25rem;
        padding: 2.5rem 2rem;
        background: rgba(192, 154, 90, 0.06);
        border: 2px dashed rgba(192, 154, 90, 0.35);
        border-radius: 14px;
        cursor: pointer;
        transition: background 0.2s, border-color 0.2s, transform 0.15s;
      }
      .imc-drop:hover { background: rgba(192, 154, 90, 0.1); border-color: rgba(192, 154, 90, 0.55); }
      .imc-drop.is-drag {
        background: rgba(192, 154, 90, 0.18);
        border-color: rgba(192, 154, 90, 0.8);
        transform: scale(1.005);
      }
      .imc-drop-text {
        display: flex;
        flex-direction: column;
        gap: 0.3rem;
        line-height: 1.4;
        flex: 1;
      }
      .imc-drop-text strong {
        font-size: 1rem;
        color: #1c1611;
        font-weight: 500;
      }
      .imc-drop-text span {
        font-size: 0.8rem;
        color: rgba(28, 22, 17, 0.55);
      }
      .imc-loading {
        margin: 0;
        font-size: 0.8rem;
        color: #8a6936;
        font-style: italic;
      }

      /* Summary pills */
      .imc-summary {
        display: flex;
        gap: 0.65rem;
        flex-wrap: wrap;
        align-items: baseline;
        padding: 1rem 1.25rem;
        background: #fff;
        border: 1px solid rgba(28, 22, 17, 0.08);
        border-radius: 12px;
      }
      .pill {
        display: inline-flex;
        align-items: baseline;
        gap: 0.4rem;
        padding: 0.4rem 0.85rem;
        border-radius: 9px;
        font-size: 0.8rem;
      }
      .pill-val { font-weight: 600; font-size: 1.1rem; }
      .pill-lbl { letter-spacing: 0.04em; }
      .pill--ok   { background: rgba(34, 145, 99, 0.13);  color: #1f6b48; }
      .pill--info { background: rgba(70, 110, 195, 0.13); color: #2c5394; }
      .pill--err  { background: rgba(170, 50, 50, 0.13);  color: #8a2a2a; }
      .pill--mute { background: rgba(28, 22, 17, 0.06);   color: rgba(28, 22, 17, 0.55); }
      .imc-summary-total {
        margin-left: auto;
        font-size: 0.82rem;
        color: rgba(28, 22, 17, 0.55);
        letter-spacing: 0.03em;
      }

      /* Table */
      .imc-preview-tablewrap {
        background: #fff;
        border: 1px solid rgba(28, 22, 17, 0.08);
        border-radius: 12px;
        overflow: hidden;
        max-height: 60vh;
        overflow-y: auto;
      }
      .imc-table {
        width: 100%;
        border-collapse: collapse;
        font-size: 0.84rem;
      }
      .imc-table thead th {
        position: sticky;
        top: 0;
        text-align: left;
        font-size: 0.7rem;
        font-weight: 500;
        letter-spacing: 0.12em;
        text-transform: uppercase;
        color: rgba(28, 22, 17, 0.55);
        padding: 0.85rem 1rem;
        border-bottom: 1px solid rgba(28, 22, 17, 0.07);
        background: rgba(28, 22, 17, 0.02);
        z-index: 1;
      }
      .imc-table tbody td {
        padding: 0.7rem 1rem;
        border-bottom: 1px solid rgba(28, 22, 17, 0.05);
        vertical-align: top;
      }
      .row--error  td { background: rgba(170, 50, 50, 0.04); }
      .row--update td { background: rgba(70, 110, 195, 0.03); }

      .imc-rownum {
        font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
        font-size: 0.75rem;
        color: rgba(28, 22, 17, 0.45);
      }

      .chip {
        display: inline-block;
        padding: 0.2rem 0.55rem;
        border-radius: 5px;
        font-size: 0.68rem;
        letter-spacing: 0.06em;
        text-transform: uppercase;
        font-weight: 500;
      }
      .chip--ok   { background: rgba(34, 145, 99, 0.13);  color: #1f6b48; }
      .chip--info { background: rgba(70, 110, 195, 0.13); color: #2c5394; }
      .chip--err  { background: rgba(170, 50, 50, 0.13);  color: #8a2a2a; }
      .chip--mute { background: rgba(28, 22, 17, 0.07);   color: rgba(28, 22, 17, 0.55); }

      .imc-name {
        font-weight: 500;
        color: #1c1611;
        line-height: 1.3;
      }
      .imc-slug {
        margin-top: 0.15rem;
        font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
        font-size: 0.72rem;
        color: rgba(28, 22, 17, 0.45);
      }
      .imc-detail-ok {
        font-size: 0.78rem;
        color: rgba(28, 22, 17, 0.55);
      }
      .imc-detail-err {
        font-size: 0.78rem;
        color: #7a2424;
        font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
      }
      .imc-errors {
        margin: 0;
        padding-left: 1rem;
        font-size: 0.78rem;
        color: #7a2424;
        line-height: 1.5;
      }
      .imc-errors li { margin-bottom: 0.15rem; }

      /* Actions */
      .imc-actions {
        display: flex;
        justify-content: flex-end;
        gap: 0.65rem;
        padding: 1rem 0 0;
      }
      .imc-btn {
        padding: 0.75rem 1.35rem;
        border-radius: 9px;
        font-size: 0.85rem;
        letter-spacing: 0.03em;
        font-weight: 500;
        font-family: inherit;
        cursor: pointer;
        border: 1px solid transparent;
        transition: background 0.18s, color 0.18s, border-color 0.18s, box-shadow 0.18s;
      }
      .imc-btn--primary {
        background: linear-gradient(135deg, #c09a5a, #8a6936);
        color: #1c1611;
      }
      .imc-btn--primary:hover:not(:disabled) {
        box-shadow: 0 10px 22px -10px rgba(192, 154, 90, 0.5);
      }
      .imc-btn--ghost {
        background: transparent;
        color: rgba(28, 22, 17, 0.65);
        border-color: rgba(28, 22, 17, 0.18);
      }
      .imc-btn--ghost:hover:not(:disabled) {
        background: rgba(28, 22, 17, 0.04);
        color: #1c1611;
      }
      .imc-btn:disabled { opacity: 0.5; cursor: not-allowed; }

      /* Error */
      .imc-error {
        padding: 0.9rem 1.1rem;
        background: rgba(170, 50, 50, 0.08);
        border: 1px solid rgba(170, 50, 50, 0.3);
        border-radius: 10px;
        font-size: 0.85rem;
        color: #7a2424;
      }
    `}</style>
  );
}
