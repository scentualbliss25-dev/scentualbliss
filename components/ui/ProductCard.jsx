'use client';
import { useState } from 'react';
import Link from 'next/link';
import { ShoppingBag, Heart, Eye } from 'lucide-react';
import { useCartStore } from '@/lib/store/cartStore';
import { useWishlistStore } from '@/lib/store/wishlistStore';
import { getImagePath } from '@/lib/products';
import { formatCOP } from '@/lib/format';
import toast from 'react-hot-toast';

const TOAST = { style: { background: '#1A1610', color: '#F6F3EE', border: '1px solid rgba(184,144,92,.3)', fontFamily: 'DM Sans, sans-serif' }, iconTheme: { primary: '#B8905C', secondary: '#1A1610' } };

export default function ProductCard({ product, onQuickView }) {
  const [hovered, setHovered] = useState(false);
  const hasRealImages = product.images?.length && !product.images[0]?.includes('placeholder');
  const img = hasRealImages ? product.images[0] : getImagePath(product);
  const { addItem } = useCartStore();
  const { items: wishlistItems, toggle: toggleWishlist } = useWishlistStore();
  const wishlisted = wishlistItems.some(i => i.id === product.id);

  const handleAddToCart = (e) => {
    e.preventDefault();
    e.stopPropagation();
    addItem(product, product.size?.[1] || product.size?.[0]);
    toast.success(`${product.name} agregado`, TOAST);
  };

  return (
    <Link href={`/perfume/${product.slug}`} style={{ display: 'block', textDecoration: 'none' }}>
      <article
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{ cursor: 'pointer' }}
      >
        {/* Image */}
        <div className="product-card-img-wrap" style={{ aspectRatio: '3/4' }}>
          <img
            src={img}
            alt={product.name}
            onError={e => { e.currentTarget.src = '/img/placeholder-perfume.webp'; }}
          />

          {/* Badges */}
          {(product.badge || (product.stock > 0 && product.stock <= 5)) && (
            <div style={{ position: 'absolute', top: 12, left: 12, display: 'flex', flexDirection: 'column', gap: 6, zIndex: 2 }}>
              {product.badge && (
                <span style={{ fontSize: '.6rem', fontWeight: 700, letterSpacing: '.12em', textTransform: 'uppercase', padding: '3px 10px', background: product.badgeColor || 'var(--gold)', color: '#FAF8F3', borderRadius: 2 }}>{product.badge}</span>
              )}
              {product.stock > 0 && product.stock <= 5 && (
                <span style={{ fontSize: '.6rem', fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase', padding: '3px 10px', background: 'rgba(26,22,16,.75)', color: 'var(--gold-light)', borderRadius: 2 }}>
                  Últimas {product.stock}
                </span>
              )}
            </div>
          )}

          {/* Wishlist */}
          <button
            className={`product-card-wishlist ${hovered ? 'is-hover' : ''}`}
            onClick={e => { e.preventDefault(); e.stopPropagation(); toggleWishlist(product); }}
            aria-label={wishlisted ? 'Quitar de favoritos' : 'Agregar a favoritos'}
            style={{
              position: 'absolute', top: 12, right: 12, zIndex: 2,
              width: 36, height: 36, borderRadius: '50%',
              background: 'rgba(246,243,238,.85)', backdropFilter: 'blur(8px)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: wishlisted ? '#C04A5C' : 'var(--gray)',
              border: 'none', cursor: 'pointer',
              transition: 'opacity .25s',
            }}
          >
            <Heart size={15} fill={wishlisted ? 'currentColor' : 'none'} />
          </button>

          {/* Hover overlay + CTA */}
          <div className="product-card-overlay">
            <div className="product-card-cta">
              <button
                id={`add-to-cart-${product.id}`}
                onClick={handleAddToCart}
                style={{
                  flex: 1, padding: '11px 0',
                  background: 'var(--gold)', color: '#FAF8F3',
                  fontSize: '.7rem', fontWeight: 600, letterSpacing: '.15em',
                  textTransform: 'uppercase', border: 'none', cursor: 'pointer',
                  fontFamily: 'var(--font-sans)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                }}
              >
                <ShoppingBag size={13} /> Agregar
              </button>
              {onQuickView && (
                <button
                  onClick={e => { e.preventDefault(); e.stopPropagation(); onQuickView(product); }}
                  style={{
                    width: 40, background: 'rgba(246,243,238,.12)',
                    border: '1px solid rgba(246,243,238,.25)',
                    color: '#FAF8F3', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}
                >
                  <Eye size={14} />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Info */}
        <div className="product-card-info">
          <p style={{ fontSize: '.62rem', letterSpacing: '.22em', color: 'var(--gold)', textTransform: 'uppercase', fontWeight: 500, marginBottom: 5 }}>
            {product.brand}
          </p>
          <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.05rem', color: 'var(--white)', fontWeight: 400, lineHeight: 1.3, marginBottom: 8 }}>
            {product.name}
            {product.type && <em style={{ fontSize: '.85rem', color: 'var(--gray)', fontStyle: 'italic', marginLeft: 6, fontWeight: 300 }}>{product.type}</em>}
          </h3>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '.95rem', fontWeight: 500, color: product.price > 0 ? 'var(--white)' : 'var(--gray)', letterSpacing: '.02em' }}>
              {product.price > 0 ? formatCOP(product.price) : 'Consultar precio'}
            </span>
            <div style={{ display: 'flex', gap: 2 }}>
              {[1,2,3,4,5].map(s => (
                <svg key={s} width="9" height="9" viewBox="0 0 10 10" fill={s <= Math.round(product.rating) ? 'var(--gold)' : 'none'} stroke="var(--gold)" strokeWidth="1.2">
                  <polygon points="5,1 6.2,3.8 9.5,4.2 7.2,6.4 7.9,9.7 5,8.1 2.1,9.7 2.8,6.4 0.5,4.2 3.8,3.8" />
                </svg>
              ))}
            </div>
          </div>
        </div>
      </article>
    </Link>
  );
}
