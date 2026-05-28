'use client';

const ITEMS = [
  'ENVÍO GRATIS A TODA COLOMBIA',
  'PAGO SEGURO CON WOMPI',
  '100% AUTÉNTICOS · GARANTÍA',
  '10% OFF EN TU PRIMERA COMPRA',
];

export default function AnnouncementBar() {
  return (
    <div className="sb-announce">
      <div className="sb-announce-track">
        {[...Array(3)].map((_, dup) => (
          ITEMS.map((t, i) => (
            <span key={`${dup}-${i}`} className="sb-announce-item">
              {t}
              <span className="sb-announce-dot" />
            </span>
          ))
        ))}
      </div>

      <style>{`
        .sb-announce {
          background: #050505;
          color: #ffd700;
          padding: 9px 0;
          font-size: .68rem;
          letter-spacing: .25em;
          text-transform: uppercase;
          font-weight: 500;
          overflow: hidden;
          position: relative;
          z-index: 60;
          font-family: var(--font-sans);
        }
        .sb-announce-track {
          display: flex;
          gap: clamp(28px, 6vw, 56px);
          white-space: nowrap;
          animation: sb-announce-scroll 40s linear infinite;
          width: max-content;
        }
        .sb-announce-item {
          display: inline-flex;
          align-items: center;
          gap: clamp(28px, 6vw, 56px);
        }
        @media (max-width: 480px) {
          .sb-announce {
            font-size: .62rem;
            letter-spacing: .18em;
            padding: 7px 0;
          }
        }
        .sb-announce-dot {
          display: inline-block;
          width: 4px;
          height: 4px;
          border-radius: 50%;
          background: #ffd700;
          opacity: .7;
        }
        @keyframes sb-announce-scroll {
          from { transform: translateX(0); }
          to { transform: translateX(-33.333%); }
        }
      `}</style>
    </div>
  );
}
