'use client';
import { useState, useEffect, useRef, useMemo } from 'react';
import Link from 'next/link';
import QuickView from '@/components/ui/QuickView';
import {
  ArrowRight, ArrowLeft, ShoppingBag, Heart, Eye,
  Sparkles, RotateCcw,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { products, collections, testimonials, productTypeLabels, getImagePath } from '@/lib/products';
import { useCartStore } from '@/lib/store/cartStore';
import { useWishlistStore } from '@/lib/store/wishlistStore';
import './HomePageClient.css';

const COP = (n) => 'COP $' + Number(n || 0).toLocaleString('es-CO');

// Perfume insignia ScentualBliss — pre-orden por WhatsApp
const HOUSE_PERFUME = {
  name: 'Aurum',
  type: 'EDP',
  ref: 'SCT-01',
  family: 'Ámbar floral',
  image: '/img/scentual-bliss-perfumery.png',
  status: 'Edición limitada',
  notes: ['Bergamota', 'Jazmín', 'Ámbar', 'Oud', 'Sándalo', 'Vainilla'],
  metrics: { sillage: 92, longevity: 88 },
  ctaHref:
    'https://wa.me/573169376436?text=' +
    encodeURIComponent('Hola! Quiero reservar Aurum EDP — la primera fragancia de autor de ScentualBliss 🌸'),
};

const TOAST_STYLE = {
  style: { background: '#1F1A14', color: '#FAF8F3', border: '1px solid rgba(184,144,92,.4)' },
  iconTheme: { primary: '#B8905C', secondary: '#FAF8F3' },
};

function _brandSlug(name) {
  return String(name || '').toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

const HERO_BRANDS = (() => {
  const seen = new Map();
  for (const p of products) {
    if (!p.brand || seen.has(p.brand)) continue;
    seen.set(p.brand, { name: p.brand, slug: _brandSlug(p.brand) });
  }
  return Array.from(seen.values());
})();

const QUIZ_STEPS = [
  {
    q: '¿En qué momento quieres que tu fragancia <em>brille</em>?',
    options: [
      { icon: '☀', text: 'Día y oficina', sub: 'Frescura ligera, energizante', weight: { fresco: 3, citrico: 3, frutal: 1 } },
      { icon: '☾', text: 'Noches especiales', sub: 'Sensual, profundo, magnético', weight: { dulce: 3, amaderado: 3, floral: 1 } },
      { icon: '✿', text: 'Casual diario', sub: 'Versátil, fácil de llevar', weight: { fresco: 2, frutal: 2, citrico: 1 } },
      { icon: '✦', text: 'Solo eventos', sub: 'Algo único e inolvidable', weight: { amaderado: 3, dulce: 2, floral: 2 } },
    ],
  },
  {
    q: '¿Qué <em>aroma</em> te detiene en seco al pasar?',
    options: [
      { icon: '✿', text: 'Flores recién cortadas', sub: 'Rosa, jazmín, gardenia', weight: { floral: 4 } },
      { icon: '◉', text: 'Vainilla y caramelo', sub: 'Dulce, cremoso, cálido', weight: { dulce: 4 } },
      { icon: '❦', text: 'Bosque después de lluvia', sub: 'Maderas, pachulí, vetiver', weight: { amaderado: 4 } },
      { icon: '☀', text: 'Cítricos al amanecer', sub: 'Bergamota, mandarina, lima', weight: { citrico: 4, fresco: 2 } },
    ],
  },
  {
    q: '¿Cómo te describirían las personas más <em>cercanas</em>?',
    options: [
      { icon: '✦', text: 'Intensa y apasionada', sub: 'Vives todo al máximo', weight: { dulce: 2, amaderado: 3 } },
      { icon: '◆', text: 'Elegante y refinada', sub: 'Tienes ojo para los detalles', weight: { floral: 3, amaderado: 2 } },
      { icon: '∿', text: 'Libre y aventurera', sub: 'Espontánea y energética', weight: { fresco: 3, citrico: 2 } },
      { icon: '❀', text: 'Coqueta y juguetona', sub: 'Siempre sorprendes', weight: { frutal: 3, dulce: 2 } },
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

const TYPE_DESCRIPTIONS = {
  disenador: {
    title: 'Diseñador',
    desc: 'Las casas icónicas del lujo. Chanel, Dior, Carolina Herrera, Tom Ford, Versace.',
  },
  nicho: {
    title: 'Nicho',
    desc: 'Perfumistas independientes que rompen las reglas. Xerjoff, Maison Crivelli, Lorenzo Pazzaglia.',
  },
  arabe: {
    title: 'Árabe',
    desc: 'Tradición olfativa de Oriente. Lattafa, Armaf, Afnan, Emper.',
  },
};

// Conteo real de productos por tipo (no hardcoded)
const TYPE_COUNTS = products.reduce((acc, p) => {
  if (p.productType) acc[p.productType] = (acc[p.productType] || 0) + 1;
  return acc;
}, {});

// ---------- Reveal-on-scroll ----------
function Reveal({ children, delay = 0, as: Tag = 'div', className = '', style }) {
  const ref = useRef(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
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
    return () => { clearTimeout(fallbackTimer); io.disconnect(); };
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

// ============================================================
// HERO — editorial, limpio, sin efectos decorativos
// ============================================================
function Hero() {
  return (
    <section className="sbh-hero">
      <div className="container sbh-hero-inner">
        <div className="sbh-hero-meta">
          <span>SCT — 01</span>
          <span className="sbh-hero-meta-dot" />
          <span>Drop 04 · 2026</span>
        </div>

        <div className="sbh-hero-grid">
          <div className="sbh-hero-left">
            <h1 className="sbh-hero-title">
              <span>El aroma</span>
              <span>que <em>te</em></span>
              <span className="italic">define.</span>
            </h1>
            <p className="sbh-hero-sub">
              Curación obsesiva de fragancias auténticas — diseñador, nicho y árabe.
              Una identidad olfativa que dura más que la noche.
            </p>
            <div className="sbh-hero-ctas">
              <Link href="/tienda" className="sbh-btn-primary">
                Explorar colección <ArrowRight size={15} />
              </Link>
              <a href="#sb-quiz" className="sbh-btn-ghost">
                <Sparkles size={13} /> Quiz olfativo
              </a>
            </div>
            <div className="sbh-hero-stats">
              <span><b>{products.length}</b> fragancias</span>
              <span className="sep">·</span>
              <span><b>{HERO_BRANDS.length}</b> marcas</span>
              <span className="sep">·</span>
              <span><b>100%</b> auténticas</span>
            </div>
          </div>

          <div className="sbh-hero-right">
            <div className="sbh-hero-bottle">
              <img src={HOUSE_PERFUME.image} alt="Aurum EDP — ScentualBliss" />
            </div>
            <div className="sbh-hero-bottle-caption">
              <span className="mono">{HOUSE_PERFUME.ref}</span>
              <span>{HOUSE_PERFUME.name} {HOUSE_PERFUME.type}</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ============================================================
// MARQUEE — slider de marcas (sin rotación)
// ============================================================
function BrandsMarquee() {
  return (
    <div className="sbh-marquee" aria-hidden="true">
      <div className="sbh-marquee-track">
        {[...Array(2)].map((_, dup) => (
          <span key={dup} className="sbh-marquee-set">
            {HERO_BRANDS.map((b, i) => (
              <span key={`${dup}-${i}`} className="sbh-marquee-item">
                <img
                  src={`/img/brands/${b.slug}.webp`}
                  alt={b.name}
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
// TRUST BAR — fondo oscuro, contraste
// ============================================================
function TrustBar() {
  const items = [
    { k: '24-48h', v: 'Envío express a toda Colombia' },
    { k: 'Wompi', v: 'Pago seguro · SSL + cifrado bancario' },
    { k: '30 días', v: 'Devolución sin preguntas' },
    { k: '100%', v: 'Auténticos · garantía total' },
  ];
  return (
    <section className="sbh-trust">
      <div className="container sbh-trust-grid">
        {items.map((it, i) => (
          <Reveal key={i} delay={i * 80} className="sbh-trust-item">
            <div className="sbh-trust-k">{it.k}</div>
            <div className="sbh-trust-v">{it.v}</div>
          </Reveal>
        ))}
      </div>
    </section>
  );
}

// ============================================================
// AURUM — fragancia de autor (reemplaza al Featured)
// ============================================================
function Aurum() {
  return (
    <section className="sbh-aurum">
      <div className="container sbh-aurum-inner">
        <div className="sbh-aurum-text">
          <Reveal>
            <p className="sbh-eyebrow">Fragancia de autor · {HOUSE_PERFUME.ref}</p>
          </Reveal>
          <Reveal delay={120}>
            <h2 className="sbh-aurum-title">
              {HOUSE_PERFUME.name}
              <span className="sbh-aurum-type">{HOUSE_PERFUME.type}</span>
            </h2>
          </Reveal>
          <Reveal delay={200}>
            <div className="sbh-rule" />
          </Reveal>
          <Reveal delay={260}>
            <p className="sbh-aurum-family">{HOUSE_PERFUME.family}</p>
            <p className="sbh-aurum-status">{HOUSE_PERFUME.status}</p>
          </Reveal>
          <Reveal delay={340}>
            <p className="sbh-aurum-desc">
              La primera fragancia firmada por la casa. Construida sobre una columna de
              ámbar y oud envuelta en jazmín y vainilla, con bergamota brillante en la
              apertura y un fondo cremoso de sándalo. Una identidad pensada para durar.
            </p>
          </Reveal>
          <Reveal delay={400}>
            <ul className="sbh-aurum-notes">
              {HOUSE_PERFUME.notes.map((n) => (
                <li key={n}>{n}</li>
              ))}
            </ul>
          </Reveal>
          <Reveal delay={460}>
            <div className="sbh-aurum-metrics">
              <div>
                <span className="mono">Sillage</span>
                <div className="sbh-metric-bar"><div style={{ width: HOUSE_PERFUME.metrics.sillage + '%' }} /></div>
                <span className="sbh-metric-val">{HOUSE_PERFUME.metrics.sillage}%</span>
              </div>
              <div>
                <span className="mono">Longevidad</span>
                <div className="sbh-metric-bar"><div style={{ width: HOUSE_PERFUME.metrics.longevity + '%' }} /></div>
                <span className="sbh-metric-val">{HOUSE_PERFUME.metrics.longevity}%</span>
              </div>
            </div>
          </Reveal>
          <Reveal delay={520}>
            <a
              href={HOUSE_PERFUME.ctaHref}
              target="_blank"
              rel="noopener noreferrer"
              className="sbh-btn-primary sbh-aurum-cta"
            >
              Pre-orden por WhatsApp <ArrowRight size={15} />
            </a>
          </Reveal>
        </div>

        <Reveal className="sbh-aurum-image" delay={120}>
          <img src={HOUSE_PERFUME.image} alt={`${HOUSE_PERFUME.name} ${HOUSE_PERFUME.type}`} />
        </Reveal>
      </div>
    </section>
  );
}

// ============================================================
// FAMILIES — grid 3x2 de las 6 familias olfativas
// ============================================================
function Families() {
  return (
    <section className="sbh-section">
      <div className="container">
        <div className="sbh-section-head">
          <Reveal><p className="sbh-eyebrow">Familias olfativas</p></Reveal>
          <Reveal delay={100}>
            <h2 className="sbh-section-title">
              Seis <em>aromas</em> que te <br />definen.
            </h2>
          </Reveal>
          <Reveal delay={200}>
            <p className="sbh-section-sub">
              Explorá por familia. Cada una es un mundo —desde la frescura cítrica hasta
              la profundidad amaderada.
            </p>
          </Reveal>
        </div>

        <div className="sbh-families">
          {collections.map((fam, i) => (
            <Reveal key={fam.id} delay={i * 70} className="sbh-family-card-wrap">
              <Link href={`/tienda?cat=${fam.id}`} className="sbh-family-card">
                <div className="sbh-family-img">
                  <img src={fam.image} alt={fam.name} loading="lazy" />
                </div>
                <div className="sbh-family-content">
                  <p className="mono sbh-family-num">{String(i + 1).padStart(2, '0')}</p>
                  <h3 className="sbh-family-name">{fam.name}</h3>
                  <p className="sbh-family-desc">{fam.description}</p>
                  <span className="sbh-family-link">
                    Ver fragancias <ArrowRight size={14} />
                  </span>
                </div>
              </Link>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

// ============================================================
// PRODUCT CARD — card limpia, sin efectos decorativos
// ============================================================
function PCard({ product, onQuick }) {
  const addItem = useCartStore(s => s.addItem);
  const wishlistItems = useWishlistStore(s => s.items);
  const toggleWish = useWishlistStore(s => s.toggle);
  const wishlisted = wishlistItems.some(i => i.id === product.id);

  const handleAdd = (e) => {
    e.preventDefault(); e.stopPropagation();
    const size = product.size?.[0] || product.sizes?.[0] || '100ml';
    addItem(product, size);
    toast.success(`${product.name} añadido al carrito`, { ...TOAST_STYLE, duration: 2400 });
  };
  const handleWish = (e) => {
    e.preventDefault(); e.stopPropagation();
    toggleWish(product);
    toast.success(wishlisted ? `${product.name} quitado de favoritos` : `${product.name} añadido a favoritos`, { ...TOAST_STYLE, duration: 2200 });
  };
  const handleQuick = (e) => {
    e.preventDefault(); e.stopPropagation();
    onQuick?.(product);
  };

  const img = getImagePath(product);
  const oldPrice = product.originalPrice || product.oldPrice;

  return (
    <Link href={`/perfume/${product.slug}`} className="sbh-pcard">
      <div className="sbh-pcard-imgwrap">
        {product.badge && (
          <span className="sbh-pcard-badge">{product.badge}</span>
        )}
        <button
          type="button"
          className={`sbh-pcard-wish ${wishlisted ? 'is-on' : ''}`}
          onClick={handleWish}
          aria-label="Añadir a favoritos"
        >
          <Heart size={14} fill={wishlisted ? 'currentColor' : 'none'} />
        </button>
        <img className="sbh-pcard-img" src={img} alt={product.name} loading="lazy" />
        <div className="sbh-pcard-actions">
          <button type="button" className="sbh-pcard-add" onClick={handleAdd}>
            <ShoppingBag size={13} /> Agregar
          </button>
          <button type="button" className="sbh-pcard-quick" onClick={handleQuick} aria-label="Vista rápida">
            <Eye size={14} />
          </button>
        </div>
      </div>
      <div className="sbh-pcard-info">
        <p className="sbh-pcard-brand">{product.brand}</p>
        <h3 className="sbh-pcard-name">{product.name}</h3>
        <div className="sbh-pcard-meta">
          <Stars rating={product.rating || 5} size={11} />
          <span className="sbh-pcard-reviews">({product.reviews || 0})</span>
        </div>
        <p className="sbh-pcard-price">
          {oldPrice && <span className="old">{COP(oldPrice)}</span>}
          {product.price > 0 && Number.isFinite(product.price)
            ? COP(product.price)
            : <span className="soon">Próximamente</span>}
        </p>
      </div>
    </Link>
  );
}

// ============================================================
// BESTSELLERS — top 6 por rating
// ============================================================
function Bestsellers({ onQuick }) {
  const best = useMemo(() => {
    return products
      .filter(p => p.bestseller)
      .sort((a, b) => (b.rating || 0) - (a.rating || 0))
      .slice(0, 6);
  }, []);

  return (
    <section className="sbh-section sbh-section-cream">
      <div className="container">
        <div className="sbh-section-head sbh-section-head-row">
          <div>
            <Reveal><p className="sbh-eyebrow">Los más codiciados</p></Reveal>
            <Reveal delay={100}>
              <h2 className="sbh-section-title">
                Bestsellers.
              </h2>
            </Reveal>
          </div>
          <Reveal delay={200} as="div">
            <Link href="/tienda?sort=bestseller" className="sbh-link-arrow">
              Ver todos <ArrowRight size={14} />
            </Link>
          </Reveal>
        </div>

        <div className="sbh-products-grid">
          {best.map((p, i) => (
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
// THREE WORLDS — diseñador, nicho, árabe
// ============================================================
function ThreeWorlds() {
  const order = ['disenador', 'nicho', 'arabe'];
  return (
    <section className="sbh-section">
      <div className="container">
        <div className="sbh-section-head center">
          <Reveal><p className="sbh-eyebrow">Nuestra curación</p></Reveal>
          <Reveal delay={100}>
            <h2 className="sbh-section-title">
              Tres <em>mundos</em>, una obsesión.
            </h2>
          </Reveal>
          <Reveal delay={200}>
            <p className="sbh-section-sub">
              No vendemos cualquier perfume. Trabajamos con tres universos olfativos y los
              traemos a Colombia, garantizados al 100%.
            </p>
          </Reveal>
        </div>

        <div className="sbh-worlds">
          {order.map((key, i) => {
            const t = TYPE_DESCRIPTIONS[key];
            const count = TYPE_COUNTS[key] || 0;
            return (
              <Reveal key={key} delay={i * 100} className="sbh-world">
                <p className="mono sbh-world-num">0{i + 1}</p>
                <h3 className="sbh-world-title">{t.title}</h3>
                <p className="sbh-world-desc">{t.desc}</p>
                <p className="sbh-world-count">
                  <b>{count}</b> {count === 1 ? 'fragancia' : 'fragancias'}
                </p>
                <Link href={`/tienda?type=${key}`} className="sbh-link-arrow">
                  Explorar <ArrowRight size={14} />
                </Link>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}

// ============================================================
// QUIZ — se mantiene la lógica
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
    <section id="sb-quiz" className="sbh-quiz">
      <div className="container">
        <div className="sbh-section-head center sbh-section-head-light">
          <Reveal><p className="sbh-eyebrow gold">Quiz olfativo</p></Reveal>
          <Reveal delay={100}>
            <h2 className="sbh-section-title">¿Qué fragancia <em>eres</em>?</h2>
          </Reveal>
          <Reveal delay={200}>
            <p className="sbh-section-sub">Tres preguntas. Una recomendación curada para ti.</p>
          </Reveal>
        </div>

        <div className="sbh-quiz-card">
          {!done ? (
            <>
              <div className="sbh-quiz-progress">
                {QUIZ_STEPS.map((_, i) => (
                  <div key={i} className={`sbh-quiz-bar ${i < step ? 'is-done' : i === step ? 'is-active' : ''}`} />
                ))}
              </div>
              <p className="sbh-quiz-step">Pregunta {step + 1} de {QUIZ_STEPS.length}</p>
              <h3 className="sbh-quiz-q" dangerouslySetInnerHTML={{ __html: QUIZ_STEPS[step].q }} />
              <div className="sbh-quiz-opts">
                {QUIZ_STEPS[step].options.map((opt, i) => (
                  <button key={i} type="button" className="sbh-quiz-opt" onClick={() => choose(opt.weight)}>
                    <span className="sbh-quiz-opt-icon">{opt.icon}</span>
                    <span className="sbh-quiz-opt-text">
                      {opt.text}
                      <span className="sbh-quiz-opt-sub">{opt.sub}</span>
                    </span>
                    <ArrowRight size={15} />
                  </button>
                ))}
              </div>
              {step > 0 && (
                <button type="button" className="sbh-quiz-back" onClick={() => setStep(step - 1)}>
                  <ArrowLeft size={13} /> Volver
                </button>
              )}
            </>
          ) : (
            <div className="sbh-quiz-result">
              <p className="sbh-quiz-step">Tu firma olfativa</p>
              <h3 className="sbh-quiz-result-title">
                Eres <em style={{ color: famColor }}>{FAMILY_NAMES[winner]}</em>.
              </h3>
              <p className="sbh-quiz-result-desc">{FAMILY_DESC[winner]}</p>
              <p className="sbh-quiz-step" style={{ marginTop: 32, marginBottom: 16 }}>
                Tres fragancias para ti
              </p>
              <div className="sbh-quiz-result-grid">
                {recommendations.length > 0 ? recommendations.map(p => (
                  <Link key={p.id} href={`/perfume/${p.slug}`} className="sbh-quiz-result-card">
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
              <button type="button" onClick={reset} className="sbh-btn-gold" style={{ marginTop: 32 }}>
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
// TESTIMONIALS — 4 reales, layout editorial limpio
// ============================================================
function Testimonials() {
  const initialsOf = (name = '') =>
    name.split(' ').map(p => p[0]).filter(Boolean).slice(0, 2).join('').toUpperCase();

  return (
    <section className="sbh-section sbh-section-cream">
      <div className="container">
        <div className="sbh-section-head center">
          <Reveal><p className="sbh-eyebrow">Lo que dicen</p></Reveal>
          <Reveal delay={100}>
            <h2 className="sbh-section-title">
              Miles de historias, <br /><em>una fragancia</em>.
            </h2>
          </Reveal>
        </div>

        <div className="sbh-testimonials">
          {testimonials.map((t, i) => (
            <Reveal key={t.id} delay={i * 80} className="sbh-tcard">
              <Stars rating={t.rating} size={12} />
              <p className="sbh-tcard-text">«{t.text}»</p>
              <div className="sbh-tcard-author">
                <span className="sbh-tcard-avatar">{initialsOf(t.name)}</span>
                <div>
                  <p className="sbh-tcard-name">{t.name}</p>
                  <p className="sbh-tcard-meta">{t.location} · <span className="mono">{t.product}</span></p>
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
// STORY — manifiesto editorial corto
// ============================================================
function Story() {
  return (
    <section className="sbh-story">
      <div className="container sbh-story-inner">
        <Reveal>
          <p className="sbh-eyebrow gold">Manifiesto</p>
        </Reveal>
        <Reveal delay={120}>
          <h2 className="sbh-story-title">
            Medellín, 2026. <br />
            Empezamos con un solo objetivo: traer al país las fragancias que <em>importan</em>.
          </h2>
        </Reveal>
        <Reveal delay={240}>
          <p className="sbh-story-text">
            ScentualBliss no es otra tienda online. Es un proyecto curatorial: probamos
            cientos de fragancias para seleccionar las que merecen estar en tu piel.
            Trabajamos directo con distribuidores oficiales y garantizamos cada frasco al
            100%. Si no te enamora, te devolvemos el dinero.
          </p>
        </Reveal>
        <Reveal delay={360} className="sbh-story-stats">
          <div>
            <span className="k">{products.length}</span>
            <span className="v">Fragancias</span>
          </div>
          <div>
            <span className="k">{HERO_BRANDS.length}</span>
            <span className="v">Marcas curadas</span>
          </div>
          <div>
            <span className="k">100%</span>
            <span className="v">Auténticas</span>
          </div>
        </Reveal>
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
    <section className="sbh-newsletter">
      <div className="container sbh-newsletter-inner">
        <Reveal>
          <p className="sbh-eyebrow">Newsletter exclusivo</p>
        </Reveal>
        <Reveal delay={120}>
          <h2 className="sbh-section-title">
            Obtené <em>10% OFF</em> <br />en tu primera compra.
          </h2>
        </Reveal>
        <Reveal delay={240}>
          <p className="sbh-section-sub">
            Suscribite y recibí ofertas, lanzamientos anticipados y guías de fragancias
            directo en tu correo. Sin spam, cancelás cuando quieras.
          </p>
        </Reveal>
        <Reveal delay={360}>
          <form className="sbh-newsletter-form" onSubmit={submit}>
            <input
              type="email"
              placeholder="tu@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <button type="submit">Suscribirme</button>
          </form>
        </Reveal>
      </div>
    </section>
  );
}

// ============================================================
// HOME — root
// ============================================================
export default function HomePageClient() {
  const [qvProduct, setQvProduct] = useState(null);

  return (
    <div className="sbh">
      <main>
        <Hero />
        <BrandsMarquee />
        <TrustBar />
        <Aurum />
        <Families />
        <Bestsellers onQuick={setQvProduct} />
        <ThreeWorlds />
        <Testimonials />
        <Quiz />
        <Story />
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
