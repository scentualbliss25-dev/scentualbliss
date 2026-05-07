// Lee el docx ya extraido (XML en temp) y mapea slug → URL
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { execSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { products } from '../lib/products.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Path donde PowerShell ya extrajo el docx en sesion previa
const TEMP_XML = process.env.TEMP
  ? path.join(process.env.TEMP, 'docx_extract', 'content', 'word', 'document.xml')
  : 'C:/Users/ACONTR~1/AppData/Local/Temp/docx_extract/content/word/document.xml';

if (!existsSync(TEMP_XML)) {
  console.error(`❌ No encontrado: ${TEMP_XML}`);
  console.error(`Ejecuta primero el extractor de PowerShell.`);
  process.exit(1);
}

// Lee el XML y extrae texto de los tags <w:t>
const xml = readFileSync(TEMP_XML, 'utf8');
const textMatches = [...xml.matchAll(/<w:t[^>]*>([^<]*)<\/w:t>/g)];
const text = textMatches.map(m => m[1]).join(' ');
console.log(`📄 Docx text length: ${text.length}`);

// Decode entidades HTML basicas
const decoded = text.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"');

// Encuentra todas las URLs de disfragancias.com
const urlRegex = /https?:\/\/disfragancias\.com\/(?:collections\/[^\/\s]+\/)?products\/([a-z0-9-]+)(?:\?[^\s]*)?/gi;
const matches = [...decoded.matchAll(urlRegex)];
const uniqueUrls = new Map();
for (const m of matches) {
  const fullUrl = m[0].split('?')[0];
  const urlSlug = m[1];
  if (!uniqueUrls.has(urlSlug)) {
    uniqueUrls.set(urlSlug, fullUrl);
  }
}
console.log(`🔗 URLs únicas en docx: ${uniqueUrls.size}`);

// Normaliza para comparar
function normalize(s) {
  return s
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

// Algoritmo de matching basado en substring contigua + tokens.
// Evita falsos positivos como "bottled-elixir" matcheando "bottled-triumph-elixir".
function similarity(productSlug, urlSlug) {
  if (!productSlug || !urlSlug) return 0;
  if (productSlug === urlSlug) return 1.0;

  // Normaliza ambos a 'a-b-c-d' (sin acentos, lowercase, hyphenated)
  const norm = (s) => normalize(s).replace(/\s+/g, '-');
  const a = norm(productSlug);
  const b = norm(urlSlug);

  // Caso 1: producto slug es substring contiguo de URL (URL tiene tokens extra al inicio o final)
  // Ej: "hugo-boss-bottled" -> "hugo-boss-bottled-100ml" → score alto
  if (b.includes(a)) {
    const extraChars = b.length - a.length;
    return Math.max(0, 1 - extraChars / a.length * 0.3);
  }

  // Caso 2: URL slug es substring contiguo del producto
  // Ej: URL "bottled-night" -> nuestro "hugo-boss-bottled-night" → score alto
  if (a.includes(b)) {
    const extraChars = a.length - b.length;
    return Math.max(0, 0.95 - extraChars / b.length * 0.3);
  }

  // Caso 3: No hay substring contiguo → revisar Jaccard pero con threshold alto
  // Esto cubre casos donde el orden de tokens difiere pero todos coinciden
  const aTokens = new Set(a.split('-').filter(Boolean));
  const bTokens = new Set(b.split('-').filter(Boolean));
  if (!aTokens.size || !bTokens.size) return 0;

  const common = [...aTokens].filter(t => bTokens.has(t)).length;
  const onlyInA = aTokens.size - common;
  const onlyInB = bTokens.size - common;

  // Si faltan tokens del producto en URL, rechazar fuerte
  if (onlyInA > 0) return 0;
  // Si la URL tiene token(s) extra, rechazar tambien (es otro producto)
  if (onlyInB > 0) return 0;

  // Mismo set de tokens en orden diferente: score moderado
  return 0.85;
}

// Mapping: para cada producto, busca la mejor URL match
const mapping = [];
const unmatched = [];
const usedUrls = new Set();

const newProducts = products.filter(p => p.brand !== 'ScentualBliss');

for (const product of newProducts) {
  let bestMatch = null;
  let bestScore = 0;
  for (const [urlSlug, url] of uniqueUrls) {
    if (usedUrls.has(url)) continue;
    const score = similarity(product.slug, urlSlug);
    if (score > bestScore) {
      bestScore = score;
      bestMatch = { url, urlSlug, score };
    }
  }

  // Threshold 0.7 para evitar matches incorrectos como bottled-elixir vs bottled-triumph-elixir
  if (bestMatch && bestScore >= 0.7) {
    mapping.push({
      slug: product.slug,
      name: product.name,
      brand: product.brand,
      url: bestMatch.url,
      score: +bestMatch.score.toFixed(2),
    });
    usedUrls.add(bestMatch.url);
  } else {
    unmatched.push({
      slug: product.slug,
      name: product.name,
      brand: product.brand,
      bestGuess: bestMatch?.url || null,
      bestScore: +(bestMatch?.score?.toFixed(2) || 0),
    });
  }
}

console.log(`\n✅ Matched: ${mapping.length} / ${newProducts.length}`);
console.log(`❌ Unmatched: ${unmatched.length}`);

writeFileSync(path.join(__dirname, 'mapping.json'), JSON.stringify(mapping, null, 2), 'utf8');
writeFileSync(path.join(__dirname, 'unmatched.json'), JSON.stringify(unmatched, null, 2), 'utf8');

console.log(`\n📁 scripts/mapping.json (${mapping.length} entries)`);
console.log(`📁 scripts/unmatched.json (${unmatched.length} entries — necesitan URL manual)`);
