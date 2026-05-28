import { getAllProducts, getAllBrands, productTypes, collections } from '@/lib/products';
import { SITE_URL, SITE_NAME, SITE_LOCALE } from '@/lib/site';
import { filterAndSort, PAGE_SIZE } from '@/lib/shop-filters';
import ProductCard from '@/components/ui/ProductCard';
import ShopFilters from '@/components/pages/ShopFilters';
import ShopLoadMore, { ShopEmptyState } from '@/components/ui/ShopLoadMore';
import QuickViewModal from '@/components/ui/QuickViewModal';
import Breadcrumbs from '@/components/ui/Breadcrumbs';

// La página usa `await searchParams` para filtrar productos, por lo que es
// inherentemente dinámica. NO se puede combinar con `revalidate` (causa el
// error "Server Components render" en Next.js 15 durante SPA navigation).
export const dynamic = 'force-dynamic';

const aromaCats = [
  { id: 'Todos', label: 'Todos' },
  ...collections.map(c => ({ id: c.id, label: c.name })),
];

const typeCats = [
  { id: 'Todos', label: 'Todos' },
  ...productTypes.map(t => ({ id: t.id, label: t.name })),
];

// allBrands ya no se calcula a nivel módulo (antes leía de array hardcoded).
// Ahora se obtiene async dentro de TiendaPage con getAllBrands().

function parseSearchParams(sp) {
  return {
    cat: sp.cat || 'Todos',
    type: sp.type || 'Todos',
    sort: sp.sort || 'featured',
    brand: sp.brand || 'Todos',
    q: sp.q || '',
    page: Math.max(1, parseInt(sp.page || '1', 10) || 1),
  };
}

// Genera segmentos de canonical sin el param "page" (la paginada apunta a su base)
function buildCanonical({ cat, type, sort, brand, q }) {
  const params = new URLSearchParams();
  if (type !== 'Todos') params.set('type', type);
  if (cat !== 'Todos') params.set('cat', cat);
  if (brand !== 'Todos') params.set('brand', brand);
  if (q) params.set('q', q);
  if (sort !== 'featured') params.set('sort', sort);
  const qs = params.toString();
  return qs ? `${SITE_URL}/tienda?${qs}` : `${SITE_URL}/tienda`;
}

function buildHeading({ cat, type, brand }) {
  if (brand !== 'Todos') return brand;
  if (type !== 'Todos') return productTypes.find(t => t.id === type)?.name || null;
  if (cat !== 'Todos') return collections.find(c => c.id === cat)?.name || null;
  return null;
}

export async function generateMetadata({ searchParams }) {
  const sp = await searchParams;
  const f = parseSearchParams(sp);
  const heading = buildHeading(f);
  const canonical = buildCanonical(f);

  let title;
  let description;
  if (f.q) {
    title = `Resultados para "${f.q}" — Tienda`;
    description = `Perfumes de lujo que coinciden con "${f.q}". Envío express en Colombia, 100% auténticos.`;
  } else if (f.brand !== 'Todos') {
    title = `Perfumes ${f.brand} — Colección Oficial`;
    description = `Descubre todos los perfumes ${f.brand} disponibles en ScentualBliss. Originales 100% con envío en 24-48h a toda Colombia.`;
  } else if (f.type !== 'Todos') {
    // productTypes ya incluyen "Perfumes" en su nombre → no anteponer
    title = `${heading} — Catálogo Completo`;
    description = `Explora nuestra selección de ${heading?.toLowerCase()}: las mejores fragancias con envío express en Colombia.`;
  } else if (f.cat !== 'Todos') {
    title = `Perfumes ${heading} — Familia Olfativa`;
    description = `Fragancias ${heading?.toLowerCase()} cuidadosamente seleccionadas. Envío express en 24-48h en Colombia.`;
  } else {
    title = 'Tienda — Todos los Perfumes de Lujo';
    description = 'Explora nuestra colección completa de fragancias exclusivas. Filtra por marca, familia olfativa y tipo. Envío gratis desde COP $350.000.';
  }

  // Páginas paginadas (?page=2+) no se indexan: apuntan canonical a la base
  const noindex = f.page > 1;

  return {
    title,
    description,
    alternates: { canonical },
    robots: noindex ? { index: false, follow: true } : undefined,
    openGraph: {
      title,
      description,
      url: canonical,
      type: 'website',
      siteName: SITE_NAME,
      locale: SITE_LOCALE,
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
    },
  };
}

