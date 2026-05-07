// Para los unmatched, valida si la mejor sugerencia tiene:
//  1. El brand exacto en el title source
//  2. Tokens significativos del nombre del producto en el title
// Si ambos OK, acepta el match.
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SHOP_URL = 'https://disfragancias.com';

const unmatched = JSON.parse(readFileSync(path.join(__dirname, 'unmatched.json'), 'utf8'));
const mapping = JSON.parse(readFileSync(path.join(__dirname, 'mapping.json'), 'utf8'));

function normalize(s) {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ').trim();
}

// SOLO tokens 100% irrelevantes. NO incluir parfum/edp/edt/elixir/intense
// porque son DISCRIMINADORES (Le Male != Le Male Le Parfum)
const NOISE = new Set(['de', 'la', 'le', 'el', 'eau', 'pour', 'for', 'men', 'man',
  'women', 'woman', 'her', 'him', 'unisex', 'a', 'an', 'the', 'set', 'regalo']);

function tokens(s) {
  return new Set(normalize(s).split(' ')
    .filter(t => t.length >= 2 && !NOISE.has(t) && !/^\d+$/.test(t)));
}

const additions = [];
const stillUnmatched = [];

for (const product of unmatched) {
  const productTokens = tokens(product.name);
  const brandTokens = tokens(product.brand);

  // Score TODAS las sugerencias y elige la de MENOS extras (mejor match)
  const candidates = [];
  for (const sug of (product.suggestions || [])) {
    if (!sug.title) continue;
    const cleanTitle = sug.title.replace(/\([^)]*\)/g, '').trim();
    const titleTokens = tokens(cleanTitle);

    // Brand debe estar completo
    const brandPresent = [...brandTokens].every(t => titleTokens.has(t));
    if (!brandPresent) continue;

    // Todos los tokens significativos del nombre del producto deben estar
    const allProductTokensInTitle = [...productTokens].every(t => titleTokens.has(t));
    if (!allProductTokensInTitle) continue;

    const allowedTokens = new Set([...productTokens, ...brandTokens]);
    const extras = [...titleTokens].filter(t => !allowedTokens.has(t));

    // Penaliza sets de regalo / discovery / miniaturas (no es el producto solo)
    const isSet = /\b(set|regalo|gift|discovery|miniaturas|duo|trio|combo|kit)\b/i.test(cleanTitle);
    candidates.push({ ...sug, cleanTitle, extras, extrasCount: extras.length, isSet });
  }

  // Prefiere match exacto sin extras. Penaliza sets de regalo (no muestran el frasco solo).
  candidates.sort((a, b) => {
    if (a.isSet !== b.isSet) return a.isSet ? 1 : -1;  // no-sets primero
    return a.extrasCount - b.extrasCount;
  });
  const best = candidates[0]?.extrasCount === 0 && !candidates[0]?.isSet ? candidates[0] : null;

  if (best) {
    additions.push({
      slug: product.slug,
      name: product.name,
      brand: product.brand,
      url: `${SHOP_URL}/products/${best.handle}`,
      sourceTitle: best.title,
      score: 1.0,
      method: 'brand-title-validation',
    });
  } else {
    stillUnmatched.push(product);
  }
}

console.log(`✅ Recovered: ${additions.length}`);
console.log(`❌ Still unmatched: ${stillUnmatched.length}`);
if (additions.length > 0) {
  console.log('\n🔎 Recovered:');
  additions.forEach((m, i) => {
    console.log(`  ${i+1}. ${m.brand} ${m.name}`);
    console.log(`     → ${m.sourceTitle}`);
  });
}

writeFileSync(path.join(__dirname, 'mapping-additions.json'), JSON.stringify(additions, null, 2), 'utf8');
writeFileSync(path.join(__dirname, 'unmatched.json'), JSON.stringify(stillUnmatched, null, 2), 'utf8');
