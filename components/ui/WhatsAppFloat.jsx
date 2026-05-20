'use client';
import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';

const PHONE = '573169376436'; // +57 (Colombia) + 3169376436
const DEFAULT_MESSAGE = 'Hola! Me interesa un perfume de ScentualBliss 🌸';

export default function WhatsAppFloat() {
  const [showTooltip, setShowTooltip] = useState(false);
  const [bumped, setBumped] = useState(false);
  const pathname = usePathname();
  // En página de detalle (mobile) sube el botón para no chocar con el CTA sticky
  const isPDP = pathname?.startsWith('/perfume/');

  // Animacion de "rebote" cada 8s para llamar la atencion sutilmente
  useEffect(() => {
    const t = setInterval(() => {
      setBumped(true);
      setTimeout(() => setBumped(false), 600);
    }, 8000);
    return () => clearInterval(t);
  }, []);

  const href = `https://wa.me/${PHONE}?text=${encodeURIComponent(DEFAULT_MESSAGE)}`;

  return (
    <>
      <div
        className={`wa-float-wrap${isPDP ? ' wa-float-wrap--pdp' : ''}`}
        style={{
          position: 'fixed',
          left: '24px',
          zIndex: 250,
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          flexDirection: 'row-reverse', // tooltip aparece a la derecha del boton
        }}
      >
        {/* Tooltip */}
        {showTooltip && (
          <div
            style={{
              background: 'rgba(31,26,18,.92)',
              color: '#FAF6EE',
              padding: '8px 14px',
              borderRadius: '8px',
              fontSize: '.85rem',
              fontWeight: 500,
              whiteSpace: 'nowrap',
              boxShadow: '0 4px 16px rgba(31,26,18,.20)',
              animation: 'fadeIn .2s ease',
              position: 'relative',
            }}
          >
            ¿Necesitas ayuda? Chatea con nosotros
            <div
              style={{
                position: 'absolute',
                left: '-6px',
                top: '50%',
                transform: 'translateY(-50%) rotate(45deg)',
                width: '12px',
                height: '12px',
                background: 'rgba(31,26,18,.92)',
              }}
            />
          </div>
        )}

        {/* Botón */}
        <a
          className="wa-float"
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Chatear por WhatsApp"
          onMouseEnter={() => setShowTooltip(true)}
          onMouseLeave={() => setShowTooltip(false)}
          style={{
            width: '60px',
            height: '60px',
            borderRadius: '50%',
            background: '#25D366',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 8px 24px rgba(37,211,102,.45), 0 2px 6px rgba(37,211,102,.30)',
            transition: 'transform .25s cubic-bezier(.4,0,.2,1), box-shadow .25s',
            transform: bumped ? 'scale(1.12)' : 'scale(1)',
            cursor: 'pointer',
            position: 'relative',
          }}
          onMouseDown={e => e.currentTarget.style.transform = 'scale(.94)'}
          onMouseUp={e => e.currentTarget.style.transform = 'scale(1)'}
        >
          {/* Pulse ring */}
          <span
            style={{
              position: 'absolute',
              inset: 0,
              borderRadius: '50%',
              border: '2px solid #25D366',
              animation: 'wa-pulse 2.4s cubic-bezier(.4,0,.2,1) infinite',
              pointerEvents: 'none',
            }}
          />
          {/* WhatsApp Icon (oficial SVG simplificado) */}
          <svg
            width="32"
            height="32"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            style={{ position: 'relative', zIndex: 1 }}
          >
            <path
              d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"
              fill="#fff"
            />
          </svg>
        </a>
      </div>

      <style>{`
        @keyframes wa-pulse {
          0% { transform: scale(1); opacity: .6; }
          100% { transform: scale(1.6); opacity: 0; }
        }
        @media (max-width: 640px) {
          .wa-tooltip { display: none; }
        }
      `}</style>
    </>
  );
}
