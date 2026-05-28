'use client';
import { useState, useEffect, useRef, useMemo, Suspense } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { ShoppingBag, Search, Menu, X, Heart, ChevronDown, ChevronRight, ArrowRight, FileText, Truck, RotateCcw, HelpCircle, Sparkles, Mail } from 'lucide-react';
import { useCartStore, useCartCount } from '@/lib/store/cartStore';
import { useWishlistStore } from '@/lib/store/wishlistStore';
import { collections, getImagePath, momentoOptions, climaOptions } from '@/lib/products-constants';

// Helper: normaliza para comparar (sin tildes, minúsculas)
const norm = (s) => String(s || '')
  .toLowerCase()
  .normalize('NFD')
  .replace(/[̀-ͯ]/g, '');

const COP = (n) => 'COP $' + Number(n || 0).toLocaleString('es-CO');

// Páginas indexables en el buscador
const SEARCHABLE_PAGES = [
  { title: 'Contacto', desc: 'Habla con nosotros',         url: '/contacto',      Icon: Mail,       keywords: ['contacto', 'whatsapp', 'email', 'ayuda', 'soporte', 'hablar'] },
  { title: 'Preguntas frecuentes', desc: 'FAQ — envíos, pagos, devoluciones', url: '/faq', Icon: HelpCircle, keywords: ['faq', 'preguntas', 'frecuentes', 'ayuda', 'envio', 'pago', 'devolucion'] },
  { title: 'Envíos',     desc: 'Cobertura y tiempos',      url: '/faq',           Icon: Truck,      keywords: ['envio', 'envios', 'shipping', 'entrega', 'express', 'colombia'] },
  { title: 'Devoluciones', desc: '30 días sin preguntas',  url: '/devoluciones',  Icon: RotateCcw,  keywords: ['devolucion', 'devoluciones', 'cambio', 'reembolso', 'garantia'] },
  { title: 'Wishlist',   desc: 'Tus favoritos guardados',  url: '/wishlist',      Icon: Heart,      keywords: ['wishlist', 'favoritos', 'guardados', 'lista'] },
  { title: 'Quiz olfativo', desc: 'Encuentra tu fragancia', url: '/#sb-quiz',     Icon: Sparkles,   keywords: ['quiz', 'test', 'recomendacion', 'olfativo'] },
  { title: 'Privacidad', desc: 'Política de privacidad',   url: '/privacidad',    Icon: FileText,   keywords: ['privacidad', 'privacy', 'datos', 'cookies'] },
  { title: 'Términos',   desc: 'Términos y condiciones',   url: '/terminos',      Icon: FileText,   keywords: ['terminos', 'condiciones', 'legal'] },
];

// Construye los items del menú principal a partir del catálogo recibido.
// Antes era constante a nivel módulo (cuando products era array hardcoded).
function buildNavItems(allBrands) {
  return [
    { label: 'Inicio', to: '/' },
    {
      label: 'Perfumes',
      to: '/tienda',
      isMegaMenu: true,
      categories: [
        {
          id: 'marcas',
          label: 'Marcas',
          isBrandList: true,
          items: allBrands.map(b => ({ label: b, to: `/tienda?brand=${encodeURIComponent(b)}` })),
        },
        {
          id: 'conc',
          label: 'Concentración',
          items: [
            { label: 'Eau de Toilette', desc: 'Fresco y ligero', to: '/tienda?conc=EDT' },
            { label: 'Eau de Parfum', desc: 'Mayor duración e intensidad', to: '/tienda?conc=EDP' },
            { label: 'Extrait de Parfum', desc: 'La máxima concentración', to: '/tienda?conc=Extrait' },
            { label: 'Parfum', desc: 'Alta concentración clásica', to: '/tienda?conc=Parfum' },
            { label: 'Elixir', desc: 'Concentración moderna extrema', to: '/tienda?conc=Elixir' },
          ],
        },
        {
          id: 'familia',
          label: 'Familias Olfativas',
          items: collections.map(c => ({ label: c.name, desc: c.description, to: `/tienda?cat=${c.id}`, color: c.color })),
        },
        {
          id: 'genero',
          label: 'Género',
          items: [
            { label: 'Masculino',  desc: 'Para él',       to: '/tienda?gender=Masculino' },
            { label: 'Femenino',   desc: 'Para ella',      to: '/tienda?gender=Femenino' },
            { label: 'Unisex',     desc: 'Para todos',     to: '/tienda?gender=Unisex' },
          ],
        },
        {
          id: 'momento',
          label: 'Hora del Día',
          items: momentoOptions.map(m => ({ label: m.name, desc: m.description, to: `/tienda?momento=${m.id}` })),
        },
        {
          id: 'clima',
          label: 'Clima',
          items: climaOptions.map(c => ({ label: c.name, desc: c.description, to: `/tienda?clima=${c.id}` })),
        },
      ],
    },
    { label: 'Tienda', to: '/tienda' },
    { label: 'Más Vendidos', to: '/tienda?sort=bestseller' },
  ];
}

export default function Navbar({ products = [] }) {
  return (
    <Suspense fallback={<NavbarShell />}>
      <NavbarInner products={products} />
    </Suspense>
  );
}

function HouseLogo() {
  return (
    <Link href="/" className="sb-nav-logo" aria-label="ScentualBliss inicio">
      <img
        src="/img/logo-transparent.svg"
        alt="ScentualBliss Perfumery"
        className="sb-logo-img"
        width="255"
        height="56"
      />
    </Link>
  );
}

function NavbarShell() {
  return (
    <header className="sb-nav">
      <div className="container sb-nav-inner">
        <div />
        <HouseLogo />
        <div />
      </div>
      <NavStyles />
    </header>
  );
}

