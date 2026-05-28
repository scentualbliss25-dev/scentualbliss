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
      { label: 'Dashboard', href: '/admin', icon: HomeIcon, exact: true },
    ],
  },
  {
    label: 'Catálogo',
    items: [
      { label: 'Productos', href: '/admin/products', icon: BoxIcon },
    ],
  },
  {
    label: 'Ventas',
    items: [
      { label: 'Órdenes', href: '/admin/orders', icon: BagIcon },
    ],
  },
  {
    label: 'Marketing',
    items: [
      { label: 'Newsletter', href: '/admin/newsletter', icon: MailIcon, soon: true },
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
        <div className="admin-brand">
          <span className="admin-brand-mark">SB</span>
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
                  const Icon = item.icon;
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
                        <Icon className="admin-nav-icon" />
                        {!collapsed && (
                          <>
                            <span className="admin-nav-label">{item.label}</span>
                            {item.soon && <span className="admin-nav-soon">próximo</span>}
                          </>
                        )}
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
            className="admin-icon-btn"
            onClick={() => setCollapsed(v => !v)}
            aria-label={collapsed ? 'Expandir sidebar' : 'Colapsar sidebar'}
            title={collapsed ? 'Expandir' : 'Colapsar'}
          >
            {collapsed ? <ChevronRightIcon /> : <ChevronLeftIcon />}
          </button>
          <button
            type="button"
            className="admin-logout-btn"
            onClick={onLogout}
            disabled={loggingOut}
            title="Cerrar sesión"
          >
            <LogoutIcon className="admin-nav-icon" />
            {!collapsed && <span>{loggingOut ? 'Saliendo…' : 'Cerrar sesión'}</span>}
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
          padding: 1.25rem 0.75rem 1rem;
          overflow: hidden;
        }

        .admin-brand {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 0.25rem 0.5rem 1.5rem;
          border-bottom: 1px solid var(--gold-border);
          margin-bottom: 1.25rem;
        }
        .admin-brand-mark {
          flex-shrink: 0;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 40px;
          height: 40px;
          border-radius: 50%;
          background: linear-gradient(135deg, var(--gold), #8a6936);
          color: var(--bg-side);
          font-weight: 700;
          font-size: 0.85rem;
          letter-spacing: 0.04em;
          box-shadow: 0 4px 14px -6px rgba(192, 154, 90, 0.5);
        }
        .admin-brand-text {
          display: flex;
          flex-direction: column;
          min-width: 0;
        }
        .admin-brand-name {
          font-size: 0.95rem;
          font-weight: 500;
          letter-spacing: 0.04em;
          color: var(--ink);
        }
        .admin-brand-sub {
          font-size: 0.65rem;
          color: var(--ink-muted);
          letter-spacing: 0.14em;
          text-transform: uppercase;
        }

        .admin-nav {
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
          gap: 0.75rem;
          padding: 0.6rem 0.85rem;
          border-radius: 10px;
          color: rgba(243, 234, 215, 0.75);
          text-decoration: none;
          font-size: 0.875rem;
          letter-spacing: 0.02em;
          transition: background 0.18s, color 0.18s;
          position: relative;
        }
        .admin-nav-link:hover:not(.is-soon) {
          background: rgba(192, 154, 90, 0.08);
          color: var(--ink);
        }
        .admin-nav-link.is-active {
          background: var(--gold-soft);
          color: var(--ink);
        }
        .admin-nav-link.is-active::before {
          content: '';
          position: absolute;
          left: -0.75rem;
          top: 50%;
          transform: translateY(-50%);
          width: 3px;
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
        .admin-nav-soon {
          font-size: 0.6rem;
          padding: 0.1rem 0.4rem;
          border-radius: 4px;
          background: rgba(243, 234, 215, 0.08);
          color: rgba(243, 234, 215, 0.5);
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
        .admin-icon-btn,
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
        .admin-icon-btn:hover,
        .admin-logout-btn:hover:not(:disabled) {
          background: rgba(192, 154, 90, 0.08);
          color: var(--ink);
          border-color: var(--gold-border);
        }
        .admin-logout-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        .admin-icon-btn {
          align-self: flex-end;
          width: auto;
          justify-content: center;
        }
        .admin-shell.is-collapsed .admin-icon-btn {
          align-self: center;
          width: 100%;
        }

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
          .admin-shell {
            grid-template-columns: var(--sidebar-w-collapsed) 1fr;
          }
          .admin-shell.is-collapsed {
            grid-template-columns: var(--sidebar-w-collapsed) 1fr;
          }
          .admin-brand-text,
          .admin-nav-section-label,
          .admin-nav-label,
          .admin-nav-soon,
          .admin-logout-btn span {
            display: none;
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

function HomeIcon(p) {
  return (
    <svg {...iconProps} {...p}>
      <path d="M3 11l9-8 9 8" />
      <path d="M5 10v10h14V10" />
      <path d="M10 20v-6h4v6" />
    </svg>
  );
}
function BoxIcon(p) {
  return (
    <svg {...iconProps} {...p}>
      <path d="M21 8l-9-5-9 5 9 5 9-5z" />
      <path d="M3 8v8l9 5 9-5V8" />
      <path d="M12 13v8" />
    </svg>
  );
}
function BagIcon(p) {
  return (
    <svg {...iconProps} {...p}>
      <path d="M6 7h12l-1 13H7L6 7z" />
      <path d="M9 7V5a3 3 0 016 0v2" />
    </svg>
  );
}
function MailIcon(p) {
  return (
    <svg {...iconProps} {...p}>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="M3 7l9 7 9-7" />
    </svg>
  );
}
function LogoutIcon(p) {
  return (
    <svg {...iconProps} {...p}>
      <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" />
      <path d="M16 17l5-5-5-5" />
      <path d="M21 12H9" />
    </svg>
  );
}
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
