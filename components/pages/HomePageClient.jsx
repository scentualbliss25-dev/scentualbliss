'use client';
import { useState, useEffect, useRef, useMemo } from 'react';
import Link from 'next/link';
import QuickView from '@/components/ui/QuickView';
import {
  ArrowRight, ArrowLeft, ShoppingBag, Heart, Eye, Star,
  Truck, Shield, RotateCcw, Award, Sparkles, Flame,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { products, collections, testimonials, getImagePath } from '@/lib/products';
import { useCartStore } from '@/lib/store/cartStore';
import { useWishlistStore } from '@/lib/store/wishlistStore';
import './HomePageClient.css';

const COP = (n) => 'COP $' + Number(n || 0).toLocaleString('es-CO');

const TRUST = [
  { Icon: Truck, title: 'Envío Express', desc: 'Entrega 24-48h en Colombia' },
  { Icon: Shield, title: 'Pago seguro', desc: 'SSL + cifrado bancario' },
  { Icon: RotateCcw, title: 'Devolución fácil', desc: '30 días sin preguntas' },
  { Icon: Award, title: '100% auténticos', desc: 'Garantía de originalidad' },
];

const NOTES_ORBIT = [
  { label: 'Bergamota', angle: -30, delay: 0 },
  { label: 'Jazmín',    angle: 40,  delay: 0.6 },
  { label: 'Ámbar',     angle: 110, delay: 1.2 },
  { label: 'Vainilla',  angle: 180, delay: 1.8 },
  { label: 'Oud',       angle: 230, delay: 2.4 },
  { label: 'Sándalo',   angle: 310, delay: 3.0 },
];

// Perfume insignia de marca propia ScentualBliss (edición limitada — pre-orden).
// No vive en lib/products.js: es exclusivo del hero y aún no tiene página de detalle.
const HOUSE_PERFUME = {
  name: 'Aurum',
  type: 'EDP',
  ref: 'SCT-01',
  family: 'Ámbar floral',
  image: '/img/scentual-bliss-perfumery.png',
  status: 'Edición limitada',
  cta: 'Pre-orden',
  // Link directo a WhatsApp con mensaje pre-rellenado para reservar
  ctaHref: 'https://wa.me/573169376436?text=' + encodeURIComponent('Hola! Quiero reservar Aurum EDP — la primera fragancia de autor de ScentualBliss 🌸'),
};

const HERO_BRANDS = [
  'Dior', 'Creed', 'Chanel', 'Lattafa', 'Tom Ford', 'JPG',
  'Carolina Herrera', 'Hugo Boss', 'Armaf', 'Valentino',
  'Versace', 'Givenchy', 'Montale', 'Xerjoff', 'YSL', 'Armani',
];

const QUIZ_STEPS = [
  {
    q: '¿En qué momento quieres que tu fragancia <em>brille</em>?',
    options: [
      { icon: '☀️', text: 'Día y oficina', sub: 'Frescura ligera, energizante', weight: { fresco: 3, citrico: 3, frutal: 1 } },
      { icon: '🌙', text: 'Noches especiales', sub: 'Sensual, profundo, magnético', weight: { dulce: 3, amaderado: 3, floral: 1 } },
      { icon: '🌿', text: 'Casual diario', sub: 'Versátil, fácil de llevar', weight: { fresco: 2, frutal: 2, citrico: 1 } },
      { icon: '✨', text: 'Solo eventos', sub: 'Algo único e inolvidable', weight: { amaderado: 3, dulce: 2, floral: 2 } },
    ],
  },
  {
    q: '¿Qué <em>aroma</em> te detiene en seco al pasar?',
    options: [
      { icon: '🌹', text: 'Flores recién cortadas', sub: 'Rosa, jazmín, gardenia', weight: { floral: 4 } },
      { icon: '🍯', text: 'Vainilla y caramelo', sub: 'Dulce, cremoso, cálido', weight: { dulce: 4 } },
      { icon: '🌲', text: 'Bosque después de lluvia', sub: 'Maderas, pachulí, vetiver', weight: { amaderado: 4 } },
      { icon: '🍋', text: 'Cítricos al amanecer', sub: 'Bergamota, mandarina, lima', weight: { citrico: 4, fresco: 2 } },
    ],
  },
  {
    q: '¿Cómo te describirían las personas más <em>cercanas</em>?',
    options: [
      { icon: '🔥', text: 'Intensa y apasionada', sub: 'Vives todo al máximo', weight: { dulce: 2, amaderado: 3 } },
      { icon: '💎', text: 'Elegante y refinada', sub: 'Tienes ojo para los detalles', weight: { floral: 3, amaderado: 2 } },
      { icon: '🌊', text: 'Libre y aventurera', sub: 'Espontánea y energética', weight: { fresco: 3, citrico: 2 } },
      { icon: '🍓', text: 'Coqueta y juguetona', sub: 'Siempre sorprendes', weight: { frutal: 3, dulce: 2 } },
    ],
  },
];

const FAMILY_NAMES = {
  floral: 'Floral romántica', frutal: 'Frutal vibrante', fresco: 'Fresca libre',
  citrico: 'Cítrica luminosa', dulce: 'Dulce magnética', amaderado: 'Amaderada profunda',
};
const FAMILY_DESC = {
  floral: 'Tu firma es etérea y femenina. Buscas elegancia atemporal con notas de rosa, jazmín y azahar.',
  frutal: 'Eres jugosa, juvenil y memorable. Te van las notas frescas con un toque dulce que dejan huella.',
  fresco: 'Eres aire en movimiento. Notas marinas, hierbas y maderas claras que respiran libertad.',
  citrico: 'Eres pura energía. Bergamota, mandarina y limón que iluminan cualquier espacio.',
  dulce: 'Eres calidez en estado puro. Vainilla, ámbar y maderas adictivas que envuelven la noche.',
  amaderado: 'Eres misterio y profundidad. Sándalo, oud y pachulí: presencia inolvidable.',
};

const TOAST_STYLE = {
  style: { background: '#1F1A14', color: '#FAF8F3', border: '1px solid rgba(184,144,92,.4)' },
  iconTheme: { primary: '#B8905C', secondary: '#FAF8F3' },
};

// ---------- Reveal-on-scroll (con fallback para SSR/producción) ----------
function Reveal({ children, delay = 0, as: Tag = 'div', className = '', style }) {
  const ref = useRef(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    // Fallback: si IntersectionObserver no dispara, mostrar igual tras 200ms
    const fallbackTimer = setTimeout(() => setShown(true), 200);

    if (!ref.current || typeof IntersectionObserver === 'undefined') {
      return () => clearTimeout(fallbackTimer);
    }

    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => {
        if (e.isIntersecting) {
          setShown(true);
          clearTimeout(fallbackTimer);
          io.disconnect();
        }
      }),
      { threshold: 0.12 }
    );
    io.observe(ref.current);

    return () => {
      clearTimeout(fallbackTimer);
      io.disconnect();
    };
  }, []);

  return (
    <Tag ref={ref} className={`reveal ${shown ? 'in' : ''} ${className}`} style={{ ...(style || {}), transitionDelay: delay + 'ms' }}>
      {children}
    </Tag>
  );
}

