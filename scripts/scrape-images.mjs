// Scraper que descarga + limpia metadata + optimiza imagenes
// Extrae las 2 primeras imagenes de cada producto Shopify.
// Uso: node scripts/scrape-images.mjs [limit]
//   limit: numero opcional de productos a procesar (default: todos)
import { readFileSync, writeFileSync, existsSync, mkdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const OUTPUT_DIR = path.join(ROOT, 'public', 'img');
const MAPPING_PATH = path.join(__dirname, 'mapping.json');
const REPORT_PATH = path.join(__dirname, 'scrape-report.json');

// === CONFIG ===
const RATE_LIMIT_MS = 1500;
const CONCURRENT = 3;
const QUALITY = 85;
const MAX_WIDTH = 800;
const MAX_HEIGHT = 1000;
const TIMEOUT_MS = 15000;
const IMAGES_PER_PRODUCT = 2;
const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36';

if (!existsSync(OUTPUT_DIR)) mkdirSync(OUTPUT_DIR, { recursive: true });

const mapping = JSON.parse(readFileSync(MAPPING_PATH, 'utf8'));
const limit = process.argv[2] ? parseInt(process.argv[2], 10) : mapping.length;
const tasks = mapping.slice(0, limit);

console.log(`🚀 Scraping ${tasks.length} productos × ${IMAGES_PER_PRODUCT} imágenes`);
console.log(`📁 Output: ${OUTPUT_DIR}`);
console.log(`⚙️  Format: WebP Q${QUALITY}, max ${MAX_WIDTH}×${MAX_HEIGHT}`);
console.log(`🐢 Rate limit: ${RATE_LIMIT_MS}ms / ${CONCURRENT} concurrentes\n`);

const results = { ok: [], partial: [], skipped: [], failed: [], mismatch: [] };
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

async function fetchWithTimeout(url, ms = TIMEOUT_MS) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), ms);
  try {
    return await fetch(url, {
      signal: ctrl.signal,
      headers: {
        'User-Agent': USER_AGENT,
        'Accept': 'text/html,application/xhtml+xml,image/webp,image/*,*/*',
      },
    });
  } finally {
    clearTimeout(timer);
  }
}

// Normaliza URL: si es protocolo-relativa, agrega https
function normalizeUrl(url) {
  if (url.startsWith('//')) return 'https:' + url;
  return url;
}

// Pide tamano alto de Shopify CDN (mejor calidad antes de resize)
function shopifyHighRes(url) {
  // Inserta sufijo _1600x1600 antes de la extension si no tiene tamano
  // Ej: foto.jpg -> foto_1600x1600.jpg
  if (!/cdn\.shopify\.com/.test(url)) return url;
  if (/_\d+x\d*\./.test(url)) return url; // ya tiene tamano
  return url.replace(/(\.[a-z]+)(\?.*)?$/i, '_1600x1600$1$2');
}

// Estrategia 1 (preferida): usa el endpoint canonico .json de Shopify
//   https://shop.com/products/HANDLE  →  https://shop.com/products/HANDLE.json
// Devuelve { title, images } o null si falla.
// El title se usa para verificar que la URL corresponde al producto correcto.
async function fetchShopifyProductJson(productUrl) {
  const jsonUrl = productUrl.replace(/\/?(\?.*)?$/, '.json$1');
  const res = await fetchWithTimeout(jsonUrl);
  if (!res.ok) return null;
  try {
    const data = await res.json();
    const imgs = data?.product?.images || [];
    return {
      title: data?.product?.title || '',
      images: imgs.map(i => normalizeUrl(i.src)).filter(Boolean),
    };
  } catch {
    return null;
  }
}

