'use client';
import { useState, useEffect, useRef, Suspense } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { ShoppingBag, Search, Menu, X, Heart, ChevronDown } from 'lucide-react';
import { useCartStore } from '@/lib/store/cartStore';
import { useWishlistStore } from '@/lib/store/wishlistStore';
import { collections } from '@/lib/products';

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
  { label: 'Bestsellers', to: '/tienda?sort=bestseller' },
];

export default function Navbar() {
  return (
    <Suspense fallback={<NavbarShell />}>
      <NavbarInner />
    </Suspense>
  );
}

function NavbarShell() {
  return (
    <header className="sb-nav">
      <div className="container sb-nav-inner">
        <Link href="/" className="sb-nav-logo" aria-label="ScentualBliss inicio">
          Scentual<span className="amp">Bliss</span>
          <span className="small">Perfumería</span>
        </Link>
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

  const { count, toggleCart } = useCartStore();
  const { items: wishlistItems } = useWishlistStore();
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeType = searchParams?.get('type');
  const activeCat = searchParams?.get('cat');

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
    if (item.submenu) return !!activeCat && item.submenu.some(s => s.catId === activeCat);
    if (item.to.includes('sort=bestseller')) return searchParams?.get('sort') === 'bestseller';
    if (item.to === '/tienda') return pathname === '/tienda' && !activeType && !activeCat;
    return pathname === item.to.split('?')[0];
  };

  return (
    <header className={`sb-nav ${scrolled ? 'scrolled' : ''}`}>
      <div className="container sb-nav-inner">
        <Link href="/" className="sb-nav-logo" aria-label="ScentualBliss inicio">
          Scentual<span className="amp">Bliss</span>
          <span className="small">Perfumería</span>
        </Link>

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
                    <div className="sb-dropdown-card">
                      {item.submenu.map(sub => {
                        const subActive = activeCat === sub.catId;
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
          <button
            className="sb-nav-icon-btn sb-mobile-toggle"
            onClick={() => setMenuOpen(m => !m)}
            aria-label={menuOpen ? 'Cerrar menú' : 'Abrir menú'}
          >
            {menuOpen ? <X size={20} /> : <Menu size={20} />}
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
                    style={{ color: 'var(--gold-dark)', transition: 'transform .25s', transform: subOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}
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
        background: rgba(253, 251, 247, .82);
        backdrop-filter: blur(20px) saturate(1.6);
        -webkit-backdrop-filter: blur(20px) saturate(1.6);
        border-bottom: 1px solid transparent;
        transition: all .35s cubic-bezier(.22,.61,.36,1);
      }
      .sb-nav.scrolled {
        background: rgba(253, 251, 247, .95);
        border-bottom-color: rgba(31, 26, 20, 0.10);
        box-shadow: 0 1px 0 rgba(31, 26, 20, .04), 0 8px 24px rgba(31,26,20,.04);
      }
      .sb-nav-inner {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding-top: 18px;
        padding-bottom: 18px;
        gap: 32px;
      }
      .sb-nav-logo {
        font-family: var(--font-serif);
        font-size: 1.75rem;
        font-weight: 500;
        letter-spacing: -.01em;
        color: #1F1A14;
        display: flex;
        flex-direction: column;
        line-height: .95;
        transition: color .25s;
        flex-shrink: 0;
      }
      .sb-nav-logo:hover { color: #8C6A40; }
      .sb-nav-logo .amp { font-style: italic; color: #8C6A40; }
      .sb-nav-logo .small {
        font-family: var(--font-sans);
        font-size: .55rem;
        letter-spacing: .35em;
        color: #7A6E5E;
        text-transform: uppercase;
        font-weight: 500;
        margin-top: 2px;
      }
      .sb-nav-links {
        display: flex;
        gap: 36px;
        align-items: center;
      }
      .sb-nav-link-wrap {
        position: relative;
        display: flex;
        align-items: center;
      }
      .sb-nav-link {
        font-family: var(--font-sans);
        font-size: .82rem;
        font-weight: 500;
        color: #1F1A14;
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
        background: #1F1A14;
        transform: scaleX(0);
        transform-origin: right;
        transition: transform .4s cubic-bezier(.16,1,.3,1);
      }
      .sb-nav-link:hover, .sb-nav-link.active { color: #8C6A40; }
      .sb-nav-link:hover::after, .sb-nav-link.active::after {
        transform: scaleX(1);
        transform-origin: left;
        background: #8C6A40;
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
        background: #FDFBF7;
        border: 1px solid rgba(31, 26, 20, 0.10);
        border-radius: 8px;
        padding: 16px;
        min-width: 380px;
        box-shadow: 0 30px 60px rgba(31, 26, 20, .12), 0 4px 12px rgba(31, 26, 20, .05);
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
        background: #FAF6EE;
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
        color: #1F1A14;
        margin: 0 0 1px 0;
      }
      .sb-dropdown-item p {
        font-size: .7rem;
        color: #7A6E5E;
        line-height: 1.4;
        margin: 0;
      }

      .sb-nav-actions {
        display: flex;
        gap: 4px;
        align-items: center;
      }
      .sb-nav-icon-btn {
        position: relative;
        width: 40px;
        height: 40px;
        border-radius: 50%;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        color: #1F1A14;
        background: transparent;
        border: 0;
        cursor: pointer;
        transition: all .25s;
      }
      .sb-nav-icon-btn:hover {
        background: #F5EFE3;
        color: #8C6A40;
      }
      .sb-nav-badge {
        position: absolute;
        top: 4px; right: 4px;
        background: #1F1A14;
        color: #FDFBF7;
        font-size: .58rem;
        font-weight: 600;
        min-width: 17px;
        height: 17px;
        padding: 0 5px;
        border-radius: 9px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        line-height: 1;
        border: 2px solid #FDFBF7;
        font-family: var(--font-sans);
      }
      .sb-nav-badge.pop { animation: sb-badge-pop .4s cubic-bezier(.16,1,.3,1); }
      @keyframes sb-badge-pop {
        0% { transform: scale(.5); }
        50% { transform: scale(1.25); }
        100% { transform: scale(1); }
      }

      .sb-mobile-toggle { display: none; }

      .sb-search-bar {
        position: absolute;
        top: 100%; left: 0; right: 0;
        background: rgba(253, 251, 247, .98);
        backdrop-filter: blur(20px);
        border-bottom: 1px solid rgba(31, 26, 20, 0.10);
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
        background: #FFFFFF;
        border: 1.5px solid rgba(31, 26, 20, .12);
        border-radius: 6px;
        color: #1F1A14;
        font-family: var(--font-sans);
        font-size: .95rem;
        outline: none;
        transition: border-color .2s, box-shadow .2s;
      }
      .sb-search-input:focus {
        border-color: #B8905C;
        box-shadow: 0 0 0 4px rgba(184, 144, 92, .15);
      }
      .sb-search-hint {
        font-size: .72rem;
        color: #7A6E5E;
        margin-top: 8px;
        max-width: 600px;
        font-family: var(--font-sans);
      }
      .sb-search-hint kbd {
        background: #FAF6EE;
        border: 1px solid rgba(31, 26, 20, 0.10);
        border-radius: 4px;
        padding: 1px 6px;
        font-family: ui-monospace, monospace;
        font-size: .85em;
        color: #4A3F33;
      }

      .sb-mobile-menu {
        position: absolute;
        top: 100%; left: 0; right: 0;
        background: rgba(253, 251, 247, .98);
        backdrop-filter: blur(20px);
        border-bottom: 1px solid rgba(31, 26, 20, 0.10);
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
        color: #1F1A14;
        letter-spacing: .02em;
        padding: 14px 0;
        border-bottom: 1px solid rgba(31, 26, 20, .07);
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
        color: #4A3F33;
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
        .sb-mobile-toggle { display: inline-flex; }
        .sb-nav-inner { gap: 12px; padding: 14px 0; }
      }
    `}</style>
  );
}
