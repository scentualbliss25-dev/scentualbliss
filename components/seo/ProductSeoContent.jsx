import { categoryLabels } from '@/lib/products-constants';

// Helper: explica una nota olfativa (server-side, sin estado)
function explainNote(noteString) {
  if (!noteString) return null;
  return noteString.split(/[,·]/).map(n => n.trim()).filter(Boolean);
}

// Genera narrativa única por producto a partir de sus atributos
function buildNarrative(product) {
  const cat = (categoryLabels[product.category] || product.category || '').toLowerCase();
  const genderLower = product.gender.toLowerCase();
  const article = genderLower === 'femenino' ? 'una' : 'un';
  const articleProd = genderLower === 'femenino' ? 'femenina' : (genderLower === 'masculino' ? 'masculino' : 'unisex');
  const typeLabel = product.type || 'EDP';

  return {
    intro: `${product.name} de ${product.brand} es ${article} ${articleProd === 'femenino' ? 'fragancia femenina' : articleProd === 'masculino' ? 'fragancia masculina' : 'fragancia unisex'} de la familia olfativa ${cat}, presentada en versión ${typeLabel}. ${product.description}`,
    projection: `Con una proyección ${product.sillage.toLowerCase()} y duración de ${product.longevity}, ${product.name} se mantiene perceptible durante toda la jornada, dejando una estela memorable que evoluciona en la piel a lo largo del día.`,
    season: `Esta fragancia ${cat} está pensada especialmente para ${product.season.toLowerCase()}, donde sus acordes alcanzan su máxima expresión olfativa. La temperatura ambiente influye en cómo respiran las notas, y ${product.name} ha sido formulada para destacar precisamente en estas condiciones climáticas.`,
  };
}

// Genera FAQs específicas por producto
function buildFAQs(product) {
  const cat = categoryLabels[product.category] || product.category;
  return [
    {
      q: `¿Cuánto dura ${product.name} en la piel?`,
      a: `${product.name} de ${product.brand} ofrece una duración de ${product.longevity} en piel, con proyección ${product.sillage.toLowerCase()}. La duración exacta puede variar según el tipo de piel, la hidratación y la temperatura ambiente, pero es considerada ${product.longevity.includes('12') || product.longevity.includes('14') || product.longevity.includes('16') ? 'excepcional' : 'sólida'} dentro de la categoría ${cat}.`,
    },
    {
      q: `¿${product.name} es para hombre o mujer?`,
      a: `${product.name} es un perfume ${product.gender.toLowerCase()}. ${product.gender === 'Unisex' ? 'Su composición equilibrada permite que sea utilizado tanto por hombres como por mujeres, adaptándose perfectamente a la química de cada piel.' : product.gender === 'Femenino' ? 'Su perfil olfativo está diseñado para realzar la feminidad con un carácter elegante y sofisticado.' : 'Su construcción olfativa proyecta masculinidad con personalidad y carácter definido.'}`,
    },
    {
      q: `¿Para qué ocasiones es ideal ${product.name}?`,
      a: `${product.name} es perfecto para ${(product.occasion || []).join(', ').toLowerCase()}. Su carácter ${product.sillage.toLowerCase()} y su duración de ${product.longevity} lo convierten en una elección segura cuando quieres destacar y dejar una impresión duradera.`,
    },
    {
      q: `¿Qué notas olfativas tiene ${product.name}?`,
      a: `La pirámide olfativa de ${product.name} se compone de notas de salida (${product.notes.top}), notas de corazón (${product.notes.heart}) y notas de fondo (${product.notes.base}). Esta construcción crea una evolución dinámica desde la primera aplicación hasta el dry-down final.`,
    },
    {
      q: `¿${product.name} es un perfume ${cat?.toLowerCase()}?`,
      a: `Sí, ${product.name} pertenece a la familia olfativa ${cat?.toLowerCase()}. ${product.category === 'oriental' ? 'Las fragancias orientales se caracterizan por sus notas cálidas, especiadas y resinosas, ideales para temporadas frías y ocasiones nocturnas.' : product.category === 'floral' ? 'Las fragancias florales destacan por sus notas de flores como rosa, jazmín o azahar, transmitiendo elegancia y feminidad.' : product.category === 'woody' ? 'Las fragancias amaderadas se distinguen por sus notas de cedro, sándalo y vetiver, transmitiendo calidez y sofisticación.' : 'Las fragancias frescas se caracterizan por sus notas cítricas, acuáticas y aromáticas, ideales para el día a día y climas cálidos.'}`,
    },
    {
      q: `¿En qué tamaño viene ${product.name}?`,
      a: `${product.name} de ${product.brand} está disponible en presentaciones de ${(product.sizes || []).map(s => s.ml).join(', ')}. La elección del tamaño depende de tu frecuencia de uso y si buscas una fragancia para llevar de viaje o de uso diario en casa.`,
    },
  ];
}

