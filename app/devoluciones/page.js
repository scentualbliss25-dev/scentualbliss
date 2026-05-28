import { SITE_URL } from '@/lib/site';

export const metadata = {
  title: 'Política de Devoluciones — 30 Días de Garantía | ScentualBliss',
  description: 'Política de devoluciones, cambios y reembolsos de ScentualBliss. 30 días de garantía sin complicaciones.',
  alternates: { canonical: `${SITE_URL}/devoluciones` },
};

const steps = [
  { n: '01', title: 'Contáctanos', desc: 'Escríbenos a ventas@scentualbliss.com.co o por WhatsApp dentro de los 30 días posteriores a recibir tu pedido.' },
  { n: '02', title: 'Aprobación', desc: 'Revisamos tu caso y te confirmamos si aplica la devolución en pocos días hábiles.' },
  { n: '03', title: 'Envío', desc: 'Nos envías el producto en su empaque original, sin uso y con todos sus accesorios.' },
  { n: '04', title: 'Reembolso', desc: 'Una vez recibido y verificado el producto, procesamos el reembolso en 5–7 días hábiles.' },
];

export default function DevolucionesPage() {
  return (
    <main style={{ minHeight: '80vh', background: 'var(--bg-1)' }}>
      <div style={{ borderBottom: '1px solid rgba(212,166,79,.12)', padding: '52px 0 36px' }}>
        <div className="container">
          <p style={{ fontSize: '.62rem', letterSpacing: '.32em', textTransform: 'uppercase', color: 'var(--gold)', marginBottom: 14, fontWeight: 500 }}>Legal</p>
          <h1 style={{ fontFamily: 'var(--font-serif)', fontWeight: 300, color: 'var(--white)', fontSize: 'clamp(2rem, 4vw, 3.5rem)' }}>
            Política de <em style={{ fontStyle: 'italic', color: 'var(--gold)' }}>Devoluciones</em>
          </h1>
          <p style={{ color: 'var(--gray)', fontSize: '.85rem', marginTop: 8 }}>30 días de garantía · Sin complicaciones</p>
        </div>
      </div>

      <div className="container" style={{ padding: '56px 24px', maxWidth: '800px' }}>

        {/* Proceso */}
        <div style={{ marginBottom: 56 }}>
          <p style={{ fontSize: '.62rem', letterSpacing: '.28em', textTransform: 'uppercase', color: 'var(--gold)', fontWeight: 500, marginBottom: 32 }}>El Proceso</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 24 }}>
            {steps.map(s => (
              <div key={s.n} style={{ padding: '24px', background: 'var(--bg-2)', borderTop: '2px solid var(--gold)' }}>
                <p style={{ fontFamily: 'var(--font-serif)', fontSize: '2rem', color: 'rgba(26,22,16,.1)', fontWeight: 300, marginBottom: 8 }}>{s.n}</p>
                <p style={{ fontWeight: 600, color: 'var(--white)', marginBottom: 8, fontSize: '.9rem' }}>{s.title}</p>
                <p style={{ color: 'var(--gray)', fontSize: '.85rem', lineHeight: 1.7 }}>{s.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Condiciones */}
        {[
          {
            title: 'Condiciones para Devolución',
            items: [
              'El producto debe estar en perfecto estado, sin uso y con su empaque original',
              'Debes solicitarlo dentro de los 30 días posteriores a la recepción',
              'Debes presentar el comprobante de compra o número de pedido',
              'Los productos deben incluir todos sus accesorios y muestras originales',
            ],
          },
          {
            title: 'Casos No Aplican Devolución',
            items: [
              'Productos usados, abiertos o sin empaque original',
              'Solicitudes después de 30 días de la recepción',
              'Productos en promoción especial o liquidación (indicado en la descripción)',
              'Daños causados por mal uso del producto',
            ],
          },
        ].map(sec => (
          <div key={sec.title} style={{ marginBottom: 40 }}>
            <h2 style={{ fontFamily: 'var(--font-serif)', fontWeight: 400, fontSize: '1.5rem', color: 'var(--white)', marginBottom: 16, borderBottom: '1px solid rgba(26,22,16,.07)', paddingBottom: 12 }}>{sec.title}</h2>
            <ul style={{ paddingLeft: 20, display: 'flex', flexDirection: 'column', gap: 10 }}>
              {sec.items.map(item => (
                <li key={item} style={{ color: 'var(--gray)', fontSize: '.95rem', lineHeight: 1.7 }}>{item}</li>
              ))}
            </ul>
          </div>
        ))}

        <div style={{ marginBottom: 40 }}>
          <h2 style={{ fontFamily: 'var(--font-serif)', fontWeight: 400, fontSize: '1.5rem', color: 'var(--white)', marginBottom: 16, borderBottom: '1px solid rgba(26,22,16,.07)', paddingBottom: 12 }}>Reembolsos</h2>
          <p style={{ color: 'var(--gray)', fontSize: '.95rem', lineHeight: 1.8 }}>
            El reembolso se realizará por el mismo método de pago utilizado en la compra. Los tiempos dependen de la entidad bancaria (generalmente 5–7 días hábiles). Los gastos de envío de la devolución corren por cuenta del cliente, excepto cuando el error sea nuestro.
          </p>
        </div>

        {/* CTA contacto */}
        <div style={{ padding: '32px', background: 'var(--bg-2)', borderLeft: '3px solid var(--gold)', marginTop: 40 }}>
          <p style={{ fontFamily: 'var(--font-serif)', fontSize: '1.2rem', color: 'var(--white)', marginBottom: 12 }}>¿Necesitas iniciar una devolución?</p>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <a href="mailto:ventas@scentualbliss.com.co" className="btn btn-primary btn-sm">ventas@scentualbliss.com.co</a>
            <a href="https://wa.me/573169376436?text=Hola, quiero iniciar una devolución" target="_blank" rel="noopener noreferrer" className="btn btn-outline btn-sm">WhatsApp</a>
          </div>
        </div>
      </div>

      <style>{`@media(max-width:600px){.container > div > div[style*="repeat(2"]{grid-template-columns:1fr !important;}}`}</style>
    </main>
  );
}
