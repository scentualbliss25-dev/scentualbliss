import { SITE_URL } from '@/lib/site';

export const metadata = {
  title: 'Términos y Condiciones | ScentualBliss',
  description: 'Términos y condiciones de uso y compra en ScentualBliss. Conoce tus derechos y obligaciones.',
  alternates: { canonical: `${SITE_URL}/terminos` },
};

export default function TerminosPage() {
  return (
    <main style={{ minHeight: '80vh', background: 'var(--bg-1)' }}>
      <div style={{ borderBottom: '1px solid rgba(212,166,79,.12)', padding: '52px 0 36px' }}>
        <div className="container">
          <p style={{ fontSize: '.62rem', letterSpacing: '.32em', textTransform: 'uppercase', color: 'var(--gold)', marginBottom: 14, fontWeight: 500 }}>Legal</p>
          <h1 style={{ fontFamily: 'var(--font-serif)', fontWeight: 300, color: 'var(--white)', fontSize: 'clamp(2rem, 4vw, 3.5rem)' }}>
            Términos y <em style={{ fontStyle: 'italic', color: 'var(--gold)' }}>Condiciones</em>
          </h1>
          <p style={{ color: 'var(--gray)', fontSize: '.85rem', marginTop: 8 }}>Última actualización: Mayo 2026</p>
        </div>
      </div>
      <div className="container" style={{ padding: '56px 24px', maxWidth: '800px' }}>
        {sections.map(s => (
          <div key={s.title} style={{ marginBottom: 40 }}>
            <h2 style={{ fontFamily: 'var(--font-serif)', fontWeight: 400, fontSize: '1.5rem', color: 'var(--white)', marginBottom: 16, borderBottom: '1px solid rgba(26,22,16,.07)', paddingBottom: 12 }}>{s.title}</h2>
            <div style={{ color: 'var(--gray)', lineHeight: 1.8, fontSize: '.95rem' }} dangerouslySetInnerHTML={{ __html: s.content }} />
          </div>
        ))}
      </div>
    </main>
  );
}

const sections = [
  {
    title: '1. Aceptación de los Términos',
    content: 'Al acceder y usar scentualbliss.com.co, usted acepta estos términos y condiciones en su totalidad. Si no está de acuerdo, le pedimos no utilizar nuestro sitio.',
  },
  {
    title: '2. Productos y Disponibilidad',
    content: 'Todos los productos mostrados están sujetos a disponibilidad de stock. Nos reservamos el derecho de modificar precios, descontinuar productos o limitar cantidades de compra sin previo aviso. Las imágenes son ilustrativas y pueden variar ligeramente del producto real.',
  },
  {
    title: '3. Proceso de Compra',
    content: `<p>Para realizar una compra debe:</p>
    <ul style="padding-left:20px;margin-top:8px;display:flex;flex-direction:column;gap:6px">
      <li>Seleccionar el producto y talla deseados</li>
      <li>Agregar al carrito y proceder al checkout</li>
      <li>Proporcionar datos de envío correctos y completos</li>
      <li>Completar el pago a través de Wompi (Bancolombia)</li>
    </ul>
    <p style="margin-top:12px">Recibirá una confirmación por email una vez procesado el pedido.</p>`,
  },
  {
    title: '4. Precios y Pagos',
    content: 'Los precios están expresados en dólares estadounidenses (USD) y se procesan en pesos colombianos (COP) según la tasa de cambio vigente. Los pagos son procesados de forma segura por Wompi/Bancolombia. ScentualBliss no almacena datos de tarjetas de crédito.',
  },
  {
    title: '5. Envíos',
    content: `<p>Realizamos envíos gratis a toda Colombia. Los tiempos estimados son:</p>
    <ul style="padding-left:20px;margin-top:8px;display:flex;flex-direction:column;gap:6px">
      <li>Ciudades principales: pocos días hábiles</li>
      <li>Municipios y zonas rurales: 3–7 días hábiles</li>
    </ul>`,
  },
  {
    title: '6. Propiedad Intelectual',
    content: 'Todo el contenido del sitio (textos, imágenes, logotipos, diseños) es propiedad de ScentualBliss o sus licenciantes. Queda prohibida su reproducción total o parcial sin autorización expresa.',
  },
  {
    title: '7. Limitación de Responsabilidad',
    content: 'ScentualBliss no será responsable por daños indirectos, incidentales o consecuentes derivados del uso del sitio o los productos. Nuestra responsabilidad máxima se limita al valor del pedido realizado.',
  },
  {
    title: '8. Ley Aplicable',
    content: 'Estos términos se rigen por las leyes de la República de Colombia. Cualquier disputa será resuelta ante los tribunales competentes de Colombia.',
  },
  {
    title: '9. Contacto',
    content: 'Para cualquier consulta sobre estos términos: <a href="mailto:ventas@scentualbliss.com.co" style="color:var(--gold)">ventas@scentualbliss.com.co</a> · WhatsApp: <a href="https://wa.me/573169376436" style="color:var(--gold)">+57 316 937 6436</a>',
  },
];
