'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState } from 'react';

/**
 * Shell del panel admin: sidebar fijo + área de contenido scrolleable.
 * Inspirado en Shopify pero con identidad propia (oscuro / dorado /
 * tipografía Montserrat, coherente con el login).
 *
 * Cada sección del nav declara su {label, href, icon, badge?}. El
 * "active" se calcula por prefix-match sobre el pathname.
 */

const NAV_SECTIONS = [
  {
    label: 'General',
    items: [
      { label: 'Dashboard', href: '/admin', exact: true },
    ],
  },
  {
    label: 'Catálogo',
    items: [
      { label: 'Productos', href: '/admin/products' },
      { label: 'Catálogo PDF', href: '/admin/catalog' },
    ],
  },
  {
    label: 'Ventas',
    items: [
      { label: 'Órdenes', href: '/admin/orders' },
    ],
  },
  {
    label: 'Marketing',
    items: [
      { label: 'Newsletter', href: '/admin/newsletter', soon: true },
    ],
  },
];

export default function AdminShell({ children }) {
  const pathname = usePathname();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  // El layout admin se aplica a TODAS las rutas /admin/*, pero queremos
  // que /admin/login se vea fullscreen sin sidebar. Auto-skip ahí.
  if (pathname === '/admin/login') return <>{children}</>;

  async function onLogout() {
    setLoggingOut(true);
    try {
      await fetch('/api/admin/logout', { method: 'POST' });
    } catch {}
    router.replace('/admin/login');
    router.refresh();
  }

  function isActive(item) {
    if (item.exact) return pathname === item.href;
    return pathname === item.href || pathname.startsWith(item.href + '/');
  }

  return (
    <div className={`admin-shell ${collapsed ? 'is-collapsed' : ''}`}>
      <aside className="admin-sidebar">
        <div className="admin-sidebar-glow" aria-hidden />

        <button
          type="button"
          className="admin-collapse-btn"
          onClick={() => setCollapsed(v => !v)}
          aria-label={collapsed ? 'Expandir sidebar' : 'Colapsar sidebar'}
          title={collapsed ? 'Expandir' : 'Colapsar'}
        >
          {collapsed ? <ChevronRightIcon /> : <ChevronLeftIcon />}
        </button>

        <div className="admin-brand">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/img/logo-icon.svg" alt="ScentualBliss" className="admin-brand-mark" />
          {!collapsed && (
            <div className="admin-brand-text">
              <span className="admin-brand-name">ScentualBliss</span>
              <span className="admin-brand-sub">Panel admin</span>
            </div>
          )}
        </div>

        <nav className="admin-nav" aria-label="Navegación del panel">
          {NAV_SECTIONS.map((section) => (
            <div key={section.label} className="admin-nav-section">
              {!collapsed && <div className="admin-nav-section-label">{section.label}</div>}
              <ul className="admin-nav-list">
                {section.items.map((item) => {
                  const active = isActive(item);
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.soon ? '#' : item.href}
                        className={`admin-nav-link ${active ? 'is-active' : ''} ${item.soon ? 'is-soon' : ''}`}
                        aria-current={active ? 'page' : undefined}
                        onClick={item.soon ? (e) => e.preventDefault() : undefined}
                        title={collapsed ? item.label : undefined}
                      >
                        {/* Los dos se renderizan siempre; qué se ve lo decide el CSS
                            (según .is-collapsed en desktop, o forzado en mobile) —
                            así no depende del estado de React para verse bien en
                            pantallas angostas. */}
                        <span className="admin-nav-mono" aria-hidden>{item.label[0]}</span>
                        <span className="admin-nav-label">{item.label}</span>
                        {item.soon && <span className="admin-nav-soon">Próximo</span>}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>

        <div className="admin-sidebar-foot">
          <button
            type="button"
            className="admin-logout-btn"
            onClick={onLogout}
            disabled={loggingOut}
            title="Cerrar sesión"
          >
            <span className="admin-logout-mono" aria-hidden>⏻</span>
            <span className="admin-logout-label">{loggingOut ? 'Saliendo…' : 'Cerrar sesión'}</span>
          </button>
        </div>
      </aside>

      <main className="admin-content">
        <div className="admin-content-inner">{children}</div>
      </main>

      <style jsx>{`
        .admin-shell {
          --sidebar-w: 260px;
          --sidebar-w-collapsed: 72px;
          --gold: #c09a5a;
          --gold-soft: rgba(192, 154, 90, 0.18);
          --gold-border: rgba(192, 154, 90, 0.22);
          --bg-shell: #0e0a07;
          --bg-side: #14100c;
          --bg-content: #f6f1e6;
          --ink: #f3ead7;
          --ink-muted: rgba(243, 234, 215, 0.55);

          display: grid;
          grid-template-columns: var(--sidebar-w) 1fr;
          min-height: 100vh;
          background: var(--bg-shell);
          color: var(--ink);
          font-family: var(--font-montserrat), ui-sans-serif, system-ui, sans-serif;
        }
        .admin-shell.is-collapsed {
          grid-template-columns: var(--sidebar-w-collapsed) 1fr;
        }

        .admin-sidebar {
          position: sticky;
          top: 0;
          height: 100vh;
          display: flex;
          flex-direction: column;
          background: var(--bg-side);
          border-right: 1px solid var(--gold-border);
          padding: 1.5rem 0.75rem 1rem;
          overflow: visible;
        }

        /* Resplandor sutil arriba, mismo lenguaje visual que /admin/login */
        .admin-sidebar-glow {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 260px;
          background: radial-gradient(420px 220px at 30% 0%, rgba(192, 154, 90, 0.14), transparent 70%);
          pointer-events: none;
          z-index: 0;
        }

        /* Botón de colapsar: flotante sobre el borde derecho del sidebar,
           siempre alcanzable sin importar el scroll del nav. */
        .admin-collapse-btn {
          position: absolute;
          top: 1.9rem;
          right: -12px;
          z-index: 5;
          width: 24px;
          height: 24px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: var(--bg-side);
          color: rgba(243, 234, 215, 0.65);
          border: 1px solid var(--gold-border);
          border-radius: 50%;
          cursor: pointer;
          transition: background 0.18s, color 0.18s, border-color 0.18s, transform 0.18s;
        }
        .admin-collapse-btn:hover {
          background: var(--gold-soft);
          color: var(--ink);
          border-color: var(--gold);
          transform: scale(1.08);
        }
        .admin-collapse-btn svg { width: 13px; height: 13px; }

        .admin-brand {
          position: relative;
          z-index: 1;
          display: flex;
          align-items: center;
          gap: 0.8rem;
          padding: 0.25rem 0.5rem 1.5rem;
          border-bottom: 1px solid var(--gold-border);
          margin-bottom: 1.25rem;
        }
        .admin-brand-mark {
          flex-shrink: 0;
          width: 32px;
          height: auto;
          filter: drop-shadow(0 4px 10px rgba(192, 154, 90, 0.35));
        }
        .admin-brand-text {
          display: flex;
          flex-direction: column;
          min-width: 0;
        }
        .admin-brand-name {
          font-size: 0.98rem;
          font-weight: 600;
          letter-spacing: 0.03em;
          color: var(--ink);
          white-space: nowrap;
        }
        .admin-brand-sub {
          font-size: 0.64rem;
          color: var(--gold);
          letter-spacing: 0.16em;
          text-transform: uppercase;
        }

        .admin-nav {
          position: relative;
          z-index: 1;
          flex: 1;
          overflow-y: auto;
          overflow-x: hidden;
          display: flex;
          flex-direction: column;
          gap: 1.25rem;
        }
        .admin-nav::-webkit-scrollbar { width: 4px; }
        .admin-nav::-webkit-scrollbar-thumb {
          background: rgba(192, 154, 90, 0.2);
          border-radius: 2px;
        }
        .admin-nav-section-label {
          padding: 0 0.85rem 0.4rem;
          font-size: 0.65rem;
          color: rgba(243, 234, 215, 0.4);
          letter-spacing: 0.18em;
          text-transform: uppercase;
        }
        .admin-nav-list {
          list-style: none;
          padding: 0;
          margin: 0;
          display: flex;
          flex-direction: column;
          gap: 0.15rem;
        }

        .admin-nav-link {
          display: flex;
          align-items: center;
          padding: 0.65rem 0.85rem;
          border-radius: 9px;
          color: rgba(243, 234, 215, 0.6);
          text-decoration: none;
          font-size: 0.87rem;
          font-weight: 400;
          letter-spacing: 0.02em;
          transition: background 0.18s, color 0.18s;
          position: relative;
        }
        .admin-nav-link:hover:not(.is-soon) {
          background: rgba(192, 154, 90, 0.08);
          color: var(--ink);
        }
        .admin-nav-link.is-active {
          background: rgba(192, 154, 90, 0.1);
          color: var(--gold);
          font-weight: 500;
        }
        .admin-nav-link.is-active::before {
          content: '';
          position: absolute;
          left: -0.75rem;
          top: 50%;
          transform: translateY(-50%);
          width: 2px;
          height: 60%;
          background: var(--gold);
          border-radius: 0 2px 2px 0;
        }
        .admin-nav-link.is-soon {
          opacity: 0.4;
          cursor: not-allowed;
        }
        .admin-nav-label {
          flex: 1;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        /* Oculto por default: solo se muestra cuando el sidebar está
           colapsado (desktop, vía .is-collapsed) o en mobile (forzado
           por media query más abajo, sin depender del estado de React). */
        .admin-nav-mono {
          display: none;
          width: 100%;
          text-align: center;
          font-size: 0.8rem;
          font-weight: 600;
          letter-spacing: 0.02em;
        }
        .admin-shell.is-collapsed .admin-nav-mono { display: block; }
        .admin-shell.is-collapsed .admin-nav-label,
        .admin-shell.is-collapsed .admin-nav-soon { display: none; }
        .admin-nav-soon {
          font-size: 0.58rem;
          padding: 0.12rem 0.45rem;
          border-radius: 99px;
          background: transparent;
          border: 1px solid rgba(192, 154, 90, 0.4);
          color: var(--gold);
          letter-spacing: 0.08em;
          text-transform: uppercase;
        }

        .admin-sidebar-foot {
          margin-top: 1rem;
          padding-top: 1rem;
          border-top: 1px solid var(--gold-border);
          display: flex;
          flex-direction: column;
          gap: 0.4rem;
        }
        .admin-logout-btn {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 0.55rem 0.85rem;
          background: transparent;
          color: rgba(243, 234, 215, 0.6);
          border: 1px solid transparent;
          border-radius: 10px;
          font-size: 0.85rem;
          letter-spacing: 0.02em;
          cursor: pointer;
          transition: background 0.18s, color 0.18s, border-color 0.18s;
          font-family: inherit;
          text-align: left;
        }
        .admin-logout-btn:hover:not(:disabled) {
          background: rgba(192, 154, 90, 0.08);
          color: var(--ink);
          border-color: var(--gold-border);
        }
        .admin-logout-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        .admin-logout-mono { display: none; width: 100%; text-align: center; }
        .admin-shell.is-collapsed .admin-logout-mono { display: block; }
        .admin-shell.is-collapsed .admin-logout-label { display: none; }

        .admin-content {
          background: var(--bg-content);
          color: #2a1f15;
          overflow-x: hidden;
          min-width: 0;
        }
        .admin-content-inner {
          min-height: 100vh;
        }

        @media (max-width: 768px) {
          .admin-shell,
          .admin-shell.is-collapsed {
            grid-template-columns: var(--sidebar-w-collapsed) 1fr;
          }
          .admin-brand-text,
          .admin-nav-section-label,
          .admin-nav-label,
          .admin-nav-soon,
          .admin-logout-label {
            display: none !important;
          }
          /* Forzado independiente del estado de React: en mobile el
             sidebar SIEMPRE se ve angosto (icon/monograma-only), sin
             importar si el usuario alcanzó a tocar el toggle. */
          .admin-nav-mono,
          .admin-logout-mono {
            display: block !important;
          }
        }
      `}</style>
    </div>
  );
}

// ─── Iconos inline (sin librería externa) ──────────────────────────────────
const iconProps = {
  width: 18,
  height: 18,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.7,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
};

function ChevronLeftIcon(p) {
  return (
    <svg {...iconProps} {...p}>
      <path d="M15 18l-6-6 6-6" />
    </svg>
  );
}
function ChevronRightIcon(p) {
  return (
    <svg {...iconProps} {...p}>
      <path d="M9 18l6-6-6-6" />
    </svg>
  );
}