// Normaliza string para comparacion (sin acentos, lowercase, sin chars especiales)
function normalizeForCompare(s) {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

// Tokens equivalentes / abreviaturas comunes en perfumeria
const TOKEN_EQUIVALENTS = {
  'edp': ['eau', 'de', 'parfum'],
  'edt': ['eau', 'de', 'toilette'],
  'edc': ['eau', 'de', 'cologne'],
  'parfum': ['edp', 'eau', 'de'],
  'eau': ['edp', 'edt'],
  'cologne': ['edc'],
};
// Tokens "ruidosos" que se ignoran en comparacion (genero, tamano, etc.)
const NOISE_TOKENS = new Set([
  'for', 'men', 'man', 'women', 'woman', 'hombre', 'mujer', 'her', 'him',
  'pour', 'unisex', 'eau', 'de', 'la', 'le', 'el', 'a', 'an', 'the',
  '30ml', '50ml', '75ml', '100ml', '125ml', '200ml', 'ml',
  'spray', 'vaporisateur', 'natural',
  // Tokens de marca redundantes (cuando ambas formas existen en el mercado)
  'giorgio', 'maison', 'francis', 'kurkdjian',
  // Tokens descriptivos comunes
  'alternativa', 'alternative', 'inspirado', 'inspired', 'set', 'regalo', 'gift',
  'discovery', 'miniaturas', 'edicion',
]);

function expandToken(t) {
  return TOKEN_EQUIVALENTS[t] ? [t, ...TOKEN_EQUIVALENTS[t]] : [t];
}

// Verifica que el title del .json corresponda al producto.
// Tolera abreviaturas (EDP↔eau de parfum) y tokens de ruido (for men, 100ml).
function verifyTitle(productName, sourceTitle) {
  if (!sourceTitle) return { ok: false, score: 0, reason: 'sin title en source' };
  // Filtra contenido entre parentesis (ej. "(Alternativa de YSL Y EDP)")
  const cleanedTitle = sourceTitle.replace(/\([^)]*\)/g, '').replace(/\s+/g, ' ').trim();
  const a = normalizeForCompare(productName);
  const b = normalizeForCompare(cleanedTitle);
  if (a === b) return { ok: true, score: 1.0 };

  const aTokensRaw = a.split(' ').filter(t => t.length >= 2 && !/^\d+$/.test(t));
  const bTokensRaw = b.split(' ').filter(t => t.length >= 2 && !/^\d+$/.test(t));
  const aTokens = new Set(aTokensRaw.filter(t => !NOISE_TOKENS.has(t)));
  const bTokens = new Set(bTokensRaw.filter(t => !NOISE_TOKENS.has(t)));

  // Detecta titles claramente genericos del shop (ej. "Disfragancias | ...")
  if (/^(disfragancias|notino|fragrancenet|sephora)/i.test(sourceTitle.trim())) {
    return { ok: false, score: 0, reason: 'title generico del shop, no del producto' };
  }

  // Para cada token del producto, verifica que aparezca o tenga equivalente en source
  const missing = [];
  for (const t of aTokens) {
    const variants = expandToken(t);
    if (!variants.some(v => bTokens.has(v))) missing.push(t);
  }
  if (missing.length > 0) {
    return { ok: false, score: 0, reason: `faltan tokens [${missing.join(',')}] en title source` };
  }

  // Tokens extras en source (no son ruido y no estan en producto)
  const extraInB = [...bTokens].filter(t => {
    const variants = expandToken(t);
    return !variants.some(v => aTokens.has(v));
  }).length;

  const score = Math.pow(0.7, extraInB);
  return {
    ok: score >= 0.24,  // permite hasta 4 tokens extras
    score,
    reason: extraInB > 4 ? `${extraInB} tokens extras en title source` : null,
  };
}

