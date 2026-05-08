'use client';
import Link from 'next/link';
import { MapPin } from 'lucide-react';

const SvgIG = () => <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/></svg>;
const SvgTT = () => <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor"><path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.27 6.27 0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.33-6.34V9.05a8.16 8.16 0 0 0 4.77 1.52V7.15a4.85 4.85 0 0 1-1-.46z"/></svg>;
const SvgWA = () => <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12 0C5.373 0 0 5.373 0 12c0 2.126.549 4.122 1.514 5.861L.057 23.943l6.204-1.43C7.9 23.47 9.91 24 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-1.892 0-3.668-.502-5.2-1.378l-.373-.214-3.683.848.873-3.585-.234-.387A9.953 9.953 0 0 1 2 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z"/></svg>;

const COLS = [
  {
    title: 'Tienda',
    links: [
      { label: 'Toda la colección', to: '/tienda' },
      { label: 'Diseñador', to: '/tienda?type=disenador' },
      { label: 'Nicho', to: '/tienda?type=nicho' },
      { label: 'Árabe', to: '/tienda?type=arabe' },
      { label: 'Bestsellers', to: '/tienda?sort=bestseller' },
    ],
  },
  {
    title: 'Aromas',
    links: [
      { label: 'Florales', to: '/tienda?cat=floral' },
      { label: 'Frutales', to: '/tienda?cat=frutal' },
      { label: 'Frescos', to: '/tienda?cat=fresco' },
      { label: 'Cítricos', to: '/tienda?cat=citrico' },
      { label: 'Dulces', to: '/tienda?cat=dulce' },
      { label: 'Amaderados', to: '/tienda?cat=amaderado' },
    ],
  },
  {
    title: 'Ayuda',
    links: [
      { label: 'Contacto', to: '/contacto' },
      { label: 'FAQ', to: '/faq' },
      { label: 'Envíos', to: '/faq' },
      { label: 'Devoluciones', to: '/faq' },
      { label: 'Wishlist', to: '/wishlist' },
    ],
  },
];

const SOCIAL = [
  { Icon: SvgIG, label: 'Instagram', href: '#' },
  { Icon: SvgTT, label: 'TikTok', href: '#' },
  { Icon: SvgWA, label: 'WhatsApp', href: 'https://wa.me/573169376436' },
];

export default function Footer() {
  return (
    <footer className="sb-footer">
      <div className="container sb-footer-inner">
        <div className="sb-footer-top">
          <div className="sb-footer-brand">
            <img
              src="/img/logo-transparent.png"
              alt="ScentualBliss Perfumery"
              className="sb-footer-logo-img"
              width="198"
              height="70"
            />
            <p>
              Perfumería de lujo. Curación obsesiva de fragancias auténticas
              para quienes no se conforman con lo ordinario.
            </p>
            <div className="sb-footer-social">
              {SOCIAL.map(({ Icon, label, href }) => (
                <a key={label} href={href} target="_blank" rel="noopener noreferrer" aria-label={label}>
                  <Icon />
                </a>
              ))}
            </div>
          </div>

          {COLS.map(col => (
            <div key={col.title} className="sb-footer-col">
              <h4>{col.title}</h4>
              <ul>
                {col.links.map(l => (
                  <li key={l.label}>
                    <Link href={l.to}>{l.label}</Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="sb-footer-bottom">
          <p>© {new Date().getFullYear()} ScentualBliss · Todos los derechos reservados</p>
          <p className="sb-footer-loc">
            <MapPin size={12} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 4 }} />
            Bogotá, Colombia · Hecho con <span style={{ color: '#D4B68A' }}>♥</span>
          </p>
        </div>
      </div>

      <style>{`
        .sb-footer {
          background: #0F0C09;
          color: rgba(250,248,243,.65);
          padding: 90px 0 36px;
          font-family: var(--font-sans);
          font-size: .88rem;
          line-height: 1.6;
        }
        .sb-footer-inner { padding-left: 24px; padding-right: 24px; }
        .sb-footer-top {
          display: grid;
          grid-template-columns: 1.6fr 1fr 1fr 1fr;
          gap: 56px;
          padding-bottom: 56px;
          border-bottom: 1px solid rgba(250,248,243,.08);
        }
        .sb-footer-logo-img {
          height: 60px;
          width: auto;
          display: block;
          margin-bottom: 20px;
        }
        .sb-footer-brand p {
          font-size: .88rem;
          line-height: 1.65;
          max-width: 36ch;
          margin-bottom: 22px;
          color: rgba(250,248,243,.65);
        }
        .sb-footer-social { display: flex; gap: 10px; }
        .sb-footer-social a {
          width: 38px;
          height: 38px;
          border-radius: 50%;
          border: 1px solid rgba(250,248,243,.15);
          display: inline-flex;
          align-items: center;
          justify-content: center;
          color: rgba(250,248,243,.7);
          transition: all .25s ease;
        }
        .sb-footer-social a:hover {
          background: #B8905C;
          border-color: #B8905C;
          color: #0F0C09;
          transform: translateY(-2px);
        }
        .sb-footer-col h4 {
          font-family: var(--font-sans);
          font-size: .72rem;
          letter-spacing: .25em;
          text-transform: uppercase;
          color: #FAF8F3;
          font-weight: 600;
          margin-bottom: 18px;
        }
        .sb-footer-col ul {
          list-style: none;
          margin: 0;
          padding: 0;
        }
        .sb-footer-col li { margin-bottom: 10px; }
        .sb-footer-col a {
          font-size: .88rem;
          color: rgba(250,248,243,.65);
          transition: color .25s ease;
        }
        .sb-footer-col a:hover { color: #D4B68A; }
        .sb-footer-bottom {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding-top: 28px;
          font-size: .72rem;
          flex-wrap: wrap;
          gap: 14px;
          color: rgba(250,248,243,.45);
          letter-spacing: .04em;
        }
        .sb-footer-loc { color: rgba(250,248,243,.55); }
        @media (max-width: 1024px) {
          .sb-footer-top { grid-template-columns: 1fr 1fr 1fr; gap: 32px; }
        }
        @media (max-width: 768px) {
          .sb-footer-top { grid-template-columns: 1fr 1fr; gap: 28px; padding-bottom: 40px; }
          .sb-footer-inner { padding-left: 18px; padding-right: 18px; }
        }
        @media (max-width: 480px) {
          .sb-footer-top { grid-template-columns: 1fr; gap: 24px; }
          .sb-footer-bottom { flex-direction: column; align-items: flex-start; }
          .sb-footer-inner { padding-left: 14px; padding-right: 14px; }
        }
      `}</style>
    </footer>
  );
}
