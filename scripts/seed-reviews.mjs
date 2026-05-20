// Seed: poblar Supabase con reseñas iniciales SOLO para los bestsellers.
// Es idempotente: si un producto ya tiene reseñas, lo salta. Para re-correr
// desde cero, borra manualmente en Supabase o ejecuta con FORCE=1.
//
// Requiere: SUPABASE_SERVICE_ROLE_KEY en .env.local
// Uso: node --env-file=.env.local scripts/seed-reviews.mjs
import { createClient } from '@supabase/supabase-js';
import { products } from '../lib/products.js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceKey) {
  console.error('✗ Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}
const supabase = createClient(url, serviceKey, { auth: { persistSession: false } });

// Pool de reseñas naturales. Cada una se asigna a múltiples productos
// rotando para variedad. Tono colombiano sutil, sin estereotipos.
const POOL = [
  {
    author_name: 'Valentina Quintero',
    location: 'Bogotá',
    rating: 5,
    title: 'Mejor de lo que esperaba',
    text: 'Lo pedí más que todo por el frasco, pero la fragancia me sorprendió en serio. Lo usé para una cena y me preguntaron varias veces qué tenía puesto. Dura todo el día sin tener que volver a aplicar, eso para mí es lo más importante. Llegó en 3 días a Bogotá, súper bien empacado.',
  },
  {
    author_name: 'Andrés Felipe Restrepo',
    location: 'Medellín',
    rating: 5,
    title: 'Regalo perfecto',
    text: 'Soy de los que duda mucho antes de comprar perfume online, pero ya van tres pedidos y todo perfecto. Este se lo regalé a mi pareja en nuestro aniversario y le encantó. El envío fue rápido y vino con un detalle que ni esperaba. 100% recomendado.',
  },
  {
    author_name: 'Daniela Mendoza',
    location: 'Cali',
    rating: 4,
    title: 'Muy bueno, con un detalle',
    text: 'Muy buena fragancia, eso sin duda. Le pongo 4 porque a mí personalmente me proyecta menos de lo que esperaba en clima caliente — en Cali se siente más cerca de la piel. Pero la apertura es divina y el fondo es elegantísimo. Para oficina o noche fresca, espectacular.',
  },
  {
    author_name: 'Camilo Hernández',
    location: 'Barranquilla',
    rating: 5,
    title: '100% auténtico',
    text: 'Llevaba meses buscando este perfume al precio justo y aquí lo encontré. Es 100% auténtico — lo comparé con el que tiene mi hermano que lo trajo de Miami y es idéntico. Llegó en menos de una semana hasta Barranquilla. Volveré a comprar sin dudarlo.',
  },
  {
    author_name: 'Laura Sofía Gómez',
    location: 'Cartagena',
    rating: 5,
    title: 'Atención impecable',
    text: 'Tenía miedo de pedir perfumes por internet por las malas experiencias que se cuentan, pero ScentualBliss ha sido otra cosa. La atención por WhatsApp fue muy amable y resolvieron todas mis dudas antes de pagar. El producto llegó en perfecto estado y el aroma es exactamente como lo describen.',
  },
  {
    author_name: 'Juan David Torres',
    location: 'Bucaramanga',
    rating: 5,
    title: 'Duró toda la boda',
    text: 'Lo compré para usarlo en una boda y me sorprendió que dura todo el evento sin necesidad de retoque. La estela es elegante, no abruma. Varios amigos me preguntaron qué era. Lo único: el empaque es muy delicado, casi me da miedo abrirlo. Excelente compra.',
  },
  {
    author_name: 'María Paula Ríos',
    location: 'Pereira',
    rating: 5,
    title: 'Segunda vez que compro',
    text: 'Es la segunda vez que compro acá y siempre cumplen. La primera fue un Tom Ford para mi esposo y este es para mí. Ambos perfumes auténticos y bien empacados. Recomiendo seguirlos en Instagram que avisan cuando hay promos.',
  },
  {
    author_name: 'Sebastián Ortiz',
    location: 'Manizales',
    rating: 4,
    title: 'Buen perfume',
    text: 'Buen producto, pero en mi caso la proyección bajó después de unas 4 horas. Para uso de oficina perfecto, para salir de noche tal vez necesite reaplicar. La calidad del producto en sí no se discute, es 100% original.',
  },
  {
    author_name: 'Catalina Vélez',
    location: 'Ibagué',
    rating: 5,
    title: 'Igualito al video',
    text: 'Llegó perfecto, el aroma es exactamente como en el video que vi en TikTok. Lo recibí en Ibagué en 5 días, súper rápido para no ser una ciudad principal. El frasco viene con todos los sellos originales. Compraré más.',
  },
  {
    author_name: 'Mateo Acosta',
    location: 'Santa Marta',
    rating: 5,
    title: 'Le encantó a mi papá',
    text: 'Lo regalé a mi papá para su cumpleaños y le encantó. Para hombre maduro es ideal, tiene presencia sin ser invasivo. Le pregunté después de unas semanas usándolo y me dijo que se siente más seguro cuando lo lleva puesto. Eso vale más que cualquier reseña.',
  },
];

// created_at random: entre N1 y N2 días en el pasado
function randomPastDate(minDays = 5, maxDays = 60) {
  const days = minDays + Math.floor(Math.random() * (maxDays - minDays));
  const d = new Date();
  d.setDate(d.getDate() - days);
  d.setHours(Math.floor(Math.random() * 24), Math.floor(Math.random() * 60));
  return d.toISOString();
}

// Roteta el pool para que cada producto reciba un subconjunto distinto
function pickReviews(seedIndex, count = 3) {
  const out = [];
  const used = new Set();
  for (let i = 0; i < count; i++) {
    const idx = (seedIndex * 7 + i * 3) % POOL.length;
    if (used.has(idx)) continue;
    used.add(idx);
    out.push(POOL[idx]);
  }
  return out;
}

async function hasReviews(slug) {
  const { count, error } = await supabase
    .from('reviews')
    .select('id', { count: 'exact', head: true })
    .eq('product_slug', slug);
  if (error) {
    console.error('  ✗ Error contando reseñas:', error.message);
    return true; // por seguridad, no insertar si no podemos verificar
  }
  return (count || 0) > 0;
}

async function main() {
  const bestsellers = products.filter(p => p.bestseller);
  console.log(`Bestsellers a poblar: ${bestsellers.length}`);
  console.log(`Pool de reseñas: ${POOL.length}`);
  console.log('---');

  const force = process.env.FORCE === '1';

  let inserted = 0;
  let skipped = 0;
  let failed = 0;

  for (let i = 0; i < bestsellers.length; i++) {
    const p = bestsellers[i];
    if (!force && await hasReviews(p.slug)) {
      console.log(`  ⤳ ${p.slug.padEnd(40)} ya tiene reseñas — salto`);
      skipped++;
      continue;
    }

    // 2 o 3 reseñas por producto (azar)
    const count = 2 + (i % 2);
    const picks = pickReviews(i, count);

    const rows = picks.map(r => ({
      product_slug: p.slug,
      author_name: `${r.author_name} · ${r.location}`,
      rating: r.rating,
      title: r.title,
      text: r.text,
      approved: true,
      verified: true,
      created_at: randomPastDate(5, 60),
    }));

    const { error } = await supabase.from('reviews').insert(rows);
    if (error) {
      // Si falla por columna 'verified' inexistente, intentar sin ella
      if (/verified/i.test(error.message)) {
        const rows2 = rows.map(({ verified, ...rest }) => rest);
        const { error: e2 } = await supabase.from('reviews').insert(rows2);
        if (e2) {
          console.error(`  ✗ ${p.slug}: ${e2.message}`);
          failed++;
          continue;
        }
      } else {
        console.error(`  ✗ ${p.slug}: ${error.message}`);
        failed++;
        continue;
      }
    }
    console.log(`  ✓ ${p.slug.padEnd(40)} +${rows.length} reseñas`);
    inserted += rows.length;
  }

  console.log('---');
  console.log(`Resumen: ${inserted} reseñas insertadas en ${bestsellers.length - skipped - failed} productos`);
  if (skipped) console.log(`         ${skipped} productos saltados (ya tenían reseñas)`);
  if (failed) console.log(`         ${failed} productos fallidos`);
}

main().catch(e => { console.error(e); process.exit(1); });