// ---------- Stars ----------
function Stars({ rating = 5, size = 11 }) {
  return (
    <span className="stars" style={{ display: 'inline-flex', gap: 2 }}>
      {[1, 2, 3, 4, 5].map((s) => (
        <svg key={s} width={size} height={size} viewBox="0 0 24 24"
          fill={s <= Math.round(rating) ? 'var(--gold)' : 'transparent'}
          stroke="var(--gold)" strokeWidth="1.5">
          <polygon points="12,2 15.1,8.3 22,9.3 17,14.1 18.2,21 12,17.8 5.8,21 7,14.1 2,9.3 8.9,8.3" />
        </svg>
      ))}
    </span>
  );
}

// ---------- Parallax hook ----------
function useParallax() {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current; if (!el) return;
    const onMove = (e) => {
      const r = el.getBoundingClientRect();
      const x = ((e.clientX - r.left) / r.width - 0.5);
      const y = ((e.clientY - r.top) / r.height - 0.5);
      el.style.setProperty('--mx', x.toFixed(3));
      el.style.setProperty('--my', y.toFixed(3));
    };
    el.addEventListener('mousemove', onMove);
    return () => el.removeEventListener('mousemove', onMove);
  }, []);
  return ref;
}

// ---------- Countdown (client-only to avoid SSR hydration mismatch) ----------
function useCountdown(target) {
  const [now, setNow] = useState(null);
  useEffect(() => {
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  if (now === null || target === null) return { h: '--', m: '--', s: '--' };
  const diff = Math.max(0, target - now);
  return {
    h: String(Math.floor(diff / 3600000)).padStart(2, '0'),
    m: String(Math.floor((diff % 3600000) / 60000)).padStart(2, '0'),
    s: String(Math.floor((diff % 60000) / 1000)).padStart(2, '0'),
  };
}

// ============================================================
// HERO — futuristic editorial
// ============================================================
function Hero() {
  const stageRef = useParallax();
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 60);
    return () => clearInterval(id);
  }, []);
  const heroProduct = products.find(p => p.slug === 'lattafa-khamrah');

  return (
    <section className="hero-fx" ref={stageRef}>
      <div className="fx-aurora" aria-hidden="true">
        <span className="aurora a1" />
        <span className="aurora a2" />
        <span className="aurora a3" />
      </div>
      <div className="fx-grid" aria-hidden="true" />
      <div className="fx-noise" aria-hidden="true" />

      <div className="fx-side fx-side-l">
        <span>SCT/0001</span>
        <span className="dot" />
        <span>BOG · MED · CTG</span>
        <span className="dot" />
        <span>EST. MMXIX</span>
      </div>
      <div className="fx-side fx-side-r">
        <span>· LIVE</span>
        <span className="pulse" />
        <span>NEW DROP / 04</span>
      </div>

      <div className="container fx-container">
        <div className="fx-left">
          <div className="fx-eyebrow">
            <span className="fx-eyebrow-dot" />
            <span>Perfumería · 2026</span>
            <span className="fx-eyebrow-bar" />
            <span>Drop 04</span>
          </div>
          <h1 className="fx-title">
            <span className="fx-line"><span className="fx-word fx-glitch" data-text="El aroma">El aroma</span></span>
            <span className="fx-line"><span className="fx-word">que <em>te</em></span></span>
            <span className="fx-line"><span className="fx-word fx-italic">define.</span></span>
          </h1>
          <p className="fx-sub">
            Curación obsesiva de fragancias auténticas — diseñador, nicho y árabe.
            Una identidad olfativa que dura más que la noche.
          </p>
          <div className="fx-ctas">
            <Link href="/tienda" className="fx-cta-primary">
              <span>Explorar colección</span>
              <span className="fx-cta-icon"><ArrowRight size={16} /></span>
            </Link>
            <a href="#sb-quiz" className="fx-cta-ghost">
              <Sparkles size={13} /> Quiz olfativo
            </a>
          </div>

          <div className="fx-specs">
            <div><span className="k">155</span><span className="v">Fragancias</span></div>
            <div><span className="k">24h</span><span className="v">Envío</span></div>
            <div><span className="k">100%</span><span className="v">Auténticas</span></div>
            <div><span className="k">28</span><span className="v">Marcas</span></div>
          </div>
        </div>

        <div className="fx-stage">
          <div className="fx-stage-inner">
            <svg className="fx-rings" viewBox="0 0 600 600" aria-hidden="true">
              <defs>
                <linearGradient id="sb-ringGrad" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="#D4B68A" stopOpacity=".9" />
                  <stop offset="50%" stopColor="#B8905C" stopOpacity=".4" />
                  <stop offset="100%" stopColor="#D4B68A" stopOpacity="0" />
                </linearGradient>
              </defs>
              <circle cx="300" cy="300" r="280" fill="none" stroke="url(#sb-ringGrad)" strokeWidth="1" strokeDasharray="2 8" className="ring r1" />
              <circle cx="300" cy="300" r="220" fill="none" stroke="url(#sb-ringGrad)" strokeWidth="1" className="ring r2" />
              <circle cx="300" cy="300" r="160" fill="none" stroke="rgba(212,182,138,.18)" strokeWidth="1" strokeDasharray="1 4" className="ring r3" />
              {Array.from({ length: 36 }).map((_, i) => {
                const a = (i * 10) * Math.PI / 180;
                const x1 = 300 + Math.cos(a) * 285, y1 = 300 + Math.sin(a) * 285;
                const x2 = 300 + Math.cos(a) * (i % 3 === 0 ? 270 : 278), y2 = 300 + Math.sin(a) * (i % 3 === 0 ? 270 : 278);
                return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="rgba(184,144,92,.5)" strokeWidth={i % 3 === 0 ? 1.4 : .8} />;
              })}
            </svg>

            <div className="fx-halo" />
            <div className="fx-beam" />

            <div className="fx-bottle">
              <img src={HOUSE_PERFUME.image} alt={`${HOUSE_PERFUME.name} ${HOUSE_PERFUME.type} — ScentualBliss`} />
              <div className="fx-bottle-shadow" />
            </div>

            <div className="fx-orbit" style={{ '--rot': `${tick * 0.12}deg` }}>
              {NOTES_ORBIT.map((n, i) => (
                <div key={i} className="fx-note" style={{ '--angle': `${n.angle}deg`, animationDelay: `${n.delay}s` }}>
                  <span style={{ transform: `rotate(${-tick * 0.12}deg)` }}>{n.label}</span>
                </div>
              ))}
            </div>

            <div className="fx-hud fx-hud-tl">
              <div className="fx-hud-line">
                <span className="fx-hud-k">REF</span>
                <span className="fx-hud-v">{HOUSE_PERFUME.ref}</span>
              </div>
              <div className="fx-hud-line">
                <span className="fx-hud-k">FAM</span>
                <span className="fx-hud-v">{HOUSE_PERFUME.family}</span>
              </div>
            </div>
            <div className="fx-hud fx-hud-br">
              <div className="fx-hud-bar">
                <div className="fx-hud-bar-fill" />
                <span className="fx-hud-bar-label">Sillage 92%</span>
              </div>
              <div className="fx-hud-bar">
                <div className="fx-hud-bar-fill alt" />
                <span className="fx-hud-bar-label">Longevidad 88%</span>
              </div>
            </div>

            <div className="fx-tag">
              <span className="fx-tag-pulse" />
              <div>
                <p className="fx-tag-eyebrow">Fragancia de autor</p>
                <p className="fx-tag-name">{HOUSE_PERFUME.name} <em>{HOUSE_PERFUME.type}</em></p>
                <p className="fx-tag-price">
                  <span className="fx-tag-status">{HOUSE_PERFUME.status}</span>
                  <span className="fx-tag-sep">·</span>
                  <b>{HOUSE_PERFUME.cta}</b>
                </p>
              </div>
              <a
                href={HOUSE_PERFUME.ctaHref}
                target="_blank"
                rel="noopener noreferrer"
                className="fx-tag-arrow"
                aria-label={`${HOUSE_PERFUME.cta} de ${HOUSE_PERFUME.name}`}
              >
                <ArrowRight size={14} />
              </a>
            </div>
          </div>
        </div>
      </div>

      <div className="fx-marquee">
        <div className="fx-marquee-track">
          {[...Array(2)].map((_, dup) => (
            <span key={dup} style={{ display: 'inline-flex', gap: 56 }}>
              {HERO_BRANDS.map((b, i) => (
                <span key={`${dup}-${i}`} className="fx-marquee-item">
                  <span className="fx-marquee-num">{String(i + 1).padStart(2, '0')}</span>
                  {b}
                </span>
              ))}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}

// ============================================================
// TRUST BAR
// ============================================================
function TrustBar() {
  return (
    <section style={{ borderTop: '1px solid var(--line)', borderBottom: '1px solid var(--line)', background: 'var(--bg-3)', padding: '28px 0' }}>
      <div className="container trust-bar-grid">
        {TRUST.map((it, i) => (
          <Reveal key={it.title} delay={i * 80}>
            <div className="trust-bar-item">
              <div style={{
                width: 42, height: 42, borderRadius: 10,
                background: 'rgba(184,144,92,.1)', border: '1px solid rgba(184,144,92,.25)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                color: 'var(--gold-deep)',
              }}>
                <it.Icon size={18} />
              </div>
              <div>
                <p style={{ fontWeight: 600, color: 'var(--ink)', fontSize: '.88rem', marginBottom: 2 }}>{it.title}</p>
                <p style={{ fontSize: '.74rem', color: 'var(--ink-3)' }}>{it.desc}</p>
              </div>
            </div>
          </Reveal>
        ))}
      </div>
      <style>{`
        .trust-bar-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 20px;
        }
        .trust-bar-item {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        @media (max-width: 768px) {
          .trust-bar-grid {
            grid-template-columns: repeat(2, 1fr);
            gap: 16px;
          }
        }
        @media (max-width: 400px) {
          .trust-bar-grid {
            grid-template-columns: 1fr;
            gap: 14px;
          }
          .trust-bar-item {
            flex-direction: row;
            align-items: center;
          }
        }
      `}</style>
    </section>
  );
}

// ============================================================
// FAMILIES
// ============================================================
function Families() {
  const [active, setActive] = useState(collections[4]?.id || 'dulce');
  return (
    <section className="section section-alt">
      <div className="container">
        <div className="section-head">
          <p className="eyebrow">Familias olfativas</p>
          <h2>Encuentra tu <em>esencia</em>.</h2>
          <p>Seis universos olfativos. Cada uno cuenta una historia distinta sobre quién eres.</p>
        </div>
        <Reveal>
          <div className="families">
            {collections.map((f, i) => (
              <Link
                key={f.id}
                href={`/tienda?cat=${f.id}`}
                className={`family ${active === f.id ? 'active' : ''}`}
                onMouseEnter={() => setActive(f.id)}
                style={{ flex: active === f.id ? 4 : 1 }}
              >
                <img src={f.image} alt={f.name} className="family-img" />
                <div className="family-num">0{i + 1}</div>
                <div className="family-dot-wrap" style={{ background: f.color }} />
                <div className="family-overlay">
                  <h3 className="family-name">{f.name}</h3>
                  <div className="family-detail">
                    <h3>{f.name}</h3>
                    <p>{f.description}</p>
                    <span className="arrow">Explorar <ArrowRight size={13} /></span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </Reveal>
      </div>
    </section>
  );
}

// ============================================================
// PRODUCT CARD
// ============================================================
function PCard({ product, onQuick }) {
  const addItem = useCartStore(s => s.addItem);
  const wishlistItems = useWishlistStore(s => s.items);
  const toggleWish = useWishlistStore(s => s.toggle);
  const wishlisted = wishlistItems.some(i => i.id === product.id);

  const handleAdd = (e) => {
    e.preventDefault();
    e.stopPropagation();
    const size = product.size?.[0] || product.sizes?.[0] || '100ml';
    addItem(product, size);
    toast.success(`${product.name} añadido al carrito`, { ...TOAST_STYLE, duration: 2400 });
  };
  const handleWish = (e) => {
    e.preventDefault();
    e.stopPropagation();
    toggleWish(product);
    toast.success(wishlisted ? `${product.name} quitado de favoritos` : `${product.name} añadido a favoritos`, { ...TOAST_STYLE, duration: 2200 });
  };
  const handleQuick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    onQuick?.(product);
  };

  const img = getImagePath(product);
  const oldPrice = product.originalPrice || product.oldPrice;

  return (
    <Link href={`/perfume/${product.slug}`} className="pcard">
      <div className="pcard-img-wrap">
        {(product.badge || (product.stock && product.stock <= 5)) && (
          <div className="pcard-badges">
            {product.badge && (
              <span className={`badge ${String(product.badge).startsWith('-') ? 'rose' : product.badge === 'Nuevo' ? 'dark' : ''}`}>
                {product.badge}
              </span>
            )}
            {product.stock != null && product.stock <= 5 && (
              <span className="badge stock">Últimas {product.stock}</span>
            )}
          </div>
        )}
        <button
          type="button"
          className={`pcard-wish ${wishlisted ? 'active' : ''}`}
          onClick={handleWish}
          aria-label="Añadir a favoritos"
        >
          <Heart size={15} fill={wishlisted ? 'currentColor' : 'none'} />
        </button>
        <img className="pcard-img" src={img} alt={product.name} />
        <div className="pcard-overlay">
          <div className="pcard-cta">
            <button type="button" className="pcard-add" onClick={handleAdd}>
              <ShoppingBag size={13} /> Agregar
            </button>
            <button type="button" className="pcard-quick" onClick={handleQuick} aria-label="Vista rápida">
              <Eye size={15} />
            </button>
          </div>
        </div>
      </div>
      <div className="pcard-info">
        <p className="pcard-brand">{product.brand}</p>
        <h3 className="pcard-name">{product.name}<em>{product.type}</em></h3>
        <div className="pcard-meta">
          <span className="pcard-price">
            {oldPrice ? <span className="old">{COP(oldPrice)}</span> : null}
            {product.price > 0 ? COP(product.price) : <em style={{ fontSize: '.85em', color: 'var(--ink-3)' }}>Próximamente</em>}
          </span>
          <Stars rating={product.rating || 5} />
        </div>
      </div>
    </Link>
  );
}

// ============================================================
// BESTSELLERS
// ============================================================
function Bestsellers({ onQuick }) {
  const items = useMemo(() => products.filter(p => p.bestseller).slice(0, 8), []);
  return (
    <section className="section">
      <div className="container">
        <div className="section-head" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: 24, maxWidth: '100%' }}>
          <div>
            <p className="eyebrow">Los más amados</p>
            <h2>Bestsellers <em>2026</em>.</h2>
            <p>Las fragancias que conquistan a quienes las prueban una sola vez.</p>
          </div>
          <Link href="/tienda" className="btn btn-ghost">
            Ver todos <ArrowRight size={14} />
          </Link>
        </div>
        <div className="products-grid">
          {items.map((p, i) => (
            <Reveal key={p.id} delay={i * 60}>
              <PCard product={p} onQuick={onQuick} />
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

// ============================================================
// FEATURED — flash offer with countdown
// ============================================================
function Featured() {
  const [target, setTarget] = useState(null);
  useEffect(() => {
    setTarget(Date.now() + 1000 * 60 * 60 * 18 + 1000 * 60 * 32);
  }, []);
  const { h, m, s } = useCountdown(target);
  const product = useMemo(() => products.find(p => p.slug === 'lattafa-khamrah') || products[0], []);
  const addItem = useCartStore(s => s.addItem);

  const handleAdd = () => {
    if (!product) return;
    const size = product.sizes?.[0]?.ml || '100ml';
    addItem(product, size);
    toast.success(`${product.name} añadido al carrito`, { ...TOAST_STYLE, duration: 2400 });
  };

  return (
    <section className="section section-alt" style={{
      background: 'linear-gradient(135deg, var(--bg-2) 0%, #FAF6EE 50%, var(--bg-2) 100%)',
      borderTop: '1px solid rgba(184,144,92,.18)',
      borderBottom: '1px solid rgba(184,144,92,.18)',
    }}>
      <div className="container">
        <div className="featured-hero">
          <Reveal>
            <div className="featured-img-wrap">
              <span className="featured-discount">−<em>30</em>%</span>
              <img className="featured-img" src={getImagePath(product)} alt={product?.name || 'Oferta'} />
            </div>
          </Reveal>
          <Reveal delay={150}>
            <div>
              <p className="eyebrow"><Flame size={12} />&nbsp;Oferta flash</p>
              <h2 style={{ marginBottom: 18 }}>30% OFF en<br /><em>{product?.name || 'Khamrah'}</em>.</h2>
              <p style={{ fontSize: '1.05rem', marginBottom: 12, lineHeight: 1.7 }}>
                {product?.description?.slice(0, 240) || 'Una sinfonía oriental cálida con dátiles especiados, vainilla cremosa y maderas envueltas en azúcar quemada.'}
              </p>
              <p style={{ fontSize: '.78rem', letterSpacing: '.2em', textTransform: 'uppercase', color: 'var(--ink-3)', fontWeight: 600, marginTop: 26 }}>
                La oferta termina en
              </p>
              <div className="countdown">
                <div className="countdown-unit"><span className="countdown-num">{h}</span><span className="countdown-label">Horas</span></div>
                <div className="countdown-unit"><span className="countdown-num">{m}</span><span className="countdown-label">Min</span></div>
                <div className="countdown-unit"><span className="countdown-num">{s}</span><span className="countdown-label">Seg</span></div>
              </div>
              <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
                <button type="button" className="btn btn-gold btn-lg" onClick={handleAdd}>
                  Aprovechar oferta <ArrowRight size={15} />
                </button>
                <Link href={`/perfume/${product?.slug || 'lattafa-khamrah'}`} className="btn btn-ghost">
                  Ver detalles
                </Link>
              </div>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

// ============================================================
// STORY
// ============================================================
function Story() {
  const storyImg = useMemo(() => {
    const p = products.find(x => x.slug === 'dior-jadore-parfum') || products.find(x => x.brand === 'Dior') || products[0];
    return getImagePath(p);
  }, []);
  return (
    <section className="section story">
      <div className="container">
        <div className="story-grid">
          <Reveal>
            <div className="story-img">
              <img src={storyImg} alt="Atelier" />
              <p className="story-quote">
                Cada fragancia que elegimos pasa por nuestras manos antes de pasar por las tuyas.
              </p>
            </div>
          </Reveal>
          <Reveal delay={200}>
            <div className="story-content">
              <p className="eyebrow">Nuestra historia</p>
              <h2>Una obsesión <em>hecha tienda</em>.</h2>
              <p>
                ScentualBliss nació de la obsesión de dos amigos que querían hacer algo diferente.
                Vieron en la perfumería una oportunidad: abrir las puertas de un mundo que siempre
                pareció exclusivo y acercarlo a quienes saben apreciar lo auténtico.
              </p>
              <p>
                Porque creemos que una fragancia excepcional no debería ser un privilegio.
                Hoy reunimos 155 fragancias —de diseñador, nicho y árabe— curadas, verificadas
                y garantizadas, para que el mundo de la perfumería sea un poco más democrático.
              </p>
              <div className="story-stats">
                <div>
                  <span className="stat-num"><em>155</em></span>
                  <span className="stat-label">Fragancias</span>
                </div>
                <div>
                  <span className="stat-num"><em>28</em></span>
                  <span className="stat-label">Marcas</span>
                </div>
                <div>
                  <span className="stat-num">4.9<em>★</em></span>
                  <span className="stat-label">Valoración</span>
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

// ============================================================
// QUIZ
// ============================================================
function Quiz() {
  const [step, setStep] = useState(0);
  const [scores, setScores] = useState({});
  const [done, setDone] = useState(false);

  const choose = (weight) => {
    const next = { ...scores };
    Object.entries(weight).forEach(([k, v]) => { next[k] = (next[k] || 0) + v; });
    setScores(next);
    if (step === QUIZ_STEPS.length - 1) setDone(true); else setStep(step + 1);
  };

  const reset = () => { setStep(0); setScores({}); setDone(false); };

  const winner = Object.entries(scores).sort((a, b) => b[1] - a[1])[0]?.[0] || 'dulce';
  const recommendations = useMemo(() => products.filter(p => p.category === winner).slice(0, 3), [winner]);
  const famColor = collections.find(f => f.id === winner)?.color || '#B8905C';

  return (
    <section id="sb-quiz" className="section quiz">
      <div className="container">
        <div className="section-head center">
          <p className="eyebrow"><Sparkles size={12} />&nbsp;Quiz olfativo</p>
          <h2>¿Qué fragancia <em>eres</em>?</h2>
          <p>Tres preguntas. Una recomendación curada para ti.</p>
        </div>
        <div className="quiz-card">
          {!done ? (
            <>
              <div className="quiz-progress">
                {QUIZ_STEPS.map((_, i) => (
                  <div key={i} className={`quiz-progress-bar ${i < step ? 'done' : i === step ? 'active' : ''}`} />
                ))}
              </div>
              <p className="quiz-step-label">Pregunta {step + 1} de {QUIZ_STEPS.length}</p>
              <h3 className="quiz-question" dangerouslySetInnerHTML={{ __html: QUIZ_STEPS[step].q }} />
              <div className="quiz-options">
                {QUIZ_STEPS[step].options.map((opt, i) => (
                  <button key={i} type="button" className="quiz-option" onClick={() => choose(opt.weight)}>
                    <span className="quiz-option-icon">{opt.icon}</span>
                    <span className="quiz-option-text">
                      {opt.text}
                      <span className="quiz-option-sub">{opt.sub}</span>
                    </span>
                    <ArrowRight size={16} style={{ color: 'var(--gold-soft)', opacity: .6 }} />
                  </button>
                ))}
              </div>
              {step > 0 && (
                <div className="quiz-actions">
                  <button type="button" className="quiz-back" onClick={() => setStep(step - 1)}>
                    <ArrowLeft size={13} /> Volver
                  </button>
                </div>
              )}
            </>
          ) : (
            <div className="quiz-result">
              <p className="quiz-result-eyebrow">Tu firma olfativa</p>
              <h3>Eres <em style={{ color: famColor }}>{FAMILY_NAMES[winner]}</em>.</h3>
              <p className="quiz-result-desc">{FAMILY_DESC[winner]}</p>
              <p className="quiz-step-label" style={{ marginTop: 28, marginBottom: 14 }}>Tres fragancias para ti</p>
              <div className="quiz-result-products">
                {recommendations.length > 0 ? recommendations.map(p => (
                  <Link key={p.id} href={`/perfume/${p.slug}`} className="quiz-result-product">
                    <img src={getImagePath(p)} alt={p.name} />
                    <p className="b">{p.brand}</p>
                    <p className="n">{p.name}</p>
                  </Link>
                )) : (
                  <p style={{ gridColumn: '1/-1', color: 'rgba(250,248,243,.6)', fontStyle: 'italic' }}>
                    Pronto añadiremos más fragancias de esta familia.
                  </p>
                )}
              </div>
              <button type="button" onClick={reset} className="btn btn-gold" style={{ marginTop: 32 }}>
                Hacer el quiz otra vez <RotateCcw size={13} />
              </button>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

// ============================================================
// TESTIMONIALS
// ============================================================
function Testimonials() {
  const initialsOf = (name = '') =>
    name.split(' ').map(p => p[0]).filter(Boolean).slice(0, 2).join('').toUpperCase();
  return (
    <section className="section">
      <div className="container">
        <div className="section-head center">
          <p className="eyebrow">Lo que dicen</p>
          <h2>Miles de historias, <em>una fragancia</em>.</h2>
        </div>
        <div className="testimonials-grid">
          {testimonials.map((t, i) => (
            <Reveal key={t.id} delay={i * 80}>
              <div className="tcard">
                <div className="tcard-stars">
                  {[1, 2, 3, 4, 5].map(s => (
                    <svg key={s} width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
                      <polygon points="12,2 15.1,8.3 22,9.3 17,14.1 18.2,21 12,17.8 5.8,21 7,14.1 2,9.3 8.9,8.3" />
                    </svg>
                  ))}
                </div>
                <p className="tcard-text">"{t.text}"</p>
                <div className="tcard-author">
                  <div className="tcard-avatar">{initialsOf(t.name)}</div>
                  <div>
                    <p className="tcard-name">{t.name}</p>
                    <p className="tcard-meta">{t.location} · {t.product}</p>
                  </div>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

// ============================================================
// NEWSLETTER
// ============================================================
function Newsletter() {
  const [email, setEmail] = useState('');
  const submit = (e) => {
    e.preventDefault();
    if (!email.includes('@')) return;
    toast.success(`¡Suscrita! Revisa ${email} para tu código de 10% OFF.`, { ...TOAST_STYLE, duration: 4000 });
    setEmail('');
  };
  return (
    <section className="section newsletter">
      <div className="container">
        <div className="newsletter-inner">
          <Reveal>
            <p className="eyebrow" style={{ justifyContent: 'center' }}>Newsletter exclusivo</p>
            <h2>Obtén <em>10% OFF</em><br />en tu primera compra.</h2>
            <p>Suscríbete y recibe ofertas, lanzamientos anticipados y guías de fragancias directo en tu email.</p>
            <form className="newsletter-form" onSubmit={submit}>
              <input className="newsletter-input" type="email" placeholder="tu@email.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
              <button className="newsletter-submit" type="submit">Suscribirme</button>
            </form>
            <p className="newsletter-fine">Sin spam. Cancela cuando quieras.</p>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

// ============================================================
// HOME PAGE CLIENT — root
// ============================================================
export default function HomePageClient() {
  const [qvProduct, setQvProduct] = useState(null);

  return (
    <div className="sb-home">
      <main>
        <Hero />
        <TrustBar />
        <Families />
        <Bestsellers onQuick={setQvProduct} />
        <Featured />
        <Story />
        <Quiz />
        <Testimonials />
        <Newsletter />
      </main>
      <QuickView
        product={qvProduct}
        isOpen={!!qvProduct}
        onClose={() => setQvProduct(null)}
      />
    </div>
  );
}
