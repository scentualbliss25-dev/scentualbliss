'use client';
import { useState } from 'react';
import { ChevronDown, MessageCircle } from 'lucide-react';
import Link from 'next/link';
import { PageTransition, Reveal } from '@/components/ui/ScrollAnimations';

const faqs = [
  {
    category: 'Pedidos y Envíos',
    items: [
      { q: '¿Cuánto tarda en llegar mi pedido?', a: 'Envío gratis a toda Colombia. Los pedidos realizados antes de las 14:00 se procesan el mismo día.' },
      { q: '¿Hacen envíos internacionales?', a: 'Sí, enviamos a México, Colombia, Argentina, España y Estados Unidos. El tiempo de entrega internacional es de 5–10 días hábiles.' },
      { q: '¿Cómo rastreo mi pedido?', a: 'Recibirás un email con el número de rastreo en cuanto tu pedido sea despachado. También puedes contactarnos con tu número de orden.' },
      { q: '¿El envío tiene algún costo?', a: 'El envío es GRATIS en pedidos mayores a $100. Para pedidos menores, el costo es de $9.99.' },
    ],
  },
  {
    category: 'Productos y Fragancias',
    items: [
      { q: '¿Las fragancias son auténticas?', a: 'Sí, todas nuestras fragancias son 100% auténticas y certificadas. Trabajamos directamente con perfumistas y casas de fragancias reconocidas.' },
      { q: '¿Cómo elijo el tamaño adecuado?', a: '30ml es ideal para probar una fragancia nueva o para llevar de viaje. 50ml es la opción más popular para uso cotidiano. 100ml es la mejor relación precio-cantidad para tu fragancia favorita.' },
      { q: '¿Qué significa la duración indicada en cada perfume?', a: 'La duración indica cuántas horas permanece la fragancia en la piel en condiciones normales. Puede variar según el tipo de piel, temperatura y actividad.' },
      { q: '¿Puedo hacer muestras antes de comprar el frasco completo?', a: 'Próximamente ofreceremos sets de muestras. Por ahora, te recomendamos empezar con el tamaño de 30ml para descubrir la fragancia.' },
    ],
  },
  {
    category: 'Devoluciones y Garantías',
    items: [
      { q: '¿Puedo devolver un producto?', a: 'Aceptamos devoluciones dentro de los 30 días siguientes a la compra, siempre que el producto esté sin abrir y en su empaque original.' },
      { q: '¿Qué hago si recibo un producto dañado?', a: 'Contáctanos dentro de las 48 horas de recibir tu pedido con fotos del daño a ventas@scentualbliss.com.co. Te enviaremos un reemplazo sin costo adicional.' },
      { q: '¿Cuánto tarda el reembolso?', a: 'Una vez aprobada la devolución, el reembolso se procesa en 3–5 días hábiles a tu método de pago original.' },
    ],
  },
];

function FaqItem({ q, a }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ borderBottom: '1px solid var(--dark-4)' }}>
      <button onClick={() => setOpen(o => !o)} style={{
        width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '20px 0', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', gap: '16px',
      }}>
        <span style={{ fontWeight: 600, color: 'var(--white)', fontSize: '.95rem', lineHeight: 1.4 }}>{q}</span>
        <ChevronDown size={18} style={{ color: 'var(--gold)', flexShrink: 0, transform: open ? 'rotate(180deg)' : 'none', transition: 'transform .3s' }} />
      </button>
      {open && (
        <p style={{ color: 'var(--gray-light)', fontSize: '.9rem', lineHeight: 1.8, paddingBottom: '20px', animation: 'slideUp .2s ease' }}>
          {a}
        </p>
      )}
    </div>
  );
}

export default function FaqPageClient() {
  return (
    <PageTransition>
    <main style={{ minHeight: '80vh' }}>
      <div style={{ background: 'var(--dark-2)', borderBottom: '1px solid rgba(201,169,110,.1)', padding: '48px 0 32px' }}>
        <div className="container">
          <p style={{ fontSize: '.75rem', color: 'var(--gold)', letterSpacing: '.15em', textTransform: 'uppercase', marginBottom: '8px' }}>Ayuda</p>
          <h1 style={{ fontFamily: 'var(--font-serif)', fontWeight: 300, color: 'var(--white)', marginBottom: '8px' }}>
            Preguntas <em style={{ color: 'var(--gold)' }}>Frecuentes</em>
          </h1>
          <p style={{ color: 'var(--gray)' }}>Todo lo que necesitas saber sobre nuestros productos y servicios.</p>
        </div>
      </div>

      <div className="container" style={{ padding: '60px 24px', maxWidth: '860px' }}>
        {faqs.map(({ category, items }) => (
          <Reveal key={category}>
            <div style={{ marginBottom: '48px' }}>
              <h2 style={{ fontFamily: 'var(--font-serif)', color: 'var(--gold)', fontSize: '1.4rem', fontWeight: 400, marginBottom: '4px' }}>
                {category}
              </h2>
              <div style={{ height: 1, background: 'rgba(201,169,110,.2)', marginBottom: '8px' }} />
              {items.map(item => <FaqItem key={item.q} {...item} />)}
            </div>
          </Reveal>
        ))}

        <Reveal>
          <div style={{ background: 'var(--dark-2)', border: '1px solid rgba(201,169,110,.15)', borderRadius: '16px', padding: '36px', textAlign: 'center', marginTop: '16px' }}>
            <MessageCircle size={32} style={{ color: 'var(--gold)', margin: '0 auto 16px' }} />
            <h3 style={{ fontFamily: 'var(--font-serif)', color: 'var(--white)', marginBottom: '8px', fontWeight: 300 }}>
              ¿No encontraste tu respuesta?
            </h3>
            <p style={{ color: 'var(--gray)', marginBottom: '24px' }}>Nuestro equipo está listo para ayudarte.</p>
            <Link href="/contacto" className="btn btn-primary">Contáctanos</Link>
          </div>
        </Reveal>
      </div>
    </main>
    </PageTransition>
  );
}
