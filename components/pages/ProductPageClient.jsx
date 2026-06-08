'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ShoppingBag, Heart, Star, Truck, Shield, RotateCcw, Zap, Check, ChevronDown, Users, Award, Clock } from 'lucide-react';
import { useCartStore } from '@/lib/store/cartStore';
import { useWishlistStore } from '@/lib/store/wishlistStore';
import { Reveal, StaggerContainer, StaggerItem } from '@/components/ui/ScrollAnimations';
import ProductCard from '@/components/ui/ProductCard';
import ProductReviews from '@/components/ui/ProductReviews';
import BrandLogo from '@/components/ui/BrandLogo';
import { getImagePath } from '@/lib/products-constants';
import { formatCOP } from '@/lib/format';
import toast from 'react-hot-toast';

const CATEGORY_LABELS = {
  // Tipos de producto (productType)
  nicho:     { label: 'Nicho',     color: '#9B59B6', bg: 'rgba(155,89,182,.15)' },
  disenador: { label: 'Diseñador', color: '#C9A96E', bg: 'rgba(201,169,110,.15)' },
  arabe:     { label: 'Árabe',     color: '#E8687A', bg: 'rgba(232,104,122,.15)' },
  // Familias olfativas (category)
  floral:    { label: 'Floral',    color: '#E8687A', bg: 'rgba(232,104,122,.15)' },
  frutal:    { label: 'Frutal',    color: '#E85D75', bg: 'rgba(232,93,117,.12)' },
  fresco:    { label: 'Fresco',    color: '#4A9B8E', bg: 'rgba(74,155,142,.15)' },
  citrico:   { label: 'Cítrico',   color: '#F5A623', bg: 'rgba(245,166,35,.15)' },
  dulce:     { label: 'Dulce',     color: '#C2A878', bg: 'rgba(194,168,120,.15)' },
  amaderado: { label: 'Amaderado', color: '#8B6914', bg: 'rgba(139,105,20,.15)' },
  // Legacy (por si algún producto aún tiene estas categorías)
  oriental:  { label: 'Oriental',  color: '#C9A96E', bg: 'rgba(201,169,110,.15)' },
  woody:     { label: 'Amaderado', color: '#8B6914', bg: 'rgba(139,105,20,.15)' },
  fresh:     { label: 'Fresco',    color: '#4A9B8E', bg: 'rgba(74,155,142,.15)' },
};

// Normaliza string: minúsculas + sin acentos
const norm = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

// Detecta si product.badge es redundante con productType (ya se muestra como primaryCat)
// Ej.: badge "Niche" + productType "nicho" → duplicado
function isRedundantTypeBadge(product) {
  if (!product?.badge || !product?.productType) return false;
  const b = norm(product.badge);
  const equivalents = {
    nicho:     ['nicho', 'niche'],
    disenador: ['disenador', 'diseñador', 'designer'],
    arabe:     ['arabe', 'árabe', 'arabic'],
  };
  return (equivalents[product.productType] || []).includes(b);
}

const faqItems = [
  { q: '¿Es 100% original?', a: 'Sí. Todos nuestros perfumes son auténticos y certificados. Trabajamos directamente con distribuidores oficiales.' },
  { q: '¿Cuánto tarda el envío?', a: 'Envío gratis a toda Colombia. Los pedidos antes de las 2 PM se despachan el mismo día.' },
  { q: '¿Puedo devolverlo si no me gusta?', a: '30 días de garantía sin preguntas. Si no estás satisfecho, te devolvemos el dinero o hacemos el cambio.' },
];

function FaqItem({ q, a }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ borderBottom: '1px solid var(--dark-4)' }}>
      <button onClick={() => setOpen(o => !o)} style={{
        width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '16px 0', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', gap: '12px',
      }}>
        <span style={{ fontWeight: 600, color: 'var(--white)', fontSize: '.9rem' }}>{q}</span>
        <ChevronDown size={16} style={{ color: 'var(--gold)', flexShrink: 0, transform: open ? 'rotate(180deg)' : 'none', transition: 'transform .3s' }} />
      </button>
      {open && <p style={{ color: 'var(--gray-light)', fontSize: '.88rem', lineHeight: 1.7, paddingBottom: '16px' }}>{a}</p>}
    </div>
  );
}