export function ProductFAQSchema({ product }) {
  const faqs = buildFAQs(product);
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map(({ q, a }) => ({
      '@type': 'Question',
      name: q,
      acceptedAnswer: { '@type': 'Answer', text: a },
    })),
  };
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}

export default function ProductSeoContent({ product }) {
  const cat = categoryLabels[product.category] || product.category;
  const narrative = buildNarrative(product);
  const faqs = buildFAQs(product);
  const topNotes = explainNote(product.notes.top) || [];
  const heartNotes = explainNote(product.notes.heart) || [];
  const baseNotes = explainNote(product.notes.base) || [];

  return (
    <section
      className="pdp-light"
      aria-label={`Información detallada de ${product.name}`}
      style={{
        background: 'var(--dark-2)',
        padding: '80px 24px',
        borderTop: '1px solid var(--dark-4)',
      }}
    >
      <div style={{ maxWidth: '900px', margin: '0 auto' }}>
        {/* Sobre la fragancia */}
        <article style={{ marginBottom: '64px' }}>
          <h2 style={{
            fontFamily: 'var(--font-serif)',
            fontSize: 'clamp(1.6rem,3vw,2.2rem)',
            color: 'var(--white)',
            marginBottom: '20px',
            fontWeight: 400,
          }}>
            Sobre <em style={{ color: 'var(--gold)' }}>{product.name}</em> de {product.brand}
          </h2>
          <p style={{ color: 'var(--gray-light)', lineHeight: 1.9, fontSize: '1rem', marginBottom: '16px' }}>
            {narrative.intro}
          </p>
          <p style={{ color: 'var(--gray-light)', lineHeight: 1.9, fontSize: '1rem', marginBottom: '16px' }}>
            {narrative.projection}
          </p>
          <p style={{ color: 'var(--gray-light)', lineHeight: 1.9, fontSize: '1rem' }}>
            {narrative.season}
          </p>
        </article>

        {/* Pirámide olfativa explicada */}
        <article style={{ marginBottom: '64px' }}>
          <h2 style={{
            fontFamily: 'var(--font-serif)',
            fontSize: 'clamp(1.6rem,3vw,2.2rem)',
            color: 'var(--white)',
            marginBottom: '20px',
            fontWeight: 400,
          }}>
            Pirámide olfativa de <em style={{ color: 'var(--gold)' }}>{product.name}</em>
          </h2>
          <p style={{ color: 'var(--gray-light)', lineHeight: 1.9, fontSize: '1rem', marginBottom: '24px' }}>
            La construcción olfativa de {product.name} se desarrolla en tres etapas que se revelan progresivamente sobre la piel. Cada capa aporta una dimensión diferente a la experiencia, creando una fragancia compleja y memorable.
          </p>

          <div style={{ marginBottom: '20px' }}>
            <h3 style={{ color: 'var(--gold)', fontSize: '.95rem', fontWeight: 600, letterSpacing: '.08em', textTransform: 'uppercase', marginBottom: '8px' }}>
              Notas de salida
            </h3>
            <p style={{ color: 'var(--gray-light)', lineHeight: 1.8, fontSize: '.95rem' }}>
              Al primer contacto, {product.name} despliega sus notas de salida: {topNotes.join(', ')}. Estas son las primeras impresiones olfativas que recibirás durante los primeros 15 a 30 minutos tras la aplicación, y definen el carácter inicial de la fragancia.
            </p>
          </div>

          <div style={{ marginBottom: '20px' }}>
            <h3 style={{ color: 'var(--gold)', fontSize: '.95rem', fontWeight: 600, letterSpacing: '.08em', textTransform: 'uppercase', marginBottom: '8px' }}>
              Notas de corazón
            </h3>
            <p style={{ color: 'var(--gray-light)', lineHeight: 1.8, fontSize: '.95rem' }}>
              A medida que las notas de salida se disipan, emergen las notas de corazón: {heartNotes.join(', ')}. Este es el alma de {product.name}, la parte que más tiempo permanecerá en tu piel y la que mejor define el ADN del perfume.
            </p>
          </div>

          <div>
            <h3 style={{ color: 'var(--gold)', fontSize: '.95rem', fontWeight: 600, letterSpacing: '.08em', textTransform: 'uppercase', marginBottom: '8px' }}>
              Notas de fondo
            </h3>
            <p style={{ color: 'var(--gray-light)', lineHeight: 1.8, fontSize: '.95rem' }}>
              El dry-down de {product.name} se asienta sobre {baseNotes.join(', ')}, creando la estela final que perdurará por horas. Estas notas son responsables de la longevidad ({product.longevity}) y de la memoria olfativa que dejarás a tu paso.
            </p>
          </div>
        </article>

        {/* Cuándo usar */}
        <article style={{ marginBottom: '64px' }}>
          <h2 style={{
            fontFamily: 'var(--font-serif)',
            fontSize: 'clamp(1.6rem,3vw,2.2rem)',
            color: 'var(--white)',
            marginBottom: '20px',
            fontWeight: 400,
          }}>
            ¿Cuándo usar <em style={{ color: 'var(--gold)' }}>{product.name}</em>?
          </h2>
          <p style={{ color: 'var(--gray-light)', lineHeight: 1.9, fontSize: '1rem', marginBottom: '20px' }}>
            {product.name} brilla en {product.season.toLowerCase()} y proyecta su mejor versión en estas situaciones:
          </p>
          <ul style={{ color: 'var(--gray-light)', lineHeight: 2, fontSize: '.95rem', paddingLeft: '20px' }}>
            {(product.occasion || []).map(o => (
              <li key={o} style={{ marginBottom: '6px' }}>
                <strong style={{ color: 'var(--white)' }}>{o}:</strong> {product.name} resulta una elección acertada gracias a su carácter {product.sillage.toLowerCase()} y su perfil {cat?.toLowerCase()}.
              </li>
            ))}
          </ul>
        </article>

        {/* Por qué elegir */}
        <article style={{ marginBottom: '64px' }}>
          <h2 style={{
            fontFamily: 'var(--font-serif)',
            fontSize: 'clamp(1.6rem,3vw,2.2rem)',
            color: 'var(--white)',
            marginBottom: '20px',
            fontWeight: 400,
          }}>
            Por qué elegir <em style={{ color: 'var(--gold)' }}>{product.name}</em>
          </h2>
          <ul style={{ color: 'var(--gray-light)', lineHeight: 2, fontSize: '.95rem', paddingLeft: '20px' }}>
            <li><strong style={{ color: 'var(--white)' }}>100% auténtico y certificado</strong> — trabajamos directamente con distribuidores oficiales para garantizar la legitimidad de cada frasco.</li>
            <li><strong style={{ color: 'var(--white)' }}>Duración {product.longevity}</strong> con proyección {product.sillage.toLowerCase()}, manteniéndose perceptible durante toda la jornada.</li>
            <li><strong style={{ color: 'var(--white)' }}>Composición {cat?.toLowerCase()}</strong> con notas {product.notes.top.split(',')[0].trim().toLowerCase()} en salida y {product.notes.base.split(',')[0].trim().toLowerCase()} en fondo.</li>
            <li><strong style={{ color: 'var(--white)' }}>{product.brand}</strong> respalda la calidad y la consistencia de cada lote producido.</li>
            <li><strong style={{ color: 'var(--white)' }}>Versión {product.type || 'EDP'}</strong> disponible en presentaciones de {(product.sizes || []).map(s => s.ml).join(', ')}.</li>
          </ul>
        </article>

        {/* FAQ */}
        <article>
          <h2 style={{
            fontFamily: 'var(--font-serif)',
            fontSize: 'clamp(1.6rem,3vw,2.2rem)',
            color: 'var(--white)',
            marginBottom: '24px',
            fontWeight: 400,
          }}>
            Preguntas frecuentes sobre <em style={{ color: 'var(--gold)' }}>{product.name}</em>
          </h2>
          <div>
            {faqs.map(({ q, a }, i) => (
              <details
                key={i}
                style={{
                  borderBottom: '1px solid var(--dark-4)',
                  padding: '16px 0',
                }}
              >
                <summary style={{
                  cursor: 'pointer',
                  fontWeight: 600,
                  color: 'var(--white)',
                  fontSize: '.95rem',
                  listStyle: 'none',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}>
                  <span>{q}</span>
                  <span style={{ color: 'var(--gold)', fontSize: '1.2rem' }}>+</span>
                </summary>
                <p style={{
                  marginTop: '12px',
                  color: 'var(--gray-light)',
                  lineHeight: 1.8,
                  fontSize: '.92rem',
                }}>
                  {a}
                </p>
              </details>
            ))}
          </div>
        </article>
      </div>
    </section>
  );
}
