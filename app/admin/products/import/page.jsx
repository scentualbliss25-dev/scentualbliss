import Link from 'next/link';
import ImportClient from './ImportClient';

export const metadata = {
  title: 'Importar productos',
  robots: { index: false, follow: false },
};

export default function ImportProductsPage() {
  return (
    <div className="imp">
      <header className="imp-head">
        <div className="imp-crumbs">
          <Link href="/admin/products">Productos</Link>
          <span aria-hidden> / </span>
          <span className="crumb-current">Importar CSV</span>
        </div>
        <div className="imp-headline">
          <p className="imp-eyebrow">Carga masiva</p>
          <h1 className="imp-title">Importar productos desde CSV / Excel</h1>
          <p className="imp-sub">
            Sube un archivo con tus productos. Los que tienen un <code>slug</code> ya existente
            se actualizan, los que no, se crean nuevos.
          </p>
        </div>
        <a href="/admin/products/import/template" download className="imp-tmpl-btn">
          ↓ Descargar plantilla Excel
        </a>
      </header>

      <ImportClient />

      <style>{`
        .imp {
          padding: 2.25rem 2.25rem 4rem;
          max-width: 1100px;
          margin: 0 auto;
          font-family: var(--font-montserrat), ui-sans-serif, system-ui, sans-serif;
          color: #2a1f15;
        }
        .imp-head { margin-bottom: 2rem; position: relative; }
        .imp-crumbs {
          font-size: 0.78rem;
          color: rgba(28, 22, 17, 0.55);
          letter-spacing: 0.04em;
          margin-bottom: 1rem;
        }
        .imp-crumbs a { color: #8a6936; text-decoration: none; }
        .imp-crumbs a:hover { text-decoration: underline; }
        .crumb-current { color: rgba(28, 22, 17, 0.5); }
        .imp-eyebrow {
          margin: 0 0 0.3rem;
          font-size: 0.7rem;
          letter-spacing: 0.2em;
          text-transform: uppercase;
          color: #8a6936;
        }
        .imp-title {
          margin: 0 0 0.5rem;
          font-size: 1.85rem;
          font-weight: 500;
          letter-spacing: -0.01em;
          color: #1c1611;
        }
        .imp-sub {
          margin: 0;
          font-size: 0.86rem;
          color: rgba(28, 22, 17, 0.6);
          max-width: 640px;
          line-height: 1.55;
        }
        .imp-sub code {
          background: rgba(28, 22, 17, 0.06);
          padding: 0.1rem 0.35rem;
          border-radius: 4px;
          font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
          font-size: 0.82em;
        }
        .imp-tmpl-btn {
          position: absolute;
          top: 2.5rem;
          right: 0;
          padding: 0.7rem 1.1rem;
          background: #fff;
          color: #1c1611;
          border: 1px solid rgba(28, 22, 17, 0.18);
          border-radius: 9px;
          font-size: 0.85rem;
          letter-spacing: 0.02em;
          text-decoration: none;
          transition: background 0.15s, border-color 0.15s, color 0.15s;
        }
        .imp-tmpl-btn:hover {
          background: rgba(192, 154, 90, 0.08);
          border-color: rgba(192, 154, 90, 0.5);
          color: #6b4f24;
        }
        @media (max-width: 720px) {
          .imp-tmpl-btn { position: static; display: inline-flex; margin-top: 1rem; }
        }
      `}</style>
    </div>
  );
}
