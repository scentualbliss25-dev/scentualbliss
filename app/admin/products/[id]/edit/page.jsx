import Link from 'next/link';
import { notFound } from 'next/navigation';
import { supabaseAdmin } from '@/lib/supabase';
import EditProductForm from './EditProductForm';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const metadata = {
  title: 'Editar producto',
  robots: { index: false, follow: false },
};

async function fetchProduct(id) {
  if (!supabaseAdmin) return null;
  const { data, error } = await supabaseAdmin
    .from('products')
    .select(`
      *,
      product_sizes ( id, ml, price, order_index ),
      product_images ( id, url, order_index )
    `)
    .eq('id', id)
    .maybeSingle();
  if (error) {
    console.error('[admin/edit] fetch product error:', error.message);
    return null;
  }
  return data;
}

async function fetchAllBrands() {
  if (!supabaseAdmin) return [];
  const { data } = await supabaseAdmin
    .from('products')
    .select('brand')
    .not('brand', 'is', null);
  return [...new Set((data || []).map((r) => r.brand))].sort((a, b) =>
    a.localeCompare(b)
  );
}

export default async function EditProductPage({ params }) {
  const { id: idParam } = await params;
  const id = Number(idParam);
  if (!Number.isFinite(id)) notFound();

  const [product, brands] = await Promise.all([
    fetchProduct(id),
    fetchAllBrands(),
  ]);

  if (!product) notFound();

  // Normaliza sizes/images con order_index para que el form los renderice
  // en el orden correcto.
  const sizes = (product.product_sizes || [])
    .slice()
    .sort((a, b) => (a.order_index ?? 99) - (b.order_index ?? 99));
  const images = (product.product_images || [])
    .slice()
    .sort((a, b) => (a.order_index ?? 99) - (b.order_index ?? 99));

  return (
    <div className="edit">
      <header className="edit-head">
        <div className="edit-crumbs">
          <Link href="/admin/products">Productos</Link>
          <span aria-hidden> / </span>
          <span className="crumb-current">Editar</span>
        </div>
        <div className="edit-headline">
          <p className="edit-eyebrow">#{product.id} · /{product.slug}</p>
          <h1 className="edit-title">{product.name}</h1>
        </div>
      </header>

      <EditProductForm
        mode="edit"
        product={{ ...product, product_sizes: sizes, product_images: images }}
        brands={brands}
      />

      <style>{`
        .edit {
          padding: 2.25rem 2.25rem 4rem;
          max-width: 1100px;
          margin: 0 auto;
          font-family: var(--font-montserrat), ui-sans-serif, system-ui, sans-serif;
          color: #2a1f15;
        }
        .edit-head {
          margin-bottom: 2rem;
        }
        .edit-crumbs {
          font-size: 0.78rem;
          color: rgba(28, 22, 17, 0.55);
          letter-spacing: 0.04em;
          margin-bottom: 1rem;
        }
        .edit-crumbs a {
          color: #8a6936;
          text-decoration: none;
        }
        .edit-crumbs a:hover { text-decoration: underline; }
        .crumb-current { color: rgba(28, 22, 17, 0.5); }
        .edit-eyebrow {
          margin: 0 0 0.3rem;
          font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
          font-size: 0.72rem;
          color: rgba(28, 22, 17, 0.5);
          letter-spacing: 0.03em;
        }
        .edit-title {
          margin: 0;
          font-size: 1.85rem;
          font-weight: 500;
          letter-spacing: -0.01em;
          color: #1c1611;
        }
      `}</style>
    </div>
  );
}
