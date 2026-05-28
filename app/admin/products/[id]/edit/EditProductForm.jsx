'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { updateProduct } from '../../_actions';
import { productTypes, collections } from '@/lib/products-constants';

/**
 * Form de edición de producto.
 *
 * Estructura: secciones tipo "cards" apiladas. Cada sección agrupa campos
 * relacionados (Info, Precio, Notas, Tamaños, Imágenes, Flags). Los
 * tamaños e imágenes son arrays dinámicos — el usuario puede agregar y
 * quitar filas. Al enviar, el server action `updateProduct` recibe todo
 * el FormData, hace UPDATE + delete-insert de sizes/images, invalida el
 * caché y redirige al listado con ?updated=<id>.
 */
export default function EditProductForm({ product, brands }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState('');

  // Arrays dinámicos en client state (sizes e images).
  const [sizes, setSizes] = useState(
    product.product_sizes?.length
      ? product.product_sizes.map((s) => ({ ml: s.ml || '', price: s.price ?? '' }))
      : [{ ml: '', price: '' }]
  );
  const [imageUrls, setImageUrls] = useState(
    product.product_images?.length
      ? product.product_images.map((i) => i.url || '')
      : ['']
  );

  function onSubmit(e) {
    e.preventDefault();
    setError('');
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      const res = await updateProduct(fd);
      // Si el action redirige (caso éxito), no llegamos acá. Sólo errores.
      if (res && !res.ok) setError(res.error || 'Error al guardar');
    });
  }

  return (
    <form onSubmit={onSubmit} className="ef" autoComplete="off">
      <input type="hidden" name="id" value={product.id} />

      {/* ── Información básica ────────────────────────────────────────── */}
      <Section title="Información" desc="Nombre, marca, tipo, descripción.">
        <Field label="Nombre" required>
          <input name="name" defaultValue={product.name || ''} required />
        </Field>

        <div className="row two">
          <Field label="Slug" required hint="Sin espacios. Es la URL: /perfume/<slug>">
            <input name="slug" defaultValue={product.slug || ''} required pattern="^[a-z0-9-]+$" />
          </Field>
          <Field label="Marca">
            <input
              name="brand"
              defaultValue={product.brand || ''}
              list="brand-list"
              placeholder="Dior, Chanel…"
            />
            <datalist id="brand-list">
              {brands.map((b) => <option key={b} value={b} />)}
            </datalist>
          </Field>
        </div>

        <div className="row three">
          <Field label="Tipo">
            <select name="product_type" defaultValue={product.product_type || ''}>
              <option value="">—</option>
              {productTypes.map((t) => (
                <option key={t.id} value={t.id}>{t.name.replace('Perfumes de ', '').replace('Perfumes ', '')}</option>
              ))}
            </select>
          </Field>
          <Field label="Familia olfativa">
            <select name="category" defaultValue={product.category || ''}>
              <option value="">—</option>
              {collections.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </Field>
          <Field label="Concentración" hint="EDP, EDT, Extrait…">
            <input name="type" defaultValue={product.type || ''} placeholder="EDP" />
          </Field>
        </div>

        <div className="row two">
          <Field label="Género">
            <select name="gender" defaultValue={product.gender || ''}>
              <option value="">—</option>
              <option value="Hombre">Hombre</option>
              <option value="Mujer">Mujer</option>
              <option value="Unisex">Unisex</option>
            </select>
          </Field>
          <Field label="Stock">
            <input name="stock" type="number" min="0" step="1" defaultValue={product.stock ?? 0} />
          </Field>
        </div>

        <Field label="Descripción" hint="Texto largo para la PDP.">
          <textarea
            name="description"
            rows={5}
            defaultValue={product.description || ''}
          />
        </Field>
      </Section>

      {/* ── Precios ───────────────────────────────────────────────────── */}
      <Section title="Precio base" desc="Precio fallback. Los tamaños abajo lo sobreescriben en la PDP.">
        <div className="row two">
          <Field label="Precio base (COP)">
            <input name="base_price" type="number" min="0" step="100" defaultValue={product.base_price ?? ''} />
          </Field>
          <Field label="Precio original (tachado)" hint="Opcional. Para mostrar descuento.">
            <input name="original_price" type="number" min="0" step="100" defaultValue={product.original_price ?? ''} />
          </Field>
        </div>
      </Section>

      {/* ── Notas olfativas ───────────────────────────────────────────── */}
      <Section title="Notas olfativas" desc="Separa cada nota con coma.">
        <Field label="Notas de salida">
          <input name="notes_top" defaultValue={product.notes_top || ''} placeholder="Bergamota, Limón, Pimienta" />
        </Field>
        <Field label="Notas de corazón">
          <input name="notes_heart" defaultValue={product.notes_heart || ''} placeholder="Rosa, Jazmín, Iris" />
        </Field>
        <Field label="Notas de fondo">
          <input name="notes_base" defaultValue={product.notes_base || ''} placeholder="Sándalo, Vainilla, Almizcle" />
        </Field>
      </Section>

      {/* ── Tamaños (array dinámico) ──────────────────────────────────── */}
      <Section
        title="Tamaños y precios"
        desc="Cada fila es un tamaño disponible. Mínimo un tamaño con precio."
      >
        <div className="sizes">
          <div className="sizes-head">
            <span>Tamaño</span>
            <span>Precio (COP)</span>
            <span></span>
          </div>
          {sizes.map((s, i) => (
            <div key={i} className="sizes-row">
              <input
                name="sizes_ml"
                value={s.ml}
                onChange={(e) => updateAt(setSizes, i, { ml: e.target.value })}
                placeholder="100ml"
              />
              <input
                name="sizes_price"
                type="number"
                min="0"
                step="100"
                value={s.price}
                onChange={(e) => updateAt(setSizes, i, { price: e.target.value })}
                placeholder="250000"
              />
              <button
                type="button"
                className="row-del"
                onClick={() => setSizes((arr) => arr.filter((_, j) => j !== i))}
                disabled={sizes.length === 1}
                aria-label="Eliminar tamaño"
                title="Eliminar tamaño"
              >×</button>
            </div>
          ))}
          <button
            type="button"
            className="row-add"
            onClick={() => setSizes((arr) => [...arr, { ml: '', price: '' }])}
          >
            + Agregar tamaño
          </button>
        </div>
      </Section>

      {/* ── Imágenes (URLs por ahora; uploader viene en Paso 4) ──────── */}
      <Section
        title="Imágenes"
        desc="URLs de las imágenes del producto. La primera es la principal."
      >
        <div className="images">
          {imageUrls.map((url, i) => (
            <div key={i} className="img-row">
              <span className="img-num">{i + 1}</span>
              <input
                name="image_url"
                value={url}
                onChange={(e) => setImageUrls((arr) => arr.map((u, j) => j === i ? e.target.value : u))}
                placeholder="/img/producto.webp  o  https://…"
              />
              {url && (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img src={url} alt="" className="img-preview" loading="lazy" onError={(e) => { e.currentTarget.style.visibility = 'hidden'; }} />
              )}
              <button
                type="button"
                className="row-del"
                onClick={() => setImageUrls((arr) => arr.filter((_, j) => j !== i))}
                disabled={imageUrls.length === 1}
                aria-label="Eliminar imagen"
              >×</button>
            </div>
          ))}
          <button
            type="button"
            className="row-add"
            onClick={() => setImageUrls((arr) => [...arr, ''])}
          >
            + Agregar imagen
          </button>
          <p className="hint">
            Upload directo desde el navegador llega en el siguiente paso.
            Por ahora, usa una URL existente del catálogo o pega una externa.
          </p>
        </div>
      </Section>

      {/* ── Performance ───────────────────────────────────────────────── */}
      <Section title="Performance y temporada" desc="Cómo se comporta la fragancia.">
        <div className="row three">
          <Field label="Longevidad">
            <input name="longevity" defaultValue={product.longevity || ''} placeholder="8–10 horas" />
          </Field>
          <Field label="Sillage / proyección">
            <input name="sillage" defaultValue={product.sillage || ''} placeholder="Moderado" />
          </Field>
          <Field label="Temporada">
            <input name="season" defaultValue={product.season || ''} placeholder="Otoño / Invierno" />
          </Field>
        </div>
        <Field label="Ocasiones" hint="Separadas con coma.">
          <input
            name="occasion"
            defaultValue={Array.isArray(product.occasion) ? product.occasion.join(', ') : (product.occasion || '')}
            placeholder="Noche, Gala, Cita"
          />
        </Field>
      </Section>

      {/* ── Flags ─────────────────────────────────────────────────────── */}
      <Section title="Visibilidad y badges" desc="Cómo aparece en home/tienda.">
        <div className="checks">
          <label className="check">
            <input type="checkbox" name="bestseller" defaultChecked={!!product.bestseller} />
            <span>Bestseller — aparece en la sección "Más vendidos"</span>
          </label>
          <label className="check">
            <input type="checkbox" name="featured" defaultChecked={!!product.featured} />
            <span>Destacado — aparece en la sección "Destacados"</span>
          </label>
        </div>
        <div className="row two">
          <Field label="Badge (texto)" hint="Ej: Nuevo, Edición limitada">
            <input name="badge" defaultValue={product.badge || ''} />
          </Field>
          <Field label="Badge color" hint="Hex (#c09a5a)">
            <input name="badge_color" defaultValue={product.badge_color || ''} placeholder="#c09a5a" />
          </Field>
        </div>
      </Section>

      {error && <div className="ef-error">{error}</div>}

      {/* ── Footer fijo con acciones ───────────────────────────────────── */}
      <div className="ef-footer">
        <button
          type="button"
          className="btn btn--ghost"
          onClick={() => router.push('/admin/products')}
          disabled={isPending}
        >
          Cancelar
        </button>
        <button type="submit" className="btn btn--primary" disabled={isPending}>
          {isPending ? 'Guardando…' : 'Guardar cambios'}
        </button>
      </div>

      <FormStyles />
    </form>
  );
}

