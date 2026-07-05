import { supabaseAdmin } from '@/lib/supabase';
import CatalogClient from './CatalogClient';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const metadata = {
  title: 'Catálogo PDF',
  robots: { index: false, follow: false },
};

async function fetchCatalogProducts() {
  if (!supabaseAdmin) return { rows: [], error: 'Supabase no configurado' };

  const { data, error } = await supabaseAdmin
    .from('products')
    .select(`
      id, slug, name, brand, product_type, type, gender,
      base_price, stock,
      product_sizes ( ml, price, order_index ),
      product_images ( url, order_index )
    `)
    .order('brand', { ascending: true })
    .order('name', { ascending: true })
    .limit(1000);

  if (error) return { rows: [], error: error.message };

  const rows = (data || []).map((p) => {
    // Tamaños vendibles (precio > 0), ordenados de menor a mayor precio.
    const sizes = (p.product_sizes || [])
      .filter((s) => Number(s.price) > 0)
      .sort((a, b) => Number(a.price) - Number(b.price))
      .map((s) => ({ ml: s.ml, price: Number(s.price) }));

    // Fallback: sin tamaños con precio pero con base_price → una sola línea.
    const displaySizes = sizes.length
      ? sizes
      : (Number(p.base_price) > 0 ? [{ ml: '', price: Number(p.base_price) }] : []);

    const images = (p.product_images || [])
      .slice()
      .sort((a, b) => (a.order_index ?? 99) - (b.order_index ?? 99));
    const thumb = images[0]?.url || (p.slug ? `/img/${p.slug}.webp` : '/img/placeholder-perfume.webp');

    return {
      id: p.id,
      slug: p.slug,
      name: p.name,
      brand: p.brand || '',
      productType: p.product_type || '',
      conc: p.type || '',
      gender: p.gender || '',
      thumb,
      displaySizes,
      fromPrice: displaySizes[0]?.price || 0,
    };
  });

  return { rows, error: null };
}

export default async function AdminCatalogPage() {
  const { rows, error } = await fetchCatalogProducts();
  return <CatalogClient products={rows} loadError={error} />;
}
