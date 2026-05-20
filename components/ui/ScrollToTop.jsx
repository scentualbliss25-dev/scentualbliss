'use client';
import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { ArrowUp } from 'lucide-react';

export default function ScrollToTop() {
  const [visible, setVisible] = useState(false);
  const pathname = usePathname();
  const isPDP = pathname?.startsWith('/perfume/');

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 400);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const handleClick = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <button
      onClick={handleClick}
      aria-label="Volver arriba"
      className={`scroll-top-btn${isPDP ? ' scroll-top-btn--pdp' : ''}`}
      style={{
        position: 'fixed',
        right: '24px',
        zIndex: 250,
        width: '52px',
        height: '52px',
        borderRadius: '50%',
        background: 'linear-gradient(135deg, #C9A96E 0%, #A07840 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        boxShadow: '0 8px 24px rgba(201,169,110,.40), 0 2px 6px rgba(31,26,18,.15)',
        cursor: 'pointer',
        border: 'none',
        color: '#1F1A12',
        transition: 'opacity .3s ease, transform .25s cubic-bezier(.4,0,.2,1), box-shadow .25s',
        opacity: visible ? 1 : 0,
        pointerEvents: visible ? 'auto' : 'none',
        transform: visible ? 'translateY(0) scale(1)' : 'translateY(20px) scale(.85)',
      }}
      onMouseEnter={e => {
        e.currentTarget.style.transform = 'translateY(-3px) scale(1.05)';
        e.currentTarget.style.boxShadow = '0 12px 30px rgba(201,169,110,.55), 0 2px 6px rgba(31,26,18,.20)';
      }}
      onMouseLeave={e => {
        e.currentTarget.style.transform = 'translateY(0) scale(1)';
        e.currentTarget.style.boxShadow = '0 8px 24px rgba(201,169,110,.40), 0 2px 6px rgba(31,26,18,.15)';
      }}
      onMouseDown={e => e.currentTarget.style.transform = 'scale(.94)'}
    >
      <ArrowUp size={22} strokeWidth={2.5} />
    </button>
  );
}
