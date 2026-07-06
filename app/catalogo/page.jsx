import { fetchCatalogProducts, applyCatalogFilters, buildFilterSummary } from '@/lib/catalog';
import CatalogSearchClient from './CatalogSearchClient';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export const metadata = {
  title: 'Catálogo de Perfumes',
  description: 'Catálogo de fragancias ScentualBliss — perfumería original.',
  robots: { index: false, follow: false },
};

// Página pública (sin login) que renderiza el mismo documento del
// catálogo que /admin/catalog, filtrado por los mismos query params que
// arma el botón "Copiar enlace" del admin. Siempre lee datos frescos —
// es un enlace "en vivo", no un archivo fijo.
export default async function PublicCatalogPage({ searchParams }) {
  const sp = await searchParams;
  const { rows, error } = await fetchCatalogProducts();

  const { list, sort } = applyCatalogFilters(rows, {
    type: sp?.type,
    gender: sp?.gender,
    min: sp?.min,
    max: sp?.max,
    brands: sp?.brands,
    noPrice: sp?.noPrice,
    sort: sp?.sort,
  });

  const filterSummary = buildFilterSummary({
    type: sp?.type || '',
    gender: sp?.gender || '',
    min: sp?.min || '',
    max: sp?.max || '',
    brands: sp?.brands ? sp.brands.split(',').filter(Boolean) : [],
  });

  const today = new Date().toLocaleDateString('es-CO', { day: 'numeric', month: 'long', year: 'numeric' });

  return (
    <div className="pubcat">
      <CatalogSearchClient
        products={list}
        filterSummary={filterSummary}
        todayLabel={today}
        sort={sort}
        loadError={error}
      />

      <style>{`
        .pubcat {
          max-width: 1280px;
          margin: 0 auto;
          padding: 1.5rem 1.25rem 3rem;
        }
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
        @media print {
          .no-print { display: none !important; }
          /* Oculta el navbar/footer del sitio — el PDF solo debe llevar
             el documento del catálogo, no la navegación de la tienda. */
          header.sb-nav, footer.sb-footer { display: none !important; }
          .pubcat { padding: 0; max-width: none; }
        }
      `}</style>
    </div>
  );
}
