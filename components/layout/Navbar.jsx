'use client';
import { useState, useEffect, useRef, useMemo, Suspense } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { ShoppingBag, Search, Menu, X, Heart, ChevronDown, ArrowRight, FileText, Truck, RotateCcw, HelpCircle, Sparkles, Mail } from 'lucide-react';
import { useCartStore, useCartCount } from '@/lib/store/cartStore';
import { useWishlistStore } from '@/lib/store/wishlistStore';
import { collections, products, getImagePath } from '@/lib/products';

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

// Marcas únicas ordenadas alfabéticamente
const allBrands = [...new Set(products.map(p => p.brand))].sort((a, b) =>
  a.localeCompare(b, 'es', { sensitivity: 'base' })
);

const NAV_ITEMS = [
  { label: 'Inicio', to: '/' },
  { label: 'Tienda', to: '/tienda' },
  {
    label: 'Aromas',
    to: '/tienda',
    submenu: collections.map(c => ({
      label: c.name,
      description: c.description,
      to: `/tienda?cat=${c.id}`,
      color: c.color,
      catId: c.id,
    })),
  },
  {
    label: 'Marcas',
    to: '/tienda',
    submenu: allBrands.map(b => ({
      label: b,
      to: `/tienda?brand=${encodeURIComponent(b)}`,
      brandId: b,
    })),
    isBrandMenu: true,
  },
  { label: 'Bestsellers', to: '/tienda?sort=bestseller' },
];

export default function Navbar() {
  return (
    <Suspense fallback={<NavbarShell />}>
      <NavbarInner />
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

function NavbarInner() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [openDropdown, setOpenDropdown] = useState(null);
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
  const { items: wishlistItems } = useWishlistStore();
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
    if (item.submenu) {
      if (item.isBrandMenu) return !!activeBrand && item.submenu.some(s => s.brandId === activeBrand);
      return !!activeCat && item.submenu.some(s => s.catId === activeCat);
    }
    if (item.to.includes('sort=bestseller')) return searchParams?.get('sort') === 'bestseller';
    if (item.to === '/tienda') return pathname === '/tienda' && !activeType && !activeCat && !activeBrand;
    return pathname === item.to.split('?')[0];
  };

  return (
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
            const hasSub = !!item.submenu;
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

                {hasSub && isOpen && (
                  <div
                    className="sb-dropdown"
                    onMouseEnter={() => openMenu(item.label)}
                    onMouseLeave={scheduleClose}
                  >
                    <div className={`sb-dropdown-card ${item.isBrandMenu ? 'sb-dropdown-card--brands' : ''}`}>
                      {item.submenu.map(sub => {
                        const subActive = item.isBrandMenu
                          ? activeBrand === sub.brandId
                          : activeCat === sub.catId;
                        if (item.isBrandMenu) {
                          return (
                            <Link
                              key={sub.label}
                              href={sub.to}
                              className={`sb-dropdown-brand ${subActive ? 'active' : ''}`}
                            >
                              {sub.label}
                            </Link>
                          );
                        }
                        return (
                          <Link
                            key={sub.label}
                            href={sub.to}
                            className={`sb-dropdown-item ${subActive ? 'active' : ''}`}
                          >
                            <span className="sb-dropdown-dot" style={{ background: sub.color }} />
                            <div>
                              <h4>{sub.label}</h4>
                              <p>{sub.description}</p>
                            </div>
                          </Link>
                        );
                      })}
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

      {menuOpen && (
        <div className="sb-mobile-menu">
          {NAV_ITEMS.map(item => {
            const hasSub = !!item.submenu;
            const subOpen = mobileSubOpen === item.label;
            if (!hasSub) {
              return (
                <Link key={item.label} href={item.to} className="sb-mobile-link">
                  {item.label}
                </Link>
              );
            }
            return (
              <div key={item.label}>
                <button
                  type="button"
                  onClick={() => setMobileSubOpen(o => o === item.label ? null : item.label)}
                  className="sb-mobile-link sb-mobile-toggle-btn"
                >
                  <span>{item.label}</span>
                  <ChevronDown
                    size={15}
                    style={{ color: '#F2CF7A', transition: 'transform .25s', transform: subOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}
                  />
                </button>
                {subOpen && (
                  <div className="sb-mobile-submenu">
                    {item.submenu.map(sub => (
                      <Link key={sub.label} href={sub.to} className="sb-mobile-sublink">
                        <span className="sb-mobile-dot" style={{ background: sub.color }} />
                        {sub.label}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <NavStyles />
    </header>
  );
}

function NavStyles() {
  return (
    <style>{`
      .sb-nav {
        position: sticky; top: 0; z-index: 50;
        background: rgba(5, 5, 5, .85);
        backdrop-filter: blur(20px) saturate(1.4);
        -webkit-backdrop-filter: blur(20px) saturate(1.4);
        border-bottom: 1px solid rgba(212, 166, 79, .12);
        transition: all .35s cubic-bezier(.22,.61,.36,1);
      }
      .sb-nav.scrolled {
        background: rgba(5, 5, 5, .96);
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

      .sb-mobile-menu {
        position: absolute;
        top: 100%; left: 0; right: 0;
        background: rgba(5, 5, 5, .98);
        backdrop-filter: blur(20px);
        border-bottom: 1px solid rgba(212, 166, 79, .22);
        padding: 16px 24px;
        display: flex;
        flex-direction: column;
        gap: 4px;
        animation: sb-slide-down .25s cubic-bezier(.22,.61,.36,1);
        max-height: calc(100vh - 120px);
        overflow-y: auto;
      }
      .sb-mobile-link {
        display: flex;
        justify-content: space-between;
        align-items: center;
        font-family: var(--font-serif);
        font-size: 1.1rem;
        color: #E8C98B;
        letter-spacing: .02em;
        padding: 14px 4px;
        border-bottom: 1px solid rgba(212, 166, 79, .12);
        background: none;
        border-left: 0;
        border-right: 0;
        border-top: 0;
        text-align: left;
        width: 100%;
        cursor: pointer;
        transition: color .2s, padding-left .25s var(--ease-out, cubic-bezier(.16,1,.3,1));
      }
      .sb-mobile-link:hover,
      .sb-mobile-link:active,
      .sb-mobile-link:focus-visible {
        color: #F2CF7A;
        padding-left: 12px;
        outline: none;
      }
      .sb-mobile-toggle-btn { font-family: var(--font-serif); }
      .sb-mobile-submenu {
        padding: 8px 0 14px 18px;
        display: flex;
        flex-direction: column;
        gap: 2px;
        border-left: 1px solid rgba(212, 166, 79, .18);
        margin-left: 4px;
      }
      .sb-mobile-sublink {
        display: flex;
        align-items: center;
        gap: 11px;
        padding: 10px 8px;
        font-family: var(--font-sans);
        font-size: .9rem;
        color: rgba(232, 201, 139, .85);
        border-radius: 6px;
        transition: background .2s, color .2s, padding-left .25s var(--ease-out, cubic-bezier(.16,1,.3,1));
      }
      .sb-mobile-sublink:hover,
      .sb-mobile-sublink:active,
      .sb-mobile-sublink:focus-visible {
        background: rgba(212, 166, 79, .12);
        color: #F2CF7A;
        padding-left: 14px;
        outline: none;
      }
      .sb-mobile-dot {
        width: 7px;
        height: 7px;
        border-radius: 50%;
        flex-shrink: 0;
        box-shadow: 0 0 0 2px rgba(212, 166, 79, .15);
      }

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