export default async function TiendaPage({ searchParams }) {
  const sp = await searchParams;
  const f = parseSearchParams(sp);

  // Carga catálogo + lista de marcas desde Supabase (cacheado en memoria).
  const [allProducts, allBrands] = await Promise.all([
    getAllProducts(),
    getAllBrands(),
  ]);

  const filtered = filterAndSort(allProducts, f);
  const limit = f.page * PAGE_SIZE;
  const visible = filtered.slice(0, limit);
  const hasMore = filtered.length > visible.length;

  const heading = buildHeading(f);
  const canonical = buildCanonical(f);

  const activeFilters = [
    f.type !== 'Todos' && { key: 'type', value: f.type, label: productTypes.find(t => t.id === f.type)?.name || f.type },
    f.cat !== 'Todos' && { key: 'cat', value: f.cat, label: collections.find(c => c.id === f.cat)?.name || f.cat },
    f.brand !== 'Todos' && { key: 'brand', value: f.brand, label: f.brand },
  ].filter(Boolean);

  // Breadcrumbs visuales + structured data
  const breadcrumbItems = [
    { name: 'Inicio', url: SITE_URL },
    { name: 'Tienda', url: `${SITE_URL}/tienda` },
    ...(heading ? [{ name: heading, url: canonical }] : []),
  ];

  // JSON-LD ItemList con productos visibles
  const itemListSchema = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: heading ? `${heading} — ScentualBliss` : 'Catálogo de Perfumes',
    numberOfItems: filtered.length,
    itemListElement: visible.map((p, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      url: `${SITE_URL}/perfume/${p.slug}`,
      name: p.name,
    })),
  };

  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: breadcrumbItems.map((b, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: b.name,
      item: b.url,
    })),
  };

  return (
    <main id="main-content" style={{ minHeight: '80vh' }}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />

      {/* Shop header */}
      <div className="shop-header">
        <div className="container">
          <Breadcrumbs items={breadcrumbItems} />
          <p className="shop-header-eyebrow">ScentualBliss · Tienda</p>
          <h1 className="shop-header-title">
            {heading
              ? f.brand !== 'Todos'
                ? <em>{heading}</em>
                : heading.startsWith('Perfumes')
                  ? <em>{heading}</em>
                  : <>Perfumes <em>{heading}</em></>
              : <>La <em>Colección</em></>}
          </h1>
          <p className="shop-header-count">{filtered.length} fragancias</p>
        </div>
      </div>

      <div className="container shop-body">
        <div className="shop-filters-sticky">
          <ShopFilters
            cat={f.cat}
            type={f.type}
            sort={f.sort}
            brand={f.brand}
            q={f.q}
            typeCats={typeCats}
            aromaCats={aromaCats}
            allBrands={allBrands}
            activeFilters={activeFilters}
            totalResults={filtered.length}
          />
        </div>

        {filtered.length === 0 ? (
          <ShopEmptyState hasFilters={activeFilters.length > 0 || !!f.q} />
        ) : (
          <div className="grid-4">
            {visible.map((p, i) => (
              <ProductCard key={p.id} product={p} priority={i < 4} />
            ))}
            <ShopLoadMore
              initialPage={f.page}
              initialShown={visible.length}
              initialTotal={filtered.length}
            />
          </div>
        )}
      </div>

      <QuickViewModal />
    </main>
  );
}