// Estrategia 2 (fallback): scrape del HTML para sitios que no expongan .json
function extractFromHtml(html, max) {
  const candidates = [];
  const seen = new Set();

  // Dedupe key: filename sin extension ni sufijos de tamano/version Shopify
  const dedupeKey = (url) => {
    try {
      const u = new URL(url, 'https://x.com');
      let f = u.pathname.split('/').pop();
      f = f.replace(/\.(jpe?g|png|webp|gif)$/i, '');
      f = f.replace(/_(?:pico|icon|thumb|compact|small|medium|large|grande|master|original|\d+x\d*)(?:_(?:crop_(?:center|top|bottom|left|right)|center))?$/i, '');
      return f.toLowerCase();
    } catch { return url; }
  };

  const tryAdd = (rawUrl) => {
    if (!rawUrl) return;
    const url = normalizeUrl(rawUrl);
    if (!/\.(jpe?g|png|webp)/i.test(url)) return;
    if (/(placeholder|logo|favicon|sprite|swatch)/i.test(url)) return;
    const key = dedupeKey(url);
    if (seen.has(key)) return;
    seen.add(key);
    candidates.push(url);
  };

  // og:image
  const ogMatch = html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i);
  if (ogMatch) tryAdd(ogMatch[1]);

  // JSON-LD Product schema
  const jsonLdMatches = [...html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)];
  for (const m of jsonLdMatches) {
    try {
      const data = JSON.parse(m[1].trim());
      const items = Array.isArray(data) ? data : [data];
      for (const item of items) {
        if (String(item['@type']).includes('Product')) {
          const imgs = Array.isArray(item.image) ? item.image : (item.image ? [item.image] : []);
          imgs.forEach(tryAdd);
        }
      }
    } catch { /* skip */ }
  }

  // <img> con cdn.shopify.com
  if (candidates.length < max) {
    const imgRegex = /<img[^>]+(?:src|data-src|data-srcset)=["']([^"']+)["']/gi;
    for (const m of html.matchAll(imgRegex)) {
      let url = m[1].split(/\s+/)[0];
      if (!/cdn\.shopify\.com/.test(url)) continue;
      tryAdd(url.replace(/&amp;/g, '&'));
      if (candidates.length >= max) break;
    }
  }

  return candidates.slice(0, max);
}

// Wrapper: prueba .json primero, fallback a HTML scraping
// Retorna { images, sourceTitle } para que el caller pueda verificar match
async function extractImageUrls(productUrl, max) {
  const jsonData = await fetchShopifyProductJson(productUrl);
  if (jsonData && jsonData.images.length > 0) {
    return {
      images: jsonData.images.slice(0, max).map(shopifyHighRes),
      sourceTitle: jsonData.title,
      via: 'shopify-json',
    };
  }
  const pageRes = await fetchWithTimeout(productUrl);
  if (!pageRes.ok) throw new Error(`page ${pageRes.status}`);
  const html = await pageRes.text();
  // Extrae title del HTML para verificacion
  const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i)
    || html.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i);
  return {
    images: extractFromHtml(html, max).map(shopifyHighRes),
    sourceTitle: titleMatch ? titleMatch[1] : '',
    via: 'html',
  };
}

