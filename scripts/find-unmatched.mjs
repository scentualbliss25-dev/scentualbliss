// Busqueda agresiva para los productos unmatched contra el catalogo completo (3068 productos)
// Estrategias adicionales:
//  1. Substring contiguo (ya estaba)
//  2. Coincidencia de TODOS los tokens (orden libre) — score 0.6
//  3. Sugerencias por marca (top-5 candidatos por marca) cuando todo lo demas falla
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SHOP_URL = 'https://disfragancias.com';

const catalog = JSON.parse(readFileSync(path.join(__dirname, 'catalog.json'), 'utf8'));
const unmatched = JSON.parse(readFileSync(path.join(__dirname, 'unmatched.json'), 'utf8'));
const mapping = JSON.parse(readFileSync(path.join(__dirname, 'mapping.json'), 'utf8'));
const usedHandles = new Set(mapping.map(m => m.url.split('/products/')[1]?.split(/[?#]/)[0]));

function normalize(s) {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

const NOISE = new Set(['de', 'la', 'le', 'el', 'eau', 'pour', 'for', 'men', 'man', 'women', 'woman',
  'her', 'him', 'unisex', 'edp', 'edt', 'parfum', 'cologne', 'a', 'an', 'the']);

function tokens(s) {
  return new Set(normalize(s).split(' ').filter(t => t.length >= 2 && !NOISE.has(t) && !/^\d+$/.test(t)));
}

function similarity(productSlug, productName, urlSlug, urlTitle) {
  if (!productSlug || !urlSlug) return 0;
  if (productSlug === urlSlug) return 1.0;

  const norm = (s) => normalize(s).replace(/\s+/g, '-');
  const a = norm(productSlug);
  const b = norm(urlSlug);

  if (a === b) return 1.0;
  if (b.includes(a)) return Math.max(0.85, 1 - (b.length - a.length) / a.length * 0.3);
  if (a.includes(b)) return Math.max(0.8, 0.95 - (a.length - b.length) / b.length * 0.3);

  // Tokens significativos (filtrando ruido)
  const aTok = tokens(productName || productSlug);
  const bTok = tokens(urlTitle || urlSlug);
  if (aTok.size === 0 || bTok.size === 0) return 0;

  const common = [...aTok].filter(t => bTok.has(t)).length;
  const onlyInA = aTok.size - common;
  const onlyInB = bTok.size - common;

  // Todos los tokens del producto deben estar en el URL/title
  if (onlyInA > 0) return 0;
  // Penaliza tokens extras en URL
  return Math.max(0, 0.85 - onlyInB * 0.1);
}

const additions = [];
const stillUnmatched = [];

for (const product of unmatched) {
  let bestMatch = null;
  let bestScore = 0;
  for (const item of catalog) {
    if (usedHandles.has(item.handle)) continue;
    const score = similarity(product.slug, product.name, item.handle, item.title);
    if (score > bestScore) {
      bestScore = score;
      bestMatch = item;
    }
  }
  // No auto-mover: dejar a match-by-brand-title.mjs validar con brand+title check
  if (false) {
    // (deshabilitado)
  } else {
    // Top 10 sugerencias por marca para revision manual
    const brandLower = normalize(product.brand);
    const suggestions = catalog
      .filter(c => !usedHandles.has(c.handle))
      .map(c => ({ ...c, sim: similarity(product.slug, product.name, c.handle, c.title) }))
      .sort((a, b) => b.sim - a.sim)
      .slice(0, 10)
      .map(c => ({ title: c.title, handle: c.handle, score: +c.sim.toFixed(2) }));

    stillUnmatched.push({
      slug: product.slug,
      name: product.name,
      brand: product.brand,
      suggestions,
    });
  }
}

writeFileSync(path.join(__dirname, 'mapping-additions.json'), JSON.stringify(additions, null, 2), 'utf8');
writeFileSync(path.join(__dirname, 'unmatched.json'), JSON.stringify(stillUnmatched, null, 2), 'utf8');

console.log(`✅ Nuevos matches: ${additions.length}`);
console.log(`❌ Aun sin match: ${stillUnmatched.length}`);
if (additions.length > 0) {
  console.log('\n🔎 Matches encontrados:');
  additions.forEach((m, i) => {
    console.log(`  ${i+1}. [${m.score}] ${m.brand} ${m.name}`);
    console.log(`     → ${m.sourceTitle}`);
  });
}
