// Descarga el catalogo completo de Disfragancias via /products.json
// y matchea los productos unmatched contra el catalogo completo.
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SHOP_URL = 'https://disfragancias.com';
const CATALOG_PATH = path.join(__dirname, 'catalog.json');
const UNMATCHED_PATH = path.join(__dirname, 'unmatched.json');
const MAPPING_PATH = path.join(__dirname, 'mapping.json');
const ADDITIONS_PATH = path.join(__dirname, 'mapping-additions.json');

// === FETCH CATALOG ===
async function fetchAllProducts() {
  const all = [];
  let page = 1;
  while (true) {
    process.stdout.write(`\rFetching pagina ${page}...`);
    const res = await fetch(`${SHOP_URL}/products.json?limit=250&page=${page}`);
    const data = await res.json();
    if (!data.products?.length) break;
    all.push(...data.products);
    if (data.products.length < 250) break;
    page++;
    await new Promise(r => setTimeout(r, 500));
  }
  console.log(`\n📚 Catálogo total: ${all.length} productos`);
  return all;
}

// === SIMILARITY (mismo algoritmo que extract-mapping) ===
function normalize(s) {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

function similarity(productSlug, urlSlug) {
  if (!productSlug || !urlSlug) return 0;
  if (productSlug === urlSlug) return 1.0;
  const norm = (s) => normalize(s).replace(/\s+/g, '-');
  const a = norm(productSlug);
  const b = norm(urlSlug);

  if (b.includes(a)) {
    const extraChars = b.length - a.length;
    return Math.max(0, 1 - extraChars / a.length * 0.3);
  }
  if (a.includes(b)) {
    const extraChars = a.length - b.length;
    return Math.max(0, 0.95 - extraChars / b.length * 0.3);
  }

  const aTokens = new Set(a.split('-').filter(Boolean));
  const bTokens = new Set(b.split('-').filter(Boolean));
  if (!aTokens.size || !bTokens.size) return 0;
  const common = [...aTokens].filter(t => bTokens.has(t)).length;
  const onlyInA = aTokens.size - common;
  const onlyInB = bTokens.size - common;
  if (onlyInA > 0) return 0;
  if (onlyInB > 0) return 0;
  return 0.85;
}

// === MAIN ===
const catalog = await fetchAllProducts();
writeFileSync(CATALOG_PATH, JSON.stringify(catalog.map(p => ({ title: p.title, handle: p.handle })), null, 2), 'utf8');

const unmatched = JSON.parse(readFileSync(UNMATCHED_PATH, 'utf8'));
const mapping = JSON.parse(readFileSync(MAPPING_PATH, 'utf8'));
const usedHandles = new Set(mapping.map(m => m.url.split('/products/')[1]?.split(/[?#]/)[0]));

const additions = [];
const stillUnmatched = [];

for (const product of unmatched) {
  let bestMatch = null;
  let bestScore = 0;
  for (const item of catalog) {
    if (usedHandles.has(item.handle)) continue;
    const score = similarity(product.slug, item.handle);
    if (score > bestScore) {
      bestScore = score;
      bestMatch = item;
    }
  }
  if (bestMatch && bestScore >= 0.7) {
    additions.push({
      slug: product.slug,
      name: product.name,
      brand: product.brand,
      url: `${SHOP_URL}/products/${bestMatch.handle}`,
      sourceTitle: bestMatch.title,
      score: +bestScore.toFixed(2),
    });
    usedHandles.add(bestMatch.handle);
  } else {
    stillUnmatched.push({
      slug: product.slug,
      name: product.name,
      brand: product.brand,
      bestGuess: bestMatch ? `${SHOP_URL}/products/${bestMatch.handle}` : null,
      bestGuessTitle: bestMatch?.title || null,
      bestScore: +(bestMatch ? bestScore : 0).toFixed(2),
    });
  }
}

writeFileSync(ADDITIONS_PATH, JSON.stringify(additions, null, 2), 'utf8');
writeFileSync(UNMATCHED_PATH, JSON.stringify(stillUnmatched, null, 2), 'utf8');

console.log(`\n✅ Nuevos matches encontrados: ${additions.length}`);
console.log(`❌ Aún sin match: ${stillUnmatched.length}`);
console.log(`\n📁 ${ADDITIONS_PATH}`);
console.log(`📁 ${UNMATCHED_PATH}`);

// Mostrar primeros 10 matches por marca
console.log('\n🔎 Primeros matches encontrados:');
additions.slice(0, 10).forEach((m, i) => {
  console.log(`  ${i+1}. ${m.brand} ${m.name}`);
  console.log(`     → ${m.sourceTitle}`);
  console.log(`     URL: ${m.url}`);
});