function NavbarInner({ products = [] }) {
  // allBrands y NAV_ITEMS se computan del catálogo (antes eran constantes de módulo).
  const allBrands = useMemo(
    () => [...new Set(products.map(p => p.brand))].sort((a, b) =>
      a.localeCompare(b, 'es', { sensitivity: 'base' })
    ),
    [products]
  );
  const NAV_ITEMS = useMemo(() => buildNavItems(allBrands), [allBrands]);

  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [openDropdown, setOpenDropdown] = useState(null);
  const [openSubcat, setOpenSubcat] = useState('marcas');
  const [mobileSubOpen, setMobileSubOpen] = useState(null);
  const closeTimerRef = useRef(null);

  const openMenu = (label) => {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
    setOpenDropdown(label);
  };
  const scheduleClose = () => {
    if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
    closeTimerRef.current = setTimeout(() => {
      setOpenDropdown(null);
      closeTimerRef.current = null;
    }, 220);
  };

  const { toggleCart } = useCartStore();
  const count = useCartCount();
  const { items: rawWishlist } = useWishlistStore();
  const wishlistItems = Array.isArray(rawWishlist) ? rawWishlist : [];
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeType = searchParams?.get('type');
  const activeCat = searchParams?.get('cat');
  const activeBrand = searchParams?.get('brand');

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 30);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    setMenuOpen(false);
    setSearchOpen(false);
    setSearchQuery('');
    setOpenDropdown(null);
    setMobileSubOpen(null);
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  }, [pathname, searchParams]);

  useEffect(() => () => {
    if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
  }, []);

  // Bloquear scroll cuando el drawer está abierto
  useEffect(() => {
    if (menuOpen) {
      document.body.style.overflow = 'hidden';
      return () => { document.body.style.overflow = ''; };
    }
  }, [menuOpen]);

  const handleSearch = (e) => {
    if (e.key === 'Escape') { setSearchOpen(false); setSearchQuery(''); }
    if (e.key === 'Enter' && searchQuery.trim()) {
      router.push(`/tienda?q=${encodeURIComponent(searchQuery.trim())}`);
      setSearchOpen(false);
      setSearchQuery('');
    }
  };

  // Resultados en vivo (productos, marcas, familias, páginas)
  const searchResults = useMemo(() => {
    const q = norm(searchQuery.trim());
    if (q.length < 2) return null;

    // Productos: busca en nombre, marca, descripción, notas
    const productMatches = products
      .map(p => {
        const haystack = norm([
          p.name, p.brand,
          p.description,
          p.notes?.top, p.notes?.heart, p.notes?.base,
        ].filter(Boolean).join(' '));
        if (!haystack.includes(q)) return null;
        // Score simple: comienza con la query → más arriba; en marca o nombre → más arriba
        let score = 0;
        if (norm(p.name).startsWith(q)) score += 10;
        else if (norm(p.name).includes(q)) score += 6;
        if (norm(p.brand).startsWith(q)) score += 8;
        else if (norm(p.brand).includes(q)) score += 4;
        score += (p.rating || 0) * 0.4;
        if (p.bestseller) score += 1;
        return { p, score };
      })
      .filter(Boolean)
      .sort((a, b) => b.score - a.score);

    // Marcas únicas que coinciden
    const brandSet = new Set();
    const brandMatches = [];
    for (const p of products) {
      if (!p.brand || brandSet.has(p.brand)) continue;
      if (norm(p.brand).includes(q)) {
        brandSet.add(p.brand);
        brandMatches.push(p.brand);
      }
      if (brandMatches.length >= 4) break;
    }

    // Familias olfativas
    const familyMatches = collections.filter(c =>
      norm(c.name).includes(q) || norm(c.description).includes(q)
    );

    // Páginas estáticas
    const pageMatches = SEARCHABLE_PAGES.filter(pg =>
      norm(pg.title).includes(q) ||
      norm(pg.desc).includes(q) ||
      pg.keywords.some(k => norm(k).includes(q))
    );

    return {
      products: productMatches.slice(0, 5).map(x => x.p),
      productsTotal: productMatches.length,
      brands: brandMatches,
      families: familyMatches.slice(0, 3),
      pages: pageMatches.slice(0, 4),
      empty: productMatches.length === 0 && brandMatches.length === 0 &&
             familyMatches.length === 0 && pageMatches.length === 0,
    };
  }, [searchQuery]);

  const closeSearch = () => { setSearchOpen(false); setSearchQuery(''); };

  const isItemActive = (item) => {
    if (item.label === 'Inicio') return pathname === '/';
    if (item.isMegaMenu) return pathname === '/tienda';
    if (item.to.includes('sort=bestseller')) return searchParams?.get('sort') === 'bestseller';
    return pathname === item.to.split('?')[0];
  };

  return (
    <>
    <header className={`sb-nav ${scrolled ? 'scrolled' : ''}`}>
      <div className="container sb-nav-inner">
        <button
          className="sb-mobile-toggle-left"
          onClick={() => setMenuOpen(m => !m)}
          aria-label={menuOpen ? 'Cerrar menú' : 'Abrir menú'}
        >
          {menuOpen ? <X size={22} /> : <Menu size={22} />}
        </button>

        <nav className="sb-nav-links">
          {NAV_ITEMS.map(item => {
            const active = isItemActive(item);
            const hasSub = !!item.submenu || !!item.isMegaMenu;
            const isOpen = openDropdown === item.label;
            return (
              <div
                key={item.label}
                className="sb-nav-link-wrap"
                onMouseEnter={() => hasSub && openMenu(item.label)}
                onMouseLeave={() => hasSub && scheduleClose()}
              >
                <Link
                  href={item.to}
                  className={`sb-nav-link ${active ? 'active' : ''}`}
                >
                  {item.label}
                  {hasSub && (
                    <ChevronDown
                      size={12}
                      style={{ transition: 'transform .25s', transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}
                    />
                  )}
                </Link>

                {item.isMegaMenu && isOpen && (
                  <div
                    className="sb-dropdown sb-megamenu-wrap"
                    onMouseEnter={() => openMenu(item.label)}
                    onMouseLeave={scheduleClose}
                  >
                    <div className="sb-megamenu">
                      {/* Left: category list */}
                      <div className="sb-megamenu-left">
                        {item.categories.map(cat => (
                          <div
                            key={cat.id}
                            className={`sb-megamenu-row ${openSubcat === cat.id ? 'active' : ''}`}
                            onMouseEnter={() => setOpenSubcat(cat.id)}
                          >
                            <span>{cat.label}</span>
                            <ChevronRight size={12} />
                          </div>
                        ))}
                        <Link href="/tienda" className="sb-megamenu-ver-todo">
                          Ver toda la tienda <ChevronRight size={11} />
                        </Link>
                      </div>
                      {/* Right: items for active category */}
                      <div className={`sb-megamenu-right ${openSubcat === 'marcas' ? 'sb-megamenu-right--brands' : ''}`}>
                        {item.categories.find(c => c.id === openSubcat)?.items.map(sub => (
                          <Link
                            key={sub.label}
                            href={sub.to}
                            className="sb-megamenu-item"
                          >
                            {sub.color && <span className="sb-dropdown-dot" style={{ background: sub.color, flexShrink: 0, marginTop: 4 }} />}
                            <div>
                              <span className="sb-megamenu-item-label">{sub.label}</span>
                              {sub.desc && <p className="sb-megamenu-item-desc">{sub.desc}</p>}
                            </div>
                          </Link>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        <HouseLogo />

        <div className="sb-nav-actions">
          <button
            onClick={() => setSearchOpen(s => !s)}
            className="sb-nav-icon-btn"
            aria-label="Buscar"
          >
            <Search size={19} />
          </button>
          <Link href="/wishlist" className="sb-nav-icon-btn" aria-label="Favoritos">
            <Heart size={19} />
            {wishlistItems.length > 0 && (
              <span className="sb-nav-badge">{wishlistItems.length}</span>
            )}
          </Link>
          <button onClick={toggleCart} className="sb-nav-icon-btn" aria-label="Carrito">
            <ShoppingBag size={19} />
            {count > 0 && (
              <span key={count} className="sb-nav-badge pop">{count}</span>
            )}
          </button>
        </div>
      </div>

      {searchOpen && (
        <div className="sb-search-bar">
          <div className="container">
            <div className="sb-search-inputwrap">
              <Search size={18} className="sb-search-icon" />
              <input
                className="sb-search-input"
                placeholder="Buscar fragancias, marcas, notas o páginas..."
                autoFocus
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                onKeyDown={handleSearch}
              />
              {searchQuery && (
                <button
                  type="button"
                  className="sb-search-clear"
                  onClick={() => setSearchQuery('')}
                  aria-label="Limpiar búsqueda"
                >
                  <X size={15} />
                </button>
              )}
            </div>

            {searchQuery.trim().length < 2 ? (
              <p className="sb-search-hint">
                Escribe al menos 2 letras · <kbd>Enter</kbd> para buscar · <kbd>Esc</kbd> para cerrar
              </p>
            ) : searchResults?.empty ? (
              <div className="sb-search-empty">
                <p>No encontramos nada para <strong>"{searchQuery}"</strong>.</p>
                <p className="sb-search-empty-hint">Probá con el nombre de la marca, la nota, o una palabra como "envío" o "wishlist".</p>
              </div>
            ) : (
              <div className="sb-search-results">
                {/* PRODUCTOS */}
                {searchResults?.products?.length > 0 && (
                  <div className="sb-search-section">
                    <p className="sb-search-section-title">Perfumes <span>{searchResults.productsTotal}</span></p>
                    <div className="sb-search-product-list">
                      {searchResults.products.map(p => (
                        <Link
                          key={p.id}
                          href={`/perfume/${p.slug}`}
                          className="sb-search-product"
                          onClick={closeSearch}
                        >
                          <img src={getImagePath(p)} alt={p.name} loading="lazy" />
                          <div className="sb-search-product-info">
                            <span className="brand">{p.brand}</span>
                            <span className="name">{p.name}<em> {p.type}</em></span>
                            <span className="price">
                              {Number.isFinite(p.price) && p.price > 0 ? COP(p.price) : 'Próximamente'}
                            </span>
                          </div>
                        </Link>
                      ))}
                    </div>
                    {searchResults.productsTotal > searchResults.products.length && (
                      <Link
                        href={`/tienda?q=${encodeURIComponent(searchQuery.trim())}`}
                        className="sb-search-viewall"
                        onClick={closeSearch}
                      >
                        Ver los {searchResults.productsTotal} resultados <ArrowRight size={13} />
                      </Link>
                    )}
                  </div>
                )}

                {/* MARCAS */}
                {searchResults?.brands?.length > 0 && (
                  <div className="sb-search-section">
                    <p className="sb-search-section-title">Marcas</p>
                    <div className="sb-search-chips">
                      {searchResults.brands.map(b => (
                        <Link
                          key={b}
                          href={`/tienda?brand=${encodeURIComponent(b)}`}
                          className="sb-search-chip"
                          onClick={closeSearch}
                        >
                          {b}
                        </Link>
                      ))}
                    </div>
                  </div>
                )}

                {/* FAMILIAS */}
                {searchResults?.families?.length > 0 && (
                  <div className="sb-search-section">
                    <p className="sb-search-section-title">Familias olfativas</p>
                    <div className="sb-search-chips">
                      {searchResults.families.map(f => (
                        <Link
                          key={f.id}
                          href={`/tienda?cat=${f.id}`}
                          className="sb-search-chip"
                          onClick={closeSearch}
                        >
                          <span className="sb-search-chip-dot" style={{ background: f.color }} />
                          {f.name}
                        </Link>
                      ))}
                    </div>
                  </div>
                )}

                {/* PÁGINAS */}
                {searchResults?.pages?.length > 0 && (
                  <div className="sb-search-section">
                    <p className="sb-search-section-title">Páginas</p>
                    <div className="sb-search-page-list">
                      {searchResults.pages.map(pg => (
                        <Link
                          key={pg.url + pg.title}
                          href={pg.url}
                          className="sb-search-page"
                          onClick={closeSearch}
                        >
                          <span className="sb-search-page-icon"><pg.Icon size={16} /></span>
                          <div>
                            <span className="title">{pg.title}</span>
                            <span className="desc">{pg.desc}</span>
                          </div>
                        </Link>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      <NavStyles />
    </header>

    {menuOpen && (
        <>
          {/* Backdrop */}
          <div
            className="sb-drawer-backdrop"
            onClick={() => setMenuOpen(false)}
            aria-hidden="true"
          />

          {/* Drawer */}
          <div className="sb-drawer" role="dialog" aria-modal="true" aria-label="Menú de navegación">

            {/* Header */}
            <div className="sb-drawer-header">
              <Link href="/" className="sb-drawer-logo" onClick={() => setMenuOpen(false)} aria-label="Inicio">
                <img src="/img/logo-transparent.svg" alt="ScentualBliss" height="40" width="160" />
              </Link>
              <button
                type="button"
                className="sb-drawer-close"
                onClick={() => setMenuOpen(false)}
                aria-label="Cerrar menú"
              >
                <X size={20} />
              </button>
            </div>

            {/* Scrollable body */}
            <div className="sb-drawer-body">

              {/* Acceso rápido a la tienda */}
              <Link href="/tienda" className="sb-drawer-cta" onClick={() => setMenuOpen(false)}>
                <span>Ver toda la tienda</span>
                <ArrowRight size={15} />
              </Link>

              {/* Links principales */}
              <nav className="sb-drawer-main-nav">
                {NAV_ITEMS.filter(i => !i.isMegaMenu && i.label !== 'Tienda').map(item => (
                  <Link
                    key={item.label}
                    href={item.to}
                    className="sb-drawer-main-link"
                    onClick={() => setMenuOpen(false)}
                  >
                    {item.label}
                  </Link>
                ))}
              </nav>

              {/* Sección Perfumes */}
              {NAV_ITEMS.filter(i => i.isMegaMenu).map(item => (
                <div key={item.label} className="sb-drawer-section">
                  <p className="sb-drawer-section-title">Explorar Perfumes</p>
                  {item.categories.map(cat => {
                    const catKey = `${item.label}-${cat.id}`;
                    const catOpen = mobileSubOpen === catKey;
                    return (
                      <div key={cat.id} className="sb-drawer-cat">
                        <button
                          type="button"
                          className="sb-drawer-cat-btn"
                          onClick={() => setMobileSubOpen(o => o === catKey ? null : catKey)}
                          aria-expanded={catOpen}
                        >
                          <span>{cat.label}</span>
                          <ChevronDown size={15} className={`sb-drawer-chevron ${catOpen ? 'open' : ''}`} />
                        </button>
                        {catOpen && (
                          <div className={`sb-drawer-cat-items ${cat.isBrandList ? 'sb-drawer-cat-items--chips' : ''}`}>
                            {cat.items.map(sub => (
                              <Link
                                key={sub.label}
                                href={sub.to}
                                onClick={() => setMenuOpen(false)}
                                className={cat.isBrandList ? 'sb-drawer-chip' : 'sb-drawer-cat-link'}
                              >
                                {sub.color && <span className="sb-drawer-dot" style={{ background: sub.color }} />}
                                {sub.label}
                              </Link>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>

            {/* Footer del drawer */}
            <div className="sb-drawer-footer">
              <div className="sb-drawer-social">
                <a href="https://www.instagram.com/scentualbliss_25/" target="_blank" rel="noopener noreferrer" aria-label="Instagram" className="sb-drawer-social-btn">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/></svg>
                </a>
                <a href="https://www.tiktok.com/@scentualbliss_25" target="_blank" rel="noopener noreferrer" aria-label="TikTok" className="sb-drawer-social-btn">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.27 6.27 0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.33-6.34V9.05a8.16 8.16 0 0 0 4.77 1.52V7.15a4.85 4.85 0 0 1-1-.46z"/></svg>
                </a>
                <a href="https://www.facebook.com/people/Scentual-Bliss/61577971191908/" target="_blank" rel="noopener noreferrer" aria-label="Facebook" className="sb-drawer-social-btn">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
                </a>
                <a href="https://wa.me/573169376436?text=Hola!%20Me%20interesa%20un%20perfume%20de%20ScentualBliss" target="_blank" rel="noopener noreferrer" aria-label="WhatsApp" className="sb-drawer-social-btn">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12 0C5.373 0 0 5.373 0 12c0 2.126.549 4.122 1.514 5.861L.057 23.943l6.204-1.43C7.9 23.47 9.91 24 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-1.892 0-3.668-.502-5.2-1.378l-.373-.214-3.683.848.873-3.585-.234-.387A9.953 9.953 0 0 1 2 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z"/></svg>
                </a>
              </div>
              <p className="sb-drawer-footer-copy">© 2026 ScentualBliss · Medellín</p>
            </div>
          </div>
        </>
      )}
    </>
  );
}

function NavStyles() {
  return (
    <style>{`
      .sb-nav {
        position: sticky; top: 0; z-index: 50;
        background: #000;
        border-bottom: 1px solid rgba(212, 166, 79, .12);
        transition: all .35s cubic-bezier(.22,.61,.36,1);
      }
      .sb-nav.scrolled {
        background: #000;
        border-bottom-color: rgba(212, 166, 79, .22);
        box-shadow: 0 1px 0 rgba(0,0,0, .25), 0 8px 24px rgba(0,0,0,.35);
      }
      .sb-nav-inner {
        display: grid;
        grid-template-columns: 1fr auto 1fr;
        align-items: center;
        padding-top: 10px;
        padding-bottom: 10px;
        gap: 24px;
      }
      .sb-nav-logo {
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
        transition: opacity .25s;
        grid-column: 2;
      }
      .sb-nav-logo:hover { opacity: .85; }
      .sb-logo-img {
        height: 56px;
        width: auto;
        display: block;
        transition: transform .35s cubic-bezier(.16,1,.3,1);
      }
      .sb-nav-logo:hover .sb-logo-img {
        transform: scale(1.03);
      }
      @media (max-width: 768px) {
        .sb-logo-img { height: 52px; }
      }
      @media (max-width: 480px) {
        .sb-logo-img { height: 48px; }
      }
      .sb-nav-links {
        display: flex;
        gap: 32px;
        align-items: center;
        justify-self: start;
        grid-column: 1;
      }
      .sb-mobile-toggle-left {
        display: none;
        width: 44px;
        height: 44px;
        border-radius: 50%;
        align-items: center;
        justify-content: center;
        color: #F2CF7A;
        background: transparent;
        border: 0;
        cursor: pointer;
        transition: background .25s, color .25s;
        grid-column: 1;
        justify-self: start;
        margin-left: -10px;
      }
      .sb-mobile-toggle-left:hover { background: rgba(212, 166, 79, .12); color: #E8C98B; }
      .sb-nav-link-wrap {
        position: relative;
        display: flex;
        align-items: center;
      }
      .sb-nav-link {
        font-family: var(--font-sans);
        font-size: .82rem;
        font-weight: 500;
        color: #E8C98B;
        position: relative;
        padding: 8px 0;
        display: inline-flex;
        align-items: center;
        gap: 4px;
        transition: color .25s;
      }
      .sb-nav-link::after {
        content: '';
        position: absolute;
        left: 0; right: 0; bottom: 0;
        height: 1px;
        background: #F2CF7A;
        transform: scaleX(0);
        transform-origin: right;
        transition: transform .4s cubic-bezier(.16,1,.3,1);
      }
      .sb-nav-link:hover, .sb-nav-link.active { color: #F2CF7A; }
      .sb-nav-link:hover::after, .sb-nav-link.active::after {
        transform: scaleX(1);
        transform-origin: left;
        background: #F2CF7A;
      }

      .sb-dropdown {
        position: absolute;
        top: 100%; left: 50%;
        transform: translateX(-50%);
        padding-top: 14px;
        z-index: 60;
        animation: sb-drop-fade .25s cubic-bezier(.22,.61,.36,1);
      }
      @keyframes sb-drop-fade {
        from { opacity: 0; transform: translateX(-50%) translateY(-6px); }
        to { opacity: 1; transform: translateX(-50%) translateY(0); }
      }
      .sb-dropdown-card {
        background: #E8C98B;
        border: 1px solid rgba(212, 166, 79, .35);
        border-radius: 8px;
        padding: 16px;
        min-width: 380px;
        box-shadow: 0 30px 60px rgba(5, 5, 5, .25), 0 4px 12px rgba(5, 5, 5, .15);
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 4px;
      }
      .sb-dropdown-item {
        display: flex;
        gap: 11px;
        padding: 10px 12px;
        border-radius: 6px;
        transition: background .2s, color .2s, transform .2s;
        position: relative;
      }
      .sb-dropdown-item:hover {
        background: #1F1A14;
        transform: translateX(2px);
      }
      .sb-dropdown-item.active {
        background: #050505;
      }
      .sb-dropdown-item.active::before {
        content: '';
        position: absolute;
        left: 2px;
        top: 14px;
        bottom: 14px;
        width: 2px;
        background: #F2CF7A;
        border-radius: 2px;
      }
      .sb-dropdown-dot {
        width: 10px;
        height: 10px;
        border-radius: 50%;
        margin-top: 6px;
        flex-shrink: 0;
        /* Aro oscuro para que el punto resalte sobre el fondo dorado claro */
        box-shadow: 0 0 0 1.5px rgba(5, 5, 5, .35), inset 0 0 0 1px rgba(255, 255, 255, .25);
        transition: box-shadow .25s, transform .25s;
      }
      .sb-dropdown-item:hover .sb-dropdown-dot,
      .sb-dropdown-item.active .sb-dropdown-dot {
        /* En hover el fondo es oscuro → cambiamos a aro claro + glow del color de la familia */
        box-shadow: 0 0 0 2px rgba(242, 207, 122, .45), 0 0 14px currentColor;
        transform: scale(1.1);
      }
      .sb-dropdown-item h4 {
        font-family: var(--font-sans);
        font-size: .82rem;
        font-weight: 600;
        color: #050505;
        margin: 0 0 1px 0;
        transition: color .2s;
      }
      .sb-dropdown-item p {
        font-size: .7rem;
        color: rgba(5, 5, 5, .60);
        line-height: 1.4;
        margin: 0;
        transition: color .2s;
      }
      .sb-dropdown-item:hover h4,
      .sb-dropdown-item.active h4 { color: #F2CF7A; }
      .sb-dropdown-item:hover p,
      .sb-dropdown-item.active p { color: rgba(232, 201, 139, .75); }

      .sb-dropdown-card--brands {
        grid-template-columns: repeat(3, 1fr);
        min-width: 480px;
        gap: 2px;
        padding: 14px;
      }
      .sb-dropdown-brand {
        display: block;
        padding: 8px 12px;
        font-family: var(--font-sans);
        font-size: .78rem;
        color: #050505;
        border-radius: 6px;
        transition: background .18s, color .18s, transform .18s;
        text-decoration: none;
        position: relative;
      }
      .sb-dropdown-brand:hover {
        background: #1F1A14;
        color: #F2CF7A;
        transform: translateX(2px);
      }
      .sb-dropdown-brand.active {
        background: #050505;
        color: #F2CF7A;
        font-weight: 600;
      }
      .sb-dropdown-brand.active::before {
        content: '';
        position: absolute;
        left: 3px;
        top: 8px;
        bottom: 8px;
        width: 2px;
        background: #F2CF7A;
        border-radius: 2px;
      }

      .sb-nav-actions {
        display: flex;
        gap: 4px;
        align-items: center;
        justify-self: end;
      }
      .sb-nav-icon-btn {
        position: relative;
        width: 40px;
        height: 40px;
        border-radius: 50%;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        color: #E8C98B;
        background: transparent;
        border: 0;
        cursor: pointer;
        transition: all .25s;
      }
      .sb-nav-icon-btn:hover {
        background: rgba(212, 166, 79, .14);
        color: #F2CF7A;
      }
      .sb-nav-icon-btn:focus-visible {
        outline: 2px solid #F2CF7A;
        outline-offset: 2px;
      }
      .sb-nav-link:focus-visible {
        outline: 2px solid #F2CF7A;
        outline-offset: 4px;
        border-radius: 2px;
      }
      .sb-dropdown-item:focus-visible,
      .sb-dropdown-brand:focus-visible {
        outline: 2px solid #F2CF7A;
        outline-offset: -2px;
      }
      .sb-nav-badge {
        position: absolute;
        top: 4px; right: 4px;
        background: #F2CF7A;
        color: #050505;
        font-size: .58rem;
        font-weight: 700;
        min-width: 17px;
        height: 17px;
        padding: 0 5px;
        border-radius: 9px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        line-height: 1;
        border: 2px solid #050505;
        font-family: var(--font-sans);
      }
      .sb-nav-badge.pop { animation: sb-badge-pop .4s cubic-bezier(.16,1,.3,1); }
      @keyframes sb-badge-pop {
        0% { transform: scale(.5); }
        50% { transform: scale(1.25); }
        100% { transform: scale(1); }
      }

      .sb-mobile-toggle { display: none !important; }

      .sb-search-bar {
        position: absolute;
        top: 100%; left: 0; right: 0;
        background: rgba(5, 5, 5, .98);
        backdrop-filter: blur(20px);
        -webkit-backdrop-filter: blur(20px);
        border-bottom: 1px solid rgba(212, 166, 79, .22);
        padding: 18px 24px 22px;
        animation: sb-slide-down .25s cubic-bezier(.22,.61,.36,1);
        max-height: calc(100vh - 80px);
        overflow-y: auto;
      }
      @keyframes sb-slide-down {
        from { opacity: 0; transform: translateY(-10px); }
        to { opacity: 1; transform: none; }
      }
      .sb-search-inputwrap {
        position: relative;
        max-width: 720px;
        display: flex;
        align-items: center;
      }
      .sb-search-icon {
        position: absolute;
        left: 14px;
        color: rgba(232, 201, 139, .55);
        pointer-events: none;
      }
      .sb-search-input {
        width: 100%;
        padding: 13px 44px 13px 42px;
        background: rgba(255, 255, 255, .06);
        border: 1.5px solid rgba(212, 166, 79, .30);
        border-radius: 8px;
        color: #E8C98B;
        font-family: var(--font-sans);
        font-size: .95rem;
        outline: none;
        transition: border-color .2s, box-shadow .2s, background .2s;
      }
      .sb-search-input::placeholder { color: rgba(232, 201, 139, .5); }
      .sb-search-input:focus {
        border-color: #F2CF7A;
        background: rgba(255, 255, 255, .09);
        box-shadow: 0 0 0 4px rgba(212, 166, 79, .22);
      }
      .sb-search-clear {
        position: absolute;
        right: 10px;
        width: 28px;
        height: 28px;
        border-radius: 50%;
        background: rgba(232, 201, 139, .12);
        color: #E8C98B;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        border: 0;
        transition: background .2s, color .2s;
      }
      .sb-search-clear:hover { background: rgba(232, 201, 139, .22); color: #F2CF7A; }
      .sb-search-hint {
        font-size: .72rem;
        color: rgba(232, 201, 139, .55);
        margin-top: 10px;
        max-width: 720px;
        font-family: var(--font-sans);
      }
      .sb-search-hint kbd {
        background: rgba(212, 166, 79, .12);
        border: 1px solid rgba(212, 166, 79, .30);
        border-radius: 4px;
        padding: 1px 6px;
        font-family: ui-monospace, monospace;
        font-size: .85em;
        color: #E8C98B;
      }
      .sb-search-empty {
        max-width: 720px;
        padding: 22px 0;
        color: rgba(232, 201, 139, .8);
        font-family: var(--font-sans);
      }
      .sb-search-empty strong { color: #F2CF7A; }
      .sb-search-empty-hint {
        margin-top: 6px;
        font-size: .82rem;
        color: rgba(232, 201, 139, .55);
      }

      /* ===== RESULTADOS ===== */
      .sb-search-results {
        max-width: 720px;
        margin-top: 16px;
        display: flex;
        flex-direction: column;
        gap: 18px;
      }
      .sb-search-section {}
      .sb-search-section-title {
        font-family: ui-monospace, monospace;
        font-size: .62rem;
        letter-spacing: .25em;
        text-transform: uppercase;
        color: #B8905C;
        margin: 0 0 10px;
        font-weight: 600;
        display: inline-flex;
        align-items: center;
        gap: 8px;
      }
      .sb-search-section-title span {
        padding: 1px 8px;
        background: rgba(212, 166, 79, .12);
        border-radius: 100px;
        font-size: .9em;
        letter-spacing: .15em;
        color: #E8C98B;
      }

      /* Productos */
      .sb-search-product-list {
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: 6px;
      }
      .sb-search-product {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 10px 12px;
        background: rgba(255, 255, 255, .03);
        border: 1px solid rgba(212, 166, 79, .14);
        border-radius: 8px;
        transition: background .2s, border-color .2s, transform .2s;
      }
      .sb-search-product:hover {
        background: rgba(212, 166, 79, .12);
        border-color: rgba(212, 166, 79, .4);
        transform: translateX(2px);
      }
      .sb-search-product img {
        width: 48px;
        height: 48px;
        object-fit: contain;
        background: rgba(232, 201, 139, .05);
        border-radius: 6px;
        padding: 4px;
        flex-shrink: 0;
      }
      .sb-search-product-info {
        display: flex;
        flex-direction: column;
        gap: 2px;
        min-width: 0;
        flex: 1;
      }
      .sb-search-product-info .brand {
        font-family: ui-monospace, monospace;
        font-size: .56rem;
        letter-spacing: .2em;
        text-transform: uppercase;
        color: rgba(232, 201, 139, .65);
        font-weight: 600;
      }
      .sb-search-product-info .name {
        font-family: var(--font-serif);
        font-size: .95rem;
        color: #F2CF7A;
        line-height: 1.15;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .sb-search-product-info .name em {
        font-size: .8em;
        color: rgba(232, 201, 139, .7);
        font-style: italic;
      }
      .sb-search-product-info .price {
        font-size: .76rem;
        color: rgba(232, 201, 139, .85);
        font-weight: 600;
        margin-top: 1px;
      }
      .sb-search-viewall {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        margin-top: 10px;
        padding: 6px 12px;
        font-family: ui-monospace, monospace;
        font-size: .68rem;
        letter-spacing: .18em;
        text-transform: uppercase;
        color: #F2CF7A;
        background: rgba(212, 166, 79, .12);
        border: 1px solid rgba(212, 166, 79, .25);
        border-radius: 100px;
        transition: all .2s;
        font-weight: 600;
      }
      .sb-search-viewall:hover {
        background: #F2CF7A;
        color: #050505;
        gap: 12px;
      }

      /* Chips (marcas y familias) */
      .sb-search-chips {
        display: flex;
        flex-wrap: wrap;
        gap: 6px;
      }
      .sb-search-chip {
        display: inline-flex;
        align-items: center;
        gap: 7px;
        padding: 7px 13px;
        background: rgba(255, 255, 255, .04);
        border: 1px solid rgba(212, 166, 79, .22);
        border-radius: 100px;
        font-family: var(--font-sans);
        font-size: .78rem;
        color: #E8C98B;
        transition: all .2s;
      }
      .sb-search-chip:hover {
        background: rgba(212, 166, 79, .18);
        border-color: #F2CF7A;
        color: #F2CF7A;
        transform: translateY(-1px);
      }
      .sb-search-chip-dot {
        width: 8px;
        height: 8px;
        border-radius: 50%;
        box-shadow: 0 0 0 1.5px rgba(5, 5, 5, .35);
      }

      /* Páginas */
      .sb-search-page-list {
        display: flex;
        flex-direction: column;
        gap: 4px;
      }
      .sb-search-page {
        display: flex;
        align-items: center;
        gap: 13px;
        padding: 10px 12px;
        background: rgba(255, 255, 255, .03);
        border: 1px solid rgba(212, 166, 79, .14);
        border-radius: 8px;
        transition: background .2s, border-color .2s, transform .2s;
      }
      .sb-search-page:hover {
        background: rgba(212, 166, 79, .12);
        border-color: rgba(212, 166, 79, .4);
        transform: translateX(2px);
      }
      .sb-search-page-icon {
        width: 34px;
        height: 34px;
        border-radius: 50%;
        background: rgba(212, 166, 79, .14);
        border: 1px solid rgba(212, 166, 79, .25);
        display: inline-flex;
        align-items: center;
        justify-content: center;
        color: #F2CF7A;
        flex-shrink: 0;
      }
      .sb-search-page .title {
        display: block;
        font-family: var(--font-sans);
        font-size: .9rem;
        color: #F2CF7A;
        font-weight: 600;
      }
      .sb-search-page .desc {
        display: block;
        font-size: .72rem;
        color: rgba(232, 201, 139, .6);
        margin-top: 1px;
      }

      @media (max-width: 768px) {
        .sb-search-product-list { grid-template-columns: 1fr; }
        .sb-search-bar { padding: 14px 20px 18px; }
      }

      /* ===== MOBILE DRAWER ===== */
      .sb-drawer-backdrop {
        position: fixed;
        inset: 0;
        background: rgba(0, 0, 0, .65);
        z-index: 98;
        backdrop-filter: blur(3px);
        animation: sb-fade-in .25s ease;
      }
      @keyframes sb-fade-in {
        from { opacity: 0; }
        to   { opacity: 1; }
      }
      .sb-drawer {
        position: fixed;
        top: 0; left: 0; bottom: 0;
        width: min(340px, 90vw);
        background: #0D0B09;
        border-right: 1px solid rgba(212,166,79,.2);
        z-index: 99;
        display: flex;
        flex-direction: column;
        animation: sb-drawer-in .3s cubic-bezier(.22,.61,.36,1);
        box-shadow: 8px 0 40px rgba(0,0,0,.5);
      }
      @keyframes sb-drawer-in {
        from { transform: translateX(-100%); }
        to   { transform: translateX(0); }
      }

      /* Header */
      .sb-drawer-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 18px 20px 16px;
        border-bottom: 1px solid rgba(212,166,79,.12);
        flex-shrink: 0;
      }
      .sb-drawer-logo img { display: block; }
      .sb-drawer-close {
        width: 40px; height: 40px;
        border-radius: 50%;
        border: 1px solid rgba(212,166,79,.2);
        background: none;
        color: rgba(232,201,139,.7);
        display: flex; align-items: center; justify-content: center;
        cursor: pointer;
        transition: background .2s, color .2s;
        flex-shrink: 0;
      }
      .sb-drawer-close:hover { background: rgba(212,166,79,.12); color: #F2CF7A; }

      /* Body (scrollable) */
      .sb-drawer-body {
        flex: 1;
        overflow-y: auto;
        padding: 12px 0 24px;
        scrollbar-width: none;
      }
      .sb-drawer-body::-webkit-scrollbar { display: none; }

      /* CTA tienda */
      .sb-drawer-cta {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin: 8px 16px 16px;
        padding: 14px 18px;
        background: linear-gradient(135deg, rgba(212,166,79,.18) 0%, rgba(212,166,79,.08) 100%);
        border: 1px solid rgba(212,166,79,.35);
        border-radius: 10px;
        font-family: var(--font-sans);
        font-size: .88rem;
        font-weight: 600;
        color: #F2CF7A;
        letter-spacing: .04em;
        transition: background .2s;
      }
      .sb-drawer-cta:hover { background: rgba(212,166,79,.25); }

      /* Main nav */
      .sb-drawer-main-nav {
        padding: 0 8px;
        margin-bottom: 8px;
      }
      .sb-drawer-main-link {
        display: flex;
        align-items: center;
        padding: 0 12px;
        height: 52px;
        font-family: var(--font-serif);
        font-size: 1.05rem;
        color: rgba(232,201,139,.85);
        border-radius: 8px;
        letter-spacing: .02em;
        transition: background .18s, color .18s;
      }
      .sb-drawer-main-link:hover,
      .sb-drawer-main-link:active { background: rgba(212,166,79,.1); color: #F2CF7A; }

      /* Perfumes section */
      .sb-drawer-section {
        padding: 0 8px;
        border-top: 1px solid rgba(212,166,79,.1);
        padding-top: 12px;
        margin-top: 4px;
      }
      .sb-drawer-section-title {
        font-size: .6rem;
        letter-spacing: .3em;
        text-transform: uppercase;
        color: rgba(212,166,79,.55);
        font-weight: 700;
        padding: 4px 12px 10px;
      }

      /* Category accordion */
      .sb-drawer-cat { margin-bottom: 2px; }
      .sb-drawer-cat-btn {
        display: flex;
        align-items: center;
        justify-content: space-between;
        width: 100%;
        padding: 0 12px;
        height: 50px;
        background: none;
        border: none;
        border-radius: 8px;
        font-family: var(--font-sans);
        font-size: .9rem;
        font-weight: 500;
        color: rgba(232,201,139,.8);
        cursor: pointer;
        text-align: left;
        transition: background .18s, color .18s;
      }
      .sb-drawer-cat-btn:hover,
      .sb-drawer-cat-btn[aria-expanded="true"] { background: rgba(212,166,79,.1); color: #F2CF7A; }
      .sb-drawer-chevron {
        color: rgba(212,166,79,.5);
        transition: transform .25s;
        flex-shrink: 0;
      }
      .sb-drawer-chevron.open { transform: rotate(180deg); color: #F2CF7A; }

      /* Items lista normal */
      .sb-drawer-cat-items {
        padding: 4px 8px 8px 12px;
        display: flex;
        flex-direction: column;
        gap: 1px;
        border-left: 2px solid rgba(212,166,79,.15);
        margin-left: 16px;
        margin-bottom: 4px;
      }
      .sb-drawer-cat-link {
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 10px 12px;
        border-radius: 6px;
        font-family: var(--font-sans);
        font-size: .86rem;
        color: rgba(232,201,139,.7);
        transition: background .18s, color .18s;
        min-height: 42px;
      }
      .sb-drawer-cat-link:hover,
      .sb-drawer-cat-link:active { background: rgba(212,166,79,.1); color: #F2CF7A; }
      .sb-drawer-dot {
        width: 8px; height: 8px;
        border-radius: 50%; flex-shrink: 0;
        box-shadow: 0 0 0 2px rgba(212,166,79,.2);
      }

      /* Chips (marcas) */
      .sb-drawer-cat-items--chips {
        flex-direction: row;
        flex-wrap: wrap;
        gap: 6px;
        padding: 8px 4px 12px 12px;
        border-left: 2px solid rgba(212,166,79,.15);
        margin-left: 16px;
      }
      .sb-drawer-chip {
        display: inline-flex;
        align-items: center;
        padding: 6px 12px;
        background: rgba(212,166,79,.08);
        border: 1px solid rgba(212,166,79,.2);
        border-radius: 99px;
        font-family: var(--font-sans);
        font-size: .75rem;
        font-weight: 500;
        color: rgba(232,201,139,.8);
        transition: background .18s, color .18s, border-color .18s;
        white-space: nowrap;
      }
      .sb-drawer-chip:hover,
      .sb-drawer-chip:active { background: rgba(212,166,79,.22); color: #F2CF7A; border-color: rgba(212,166,79,.5); }

      /* Footer del drawer */
      .sb-drawer-footer {
        padding: 16px 20px;
        border-top: 1px solid rgba(212,166,79,.12);
        flex-shrink: 0;
      }
      .sb-drawer-social {
        display: flex;
        gap: 10px;
        margin-bottom: 12px;
      }
      .sb-drawer-social-btn {
        width: 40px; height: 40px;
        border-radius: 50%;
        border: 1px solid rgba(212,166,79,.2);
        display: flex; align-items: center; justify-content: center;
        color: rgba(232,201,139,.6);
        transition: background .2s, color .2s;
      }
      .sb-drawer-social-btn:hover { background: rgba(212,166,79,.15); color: #F2CF7A; }
      .sb-drawer-footer-copy {
        font-size: .68rem;
        color: rgba(232,201,139,.3);
        letter-spacing: .08em;
      }

      /* ===== MEGA MENU (desktop flyout two-panel) ===== */
      .sb-megamenu-wrap {
        left: 0;
        transform: none;
        animation: sb-drop-fade .22s cubic-bezier(.22,.61,.36,1);
      }
      .sb-megamenu {
        display: flex;
        border-radius: 10px;
        overflow: hidden;
        border: 1px solid rgba(212,166,79,.3);
        box-shadow: 0 32px 64px rgba(5,5,5,.35), 0 4px 16px rgba(5,5,5,.2);
        min-width: 580px;
      }
      /* Left panel: dark, category list */
      .sb-megamenu-left {
        width: 190px;
        flex-shrink: 0;
        background: #1A1612;
        border-right: 1px solid rgba(212,166,79,.15);
        padding: 10px 8px;
        display: flex;
        flex-direction: column;
        gap: 2px;
      }
      .sb-megamenu-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 10px 12px;
        border-radius: 6px;
        cursor: pointer;
        font-family: var(--font-sans);
        font-size: .8rem;
        font-weight: 500;
        color: rgba(232,201,139,.65);
        letter-spacing: .04em;
        transition: background .18s, color .18s;
        user-select: none;
      }
      .sb-megamenu-row:hover { background: rgba(212,166,79,.1); color: #E8C98B; }
      .sb-megamenu-row.active { background: rgba(212,166,79,.18); color: #F2CF7A; }
      .sb-megamenu-row.active svg { color: #F2CF7A; }
      .sb-megamenu-ver-todo {
        display: flex;
        align-items: center;
        gap: 6px;
        margin-top: auto;
        padding: 10px 12px;
        font-family: var(--font-sans);
        font-size: .72rem;
        font-weight: 600;
        letter-spacing: .12em;
        text-transform: uppercase;
        color: rgba(212,166,79,.55);
        border-top: 1px solid rgba(212,166,79,.12);
        transition: color .18s;
      }
      .sb-megamenu-ver-todo:hover { color: #F2CF7A; }
      /* Right panel: gold, items */
      .sb-megamenu-right {
        flex: 1;
        background: #E8C98B;
        padding: 14px;
        display: flex;
        flex-direction: column;
        gap: 3px;
        min-width: 280px;
        max-height: 420px;
        overflow-y: auto;
      }
      .sb-megamenu-right--brands {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        align-content: flex-start;
        gap: 2px;
        min-width: 400px;
      }
      .sb-megamenu-item {
        display: flex;
        align-items: flex-start;
        gap: 10px;
        padding: 9px 12px;
        border-radius: 6px;
        color: #1A1612;
        text-decoration: none;
        transition: background .18s, color .18s, transform .18s;
      }
      .sb-megamenu-item:hover { background: #1F1A14; transform: translateX(2px); }
      .sb-megamenu-right--brands .sb-megamenu-item { padding: 8px 10px; }
      .sb-megamenu-item-label {
        display: block;
        font-family: var(--font-sans);
        font-size: .82rem;
        font-weight: 600;
        color: #1A1612;
        line-height: 1.2;
        transition: color .18s;
      }
      .sb-megamenu-item:hover .sb-megamenu-item-label { color: #F2CF7A; }
      .sb-megamenu-item-desc {
        font-size: .68rem;
        color: rgba(26,22,18,.55);
        margin: 2px 0 0;
        line-height: 1.3;
        transition: color .18s;
      }
      .sb-megamenu-item:hover .sb-megamenu-item-desc { color: rgba(232,201,139,.65); }

      @media (max-width: 1024px) {
        .sb-nav-links { gap: 22px; }
      }
      @media (max-width: 900px) {
        .sb-nav-links { display: none; }
        .sb-mobile-toggle-left { display: inline-flex; }
        .sb-nav-inner {
          grid-template-columns: 1fr auto 1fr;
          gap: 12px;
          padding: 8px 0;
        }
      }
    `}</style>
  );
}