export default function ProductPageClient({ product, resolvedImages, related = [] }) {
  const productSizes = product?.sizes || [];
  const [selSize, setSelSize] = useState(productSizes[1]?.ml || productSizes[0]?.ml || null);
  const selectedSizeObj = productSizes.find(s => s.ml === selSize) || productSizes[0];
  const displayPrice = selectedSizeObj?.price ?? product?.price ?? 0;
  const [imgIdx, setImgIdx] = useState(0);
  const [qty, setQty] = useState(1);
  const [tab, setTab] = useState('descripcion');
  const { addItem } = useCartStore();
  const { items: rawWishlist, toggle: toggleWishlist } = useWishlistStore();
  const wishlistItems = Array.isArray(rawWishlist) ? rawWishlist : [];
  const wishlisted = product ? wishlistItems.some(i => i?.id === product.id) : false;

  // Reviews reales desde Supabase
  const [realReviews, setRealReviews] = useState([]);
  useEffect(() => {
    if (!product?.slug) return;
    fetch(`/api/reviews?slug=${product.slug}`)
      .then(r => r.ok ? r.json() : [])
      .then(data => Array.isArray(data) && setRealReviews(data))
      .catch(() => {});
  }, [product?.slug]);

  // "X personas están viendo esto" — número random.
  // CRÍTICO: Math.random() en render directo causaba hydration mismatch
  // (server generaba un número, cliente otro → React reventaba el árbol
  // entero → "Algo salió mal"). Lo calculamos en useEffect (solo cliente)
  // y mostramos solo cuando ya existe el valor.
  const [liveViewers, setLiveViewers] = useState(null);
  useEffect(() => {
    setLiveViewers(Math.floor(Math.random() * 20) + 8);
  }, []);

  // Sin fallback al rating/reviews hardcoded de lib/products.js: si no hay
  // reseñas reales en Supabase, mostramos 0 y la UI se adapta (oculta el
  // bloque de estrellas y muestra "Aún sin reseñas").
  const reviewCount = realReviews.length;
  const avgRating = realReviews.length
    ? (realReviews.reduce((s, r) => s + r.rating, 0) / realReviews.length).toFixed(1)
    : 0;
  const recommendPct = realReviews.length
    ? Math.round(realReviews.filter(r => r.rating >= 4).length / realReviews.length * 100)
    : null;

  if (!product) return (
    <div style={{ textAlign: 'center', padding: '120px 24px' }}>
      <h2 style={{ fontFamily: 'var(--font-serif)', color: 'var(--white)' }}>Producto no encontrado</h2>
      <Link href="/tienda" className="btn btn-outline" style={{ marginTop: '24px' }}>Volver a la Tienda</Link>
    </div>
  );

  // `related` viene desde el server padre (app/perfume/[slug]/page.js)
  // que calcula los productos relacionados ya filtrados.

  const discount = product.originalPrice ? Math.round((1 - product.price / product.originalPrice) * 100) : null;
  // El "tipo de producto" es Diseñador / Nicho / Árabe (product.productType)
  // NOT product.type que es la concentración (EDP / EDT / Parfum).
  const primaryCat = CATEGORY_LABELS[product.productType] || CATEGORY_LABELS[product.category] || CATEGORY_LABELS['disenador'];
  // Familias olfativas: array de hasta 5. Fallback a [product.category] para
  // productos viejos que solo tengan la singular poblada.
  const scentCats = (Array.isArray(product.categories) && product.categories.length
      ? product.categories
      : (product.category ? [product.category] : [])
    )
    .map(id => ({ id, ...(CATEGORY_LABELS[id] || {}) }))
    .filter(c => c.label);
  const scentCat = scentCats[0]; // primera = principal (compat con UI vieja)

  // Imagenes resueltas: prioridad → resolvedImages (server-side fs scan) → product.images → fallback
  const hasRealImages = product.images?.length && !product.images[0]?.includes('placeholder');
  const productImages = (resolvedImages && resolvedImages.length)
    ? resolvedImages
    : (hasRealImages ? product.images : [getImagePath(product)]);

  const handleAdd = () => {
    if (displayPrice <= 0) {
      toast.error('Producto sin precio. Consúltanos por WhatsApp.', {
        style: { background: '#1A1A1A', color: '#fff', border: '1px solid rgba(232,104,122,.4)' },
      });
      return;
    }
    for (let i = 0; i < qty; i++) addItem(product, selSize);
    toast.success(`${product.name} agregado al carrito`, {
      style: { background: '#1A1A1A', color: '#fff', border: '1px solid rgba(201,169,110,.3)' },
      iconTheme: { primary: '#C9A96E', secondary: '#000' },
    });
  };

  const handleBuyNow = () => {
    if (displayPrice <= 0) {
      toast.error('Producto sin precio. Consúltanos por WhatsApp.', {
        style: { background: '#1A1A1A', color: '#fff', border: '1px solid rgba(232,104,122,.4)' },
      });
      return;
    }
    addItem(product, selSize);
    window.location.href = '/checkout';
  };

  const benefits = product.benefits || [
    `Duración excepcional: ${product.longevity}`,
    `Proyección ${product.sillage} — se nota sin ser invasivo`,
    `Ideal para ${product.occasion?.join(', ') || product.season}`,
  ];

  return (
    <main className="pdp-light">
      {/* URGENCY BANNER */}
      {product.stock <= 15 && (
        <div style={{
          background: 'linear-gradient(90deg, rgba(192,74,92,.08), rgba(192,74,92,.14), rgba(192,74,92,.08))',
          borderBottom: '1px solid rgba(192,74,92,.3)',
          padding: '10px 24px', textAlign: 'center',
        }}>
          <p style={{ fontSize: '.82rem', color: 'var(--error)', fontWeight: 700, letterSpacing: '.04em' }}>
            🔥 ¡Solo quedan <strong>{product.stock} unidades</strong>! {product.stock <= 5 ? 'Último stock disponible.' : 'Pide antes de que se agote.'}
          </p>
        </div>
      )}

      <div className="container" style={{ padding: '32px 24px' }}>
        {/* BREADCRUMB */}
        <nav style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '28px', fontSize: '.78rem', color: 'var(--gray)' }}>
          <Link href="/" style={{ color: 'var(--gray)' }}>Inicio</Link>
          <span>/</span>
          <Link href="/tienda" style={{ color: 'var(--gray)' }}>Tienda</Link>
          <span>/</span>
          {product.productType && (
            <>
              <Link href={`/tienda?type=${product.productType}`} style={{ color: 'var(--gold)' }}>{primaryCat.label}</Link>
              <span>/</span>
            </>
          )}
          <span style={{ color: 'var(--white)' }}>{product.name}</span>
        </nav>

        {/* MAIN GRID */}
        <div className="product-main-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '64px', marginBottom: '80px', alignItems: 'start' }}>

          {/* LEFT: GALLERY */}
          <div className="product-gallery" style={{ position: 'sticky', top: '100px' }}>
            <div className="product-main-img" style={{ position: 'relative', aspectRatio: '4/5', borderRadius: '20px', overflow: 'hidden', background: '#F8F3EA', marginBottom: '12px' }}>
              <img
                src={productImages[imgIdx]}
                alt={`${product.name} ${product.brand} perfume`}
                style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'transform .4s ease' }}
                onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.04)'}
                onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
                onError={e => { e.currentTarget.src = '/img/placeholder-perfume.webp'; }}
              />
              {/* Badges overlay */}
              <div style={{ position: 'absolute', top: 16, left: 16, display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {/* Oculta el badge si duplica el productType (Niche/Nicho, Designer/Diseñador, Arabic/Árabe) */}
                {product.badge && !isRedundantTypeBadge(product) && (
                  <span className="badge" style={{ background: product.badgeColor || 'var(--gold)' }}>{product.badge}</span>
                )}
                {discount && (
                  <span className="badge" style={{ background: 'var(--error)', color: 'var(--white)' }}>-{discount}%</span>
                )}
                {primaryCat && (
                  <span className="badge" style={{ background: primaryCat.bg, color: primaryCat.color, border: `1px solid ${primaryCat.color}40` }}>
                    {primaryCat.label}
                  </span>
                )}
                {product.type && (
                  <span className="badge" style={{ background: 'rgba(255,255,255,.06)', color: 'var(--gray-light)', border: '1px solid rgba(255,255,255,.12)', fontWeight: 500 }}>
                    {product.type}
                  </span>
                )}
              </div>
              {/* Wishlist overlay */}
              <button
                onClick={() => toggleWishlist(product)}
                style={{
                  position: 'absolute', top: 16, right: 16,
                  width: 40, height: 40, borderRadius: '50%',
                  background: 'rgba(250,248,243,.75)', backdropFilter: 'blur(8px)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: wishlisted ? 'var(--error)' : 'var(--gray-light)',
                  border: '1px solid rgba(31,26,18,.10)', cursor: 'pointer', transition: 'all .2s',
                }}
              >
                <Heart size={17} fill={wishlisted ? 'currentColor' : 'none'} />
              </button>
            </div>
            {/* Thumbnails */}
            {productImages.length > 1 && (
              <div className="product-thumbs" style={{ display: 'flex', gap: '10px' }}>
                {productImages.map((img, i) => (
                  <button key={i} onClick={() => setImgIdx(i)} className="product-thumb" style={{
                    borderRadius: '10px', overflow: 'hidden', flexShrink: 0,
                    border: `2px solid ${imgIdx === i ? 'var(--gold)' : 'var(--dark-4)'}`,
                    transition: 'border-color .2s', padding: 0, background: 'var(--dark-2)',
                  }}>
                    <img src={img} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  </button>
                ))}
              </div>
            )}
            {/* Social Proof Below Image — solo si hay reseñas reales */}
            {realReviews.length > 0 && (
              <div style={{ marginTop: '20px', display: 'flex', gap: '20px', padding: '16px', background: 'var(--dark-2)', borderRadius: '12px', border: '1px solid var(--dark-4)' }}>
                <div style={{ textAlign: 'center', flex: 1 }}>
                  <p style={{ fontFamily: 'var(--font-serif)', fontSize: '1.4rem', color: 'var(--gold)', fontWeight: 600 }}>{reviewCount}</p>
                  <p style={{ fontSize: '.72rem', color: 'var(--gray)', letterSpacing: '.06em', textTransform: 'uppercase' }}>{reviewCount === 1 ? 'Reseña' : 'Reseñas'}</p>
                </div>
                <div style={{ width: 1, background: 'var(--dark-4)' }} />
                <div style={{ textAlign: 'center', flex: 1 }}>
                  <p style={{ fontFamily: 'var(--font-serif)', fontSize: '1.4rem', color: 'var(--gold)', fontWeight: 600 }}>{avgRating}★</p>
                  <p style={{ fontSize: '.72rem', color: 'var(--gray)', letterSpacing: '.06em', textTransform: 'uppercase' }}>Valoración</p>
                </div>
                <div style={{ width: 1, background: 'var(--dark-4)' }} />
                <div style={{ textAlign: 'center', flex: 1 }}>
                  <p style={{ fontFamily: 'var(--font-serif)', fontSize: '1.4rem', color: 'var(--gold)', fontWeight: 600 }}>{recommendPct}%</p>
                  <p style={{ fontSize: '.72rem', color: 'var(--gray)', letterSpacing: '.06em', textTransform: 'uppercase' }}>Recomiendan</p>
                </div>
              </div>
            )}
          </div>

          {/* RIGHT: PURCHASE PANEL */}
          <div>
            {/* Brand + Category */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px', flexWrap: 'wrap' }}>
              <span style={{ color: 'var(--gold)' }}>
                <BrandLogo brand={product.brand} size="md" />
              </span>
              <span style={{ color: 'var(--dark-4)' }}>·</span>
              <span style={{ fontSize: '.72rem', color: 'var(--gray)', letterSpacing: '.08em', textTransform: 'uppercase' }}>{product.gender}</span>
              {scentCats.length > 0 && (
                <>
                  <span style={{ color: 'var(--dark-4)' }}>·</span>
                  {scentCats.map((c) => (
                    <span key={c.id} style={{ fontSize: '.7rem', padding: '2px 10px', borderRadius: '99px', background: c.bg, color: c.color, fontWeight: 600, letterSpacing: '.06em', textTransform: 'uppercase' }}>
                      {c.label}
                    </span>
                  ))}
                </>
              )}
            </div>

            {/* Product Name */}
            <h1 style={{ fontFamily: 'var(--font-serif)', fontWeight: 300, color: 'var(--white)', marginBottom: '8px', fontSize: 'clamp(1.8rem,3vw,2.6rem)', lineHeight: 1.1 }}>
              {product.name}
            </h1>

            {/* Hook */}
            {product.shortDescription && (
              <p style={{ fontSize: '1rem', color: 'var(--gold)', fontStyle: 'italic', marginBottom: '16px', lineHeight: 1.5 }}>
                "{product.shortDescription}"
              </p>
            )}

            {/* Rating real (Supabase). Si aún no hay reseñas, no mostramos
                ninguna estrella ni promedio para no falsear señal de calidad. */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
              {realReviews.length > 0 ? (
                <>
                  <div style={{ display: 'flex', gap: '2px' }}>
                    {[1,2,3,4,5].map(s => (
                      <Star key={s} size={15} style={{ color: 'var(--gold)' }} fill={s <= Math.round(Number(avgRating)) ? 'currentColor' : 'none'} />
                    ))}
                  </div>
                  <span style={{ fontWeight: 700, color: 'var(--white)', fontSize: '.9rem' }}>{avgRating}</span>
                  <span style={{ color: 'var(--gray)', fontSize: '.85rem' }}>({reviewCount} {reviewCount === 1 ? 'reseña' : 'reseñas'})</span>
                </>
              ) : (
                <span style={{ color: 'var(--gray)', fontSize: '.85rem' }}>Aún sin reseñas — sé el primero en opinar</span>
              )}
              <span style={{ marginLeft: '4px', fontSize: '.75rem', color: 'var(--success)', fontWeight: 600 }}>✓ Auténtico</span>
            </div>

            {/* Price */}
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '14px', marginBottom: '6px' }}>
              <span style={{ fontFamily: 'var(--font-serif)', fontSize: '2.4rem', color: 'var(--gold)', fontWeight: 400 }}>
                {displayPrice > 0 ? formatCOP(displayPrice) : 'Consultar precio'}
              </span>
              {product.originalPrice > 0 && (
                <span style={{ fontSize: '1.2rem', color: 'var(--gray)', textDecoration: 'line-through' }}>
                  {formatCOP(product.originalPrice)}
                </span>
              )}
              {discount && (
                <span style={{ background: 'var(--error)', color: '#fff', fontSize: '.78rem', fontWeight: 700, padding: '4px 10px', borderRadius: '99px' }}>
                  Ahorras {discount}%
                </span>
              )}
            </div>
            <p style={{ fontSize: '.78rem', color: 'var(--gray)', marginBottom: '24px' }}>
              Impuestos incluidos · Envío calculado al finalizar
            </p>

            {/* Benefits */}
            <div style={{ marginBottom: '24px', padding: '16px', background: 'rgba(201,169,110,.05)', borderRadius: '10px', border: '1px solid rgba(201,169,110,.15)' }}>
              {benefits.map((b, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', marginBottom: i < benefits.length - 1 ? '10px' : 0 }}>
                  <Check size={15} style={{ color: 'var(--gold)', flexShrink: 0, marginTop: '2px' }} />
                  <span style={{ fontSize: '.88rem', color: 'var(--gray-light)', lineHeight: 1.5 }}>{b}</span>
                </div>
              ))}
            </div>

            {/* Size Selector */}
            <div style={{ marginBottom: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                <label style={{ fontSize: '.8rem', fontWeight: 600, letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--gray-light)' }}>
                  Tamaño: <span style={{ color: 'var(--gold)' }}>{selSize}</span>
                </label>
              </div>
              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                {productSizes.map(s => (
                  <button key={s.ml} onClick={() => setSelSize(s.ml)} style={{
                    padding: '10px 22px', borderRadius: '8px', border: '1.5px solid',
                    borderColor: selSize === s.ml ? 'var(--gold)' : 'var(--dark-4)',
                    background: selSize === s.ml ? 'rgba(201,169,110,.12)' : 'transparent',
                    color: selSize === s.ml ? 'var(--gold)' : 'var(--gray-light)',
                    fontSize: '.88rem', fontWeight: 600, transition: 'all .2s', cursor: 'pointer',
                    display: 'flex', flexDirection: 'column', alignItems: 'center', lineHeight: 1.2,
                  }}>
                    <span>{s.ml}</span>
                    {s.price > 0 && (
                      <span style={{ fontSize: '.72rem', fontWeight: 500, opacity: .85, marginTop: 2 }}>{formatCOP(s.price)}</span>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Qty + CTA */}
            <div style={{ display: 'flex', gap: '12px', marginBottom: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', border: '1.5px solid var(--dark-4)', borderRadius: '8px', overflow: 'hidden', flexShrink: 0 }}>
                <button onClick={() => setQty(q => Math.max(1, q - 1))} style={{ width: 44, height: 56, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--gray)', fontSize: '1.2rem', background: 'var(--dark-2)', cursor: 'pointer' }}>−</button>
                <span style={{ width: 44, textAlign: 'center', fontWeight: 700, color: 'var(--white)', background: 'var(--dark-3)', lineHeight: '56px' }}>{qty}</span>
                <button onClick={() => setQty(q => q + 1)} style={{ width: 44, height: 56, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--gray)', fontSize: '1.2rem', background: 'var(--dark-2)', cursor: 'pointer' }}>+</button>
              </div>
              <button
                onClick={handleAdd}
                disabled={displayPrice <= 0}
                className="btn btn-primary"
                style={{ flex: 1, fontSize: '.95rem', height: '56px', opacity: displayPrice <= 0 ? 0.55 : 1, cursor: displayPrice <= 0 ? 'not-allowed' : 'pointer' }}
              >
                <ShoppingBag size={18} /> {displayPrice > 0 ? 'Agregar al Carrito' : 'Consultar precio'}
              </button>
            </div>

            {/* Buy Now */}
            {displayPrice > 0 && (
              <button onClick={handleBuyNow} className="btn btn-outline btn-full" style={{ marginBottom: '20px', height: '52px' }}>
                Comprar Ahora — {formatCOP(displayPrice * qty)}
              </button>
            )}

            {/* Trust Row */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px', marginBottom: '24px' }}>
              {[
                { icon: Truck, title: 'Envío gratis', desc: 'a toda Colombia' },
                { icon: Shield, title: 'Pago Seguro', desc: 'SSL 256-bit' },
                { icon: RotateCcw, title: '30 días', desc: 'Devolución' },
              ].map(({ icon: Icon, title, desc }) => (
                <div key={title} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px', background: 'var(--dark-2)', borderRadius: '8px', border: '1px solid var(--dark-4)' }}>
                  <Icon size={16} style={{ color: 'var(--gold)', flexShrink: 0 }} />
                  <div>
                    <p style={{ fontSize: '.72rem', fontWeight: 600, color: 'var(--white)' }}>{title}</p>
                    <p style={{ fontSize: '.65rem', color: 'var(--gray)' }}>{desc}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Live Viewers — solo se monta tras hidratar para evitar mismatch SSR/CSR */}
            {liveViewers !== null && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 16px', background: 'rgba(124,158,135,.07)', border: '1px solid rgba(124,158,135,.2)', borderRadius: '8px', marginBottom: '28px' }}>
                <Users size={15} style={{ color: 'var(--success)' }} />
                <span style={{ fontSize: '.82rem', color: 'var(--success)', fontWeight: 600 }}>
                  🟢 {liveViewers} personas están viendo esto ahora mismo
                </span>
              </div>
            )}

            {/* TABS */}
            <div style={{ borderTop: '1px solid var(--dark-4)', paddingTop: '24px' }}>
              <div style={{ display: 'flex', gap: 0, borderBottom: '1px solid var(--dark-4)', marginBottom: '20px', overflowX: 'auto' }}>
                {[
                  { id: 'descripcion', label: 'Descripción' },
                  { id: 'notas', label: 'Notas Olfativas' },
                  { id: 'detalles', label: 'Detalles' },
                ].map(t => (
                  <button key={t.id} onClick={() => setTab(t.id)} style={{
                    padding: '10px 18px', fontSize: '.78rem', fontWeight: 600, letterSpacing: '.06em', textTransform: 'uppercase',
                    border: 'none', background: 'none', cursor: 'pointer', whiteSpace: 'nowrap',
                    color: tab === t.id ? 'var(--gold)' : 'var(--gray)',
                    borderBottom: `2px solid ${tab === t.id ? 'var(--gold)' : 'transparent'}`,
                    marginBottom: '-1px', transition: 'color .2s',
                  }}>{t.label}</button>
                ))}
              </div>

              {tab === 'descripcion' && (
                <div>
                  <p style={{ color: 'var(--gray-light)', lineHeight: 1.9, fontSize: '.95rem', marginBottom: '20px' }}>
                    {product.description}
                  </p>
                  {product.occasion && (
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                      {product.occasion.map(o => (
                        <span key={o} style={{ fontSize: '.75rem', padding: '4px 12px', border: '1px solid rgba(201,169,110,.25)', borderRadius: '99px', color: 'var(--gold)' }}>{o}</span>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {tab === 'notas' && product.notes && (
                <div>
                  {/* Visual Pyramid */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0', marginBottom: '16px' }}>
                    {[
                      { layer: 'Salida', notes: product.notes.top, icon: '✦', width: '60%', bg: 'rgba(201,169,110,.12)' },
                      { layer: 'Corazón', notes: product.notes.heart, icon: '❤', width: '80%', bg: 'rgba(201,169,110,.08)' },
                      { layer: 'Fondo', notes: product.notes.base, icon: '◆', width: '100%', bg: 'rgba(201,169,110,.04)' },
                    ].map(({ layer, notes, icon, width, bg }) => (
                      <div key={layer} style={{ padding: '16px 20px', background: bg, margin: '0 auto', width, borderRadius: '8px', marginBottom: '4px', textAlign: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginBottom: '4px' }}>
                          <span style={{ color: 'var(--gold)', fontSize: '.7rem' }}>{icon}</span>
                          <span style={{ fontSize: '.72rem', fontWeight: 700, letterSpacing: '.12em', textTransform: 'uppercase', color: 'var(--gold)' }}>{layer}</span>
                        </div>
                        <p style={{ fontSize: '.88rem', color: 'var(--gray-light)' }}>{notes}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {tab === 'detalles' && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  {[
                    ['Concentración', product.type],
                    ['Duración', product.longevity],
                    ['Proyección', product.sillage],
                    ['Temporada', product.season],
                    ['Género', product.gender],
                    [scentCats.length > 1 ? 'Familias' : 'Familia', scentCats.map(c => c.label).join(' · ') || '—'],
                    ['Tipo', primaryCat?.label || '—'],
                  ].filter(([,v]) => v).map(([k, v]) => (
                    <div key={k} style={{ padding: '12px 16px', background: 'var(--dark-2)', borderRadius: '8px', border: '1px solid var(--dark-4)' }}>
                      <p style={{ fontSize: '.68rem', color: 'var(--gray)', textTransform: 'uppercase', letterSpacing: '.1em', marginBottom: '4px' }}>{k}</p>
                      <p style={{ color: 'var(--white)', fontWeight: 600, fontSize: '.9rem' }}>{v}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* SOCIAL PROOF BANNER */}
        <div className="pdp-social-proof" style={{ background: 'linear-gradient(135deg, var(--dark-2), var(--dark-3))', border: '1px solid rgba(201,169,110,.15)', borderRadius: '16px', marginBottom: '64px' }}>
          <div className="pdp-social-proof-grid">
            {[
              { icon: Users, value: '50,000+', label: 'Clientes satisfechos' },
              { icon: Award, value: '100%', label: 'Auténtico garantizado' },
              { icon: Clock, value: 'Gratis', label: 'Envío a toda Colombia' },
              { icon: Star, value: '4.9/5', label: 'Valoración promedio' },
            ].map(({ icon: Icon, value, label }) => (
              <div key={label} className="pdp-social-proof-item">
                <Icon className="pdp-social-proof-icon" style={{ color: 'var(--gold)' }} />
                <p className="pdp-social-proof-value">{value}</p>
                <p className="pdp-social-proof-label">{label}</p>
              </div>
            ))}
          </div>
          <style>{`
            .pdp-social-proof { padding: 32px; }
            .pdp-social-proof-grid {
              display: grid;
              grid-template-columns: repeat(4, 1fr);
              gap: 24px;
              text-align: center;
            }
            .pdp-social-proof-item { min-width: 0; }
            .pdp-social-proof-icon {
              width: 24px;
              height: 24px;
              margin: 0 auto 8px;
              display: block;
            }
            .pdp-social-proof-value {
              font-family: var(--font-serif);
              font-size: 1.5rem;
              color: var(--white);
              font-weight: 600;
              margin-bottom: 4px;
              line-height: 1.15;
              word-break: break-word;
            }
            .pdp-social-proof-label {
              font-size: .78rem;
              color: var(--gray);
              letter-spacing: .04em;
              line-height: 1.35;
            }
            @media (max-width: 720px) {
              .pdp-social-proof { padding: 24px 18px; }
              .pdp-social-proof-grid {
                grid-template-columns: repeat(2, 1fr);
                gap: 22px 16px;
              }
              .pdp-social-proof-value { font-size: 1.25rem; }
              .pdp-social-proof-label { font-size: .72rem; }
            }
            @media (max-width: 380px) {
              .pdp-social-proof-value { font-size: 1.1rem; }
            }
          `}</style>
        </div>

        {/* REVIEWS */}
        <ProductReviews
          productSlug={product.slug}
          initialRating={Number(avgRating)}
          initialCount={reviewCount}
        />

        {/* FAQ */}
        <div style={{ maxWidth: '700px', margin: '0 auto 64px' }}>
          <div className="section-header" style={{ marginBottom: '24px' }}>
            <p className="eyebrow">Preguntas frecuentes</p>
            <h2 style={{ fontSize: 'clamp(1.4rem,2.5vw,2rem)' }}>¿Tienes <em style={{ color: 'var(--gold)' }}>dudas?</em></h2>
          </div>
          <div style={{ background: 'var(--dark-2)', border: '1px solid rgba(201,169,110,.15)', borderRadius: '12px', padding: '8px 24px' }}>
            {faqItems.map(item => <FaqItem key={item.q} {...item} />)}
          </div>
        </div>

        {/* RELATED PRODUCTS */}
        {related.length > 0 && (
          <Reveal>
            <div style={{ marginBottom: '48px' }}>
              <div className="section-header" style={{ marginBottom: '32px' }}>
                <p className="eyebrow">También te puede gustar</p>
                <h2 style={{ fontSize: 'clamp(1.6rem,3vw,2.4rem)' }}>Fragancias <em style={{ color: 'var(--gold)' }}>similares</em></h2>
              </div>
              <div className="grid-4">
                {related.map(p => <ProductCard key={p.id} product={p} />)}
              </div>
            </div>
          </Reveal>
        )}
      </div>

      {/* STICKY MOBILE CTA */}
      <div className="mobile-sticky-cta" role="region" aria-label="Acción de compra">
        <div className="mobile-sticky-cta-info">
          <p className="mobile-sticky-cta-size">Talla {selSize}</p>
          <p className="mobile-sticky-cta-price">
            {displayPrice > 0 ? formatCOP(displayPrice) : 'Consultar'}
          </p>
        </div>
        <button
          onClick={handleAdd}
          disabled={displayPrice <= 0}
          className="btn btn-primary mobile-sticky-cta-btn"
          aria-label={displayPrice > 0 ? `Agregar ${product.name} al carrito` : 'Consultar precio'}
        >
          <ShoppingBag size={16} aria-hidden="true" />
          <span>{displayPrice > 0 ? 'Agregar' : 'Consultar'}</span>
        </button>
      </div>

      <style>{`
        @media(max-width:768px) {
          main > .container > div:nth-child(2) { grid-template-columns: 1fr !important; gap: 32px !important; }
          main > .container > div:nth-child(2) > div:first-child { position: static !important; }
          .grid-3 { grid-template-columns: 1fr !important; }
        }
        @media(max-width:640px) {
          .grid-4 { grid-template-columns: repeat(2,1fr) !important; }
        }
      `}</style>
    </main>
  );
}
