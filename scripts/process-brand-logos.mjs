// Procesa los logos originales (en cualquier formato y resolución) que
// estén en public/img/brands-original/ y genera los WebP normalizados
// en public/img/brands/, todos a CANVAS_W × CANVAS_H con el logo
// centrado y escalado al máximo manteniendo su proporción.
//
// La carpeta brands-original/ está en .gitignore (no va al repo) y
// sirve como respaldo permanente. Si necesitas re-generar los WebP
// con otro tamaño o calidad, solo modificas los parámetros aquí y
// vuelves a correr el script: idempotente y reproducible.
//
// Uso: node scripts/process-brand-logos.mjs
import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const SRC_DIR = path.join(process.cwd(), 'public', 'img', 'brands-original');
const OUT_DIR = path.join(process.cwd(), 'public', 'img', 'brands');

// 720×240 = 2× del tamaño anterior (360×120). Suficiente para retina 3x
// en tamaño 'md' (144×48 lógico → 432×144 físico, < 720×240).
const CANVAS_W = 720;
const CANVAS_H = 240;
const WEBP_QUALITY = 90;

// Mapeo: filename original (sin extensión, case-sensitive) → slug final.
// Tolera typos del original que ya conocemos.
const FILE_TO_SLUG = {
  // Aliases exactos (los más comunes)
  'Afnan': 'afnan',
  'Ahli': 'ahli',
  'AHLI': 'ahli',
  'Armaf': 'armaf',
  'Bharara': 'bharara',
  'Carolina Herrera': 'carolina-herrera',
  'Chanel': 'chanel',
  'Creed': 'creed',
  'Creed_Fragrances_logo.svg': 'creed',
  'Dior': 'dior',
  'Dolce and gabbana': 'dolce-and-gabbana',
  'Dolce & Gabbana': 'dolce-and-gabbana',
  'Emper': 'emper',
  'emper-300x300': 'emper',
  'Giardini di Toscana': 'giardini-di-toscana',
  'Giardiano di toscana': 'giardini-di-toscana',
  'Giorgio Armani': 'giorgio-armani',
  'Hugo Boss': 'hugo-boss',
  'Jean Paul Gaultier': 'jean-paul-gaultier',
  'Lacoste': 'lacoste',
  'Lancome': 'lancome',
  'Lancôme': 'lancome',
  'Lancóme': 'lancome',
  'Lattafa': 'lattafa',
  'Lorenzo Pazzaglia': 'lorenzo-pazzaglia',
  'Louis Vuitton': 'louis-vuitton',
  'Maison Crivelli': 'maison-crivelli',
  'Maison Francis Kurkdjian': 'maison-francis-kurkdjian',
  'Maison Francis Kurkdijan': 'maison-francis-kurkdjian',
  'Montale': 'montale',
  'Nautica': 'nautica',
  'Paco Rabanne': 'paco-rabanne',
  'Tom Ford': 'tom-ford',
  'Valentino': 'valentino',
  'Versace': 'versace',
  'Xerjoff': 'xerjoff',
};

// Filenames que no son marcas del catálogo: se ignoran sin escribir output
const SKIP_FILES = new Set(['Sabrina Carpenter']);

async function main() {
  let files;
  try {
    files = await fs.readdir(SRC_DIR);
  } catch {
    console.error(`✗ No existe ${SRC_DIR}. Pega los originales y vuelve a correr.`);
    process.exit(1);
  }

  if (files.length === 0) {
    console.error(`✗ La carpeta ${SRC_DIR} está vacía. Pega los originales.`);
    process.exit(1);
  }

  await fs.mkdir(OUT_DIR, { recursive: true });

  const rows = [];
  const skipped = [];
  const orphans = [];

  for (const file of files) {
    const ext = path.extname(file).toLowerCase();
    const base = path.basename(file, ext);

    if (SKIP_FILES.has(base)) {
      skipped.push(file);
      continue;
    }

    // Lookup case-insensitive: tolera filenames como 'versace', 'Versace' o 'VERSACE'
    const slug = FILE_TO_SLUG[base] || FILE_TO_SLUG[Object.keys(FILE_TO_SLUG).find(k => k.toLowerCase() === base.toLowerCase()) || ''];
    if (!slug) {
      orphans.push(file);
      continue;
    }

    const inputBuf = await fs.readFile(path.join(SRC_DIR, file));
    const inputMeta = await sharp(inputBuf).metadata();

    // 1) trim recorta padding transparente/uniforme original
    // 2) resize 'inside' escala manteniendo aspect ratio
    // 3) extend rellena el canvas hasta CANVAS_W × CANVAS_H centrado
    const trimmed = await sharp(inputBuf)
      .trim({ threshold: 10 })
      .resize({
        width: CANVAS_W,
        height: CANVAS_H,
        fit: 'inside',
        withoutEnlargement: false,
        background: { r: 0, g: 0, b: 0, alpha: 0 },
        kernel: 'lanczos3',
      })
      .toBuffer();

    const trimMeta = await sharp(trimmed).metadata();
    const padX = Math.floor((CANVAS_W - trimMeta.width) / 2);
    const padY = Math.floor((CANVAS_H - trimMeta.height) / 2);

    const final = await sharp(trimmed)
      .extend({
        top: padY,
        bottom: CANVAS_H - trimMeta.height - padY,
        left: padX,
        right: CANVAS_W - trimMeta.width - padX,
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      })
      .webp({ quality: WEBP_QUALITY, effort: 6, smartSubsample: true })
      .toBuffer();

    const outPath = path.join(OUT_DIR, `${slug}.webp`);
    await fs.writeFile(outPath, final);

    rows.push({
      file,
      slug,
      inputDim: `${inputMeta.width}×${inputMeta.height}`,
      logoDim: `${trimMeta.width}×${trimMeta.height}`,
      outSize: final.length,
    });
  }

  console.log(`\n=== Procesados a canvas ${CANVAS_W}×${CANVAS_H} (calidad WebP ${WEBP_QUALITY}) ===`);
  rows.sort((a, b) => a.slug.localeCompare(b.slug)).forEach(r => {
    console.log(`  ${r.slug.padEnd(28)}  origen ${r.inputDim.padStart(11)}  →  logo ${r.logoDim.padStart(10)}  →  ${String(r.outSize).padStart(6)} B`);
  });

  console.log(`\n=== Resumen ===`);
  console.log(`  Procesados: ${rows.length}`);
  if (skipped.length) console.log(`  Saltados:   ${skipped.length}  → ${skipped.join(', ')}`);
  if (orphans.length) console.log(`  Sin mapeo:  ${orphans.length}  → ${orphans.join(', ')}  (agrega al FILE_TO_SLUG)`);
}

main().catch((e) => { console.error(e); process.exit(1); });
