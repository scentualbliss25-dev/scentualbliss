'use client';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ShoppingBag, Star, Zap } from 'lucide-react';
import Link from 'next/link';
import { useCartStore } from '@/lib/store/cartStore';
import { formatCOP } from '@/lib/wompi';
import { getImagePath } from '@/lib/products';
import toast from 'react-hot-toast';

export default function QuickView({ product, isOpen, onClose }) {
  const [selSize, setSelSize] = useState(null);
  const [imgIdx, setImgIdx] = useState(0);
  const { addItem } = useCartStore();
  const hasRealImages = product?.images?.length && !product.images[0]?.includes('placeholder');
  const productImages = product ? (hasRealImages ? product.images : [getImagePath(product)]) : [];

  useEffect(() => {
    if (product) setSelSize(product.size[1] || product.size[0]);
    setImgIdx(0);
  }, [product]);

  useEffect(() => {
    if (isOpen) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = '';
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  const handleAdd = () => {
    addItem(product, selSize);
    toast.success(`${product.name} agregado al carrito`, {
      style: { background: '#1A1A1A', color: '#fff', border: '1px solid rgba(201,169,110,.3)' },
      iconTheme: { primary: '#C9A96E', secondary: '#000' },
    });
    onClose();
  };

  if (!product) return null;

  const discount = product.originalPrice
    ? Math.round((1 - product.price / product.originalPrice) * 100) : null;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            onClick={onClose}
            style={{ position: 'fixed', inset: 0, background: 'rgba(31,26,18,.40)', backdropFilter: 'blur(4px)', zIndex: 300 }}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 20 }}
            transition={{ duration: 0.35, ease: [0.25, 0.1, 0.25, 1] }}
            style={{
              position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)',
              width: '92%', maxWidth: '860px', maxHeight: '90vh', overflow: 'auto',
              background: 'var(--dark-2)', border: '1px solid rgba(201,169,110,.2)',
              borderRadius: '20px', zIndex: 301, boxShadow: '0 24px 80px rgba(31,26,18,.30)',
            }}
          >
            <button onClick={onClose} style={{
              position: 'absolute', top: 16, right: 16, zIndex: 10,
              width: 36, height: 36, borderRadius: '50%', background: 'rgba(250,248,243,.75)',
              backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'var(--gray)', border: '1px solid rgba(31,26,18,.08)', transition: 'all .2s', cursor: 'pointer',
            }}
              onMouseEnter={e => { e.currentTarget.style.color = 'var(--white)'; e.currentTarget.style.borderColor = 'rgba(201,169,110,.4)'; }}
              onMouseLeave={e => { e.currentTarget.style.color = 'var(--gray)'; e.currentTarget.style.borderColor = 'rgba(31,26,18,.08)'; }}>
              <X size={18} />
            </button>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', height: 'min(88vh, 640px)' }}>

              {/* Imagen */}
              <div style={{ position: 'relative', background: 'var(--dark-3)', overflow: 'hidden' }}>
                <img src={productImages[imgIdx]} alt={product.name}
                  onError={e => { e.currentTarget.src = '/img/placeholder-perfume.webp'; }}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                {product.badge && (
                  <span className="badge" style={{ position: 'absolute', top: 16, left: 16, background: product.badgeColor }}>{product.badge}</span>
                )}
                {discount && (
                  <span className="badge" style={{ position: 'absolute', top: product.badge ? 44 : 16, left: 16, background: 'var(--error)' }}>-{discount}%</span>
                )}
                {productImages.length > 1 && (
                  <div style={{ position: 'absolute', bottom: 16, left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: '6px' }}>
                    {productImages.map((_, i) => (
                      <button key={i} onClick={() => setImgIdx(i)} style={{
                        width: imgIdx === i ? 24 : 8, height: 8, borderRadius: '99px',
                        background: imgIdx === i ? 'var(--gold)' : 'rgba(31,26,18,.30)',
                        border: 'none', cursor: 'pointer', transition: 'all .3s',
                      }} />
                    ))}
                  </div>
                )}
              </div>

              {/* Info panel: scrollable arriba + botones fijos abajo */}
              <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

                {/* Contenido scrollable */}
                <div style={{ flex: 1, overflowY: 'auto', padding: '28px 24px 16px' }}>
                  <p style={{ fontSize: '.68rem', color: 'var(--gold)', fontWeight: 600, letterSpacing: '.14em', textTransform: 'uppercase', marginBottom: '6px' }}>{product.brand} · {product.gender}</p>
                  <h2 style={{ fontFamily: 'var(--font-serif)', fontWeight: 300, color: 'var(--white)', fontSize: '1.65rem', lineHeight: 1.2, marginBottom: '10px' }}>{product.name}</h2>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                    <div style={{ display: 'flex', gap: '2px' }}>
                      {[1,2,3,4,5].map(s => <Star key={s} size={13} style={{ color: 'var(--gold)' }} fill={s <= Math.round(product.rating) ? 'currentColor' : 'none'} />)}
                    </div>
                    <span style={{ fontSize: '.82rem', fontWeight: 600, color: 'var(--white)' }}>{product.rating}</span>
                    <span style={{ color: 'var(--gray)', fontSize: '.78rem' }}>({product.reviews})</span>
                  </div>

                  <div style={{ marginBottom: '12px' }}>
                    {product.price > 0 ? (
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px' }}>
                        <span style={{ fontFamily: 'var(--font-serif)', fontSize: '1.6rem', color: 'var(--gold)' }}>{formatCOP(product.price)}</span>
                        {product.originalPrice > 0 && (
                          <span style={{ fontSize: '.95rem', color: 'var(--gray)', textDecoration: 'line-through' }}>{formatCOP(product.originalPrice)}</span>
                        )}
                      </div>
                    ) : (
                      <span style={{ fontFamily: 'var(--font-serif)', fontSize: '1.1rem', color: 'var(--gray)', fontStyle: 'italic' }}>Consultar precio</span>
                    )}
                  </div>

                  {product.stock <= 10 && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '12px', padding: '7px 10px', background: 'rgba(232,104,122,.08)', border: '1px solid rgba(232,104,122,.25)', borderRadius: '6px' }}>
                      <Zap size={12} style={{ color: 'var(--error)' }} />
                      <span style={{ fontSize: '.75rem', color: 'var(--error)' }}>¡Solo {product.stock} unidades disponibles!</span>
                    </div>
                  )}

                  <p style={{ fontSize: '.85rem', color: 'var(--gray-light)', lineHeight: 1.65, marginBottom: '16px' }}>{product.description}</p>

                  <div style={{ display: 'flex', gap: '12px', padding: '10px', background: 'rgba(201,169,110,.05)', border: '1px solid rgba(201,169,110,.12)', borderRadius: '8px' }}>
                    {[['Salida', product.notes.top], ['Corazón', product.notes.heart], ['Fondo', product.notes.base]].map(([l, n]) => (
                      <div key={l} style={{ flex: 1 }}>
                        <p style={{ fontSize: '.6rem', fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--gold)', marginBottom: '2px' }}>{l}</p>
                        <p style={{ fontSize: '.72rem', color: 'var(--gray-light)', lineHeight: 1.4 }}>{n}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Tamaños + botones: siempre visibles al fondo */}
                <div style={{ padding: '14px 24px 24px', borderTop: '1px solid rgba(201,169,110,.12)', background: 'var(--dark-2)' }}>
                  <div style={{ marginBottom: '12px' }}>
                    <label style={{ fontSize: '.68rem', fontWeight: 600, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--gray)', marginBottom: '8px', display: 'block' }}>Tamaño</label>
                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                      {product.size.map(s => (
                        <button key={s} onClick={() => setSelSize(s)} style={{
                          padding: '7px 14px', borderRadius: '6px', border: '1.5px solid',
                          borderColor: selSize === s ? 'var(--gold)' : 'var(--dark-4)',
                          background: selSize === s ? 'rgba(201,169,110,.1)' : 'transparent',
                          color: selSize === s ? 'var(--gold)' : 'var(--gray-light)',
                          fontSize: '.8rem', fontWeight: 600, cursor: 'pointer', transition: 'all .2s',
                        }}>{s}</button>
                      ))}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button onClick={handleAdd} className="btn btn-primary" style={{ flex: 1, padding: '12px' }}>
                      <ShoppingBag size={15} /> Agregar al Carrito
                    </button>
                    <Link href={`/perfume/${product.slug}`} onClick={onClose} className="btn btn-outline" style={{ flexShrink: 0, padding: '12px 16px' }}>
                      Ver Detalle
                    </Link>
                  </div>
                </div>
              </div>
            </div>

            <style>{`
              @media(max-width:768px) {
                div[style*="1fr 1fr"] { grid-template-columns: 1fr !important; }
              }
            `}</style>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
