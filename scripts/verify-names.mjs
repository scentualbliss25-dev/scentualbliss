// Verifica que cada producto tenga el nombre tal cual aparece en Disfragancias
// Compara `brand + name` (formato local) contra el title canonical del .json
// Genera un reporte con diferencias.
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { products } from '../lib/products.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MAPPING = JSON.parse(readFileSync(path.join(__dirname, 'mapping.json'), 'utf8'));
const REPORT = path.join(__dirname, 'name-diff-report.json');

const RATE_LIMIT_MS = 800;
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

// Index productos por slug
const productsBySlug = new Map(products.map(p => [p.slug, p]));

const results = { ok: [], diffs: [], failed: [] };

console.log(`🔍 Verificando ${MAPPING.length} productos contra Disfragancias...\n`);

let i = 0;
for (const m of MAPPING) {
  i++;
  const product = productsBySlug.get(m.slug);
  if (!product) {
    results.failed.push({ slug: m.slug, reason: 'not in products.js' });
    continue;
  }

  // Fetch canonical title del .json endpoint
  const jsonUrl = m.url.replace(/\/?(\?.*)?$/, '.json$1');
  let canonicalTitle = null;
  try {
    const res = await fetch(jsonUrl, { headers: { 'User-Agent': 'Mozilla/5.0' } });
    if (res.ok) {
      const data = await res.json();
      canonicalTitle = data?.product?.title?.trim() || null;
    }
  } catch {}

  if (!canonicalTitle) {
    results.failed.push({ slug: m.slug, url: m.url, reason: 'fetch failed' });
    process.stdout.write(`\r[${i}/${MAPPING.length}] ❌ ${m.slug}              `);
    await sleep(RATE_LIMIT_MS);
    continue;
  }

  // Calcular nuestro display name actual
  const localFull = `${product.brand} ${product.name}`.trim();

  // Calcular nombre sugerido: title canonical menos brand prefix (si esta al inicio)
  let suggestedName = canonicalTitle;
  const brandLower = product.brand.toLowerCase();
  if (canonicalTitle.toLowerCase().startsWith(brandLower)) {
    suggestedName = canonicalTitle.slice(product.brand.length).trim();
  }

  const isMatch = localFull.toLowerCase() === canonicalTitle.toLowerCase();
  const entry = {
    slug: m.slug,
    brand: product.brand,
    currentName: product.name,
    canonicalTitle,
    suggestedName,
    localFull,
    match: isMatch,
  };

  if (isMatch) {
    results.ok.push(entry);
  } else {
    results.diffs.push(entry);
  }

  process.stdout.write(`\r[${i}/${MAPPING.length}] ${isMatch ? '✅' : '⚠️ '} ${m.slug}              `);
  await sleep(RATE_LIMIT_MS);
}

console.log('\n\n📊 Resultado:');
console.log(`   ✅ Match exacto: ${results.ok.length}`);
console.log(`   ⚠️  Diferencias: ${results.diffs.length}`);
console.log(`   ❌ Fallos fetch: ${results.failed.length}`);

writeFileSync(REPORT, JSON.stringify(results, null, 2), 'utf8');
console.log(`\n📁 Reporte: ${REPORT}`);
