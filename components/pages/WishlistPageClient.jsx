'use client';
import Link from 'next/link';
import { Heart, ArrowRight, ShoppingBag } from 'lucide-react';
import { PageTransition } from '@/components/ui/ScrollAnimations';
import { useWishlistStore } from '@/lib/store/wishlistStore';
import { useCartStore } from '@/lib/store/cartStore';
import ProductCard from '@/components/ui/ProductCard';
import toast from 'react-hot-toast';

export default function WishlistPageClient() {
  const { items: rawItems, toggle } = useWishlistStore();
  const items = Array.isArray(rawItems) ? rawItems : [];
  const { addItem } = useCartStore();

  const handleAddAll = () => {
    items.forEach(p => addItem(p, p.sizes?.[1]?.ml || p.sizes?.[0]?.ml));
    toast.success(`${items.length} fragancias agregadas al carrito`, {
      style: { background: '#1A1A1A', color: '#fff', border: '1px solid rgba(201,169,110,.3)' },
      iconTheme: { primary: '#C9A96E', secondary: '#000' },
    });
  };

  return (
    <PageTransition>
    <main style={{ minHeight: '80vh' }}>
      <div style={{ background: 'var(--dark-2)', borderBottom: '1px solid rgba(201,169,110,.1)', padding: '48px 0 32px' }}>
        <div className="container" style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
              <Heart size={22} style={{ color: 'var(--gold)' }} fill="currentColor" />
              <h1 style={{ fontFamily: 'var(--font-serif)', fontWeight: 300, color: 'var(--white)' }}>
                Lista de <em style={{ color: 'var(--gold)' }}>Deseos</em>
              </h1>
            </div>
            <p style={{ color: 'var(--gray)' }}>
              {items.length} {items.length === 1 ? 'fragancia guardada' : 'fragancias guardadas'}
            </p>
          </div>
          {items.length > 0 && (
            <button onClick={handleAddAll} className="btn btn-primary btn-sm" style={{ gap: '8px' }}>
              <ShoppingBag size={15} /> Agregar todo al carrito
            </button>
          )}
        </div>
      </div>

      <div className="container" style={{ padding: '40px 24px' }}>
        {items.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '100px 24px' }}>
            <div style={{ width: 80, height: 80, borderRadius: '50%', background: 'rgba(201,169,110,.08)', border: '1px solid rgba(201,169,110,.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px' }}>
              <Heart size={36} style={{ color: 'var(--dark-4)' }} />
            </div>
            <h2 style={{ fontFamily: 'var(--font-serif)', color: 'var(--white)', marginBottom: '12px', fontWeight: 300 }}>
              Tu lista de deseos está vacía
            </h2>
            <p style={{ color: 'var(--gray)', marginBottom: '32px', maxWidth: '400px', margin: '0 auto 32px' }}>
              Guarda tus fragancias favoritas tocando el corazón en cualquier producto.
            </p>
            <Link href="/tienda" className="btn btn-primary">
              Explorar Fragancias <ArrowRight size={16} />
            </Link>
          </div>
        ) : (
          <div className="grid-4">
            {items.map(p => <ProductCard key={p.id} product={p} />)}
          </div>
        )}
      </div>
    </main>
    </PageTransition>
  );
}
