'use client';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';

export default function ShopLoadMore({ shown, total, nextPage }) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const handleClick = () => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('page', String(nextPage));
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, marginTop: 48 }}>
      <p style={{ fontSize: '.78rem', color: 'var(--gray-light)', letterSpacing: '.06em' }}>
        Mostrando {shown} de {total}
      </p>
      <button onClick={handleClick} className="btn btn-outline" style={{ minWidth: 240 }}>
        Cargar más fragancias
      </button>
    </div>
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
