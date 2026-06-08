import { NextResponse } from 'next/server';
import { filterAndSort, PAGE_SIZE } from '@/lib/shop-filters';
import { getAllProducts } from '@/lib/products';

export async function GET(request) {
  const sp = new URL(request.url).searchParams;
  const page = Math.max(1, parseInt(sp.get('page') || '1', 10) || 1);
  const filters = {
    cat: sp.get('cat') || 'Todos',
    type: sp.get('type') || 'Todos',
    sort: sp.get('sort') || 'featured',
    brand: sp.get('brand') || 'Todos',
    q: sp.get('q') || '',
  };

  // Tras migrar a Supabase, filterAndSort requiere el array de productos como
  // primer argumento (antes lo importaba como módulo). Sin esto el endpoint
  // devolvía siempre [] → "Cargar más" en /tienda nunca cargaba nada.
  const allProducts = await getAllProducts();
  const filtered = filterAndSort(allProducts, filters);
  const start = (page - 1) * PAGE_SIZE;
  const items = filtered.slice(start, start + PAGE_SIZE);
  const total = filtered.length;
  const hasMore = start + items.length < total;

  return NextResponse.json(
    { items, page, hasMore, total },
    { headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600' } }
  );
}
