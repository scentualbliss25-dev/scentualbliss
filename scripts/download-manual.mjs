// Descarga manual de una URL especifica para un slug dado
// Uso: node scripts/download-manual.mjs <slug> <product-page-url> [imageNumber]
//   imageNumber: 1 (default) para principal, 2 para segunda imagen
import { writeFileSync, existsSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUTPUT_DIR = path.join(__dirname, '..', 'public', 'img');

const QUALITY = 85;
const MAX_W = 800, MAX_H = 1000;
const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36';

if (!existsSync(OUTPUT_DIR)) mkdirSync(OUTPUT_DIR, { recursive: true });

const [, , slug, pageUrl, imgNumStr] = process.argv;
if (!slug || !pageUrl) {
  console.error('Uso: node scripts/download-manual.mjs <slug> <url> [imgNum=1]');
  process.exit(1);
}
const imgNum = parseInt(imgNumStr || '1', 10);
const outFile = imgNum === 1 ? `${slug}.webp` : `${slug}-${imgNum}.webp`;
const outPath = path.join(OUTPUT_DIR, outFile);

console.log(`📥 Descargando: ${slug} → ${outFile}`);
console.log(`📄 Source: ${pageUrl}`);

// 1. Fetch pagina
const pageRes = await fetch(pageUrl, {
  headers: { 'User-Agent': USER_AGENT, 'Accept': 'text/html,*/*' },
});
if (!pageRes.ok) throw new Error(`page ${pageRes.status}`);
const html = await pageRes.text();

// 2. Extraer URL imagen: og:image > twitter:image > primer img grande
const patterns = [
  /<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i,
  /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i,
  /<meta[^>]+name=["']twitter:image["'][^>]+content=["']([^"']+)["']/i,
];
let imgUrl = null;
for (const re of patterns) {
  const m = html.match(re);
  if (m && m[1]) {
    imgUrl = m[1].replace(/&amp;/g, '&');
    if (imgUrl.startsWith('//')) imgUrl = 'https:' + imgUrl;
    break;
  }
}

if (!imgUrl) {
  console.error('❌ No se encontró og:image');
  process.exit(1);
}
console.log(`🔗 Imagen: ${imgUrl}`);

// 3. Descargar imagen
const imgRes = await fetch(imgUrl, { headers: { 'User-Agent': USER_AGENT } });
if (!imgRes.ok) throw new Error(`img ${imgRes.status}`);
const buf = Buffer.from(await imgRes.arrayBuffer());
console.log(`💾 Descargado: ${Math.round(buf.length / 1024)}KB`);

// 4. Procesar: strip metadata + resize + webp
const out = await sharp(buf)
  .rotate()
  .resize({ width: MAX_W, height: MAX_H, fit: 'inside', withoutEnlargement: true })
  .webp({ quality: QUALITY, effort: 6 })
  .toBuffer();

writeFileSync(outPath, out);
console.log(`✅ Guardado: ${outPath} (${Math.round(out.length / 1024)}KB)`);

// Verificar metadata
const meta = await sharp(out).metadata();
console.log(`🛡️  Metadata: EXIF=${meta.exif ? '⚠️' : '✅'} ICC=${meta.icc ? '⚠️' : '✅'} XMP=${meta.xmp ? '⚠️' : '✅'}`);
