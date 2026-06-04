'use client';
import { useState, useEffect, useRef, useMemo, createContext, useContext } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import Image from 'next/image';

// QuickView usa framer-motion (~50KB). Cargar solo cuando el usuario abre la vista rápida.
const QuickView = dynamic(() => import('@/components/ui/QuickView'), { ssr: false });
import {
  ArrowRight, ArrowLeft, ShoppingBag, Heart, Eye,
  Truck, Shield, RotateCcw, Award, Sparkles, Flame,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { collections, testimonials, getImagePath, deriveClima } from '@/lib/products-constants';
import { useCartStore } from '@/lib/store/cartStore';
import { useWishlistStore } from '@/lib/store/wishlistStore';
import './HomePageClient.css';

const COP = (n) => 'COP $' + Number(n || 0).toLocaleString('es-CO');

const TRUST = [
  { Icon: Truck, title: 'Envío gratis', desc: 'a toda Colombia' },
  { Icon: Shield, title: 'Pago seguro', desc: 'SSL + cifrado bancario' },
  { Icon: RotateCcw, title: 'Devolución gratis', desc: 'En los primeros 30 días' },
  { Icon: Award, title: '100% auténticos', desc: 'Garantía de originalidad' },
];

// Toma la primera nota de una cadena tipo "Azafrán, Bergamota" → "Azafrán"
const firstNote = (s) => String(s || '').split(',')[0]?.trim() || '—';

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

function _brandSlug(name) {
  return String(name || '').toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

// === Context para compartir `products` entre sub-componentes sin tener
// que pasarlo por props uno por uno. El padre (HomePageClient) lo
// recibe del server component y lo inyecta acá.
const ProductsContext = createContext([]);
const useProducts = () => useContext(ProductsContext);

// HERO_BRANDS antes era constante a nivel módulo (cuando products era
// un array hardcoded). Ahora es función que recibe el array.
function getHeroBrands(products) {
  const seen = new Map();
  for (const p of products) {
    if (!p.brand || seen.has(p.brand)) continue;
    seen.set(p.brand, { name: p.brand, slug: _brandSlug(p.brand) });
  }
  return Array.from(seen.values());
}

// QUIZ_STEPS — cada opción puede aportar a tres dimensiones de matching:
//   weight       → boost a familias olfativas (acumulan score)
//   occasionTags → palabras clave que se cruzan contra product.occasion
//   productType  → 'disenador' | 'nicho' | 'arabe' | null (sin filtro)
//   genderTags   → 'Masculino' | 'Femenino' | 'Unisex' (match laxo)
const QUIZ_STEPS = [
  {
    q: '¿Para quién es el <em>perfume</em>?',
    field: 'gender',
    options: [
      { icon: '👩', text: 'Para mujer', sub: '', weight: {}, genderTags: ['Femenino', 'Unisex'] },
      { icon: '👨', text: 'Para hombre', sub: '', weight: {}, genderTags: ['Masculino', 'Unisex'] },
      { icon: '🎁', text: 'Es un regalo', sub: 'Quiero algo unisex que le guste a cualquiera', weight: {}, genderTags: ['Unisex', 'Femenino', 'Masculino'] },
    ],
  },
  {
    q: '¿Cuándo lo vas a <em>usar</em>?',
    field: 'occasion',
    options: [
      { icon: '☀️', text: 'Para el día / oficina', sub: 'Algo fresco y ligero',
        weight: { fresco: 3, citrico: 3, frutal: 1 },
        occasionTags: ['Día', 'Trabajo', 'Casual'] },
      { icon: '🌙', text: 'Para la noche', sub: 'Algo más intenso y sensual',
        weight: { dulce: 3, amaderado: 3, floral: 1 },
        occasionTags: ['Noche', 'Romántico', 'Cenas', 'Eventos especiales'] },
      { icon: '👕', text: 'Para todos los días', sub: 'Versátil, fácil de llevar',
        weight: { fresco: 2, frutal: 2, citrico: 1, floral: 1 },
        occasionTags: ['Casual', 'Día'] },
      { icon: '🥂', text: 'Para ocasiones especiales', sub: 'Eventos, cenas, citas',
        weight: { amaderado: 3, dulce: 2, floral: 2 },
        occasionTags: ['Eventos formales', 'Eventos especiales', 'Cenas elegantes', 'Fiestas'] },
    ],
  },
  {
    q: '¿Qué tipo de aroma te <em>gusta</em>?',
    field: 'family',
    options: [
      { icon: '🌸', text: 'Floral', sub: 'Rosa, jazmín, flores', weight: { floral: 5 } },
      { icon: '🍯', text: 'Dulce', sub: 'Vainilla, caramelo, gourmand', weight: { dulce: 5 } },
      { icon: '🌲', text: 'Amaderado', sub: 'Madera, oud, sándalo', weight: { amaderado: 5 } },
      { icon: '🍋', text: 'Cítrico', sub: 'Limón, bergamota, naranja', weight: { citrico: 5, fresco: 2 } },
      { icon: '🍓', text: 'Frutal', sub: 'Frutos rojos, manzana, durazno', weight: { frutal: 5, dulce: 1 } },
      { icon: '🌊', text: 'Fresco', sub: 'Marino, herbal, aire libre', weight: { fresco: 5, citrico: 1 } },
    ],
  },
  {
    q: '¿Qué tipo de perfumes <em>prefieres</em>?',
    field: 'style',
    options: [
      { icon: '💎', text: 'De diseñador', sub: 'Chanel, Dior, Tom Ford, Carolina Herrera',
        weight: { floral: 1 }, productType: 'disenador' },
      { icon: '✨', text: 'De nicho (exclusivos)', sub: 'Xerjoff, MFK, marcas artesanales',
        weight: { amaderado: 1, floral: 1 }, productType: 'nicho' },
      { icon: '🌙', text: 'Árabes (intensos)', sub: 'Lattafa, Armaf, Afnan',
        weight: { dulce: 1, amaderado: 1 }, productType: 'arabe' },
      { icon: '🎲', text: 'Cualquiera está bien', sub: 'Que el sistema elija por mí',
        weight: {}, productType: null },
    ],
  },
  {
    q: '¿Cuánto querés <em>invertir</em>?',
    field: 'budget',
    options: [
      { icon: '🌱', text: 'Para empezar tu colección',
        sub: 'Hasta $200.000 — primera fragancia o regalo con encanto',
        weight: {}, priceMin: null, priceMax: 200000 },
      { icon: '✨', text: 'Equilibrio perfecto',
        sub: 'Entre $200.000 y $400.000 — calidad y carácter sin extremos',
        weight: {}, priceMin: 200000, priceMax: 400000 },
      { icon: '💎', text: 'Selección premium',
        sub: 'Entre $400.000 y $700.000 — fragancias con firma propia',
        weight: {}, priceMin: 400000, priceMax: 700000 },
      { icon: '👑', text: 'Piezas exclusivas',
        sub: 'Desde $700.000 — lujo y artesanía sin techo',
        weight: {}, priceMin: 700000, priceMax: null },
      { icon: '🎲', text: 'Sin preferencia',
        sub: 'Mostrame las mejores opciones según mi perfil',
        weight: {}, priceMin: null, priceMax: null },
    ],
  },
];

const FAMILY_NAMES = {
  floral: 'Floral',
  frutal: 'Frutal',
  fresco: 'Fresco',
  citrico: 'Cítrico',
  dulce: 'Dulce / Gourmand',
  amaderado: 'Amaderado',
};
const FAMILY_DESC = {
  floral: 'Te gustan los aromas de flores: rosa, jazmín, azahar. Femenino, elegante y atemporal.',
  frutal: 'Te van los aromas frutales y jugosos: frutos rojos, manzana, durazno. Juvenil y alegre.',
  fresco: 'Prefieres aromas frescos y limpios: marinos, herbales, aire libre. Ideal para el día.',
  citrico: 'Te encantan los aromas cítricos: limón, bergamota, naranja. Energético y luminoso.',
  dulce: 'Te van los perfumes dulces y gourmand: vainilla, caramelo, ámbar. Cálido y adictivo.',
  amaderado: 'Buscas aromas amaderados: sándalo, oud, pachulí. Profundo y sofisticado.',
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
  const products = useProducts();
  const stageRef = useParallax();
  // Producto destacado del hero. Cambialo de slug si querés rotar el destacado.
  const heroProduct = products.find(p => p.slug === 'montale-arabians-tonka');
  const heroRef = `MTL-${String(heroProduct?.id || 141).padStart(3, '0')}`;
  const heroFamily = 'Oud gourmand'; // derivada de las notas: oud, rosa, tonka, ámbar
  const heroSillage = 92;
  const heroLongevity = 88;
  // Para el hero usamos una versión PNG con fondo recortado (transparente) generada
  // con scripts/remove-bg-hero.mjs. Cae al webp del catálogo si la transparente no existe.
  const heroImg = heroProduct
    ? `/img/hero/${heroProduct.slug}-transparent.png`
    : HOUSE_PERFUME.image;

  // Lista de 6 atributos para el panel vertical detrás de la botella
  const CLIMA_LABEL = { calido: 'Cálido', templado: 'Templado', frio: 'Frío' };
  const heroPyramid = [
    { pos: 'Clima',         label: CLIMA_LABEL[deriveClima(heroProduct || {})] || '—' },
    { pos: 'Género',        label: heroProduct?.gender || '—' },
    { pos: 'Concentración', label: heroProduct?.type || '—' },
    { pos: 'Salida',        label: firstNote(heroProduct?.notes?.top) },
    { pos: 'Corazón',       label: firstNote(heroProduct?.notes?.heart) },
    { pos: 'Fondo',         label: firstNote(heroProduct?.notes?.base) },
  ];

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

            {/* Halo y beam removidos: el usuario quiere la botella sin efectos/glow detrás */}

            <div className="fx-bottle">
              <Image
                fill
                priority
                src={heroImg}
                alt={`${heroProduct?.brand || ''} ${heroProduct?.name || HOUSE_PERFUME.name} ${heroProduct?.type || HOUSE_PERFUME.type}`}
                style={{ objectFit: 'contain' }}
                sizes="(max-width: 640px) 90vw, (max-width: 1100px) 50vw, 42vw"
              />
            </div>

            <ul className="fx-notes-list" aria-label="Ficha técnica del perfume">
              {heroPyramid.map((n, i) => (
                <li
                  key={i}
                  className="fx-note-row"
                  style={{ animationDelay: `${0.9 + i * 0.08}s` }}
                >
                  <span className="fx-note-row-dot" aria-hidden="true" />
                  <span className="fx-note-row-pos">{n.pos}</span>
                  <span className="fx-note-row-label">{n.label}</span>
                </li>
              ))}
            </ul>

            <div className="fx-hud fx-hud-tl">
              <div className="fx-hud-line">
                <span className="fx-hud-k">REF</span>
                <span className="fx-hud-v">{heroRef}</span>
              </div>
              <div className="fx-hud-line">
                <span className="fx-hud-k">FAM</span>
                <span className="fx-hud-v">{heroFamily}</span>
              </div>
            </div>
            <div className="fx-hud fx-hud-br">
              <div className="fx-hud-bar">
                <div className="fx-hud-bar-fill" style={{ width: heroSillage + '%' }} />
                <span className="fx-hud-bar-label">Sillage {heroSillage}%</span>
              </div>
              <div className="fx-hud-bar">
                <div className="fx-hud-bar-fill alt" style={{ width: heroLongevity + '%' }} />
                <span className="fx-hud-bar-label">Longevidad {heroLongevity}%</span>
              </div>
            </div>

            <Link
              href={heroProduct ? `/perfume/${heroProduct.slug}` : '/tienda'}
              className="fx-tag"
              aria-label={`Ver ${heroProduct?.brand || ''} ${heroProduct?.name || ''}`}
            >
              <span className="fx-tag-pulse" />
              <div>
                <p className="fx-tag-eyebrow">Nicho · Destacado</p>
                <p className="fx-tag-name">
                  {heroProduct?.name || HOUSE_PERFUME.name}{' '}
                  <em>{heroProduct?.type || HOUSE_PERFUME.type}</em>
                </p>
                <p className="fx-tag-price">
                  {heroProduct?.brand || 'ScentualBliss'}
                  <span className="fx-tag-sep">·</span>
                  <b>Ver perfume</b>
                </p>
              </div>
              <span className="fx-tag-arrow" aria-hidden="true">
                <ArrowRight size={14} />
              </span>
            </Link>
          </div>
        </div>
      </div>

    </section>
  );
}

// ============================================================
// BRANDS MARQUEE — banda blanca con logos (se ubica debajo del trust bar)
// ============================================================
function BrandsMarquee() {
  const products = useProducts();
  const HERO_BRANDS = useMemo(() => getHeroBrands(products), [products]);
  return (
    <div className="fx-marquee" aria-hidden="true">
      <div className="fx-marquee-track">
        {[...Array(2)].map((_, dup) => (
          <span key={dup} style={{ display: 'inline-flex', alignItems: 'center', gap: 44 }}>
            {HERO_BRANDS.map((b, i) => (
              <span key={`${dup}-${i}`} className="fx-marquee-item">
                <img
                  src={`/img/brands/${b.slug}.webp`}
                  alt={b.name}
                  className="brand-logo-img"
                  width={90}
                  height={26}
                  loading="lazy"
                  onError={(e) => { e.currentTarget.parentElement.style.display = 'none'; }}
                />
              </span>
            ))}
          </span>
        ))}
      </div>
    </div>
  );
}

// ============================================================
// TRUST BAR
// ============================================================
function TrustBar() {
  return (
    <section style={{ borderTop: '1px solid rgba(212,166,79,.22)', borderBottom: '1px solid rgba(212,166,79,.22)', background: '#050505', padding: '28px 0' }}>
      <div className="container trust-bar-grid">
        {TRUST.map((it, i) => (
          <Reveal key={it.title} delay={i * 80}>
            <div className="trust-bar-item">
              <div style={{
                width: 42, height: 42, borderRadius: 10,
                background: 'rgba(212,166,79,.10)', border: '1px solid rgba(212,166,79,.30)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                color: '#F2CF7A',
              }}>
                <it.Icon size={18} />
              </div>
              <div>
                <p style={{ fontWeight: 600, color: '#E8C98B', fontSize: '.88rem', marginBottom: 2 }}>{it.title}</p>
                <p style={{ fontSize: '.74rem', color: 'rgba(232,201,139,.6)' }}>{it.desc}</p>
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
                prefetch={false}
                className={`family ${active === f.id ? 'active' : ''}`}
                onMouseEnter={() => setActive(f.id)}
                style={{ flex: active === f.id ? 4 : 1 }}
              >
                <Image
                  fill
                  src={f.image}
                  alt={f.name}
                  className="family-img"
                  style={{ objectFit: 'cover' }}
                  sizes="(max-width: 640px) 100vw, (max-width: 1100px) 33vw, 16vw"
                />
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
  const rawWishlist = useWishlistStore(s => s.items);
  const toggleWish = useWishlistStore(s => s.toggle);
  const wishlistItems = Array.isArray(rawWishlist) ? rawWishlist : [];
  const wishlisted = wishlistItems.some(i => i?.id === product.id);

  const handleAdd = (e) => {
    e.preventDefault();
    e.stopPropagation();
    // selectedSize debe ser SIEMPRE un string (ej "100ml"), nunca el objeto
    // {ml, price} entero. Si pasa el objeto, el CartDrawer intenta renderizarlo
    // como children → "Objects are not valid as a React child (found: object
    // with keys {ml, price})" y revienta toda la home.
    const size = product.sizes?.[0]?.ml || product.size?.[0] || '100ml';
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
        <div className="pcard-img-inner">
          <Image
            fill
            src={img}
            alt={product.name}
            className="pcard-img"
            style={{ objectFit: 'contain', mixBlendMode: 'multiply' }}
            sizes="(max-width: 640px) 50vw, (max-width: 1100px) 25vw, 20vw"
          />
        </div>
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
        </div>
      </div>
    </Link>
  );
}

// ============================================================
// BESTSELLERS
// ============================================================
function Bestsellers({ onQuick }) {
  const products = useProducts();
  const items = useMemo(() => products.filter(p => p.bestseller).slice(0, 8), [products]);
  return (
    <section className="section section-white">
      <div className="container">
        <div className="section-head" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: 24, maxWidth: '100%' }}>
          <div>
            <p className="eyebrow">Los más amados</p>
            <h2>Los más <em>vendidos</em>.</h2>
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
// Duración de la oferta flash: 20 horas desde primera visita
const FLASH_DURATION_MS = 1000 * 60 * 60 * 20;
const FLASH_KEY = 'sb_flash_offer_end';

function Featured() {
  const products = useProducts();
  const [target, setTarget] = useState(null);
  useEffect(() => {
    try {
      let stored = Number(localStorage.getItem(FLASH_KEY));
      if (!stored || stored <= Date.now()) {
        stored = Date.now() + FLASH_DURATION_MS;
        localStorage.setItem(FLASH_KEY, String(stored));
      }
      setTarget(stored);
    } catch {
      setTarget(Date.now() + FLASH_DURATION_MS);
    }
  }, []);
  const { h, m, s } = useCountdown(target);
  const product = useMemo(() => products.find(p => p.slug === 'lattafa-khamrah') || products[0], [products]);
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
              <Image
                fill
                src={getImagePath(product)}
                alt={product?.name || 'Oferta'}
                className="featured-img"
                style={{ objectFit: 'contain', mixBlendMode: 'multiply' }}
                sizes="(max-width: 860px) 90vw, 45vw"
              />
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
  const products = useProducts();
  const storyImg = useMemo(() => {
    const p = products.find(x => x.slug === 'dior-jadore-parfum') || products.find(x => x.brand === 'Dior') || products[0];
    return getImagePath(p);
  }, [products]);
  return (
    <section className="section story">
      <div className="container">
        <div className="story-grid">
          <Reveal>
            <div className="story-img">
              <div className="story-img-inner">
                <Image
                  fill
                  src={storyImg}
                  alt="Atelier"
                  className="story-img-pic"
                  style={{ objectFit: 'contain', mixBlendMode: 'screen' }}
                  sizes="(max-width: 860px) 90vw, 45vw"
                />
              </div>
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
// Tipos de productType en español para mostrar en chips
const TYPE_DISPLAY = { disenador: 'Diseñador', nicho: 'Nicho', arabe: 'Árabe' };

// Texto del badge "por qué te lo recomendamos" para cada perfume
function matchReason(product, prefs) {
  const reasons = [];
  if (prefs.topFamily && product.category === prefs.topFamily) {
    reasons.push(FAMILY_NAMES[product.category]?.split(' ')[0] || product.category);
  }
  if (prefs.productType && product.productType === prefs.productType) {
    reasons.push(TYPE_DISPLAY[product.productType]);
  }
  if (prefs.occasionTags?.length && product.occasion?.some(o =>
    prefs.occasionTags.some(t => o.toLowerCase().includes(t.toLowerCase())))) {
    reasons.push('Tu ocasión');
  }
  if (product.bestseller && reasons.length < 2) reasons.push('Bestseller');
  return reasons.slice(0, 2).join(' · ');
}

function Quiz() {
  const products = useProducts();
  const [step, setStep] = useState(0);
  const [scores, setScores] = useState({});
  const [prefs, setPrefs] = useState({}); // { occasionTags, productType, genderTags }
  const [done, setDone] = useState(false);

  const choose = (opt) => {
    // Acumula pesos de familia
    const nextScores = { ...scores };
    Object.entries(opt.weight || {}).forEach(([k, v]) => {
      nextScores[k] = (nextScores[k] || 0) + v;
    });
    setScores(nextScores);

    // Guarda las preferencias contextuales según el field de la pregunta
    const stepDef = QUIZ_STEPS[step];
    const nextPrefs = { ...prefs };
    if (stepDef.field === 'occasion' && opt.occasionTags) nextPrefs.occasionTags = opt.occasionTags;
    if (stepDef.field === 'style') nextPrefs.productType = opt.productType ?? null;
    if (stepDef.field === 'gender' && opt.genderTags) nextPrefs.genderTags = opt.genderTags;
    if (stepDef.field === 'budget') {
      nextPrefs.priceMin = opt.priceMin ?? null;
      nextPrefs.priceMax = opt.priceMax ?? null;
    }
    setPrefs(nextPrefs);

    if (step === QUIZ_STEPS.length - 1) setDone(true); else setStep(step + 1);
  };

  const reset = () => { setStep(0); setScores({}); setPrefs({}); setDone(false); };

  // Familia dominante y secundaria
  const sortedFamilies = Object.entries(scores).sort((a, b) => b[1] - a[1]);
  const topFamily = sortedFamilies[0]?.[0] || 'dulce';
  const secondFamily = sortedFamilies[1]?.[0] || null;
  const famColor = collections.find(f => f.id === topFamily)?.color || '#B8905C';

  // Recomendaciones: scoring multi-factor sobre TODO el catálogo
  const recommendations = useMemo(() => {
    if (!done) return [];

    // HARD FILTERS: si el usuario eligió una preferencia explícita, la respetamos
    // de forma estricta (no es solo un boost en el score).
    const matchesHardFilters = (p) => {
      if (!Number.isFinite(p.price) || p.price <= 0) return false;
      // Tipo de producto: si eligió Diseñador / Nicho / Árabe → debe coincidir
      if (prefs.productType && p.productType !== prefs.productType) return false;
      // Género: si eligió "Para mujer" / "Para hombre" → solo géneros compatibles
      // (genderTags ya incluye Unisex en los casos correspondientes)
      if (prefs.genderTags?.length && p.gender && !prefs.genderTags.includes(p.gender)) return false;
      // Presupuesto: rango opcional. Si el usuario eligió un rango concreto,
      // descartamos productos fuera de él. "Sin preferencia" deja ambos en null.
      if (prefs.priceMin != null && p.price < prefs.priceMin) return false;
      if (prefs.priceMax != null && p.price > prefs.priceMax) return false;
      return true;
    };

    const scored = products
      .filter(matchesHardFilters)
      .map(p => {
        let score = 0;

        // 1. FAMILIA olfativa (señal primaria)
        if (p.category === topFamily) score += 12;
        else if (p.category === secondFamily) score += 5;

        // 2. OCASIÓN — soft, cruce con product.occasion
        if (prefs.occasionTags?.length && Array.isArray(p.occasion)) {
          const overlap = p.occasion.filter(o =>
            prefs.occasionTags.some(t => o.toLowerCase().includes(t.toLowerCase()))
          );
          score += overlap.length * 2.5;
        }

        // 3. Calidad: rating y bestseller como desempates finos
        score += (p.rating || 0) * 0.6;
        if (p.bestseller) score += 1.5;
        if (p.featured) score += 0.5;

        return { p, score };
      });

    // Top resultados por score (selección de los mejores matches dentro del filtro)
    let top = scored
      .sort((a, b) => b.score - a.score)
      .slice(0, 6)
      .map(({ p }) => p);

    // Fallback: si no llegamos a 3 dentro del filtro estricto, completamos con
    // los top-rated de productos que TAMBIÉN respeten los filtros duros
    if (top.length < 3) {
      const usedIds = new Set(top.map(p => p.id));
      const fallback = products
        .filter(p => matchesHardFilters(p) && !usedIds.has(p.id))
        .sort((a, b) => (b.rating || 0) - (a.rating || 0))
        .slice(0, 6 - top.length);
      top = [...top, ...fallback];
    }

    // Una vez seleccionados los mejores matches, los ordenamos de menor a mayor precio
    top = top.sort((a, b) => (a.price || 0) - (b.price || 0));

    return top;
  }, [done, scores, prefs, topFamily, secondFamily, products]);

  const contextDesc = (() => {
    if (!done) return '';
    const parts = [];
    if (prefs.occasionTags?.includes('Día')) parts.push('para usar de día');
    else if (prefs.occasionTags?.includes('Noche')) parts.push('para la noche');
    else if (prefs.occasionTags?.some(t => t.includes('Eventos'))) parts.push('para ocasiones especiales');
    else if (prefs.occasionTags?.includes('Casual')) parts.push('para el día a día');
    if (prefs.productType) parts.push(`del tipo ${TYPE_DISPLAY[prefs.productType].toLowerCase()}`);
    // Rango de presupuesto (si el usuario lo eligió y no fue "Sin preferencia")
    const fmt = (n) => `$${Math.round(n / 1000)}.000`;
    if (prefs.priceMin != null && prefs.priceMax != null) {
      parts.push(`entre ${fmt(prefs.priceMin)} y ${fmt(prefs.priceMax)}`);
    } else if (prefs.priceMax != null) {
      parts.push(`hasta ${fmt(prefs.priceMax)}`);
    } else if (prefs.priceMin != null) {
      parts.push(`desde ${fmt(prefs.priceMin)}`);
    }
    return parts.length ? ` Elegidos ${parts.join(' y ')}.` : '';
  })();

  return (
    <section id="sb-quiz" className="section quiz">
      <div className="container">
        <div className="section-head center">
          <p className="eyebrow"><Sparkles size={12} />&nbsp;Quiz olfativo</p>
          <h2>Encontrá tu <em>perfume ideal</em></h2>
          <p>Responde {QUIZ_STEPS.length} preguntas rápidas y te recomendamos los perfumes de nuestro catálogo que mejor encajan con vos.</p>
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
                  <button key={i} type="button" className="quiz-option" onClick={() => choose(opt)}>
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
              <p className="quiz-result-eyebrow">Tu tipo de perfume</p>
              <h3>Te gustan los <em style={{ color: famColor }}>{FAMILY_NAMES[topFamily]}</em></h3>
              <p className="quiz-result-desc">
                {FAMILY_DESC[topFamily]}{contextDesc}
              </p>
              <p className="quiz-step-label" style={{ marginTop: 28, marginBottom: 14 }}>
                Te recomendamos {recommendations.length} perfumes (del más económico al más caro)
              </p>
              <div className="quiz-result-products">
                {recommendations.length > 0 ? recommendations.map(p => {
                  const reason = matchReason(p, { ...prefs, topFamily });
                  return (
                    <Link key={p.id} href={`/perfume/${p.slug}`} className="quiz-result-product">
                      <div className="quiz-result-img-wrap">
                        <Image fill src={getImagePath(p)} alt={p.name} style={{ objectFit: 'contain' }} sizes="120px" />
                        {p.bestseller && <span className="quiz-result-badge">Bestseller</span>}
                      </div>
                      <p className="b">{p.brand}</p>
                      <p className="n">{p.name}<em> {p.type}</em></p>
                      <div className="quiz-result-meta">
                        <span className="quiz-result-price">{COP(p.price)}</span>
                        <span className="quiz-result-rating">★ {(p.rating || 0).toFixed(1)}</span>
                      </div>
                      {reason && <span className="quiz-result-reason">{reason}</span>}
                    </Link>
                  );
                }) : (
                  <p style={{ gridColumn: '1/-1', color: 'rgba(250,248,243,.6)', fontStyle: 'italic' }}>
                    No encontramos coincidencias exactas. Probá otras respuestas.
                  </p>
                )}
              </div>
              <div style={{ display: 'flex', gap: 12, marginTop: 32, justifyContent: 'center', flexWrap: 'wrap' }}>
                <Link href="/tienda" className="btn btn-outline">
                  Ver toda la tienda <ArrowRight size={13} />
                </Link>
                <button type="button" onClick={reset} className="btn btn-gold">
                  Hacer el quiz otra vez <RotateCcw size={13} />
                </button>
              </div>
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
// Tiempo relativo en español a partir de un timestamp ISO (ej. "hace 3 días").
function relativeTime(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const diff = (Date.now() - d.getTime()) / 1000;
  if (diff < 60) return 'hace un momento';
  if (diff < 3600) return `hace ${Math.floor(diff / 60)} min`;
  if (diff < 86400) return `hace ${Math.floor(diff / 3600)} h`;
  if (diff < 604800) {
    const days = Math.floor(diff / 86400);
    return `hace ${days} ${days === 1 ? 'día' : 'días'}`;
  }
  if (diff < 2592000) {
    const weeks = Math.floor(diff / 604800);
    return `hace ${weeks} ${weeks === 1 ? 'semana' : 'semanas'}`;
  }
  if (diff < 31536000) {
    const months = Math.floor(diff / 2592000);
    return `hace ${months} ${months === 1 ? 'mes' : 'meses'}`;
  }
  const years = Math.floor(diff / 31536000);
  return `hace ${years} ${years === 1 ? 'año' : 'años'}`;
}

// Hash determinista nombre → tono de avatar (paleta cálida coherente con la marca).
const AVATAR_PALETTE = [
  'linear-gradient(135deg, #B8905C 0%, #8C6A40 100%)',
  'linear-gradient(135deg, #C77A7A 0%, #9C5050 100%)',
  'linear-gradient(135deg, #4A6B5C 0%, #2F4A3D 100%)',
  'linear-gradient(135deg, #6B5B4A 0%, #3D2F22 100%)',
  'linear-gradient(135deg, #D4B68A 0%, #B8905C 100%)',
];
function avatarBg(name = '') {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  return AVATAR_PALETTE[hash % AVATAR_PALETTE.length];
}

function Testimonials() {
  const products = useProducts();
  const [reviews, setReviews] = useState(null); // null = loading, [] = empty
  const scrollerRef = useRef(null);
  const [canPrev, setCanPrev] = useState(false);
  const [canNext, setCanNext] = useState(true);

  const initialsOf = (name = '') =>
    name.split(' ').map(p => p[0]).filter(Boolean).slice(0, 2).join('').toUpperCase();

  // Lookup rápido slug → producto (para mostrar la marca + nombre en la card)
  const productBySlug = useMemo(() => {
    const map = new Map();
    for (const p of products) map.set(p.slug, p);
    return map;
  }, [products]);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/reviews?limit=10')
      .then(r => (r.ok ? r.json() : []))
      .then(data => { if (!cancelled) setReviews(Array.isArray(data) ? data : []); })
      .catch(() => { if (!cancelled) setReviews([]); });
    return () => { cancelled = true; };
  }, []);

  // Si la API devolvió reseñas reales, las usamos. Si no, fallback al hardcoded seed.
  const items = (reviews && reviews.length > 0)
    ? reviews.map(r => {
        const prod = productBySlug.get(r.product_slug);
        return {
          id: r.id,
          name: r.author_name,
          rating: r.rating,
          text: r.text,
          product: prod ? `${prod.brand} ${prod.name}` : r.product_slug,
          when: relativeTime(r.created_at),
        };
      })
    : testimonials.map(t => ({ ...t, when: t.location || '' }));

  // Actualiza disponibilidad de flechas según scroll actual
  const updateArrows = () => {
    const el = scrollerRef.current;
    if (!el) return;
    setCanPrev(el.scrollLeft > 8);
    setCanNext(el.scrollLeft + el.clientWidth < el.scrollWidth - 8);
  };

  useEffect(() => {
    updateArrows();
    const el = scrollerRef.current;
    if (!el) return;
    el.addEventListener('scroll', updateArrows, { passive: true });
    window.addEventListener('resize', updateArrows);
    return () => {
      el.removeEventListener('scroll', updateArrows);
      window.removeEventListener('resize', updateArrows);
    };
  }, [items.length]);

  const scrollBy = (dir) => {
    const el = scrollerRef.current;
    if (!el) return;
    const card = el.querySelector('.tcard');
    const step = (card?.clientWidth || 320) + 20; // card width + gap
    el.scrollBy({ left: dir * step, behavior: 'smooth' });
  };

  return (
    <section className="section">
      <div className="container">
        <div className="section-head center">
          <p className="eyebrow">Lo que dicen</p>
          <h2>Miles de historias, <em>una fragancia</em>.</h2>
        </div>
        <div className="testimonials-wrap">
          <button
            type="button"
            className={`testimonials-arrow prev ${canPrev ? '' : 'is-hidden'}`}
            onClick={() => scrollBy(-1)}
            aria-label="Reseña anterior"
          >
            <ArrowLeft size={18} />
          </button>
          <button
            type="button"
            className={`testimonials-arrow next ${canNext ? '' : 'is-hidden'}`}
            onClick={() => scrollBy(1)}
            aria-label="Siguiente reseña"
          >
            <ArrowRight size={18} />
          </button>

          <div className="testimonials-grid" ref={scrollerRef}>
            {items.map((t, i) => (
              <article key={t.id ?? i} className="tcard">
                <div className="tcard-head">
                  <div className="tcard-avatar" style={{ background: avatarBg(t.name) }}>
                    {initialsOf(t.name)}
                  </div>
                  <div className="tcard-id">
                    <p className="tcard-name">{t.name}</p>
                    {t.when && <p className="tcard-when">{t.when}</p>}
                  </div>
                </div>
                <div className="tcard-stars" aria-label={`${t.rating || 5} de 5 estrellas`}>
                  {[1, 2, 3, 4, 5].map(s => (
                    <svg key={s} width="14" height="14" viewBox="0 0 24 24"
                      fill={s <= Math.round(t.rating || 5) ? 'currentColor' : 'rgba(31,26,20,.12)'}>
                      <polygon points="12,2 15.1,8.3 22,9.3 17,14.1 18.2,21 12,17.8 5.8,21 7,14.1 2,9.3 8.9,8.3" />
                    </svg>
                  ))}
                </div>
                <p className="tcard-text">{t.text}</p>
                {t.product && (
                  <p className="tcard-product">{t.product}</p>
                )}
              </article>
            ))}
          </div>
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
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (!email.includes('@') || loading) return;
    setLoading(true);
    try {
      const res = await fetch('/api/newsletter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (data.already) {
        toast(`${email} ya está suscrito. ¡Gracias!`, { ...TOAST_STYLE, icon: '💛', duration: 4000 });
      } else if (data.success) {
        toast.success(`¡Suscrito! Revisa ${email} para tu código de 10% OFF.`, { ...TOAST_STYLE, duration: 4000 });
        setEmail('');
      } else {
        toast.error('Algo salió mal. Intenta de nuevo.', { ...TOAST_STYLE });
      }
    } catch {
      toast.error('Sin conexión. Intenta de nuevo.', { ...TOAST_STYLE });
    } finally {
      setLoading(false);
    }
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
              <button className="newsletter-submit" type="submit" disabled={loading}>
                {loading ? 'Enviando…' : 'Suscribirme'}
              </button>
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
export default function HomePageClient({ products = [] }) {
  const [qvProduct, setQvProduct] = useState(null);

  return (
    <ProductsContext.Provider value={products}>
    <div className="sb-home">
      <main>
        <Hero />
        <TrustBar />
        <BrandsMarquee />
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
    </ProductsContext.Provider>
  );
}
