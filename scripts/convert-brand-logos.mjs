// Convierte logos de marca a WebP uniforme + renombra a slug correcto.
// Uso: node scripts/convert-brand-logos.mjs
import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const BRANDS_DIR = path.join(process.cwd(), 'public', 'img', 'brands');
const WEBP_QUALITY = 88;

// Mapeo: nombre actual del archivo (sin extensión) → slug objetivo.
// Aquí corregimos typos del filename original.
const FILE_TO_SLUG = {
  'Afnan': 'afnan',
  'Ahli': 'ahli',
  'Armaf': 'armaf',
  'Bharara': 'bharara',
  'Carolina Herrera': 'carolina-herrera',
  'Chanel': 'chanel',
  'Creed_Fragrances_logo.svg': 'creed',
  'Dior': 'dior',
  'Dolce and gabbana': 'dolce-and-gabbana',
  'emper-300x300': 'emper',
  'Giardiano di toscana': 'giardini-di-toscana',
  'Giorgio Armani': 'giorgio-armani',
  'Hugo Boss': 'hugo-boss',
  'Jean Paul Gaultier': 'jean-paul-gaultier',
  'Lacoste': 'lacoste',
  'Lancóme': 'lancome',
  'Lattafa': 'lattafa',
  'Lorenzo Pazzaglia': 'lorenzo-pazzaglia',
  'Louis Vuitton': 'louis-vuitton',
  'Maison Crivelli': 'maison-crivelli',
  'Maison Francis Kurkdijan': 'maison-francis-kurkdjian',
  'Montale': 'montale',
  'Nautica': 'nautica',
  'Paco Rabanne': 'paco-rabanne',
  'Tom Ford': 'tom-ford',
  'Valentino': 'valentino',
  'Xerjoff': 'xerjoff',
};

// Archivos a descartar (no son marcas del catálogo)
const SKIP_FILES = new Set(['Sabrina Carpenter']);

async function main() {
  const files = await fs.readdir(BRANDS_DIR);
  const before = [];
  const after = [];
  const skipped = [];
  const orphan = [];

  for (const file of files) {
    const ext = path.extname(file).toLowerCase();
    const base = path.basename(file, ext);
    const fullPath = path.join(BRANDS_DIR, file);

    if (SKIP_FILES.has(base)) {
      await fs.unlink(fullPath);
      skipped.push(file);
      continue;
    }

    const slug = FILE_TO_SLUG[base];
    if (!slug) {
      orphan.push(file);
      continue;
    }

    const targetPath = path.join(BRANDS_DIR, `${slug}.webp`);
    const sizeBefore = (await fs.stat(fullPath)).size;

    // Leer a buffer primero — evita EBUSY en Windows cuando input y output
    // resuelven al mismo archivo por case-insensitive filesystem.
    const inputBuf = await fs.readFile(fullPath);
    const outBuf = await sharp(inputBuf)
      .webp({ quality: WEBP_QUALITY, effort: 6 })
      .toBuffer();

    // Borrar el original (filename con case original) antes de escribir el slug
    // lowercase, para evitar archivos duplicados case-distinct en repos que sí
    // distinguen (Linux/Vercel).
    await fs.unlink(fullPath);
    await fs.writeFile(targetPath, outBuf);

    const sizeAfter = (await fs.stat(targetPath)).size;
    before.push({ file, size: sizeBefore });
    after.push({ slug, size: sizeAfter, savings: sizeBefore - sizeAfter });
  }

  const sumBefore = before.reduce((s, x) => s + x.size, 0);
  const sumAfter = after.reduce((s, x) => s + x.size, 0);

  console.log('\n=== Conversión ===');
  after.sort((a, b) => a.slug.localeCompare(b.slug)).forEach(({ slug, size, savings }) => {
    const sign = savings >= 0 ? '-' : '+';
    console.log(`  ${slug.padEnd(28)}  ${String(size).padStart(7)} B  (${sign}${Math.abs(savings)} B)`);
  });

  console.log('\n=== Resumen ===');
  console.log(`  Convertidos:  ${after.length}`);
  console.log(`  Eliminados:   ${skipped.length}  → ${skipped.join(', ') || '(ninguno)'}`);
  if (orphan.length) console.log(`  Sin mapeo:    ${orphan.length}  → ${orphan.join(', ')}`);
  console.log(`  Tamaño total: ${sumBefore} B → ${sumAfter} B (${Math.round((1 - sumAfter / sumBefore) * 100)}% más ligero)`);
}

main().catch((e) => { console.error(e); process.exit(1); });
