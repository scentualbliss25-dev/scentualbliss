import { SITE_URL } from '@/lib/site';

export const metadata = {
  title: 'Política de Privacidad | ScentualBliss',
  description: 'Política de privacidad y tratamiento de datos personales de ScentualBliss conforme a la Ley 1581 de 2012.',
  alternates: { canonical: `${SITE_URL}/privacidad` },
};

export default function PrivacidadPage() {
  return (
    <main style={{ minHeight: '80vh', background: 'var(--bg-1)' }}>
      <div style={{ borderBottom: '1px solid rgba(212,166,79,.12)', padding: '52px 0 36px' }}>
        <div className="container">
          <p style={{ fontSize: '.62rem', letterSpacing: '.32em', textTransform: 'uppercase', color: 'var(--gold)', marginBottom: 14, fontWeight: 500 }}>Legal</p>
          <h1 style={{ fontFamily: 'var(--font-serif)', fontWeight: 300, color: 'var(--white)', fontSize: 'clamp(2rem, 4vw, 3.5rem)' }}>
            Política de <em style={{ fontStyle: 'italic', color: 'var(--gold)' }}>Privacidad</em>
          </h1>
          <p style={{ color: 'var(--gray)', fontSize: '.85rem', marginTop: 8 }}>Última actualización: Mayo 2026</p>
        </div>
      </div>

      <div className="container" style={{ padding: '56px 24px', maxWidth: '800px' }}>
        <LegalContent />
      </div>
    </main>
  );
}

function Section({ title, children }) {
  return (
    <div style={{ marginBottom: 40 }}>
      <h2 style={{ fontFamily: 'var(--font-serif)', fontWeight: 400, fontSize: '1.5rem', color: 'var(--white)', marginBottom: 16, borderBottom: '1px solid rgba(26,22,16,.07)', paddingBottom: 12 }}>{title}</h2>
      <div style={{ color: 'var(--gray)', lineHeight: 1.8, fontSize: '.95rem' }}>{children}</div>
    </div>
  );
}

function LegalContent() {
  return (
    <>
      <Section title="1. Responsable del Tratamiento">
        <p>ScentualBliss (en adelante "la Empresa") es responsable del tratamiento de los datos personales que usted nos proporciona a través de nuestro sitio web <strong>scentualbliss.com.co</strong>.</p>
        <p style={{ marginTop: 12 }}>Contacto: <a href="mailto:ventas@scentualbliss.com.co" style={{ color: 'var(--gold)' }}>ventas@scentualbliss.com.co</a></p>
      </Section>

      <Section title="2. Datos que Recopilamos">
        <p>Recopilamos los siguientes datos cuando realiza una compra o se registra:</p>
        <ul style={{ marginTop: 12, paddingLeft: 20, display: 'flex', flexDirection: 'column', gap: 8 }}>
          <li>Nombre completo y datos de contacto (email, teléfono)</li>
          <li>Dirección de envío</li>
          <li>Información de pago (procesada de forma segura por Wompi/Bancolombia)</li>
          <li>Historial de compras</li>
          <li>Datos de navegación (cookies, IP, dispositivo)</li>
        </ul>
      </Section>

      <Section title="3. Finalidad del Tratamiento">
        <p>Sus datos son utilizados para:</p>
        <ul style={{ marginTop: 12, paddingLeft: 20, display: 'flex', flexDirection: 'column', gap: 8 }}>
          <li>Procesar y gestionar sus pedidos</li>
          <li>Enviar confirmaciones y actualizaciones de estado del pedido</li>
          <li>Atención al cliente y resolución de solicitudes</li>
          <li>Envío de comunicaciones comerciales (solo con su consentimiento)</li>
          <li>Cumplimiento de obligaciones legales y fiscales</li>
          <li>Mejorar nuestros servicios mediante análisis estadísticos</li>
        </ul>
      </Section>

      <Section title="4. Base Legal del Tratamiento">
        <p>El tratamiento de sus datos se basa en:</p>
        <ul style={{ marginTop: 12, paddingLeft: 20, display: 'flex', flexDirection: 'column', gap: 8 }}>
          <li><strong>Ejecución contractual:</strong> para procesar su pedido</li>
          <li><strong>Consentimiento:</strong> para comunicaciones de marketing</li>
          <li><strong>Interés legítimo:</strong> para mejorar nuestros servicios</li>
          <li><strong>Cumplimiento legal:</strong> según la Ley 1581 de 2012 (Colombia)</li>
        </ul>
      </Section>

      <Section title="5. Conservación de Datos">
        <p>Sus datos personales se conservarán durante el tiempo necesario para cumplir con las finalidades descritas y las obligaciones legales aplicables. En general:</p>
        <ul style={{ marginTop: 12, paddingLeft: 20, display: 'flex', flexDirection: 'column', gap: 8 }}>
          <li>Datos de clientes activos: durante la relación comercial</li>
          <li>Datos fiscales y de facturación: mínimo 5 años según normativa colombiana</li>
          <li>Datos de marketing: hasta que retire su consentimiento</li>
        </ul>
      </Section>

      <Section title="6. Sus Derechos">
        <p>De acuerdo con la Ley 1581 de 2012, usted tiene derecho a:</p>
        <ul style={{ marginTop: 12, paddingLeft: 20, display: 'flex', flexDirection: 'column', gap: 8 }}>
          <li>Conocer, actualizar y rectificar sus datos</li>
          <li>Solicitar prueba de la autorización otorgada</li>
          <li>Ser informado sobre el uso de sus datos</li>
          <li>Presentar quejas ante la Superintendencia de Industria y Comercio</li>
          <li>Revocar la autorización y solicitar la supresión de datos</li>
        </ul>
        <p style={{ marginTop: 12 }}>Para ejercer sus derechos, escríbanos a <a href="mailto:ventas@scentualbliss.com.co" style={{ color: 'var(--gold)' }}>ventas@scentualbliss.com.co</a></p>
      </Section>

      <Section title="7. Cookies">
        <p>Utilizamos cookies técnicas necesarias para el funcionamiento del sitio y cookies analíticas (Google Analytics) para medir el uso del sitio. Puede configurar su navegador para rechazar cookies, aunque esto puede afectar la funcionalidad.</p>
      </Section>

      <Section title="8. Seguridad">
        <p>Implementamos medidas de seguridad técnicas y organizativas para proteger sus datos contra acceso no autorizado, pérdida o destrucción. Los pagos son procesados por Wompi (Bancolombia) con cifrado SSL.</p>
      </Section>

      <Section title="9. Cambios en esta Política">
        <p>Nos reservamos el derecho de actualizar esta política. Le notificaremos cambios significativos por email o mediante aviso en el sitio web.</p>
      </Section>
    </>
  );
}
