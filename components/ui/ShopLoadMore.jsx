'use client';
import { useState, useEffect, useRef } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import ProductCard from '@/components/ui/ProductCard';

// Renderiza dentro del .grid-4: agrega productos extra (cliente) y el botón
// "Cargar más" como una celda full-width al final del grid.
export default function ShopLoadMore({ initialPage, initialShown, initialTotal }) {
  const searchParams = useSearchParams();
  const [extra, setExtra] = useState([]);
  const [currentPage, setCurrentPage] = useState(initialPage);
  const [total, setTotal] = useState(initialTotal);
  const [hasMore, setHasMore] = useState(initialShown < initialTotal);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Una nueva combinación de filtros (URL distinta sin contar 'page') invalida
  // los extras cargados — el SSR vuelve a renderizar desde cero.
  const filterKey = (() => {
    const p = new URLSearchParams(searchParams.toString());
    p.delete('page');
    return p.toString();
  })();
  const lastFilterKey = useRef(filterKey);
  useEffect(() => {
    if (lastFilterKey.current !== filterKey) {
      lastFilterKey.current = filterKey;
      setExtra([]);
      setCurrentPage(initialPage);
      setTotal(initialTotal);
      setHasMore(initialShown < initialTotal);
      setError(null);
    }
  }, [filterKey, initialPage, initialShown, initialTotal]);

  async function loadMore() {
    if (loading || !hasMore) return;
    setLoading(true);
    setError(null);
    const nextPage = currentPage + 1;
    try {
      const params = new URLSearchParams(searchParams.toString());
      params.set('page', String(nextPage));
      const res = await fetch(`/api/products?${params.toString()}`);
      if (!res.ok) throw new Error('fetch failed');
      const data = await res.json();
      setExtra(prev => [...prev, ...data.items]);
      setCurrentPage(nextPage);
      setTotal(data.total);
      setHasMore(data.hasMore);
      // Actualizar la URL sin disparar navegación ni re-render server
      const url = new URL(window.location.href);
      url.searchParams.set('page', String(nextPage));
      window.history.replaceState(window.history.state, '', url.toString());
    } catch (e) {
      setError('No se pudo cargar más fragancias. Intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  }

  const shown = initialShown + extra.length;

  return (
    <>
      {extra.map(p => <ProductCard key={p.id} product={p} />)}
      {(hasMore || error) && (
        <div className="grid-load-more">
          <p className="grid-load-more-count" aria-live="polite">
            Mostrando {shown} de {total}
          </p>
          {error && <p className="grid-load-more-error" role="alert">{error}</p>}
          <button
            onClick={loadMore}
            disabled={loading}
            className="btn btn-outline"
            style={{ minWidth: 240 }}
            aria-busy={loading}
          >
            {loading ? 'Cargando…' : 'Cargar más fragancias'}
          </button>
        </div>
      )}
    </>
  );
}

export function ShopEmptyState({ hasFilters }) {
  const router = useRouter();
  const pathname = usePathname();
  return (
    <div style={{ textAlign: 'center', padding: '100px 0' }}>
      <p style={{ fontFamily: 'var(--font-serif)', fontSize: '1.5rem', color: 'var(--gray-light)', fontWeight: 300, marginBottom: 12, fontStyle: 'italic' }}>Sin resultados</p>
      <p style={{ fontSize: '.85rem', color: 'var(--gray)', marginBottom: 24 }}>
        {hasFilters
          ? 'Prueba con otra combinación de filtros o quita la búsqueda.'
          : 'No hay productos en este momento.'}
      </p>
      <button onClick={() => router.push(pathname, { scroll: false })} className="btn btn-outline btn-sm">
        Limpiar filtros
      </button>
    </div>
  );
}
