'use client';
import { useState, useEffect, useRef, Suspense } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { ShoppingBag, Search, Menu, X, Heart, ChevronDown } from 'lucide-react';
import { useCartStore, useCartCount } from '@/lib/store/cartStore';
import { useWishlistStore } from '@/lib/store/wishlistStore';
import { collections, products } from '@/lib/products';

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
            <input
              className="sb-search-input"
              placeholder="Buscar fragancias, notas, colecciones..."
              autoFocus
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              onKeyDown={handleSearch}
            />
            <p className="sb-search-hint">
              <kbd>Enter</kbd> para buscar · <kbd>Esc</kbd> para cerrar
            </p>
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
        transition: background .2s;
      }
      .sb-dropdown-item:hover, .sb-dropdown-item.active {
        background: rgba(212, 166, 79, .18);
      }
      .sb-dropdown-dot {
        width: 8px;
        height: 8px;
        border-radius: 50%;
        margin-top: 7px;
        flex-shrink: 0;
        box-shadow: 0 0 0 3px rgba(255,255,255,.6);
      }
      .sb-dropdown-item h4 {
        font-family: var(--font-sans);
        font-size: .82rem;
        font-weight: 600;
        color: #050505;
        margin: 0 0 1px 0;
      }
      .sb-dropdown-item p {
        font-size: .7rem;
        color: rgba(5, 5, 5, .60);
        line-height: 1.4;
        margin: 0;
      }
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
        transition: background .18s, color .18s;
        text-decoration: none;
      }
      .sb-dropdown-brand:hover {
        background: rgba(212, 166, 79, .18);
        color: #A87428;
      }
      .sb-dropdown-brand.active {
        background: rgba(212, 166, 79, .18);
        color: #A87428;
        font-weight: 600;
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
        background: rgba(212, 166, 79, .12);
        color: #F2CF7A;
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
        border-bottom: 1px solid rgba(212, 166, 79, .22);
        padding: 16px 24px;
        animation: sb-slide-down .25s cubic-bezier(.22,.61,.36,1);
      }
      @keyframes sb-slide-down {
        from { opacity: 0; transform: translateY(-10px); }
        to { opacity: 1; transform: none; }
      }
      .sb-search-input {
        width: 100%;
        max-width: 600px;
        padding: 12px 16px;
        background: rgba(255, 255, 255, .06);
        border: 1.5px solid rgba(212, 166, 79, .30);
        border-radius: 6px;
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
      .sb-search-hint {
        font-size: .72rem;
        color: rgba(232, 201, 139, .55);
        margin-top: 8px;
        max-width: 600px;
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
        padding: 14px 0;
        border-bottom: 1px solid rgba(212, 166, 79, .12);
        background: none;
        border-left: 0;
        border-right: 0;
        border-top: 0;
        text-align: left;
        width: 100%;
        cursor: pointer;
      }
      .sb-mobile-toggle-btn { font-family: var(--font-serif); }
      .sb-mobile-submenu {
        padding: 6px 0 12px 14px;
        display: flex;
        flex-direction: column;
        gap: 2px;
      }
      .sb-mobile-sublink {
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 10px 0;
        font-family: var(--font-sans);
        font-size: .9rem;
        color: #F2CF7A;
      }
      .sb-mobile-dot {
        width: 7px;
        height: 7px;
        border-radius: 50%;
        flex-shrink: 0;
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