function Section({ title, desc, children }) {
  return (
    <section className="ef-section">
      <header className="ef-section-head">
        <h2>{title}</h2>
        {desc && <p>{desc}</p>}
      </header>
      <div className="ef-section-body">{children}</div>
    </section>
  );
}

function Field({ label, hint, required, children }) {
  return (
    <label className="field">
      <span className="field-label">
        {label}
        {required && <em aria-hidden> *</em>}
      </span>
      {children}
      {hint && <span className="field-hint">{hint}</span>}
    </label>
  );
}

function updateAt(setter, idx, patch) {
  setter((arr) => arr.map((item, i) => (i === idx ? { ...item, ...patch } : item)));
}

function FormStyles() {
  return (
    <style>{`
      .ef {
        display: flex;
        flex-direction: column;
        gap: 1rem;
        font-family: var(--font-montserrat), ui-sans-serif, system-ui, sans-serif;
        color: #2a1f15;
      }
      .ef-section {
        display: grid;
        grid-template-columns: 280px 1fr;
        gap: 2rem;
        padding: 1.5rem 1.6rem;
        background: #fff;
        border: 1px solid rgba(28, 22, 17, 0.08);
        border-radius: 14px;
      }
      @media (max-width: 820px) {
        .ef-section { grid-template-columns: 1fr; gap: 1rem; }
      }
      .ef-section-head h2 {
        margin: 0 0 0.4rem;
        font-size: 1rem;
        font-weight: 500;
        color: #1c1611;
        letter-spacing: 0.01em;
      }
      .ef-section-head p {
        margin: 0;
        font-size: 0.78rem;
        color: rgba(28, 22, 17, 0.55);
        line-height: 1.5;
      }
      .ef-section-body {
        display: flex;
        flex-direction: column;
        gap: 1rem;
      }
      .row {
        display: grid;
        gap: 1rem;
      }
      .row.two   { grid-template-columns: 1fr 1fr; }
      .row.three { grid-template-columns: 1fr 1fr 1fr; }
      @media (max-width: 720px) {
        .row.two, .row.three { grid-template-columns: 1fr; }
      }

      .field {
        display: flex;
        flex-direction: column;
        gap: 0.35rem;
        min-width: 0;
      }
      .field-label {
        font-size: 0.72rem;
        letter-spacing: 0.14em;
        text-transform: uppercase;
        color: rgba(28, 22, 17, 0.5);
      }
      .field-label em {
        color: #c46b1e;
        font-style: normal;
      }
      .field-hint {
        margin-top: 0.1rem;
        font-size: 0.72rem;
        color: rgba(28, 22, 17, 0.45);
        line-height: 1.4;
      }
      .ef input,
      .ef select,
      .ef textarea {
        width: 100%;
        padding: 0.6rem 0.8rem;
        background: #fff;
        border: 1px solid rgba(28, 22, 17, 0.15);
        border-radius: 8px;
        font-size: 0.88rem;
        color: #1c1611;
        font-family: inherit;
        transition: border-color 0.18s, box-shadow 0.18s;
      }
      .ef textarea { resize: vertical; min-height: 100px; line-height: 1.55; }
      .ef input:focus,
      .ef select:focus,
      .ef textarea:focus {
        outline: none;
        border-color: rgba(192, 154, 90, 0.55);
        box-shadow: 0 0 0 3px rgba(192, 154, 90, 0.12);
      }
      .ef input:invalid:not(:placeholder-shown) {
        border-color: rgba(196, 107, 30, 0.5);
      }

      /* Sizes editor */
      .sizes {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
      }
      .sizes-head {
        display: grid;
        grid-template-columns: 1fr 1fr 40px;
        gap: 0.6rem;
        padding: 0 0.2rem;
        font-size: 0.7rem;
        letter-spacing: 0.14em;
        text-transform: uppercase;
        color: rgba(28, 22, 17, 0.5);
      }
      .sizes-row {
        display: grid;
        grid-template-columns: 1fr 1fr 40px;
        gap: 0.6rem;
        align-items: center;
      }

      .row-del {
        width: 32px;
        height: 32px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        background: rgba(170, 50, 50, 0.07);
        border: 1px solid rgba(170, 50, 50, 0.18);
        color: #8a2a2a;
        border-radius: 8px;
        cursor: pointer;
        font-size: 1.1rem;
        line-height: 1;
        transition: background 0.15s;
      }
      .row-del:hover:not(:disabled) { background: rgba(170, 50, 50, 0.15); }
      .row-del:disabled { opacity: 0.3; cursor: not-allowed; }
      .row-add {
        margin-top: 0.4rem;
        align-self: flex-start;
        padding: 0.5rem 0.95rem;
        background: rgba(192, 154, 90, 0.1);
        color: #6b4f24;
        border: 1px dashed rgba(192, 154, 90, 0.4);
        border-radius: 8px;
        font-size: 0.8rem;
        letter-spacing: 0.03em;
        cursor: pointer;
        font-family: inherit;
        transition: background 0.15s, border-color 0.15s;
      }
      .row-add:hover {
        background: rgba(192, 154, 90, 0.18);
        border-color: rgba(192, 154, 90, 0.6);
      }

      /* Images */
      .images {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
      }
      .img-row {
        display: grid;
        grid-template-columns: 28px 1fr 40px 40px;
        gap: 0.6rem;
        align-items: center;
      }
      .img-num {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 28px;
        height: 28px;
        background: rgba(28, 22, 17, 0.06);
        border-radius: 6px;
        font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
        font-size: 0.78rem;
        color: rgba(28, 22, 17, 0.7);
      }
      .img-preview {
        width: 40px;
        height: 40px;
        object-fit: cover;
        border-radius: 6px;
        background: rgba(28, 22, 17, 0.06);
      }
      .hint {
        margin: 0.5rem 0 0;
        font-size: 0.72rem;
        color: rgba(28, 22, 17, 0.5);
        font-style: italic;
      }

      /* Checks */
      .checks {
        display: flex;
        flex-direction: column;
        gap: 0.65rem;
      }
      .check {
        display: flex;
        align-items: center;
        gap: 0.6rem;
        font-size: 0.85rem;
        color: #1c1611;
        cursor: pointer;
      }
      .check input { width: auto; padding: 0; }

      /* Error y footer */
      .ef-error {
        padding: 0.9rem 1.1rem;
        background: rgba(170, 50, 50, 0.08);
        border: 1px solid rgba(170, 50, 50, 0.3);
        border-radius: 10px;
        font-size: 0.86rem;
        color: #7a2424;
      }

      .ef-footer {
        position: sticky;
        bottom: 0;
        display: flex;
        justify-content: flex-end;
        gap: 0.65rem;
        padding: 1rem 1.4rem;
        background: rgba(246, 241, 230, 0.92);
        backdrop-filter: blur(8px);
        border: 1px solid rgba(28, 22, 17, 0.08);
        border-radius: 14px;
        margin-top: 0.5rem;
      }
      .btn {
        display: inline-flex;
        align-items: center;
        padding: 0.7rem 1.4rem;
        border-radius: 9px;
        font-size: 0.85rem;
        letter-spacing: 0.03em;
        font-weight: 500;
        font-family: inherit;
        cursor: pointer;
        text-decoration: none;
        transition: background 0.18s, color 0.18s, border-color 0.18s, box-shadow 0.18s;
        border: 1px solid transparent;
      }
      .btn--primary {
        background: linear-gradient(135deg, #c09a5a, #8a6936);
        color: #1c1611;
      }
      .btn--primary:hover:not(:disabled) {
        box-shadow: 0 10px 22px -10px rgba(192, 154, 90, 0.5);
      }
      .btn--ghost {
        background: transparent;
        color: rgba(28, 22, 17, 0.65);
        border-color: rgba(28, 22, 17, 0.18);
      }
      .btn--ghost:hover:not(:disabled) {
        background: rgba(28, 22, 17, 0.04);
        color: #1c1611;
      }
      .btn:disabled {
        opacity: 0.55;
        cursor: not-allowed;
      }
    `}</style>
  );
}