// Procesa una sola imagen: download → strip → resize → webp → save
async function downloadAndProcess(imgUrl, outPath) {
  if (existsSync(outPath) && statSync(outPath).size > 1000) {
    return { skipped: true };
  }
  const res = await fetchWithTimeout(imgUrl);
  if (!res.ok) throw new Error(`img ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());

  const out = await sharp(buf)
    .rotate() // respeta orientation EXIF y la consume
    .resize({
      width: MAX_WIDTH,
      height: MAX_HEIGHT,
      fit: 'inside',
      withoutEnlargement: true,
    })
    .webp({ quality: QUALITY, effort: 6 })
    .toBuffer();

  writeFileSync(outPath, out);
  return { skipped: false, sizeKb: Math.round(out.length / 1024) };
}

async function processOne({ slug, name, brand, url }) {
  try {
    // Build output paths para las N imagenes
    const outPaths = Array.from({ length: IMAGES_PER_PRODUCT }, (_, i) =>
      path.join(OUTPUT_DIR, i === 0 ? `${slug}.webp` : `${slug}-${i + 1}.webp`)
    );

    // Skip si ya existen TODAS
    if (outPaths.every(p => existsSync(p) && statSync(p).size > 1000)) {
      return { status: 'skipped', slug, reason: 'todas existen' };
    }

    // Extraer URLs + title del producto fuente
    const { images: imgUrls, sourceTitle, via } = await extractImageUrls(url, IMAGES_PER_PRODUCT);
    if (imgUrls.length === 0) throw new Error('no se encontraron imagenes');

    // VERIFICACION CRITICA: el title del producto en la URL fuente debe
    // corresponder a nuestro producto (evita guardar imagen incorrecta)
    const productName = `${brand} ${name}`;
    const verify = verifyTitle(productName, sourceTitle);
    if (!verify.ok) {
      return {
        status: 'mismatch',
        slug,
        name,
        brand,
        url,
        sourceTitle,
        reason: verify.reason || 'title source no corresponde',
      };
    }

    // Descargar cada una secuencialmente
    const downloaded = [];
    for (let i = 0; i < imgUrls.length && i < IMAGES_PER_PRODUCT; i++) {
      try {
        const result = await downloadAndProcess(imgUrls[i], outPaths[i]);
        downloaded.push({
          path: outPaths[i].replace(ROOT, '').replace(/\\/g, '/'),
          sourceUrl: imgUrls[i],
          ...result,
        });
      } catch (err) {
        downloaded.push({
          path: outPaths[i].replace(ROOT, '').replace(/\\/g, '/'),
          sourceUrl: imgUrls[i],
          error: err.message,
        });
      }
    }

    const successCount = downloaded.filter(d => !d.error).length;
    return {
      status: successCount === IMAGES_PER_PRODUCT ? 'ok' : (successCount > 0 ? 'partial' : 'failed'),
      slug,
      name,
      brand,
      sourceTitle,
      via,
      downloaded,
      foundUrls: imgUrls.length,
    };
  } catch (err) {
    return { status: 'failed', slug, name, brand, url, error: err.message };
  }
}

let processed = 0;
function logResult(r) {
  processed++;
  const prefix = `[${processed}/${tasks.length}]`;
  if (r.status === 'ok') {
    const sizes = r.downloaded.map(d => d.skipped ? 'skip' : d.sizeKb + 'KB').join(' + ');
    console.log(`✅ ${prefix} ${r.slug} (${sizes})`);
  } else if (r.status === 'partial') {
    console.log(`⚠️  ${prefix} ${r.slug} — solo ${r.downloaded.filter(d => !d.error).length}/${IMAGES_PER_PRODUCT} imágenes`);
  } else if (r.status === 'skipped') {
    console.log(`⏭️  ${prefix} ${r.slug} (${r.reason})`);
  } else if (r.status === 'mismatch') {
    console.log(`🚫 ${prefix} ${r.slug} — title NO match: "${r.sourceTitle}" (${r.reason})`);
  } else {
    console.log(`❌ ${prefix} ${r.slug} — ${r.error}`);
  }
}

async function runWithPool(items, concurrency, fn) {
  const queue = [...items];
  const workers = Array(concurrency).fill(null).map(async () => {
    while (queue.length) {
      const item = queue.shift();
      if (!item) break;
      const result = await fn(item);
      logResult(result);
      const bucket = ['ok', 'partial', 'skipped', 'mismatch', 'failed'].includes(result.status) ? result.status : 'failed';
      results[bucket].push(result);
      await sleep(RATE_LIMIT_MS);
    }
  });
  await Promise.all(workers);
}

const start = Date.now();
await runWithPool(tasks, CONCURRENT, processOne);
const elapsed = ((Date.now() - start) / 1000).toFixed(1);

console.log(`\n📊 Resultado:`);
console.log(`   ✅ OK (${IMAGES_PER_PRODUCT}/${IMAGES_PER_PRODUCT}): ${results.ok.length}`);
console.log(`   ⚠️  Partial: ${results.partial.length}`);
console.log(`   ⏭️  Skipped: ${results.skipped.length}`);
console.log(`   🚫 Mismatch (title diferente): ${results.mismatch.length}`);
console.log(`   ❌ Failed: ${results.failed.length}`);
console.log(`   ⏱️  Tiempo: ${elapsed}s`);

writeFileSync(REPORT_PATH, JSON.stringify(results, null, 2), 'utf8');
console.log(`\n📁 Reporte: ${REPORT_PATH}`);
