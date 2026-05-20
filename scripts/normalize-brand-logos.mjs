// Normaliza todos los logos de marca a un canvas uniforme manteniendo
// la proporción original del logo. Resultado: cada archivo es exactamente
// CANVAS_W × CANVAS_H, con el logo centrado y escalado al máximo que cabe.
// El componente BrandLogo entonces puede usar el mismo height para todos
// y se ven con el mismo peso visual sin importar la forma original.
//
// Uso: node scripts/normalize-brand-logos.mjs
import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const BRANDS_DIR = path.join(process.cwd(), 'public', 'img', 'brands');
const CANVAS_W = 360;
const CANVAS_H = 120;
const WEBP_QUALITY = 88;

async function main() {
  const files = (await fs.readdir(BRANDS_DIR)).filter(f => f.endsWith('.webp'));
  const rows = [];

  for (const file of files) {
    const fullPath = path.join(BRANDS_DIR, file);
    const inputBuf = await fs.readFile(fullPath);

    // 1) trim quita el padding transparente/uniforme original
    // 2) resize 'inside' escala manteniendo aspect ratio sin recortar
    // 3) extend completa el canvas hasta CANVAS_W × CANVAS_H con transparente
    //    para que TODOS los archivos finales tengan exactamente el mismo tamaño
    const out = await sharp(inputBuf)
      .trim({ threshold: 10 })
      .resize({
        width: CANVAS_W,
        height: CANVAS_H,
        fit: 'inside',
        withoutEnlargement: false,
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      })
      .toBuffer();

    // Centrar dentro del canvas final
    const meta = await sharp(out).metadata();
    const padX = Math.floor((CANVAS_W - meta.width) / 2);
    const padY = Math.floor((CANVAS_H - meta.height) / 2);

    const final = await sharp(out)
      .extend({
        top: padY,
        bottom: CANVAS_H - meta.height - padY,
        left: padX,
        right: CANVAS_W - meta.width - padX,
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      })
      .webp({ quality: WEBP_QUALITY, effort: 6 })
      .toBuffer();

    await fs.writeFile(fullPath, final);
    rows.push({ file, w: meta.width, h: meta.height, size: final.length });
  }

  console.log('\n=== Normalización (canvas final ' + CANVAS_W + '×' + CANVAS_H + ') ===');
  rows.sort((a, b) => a.file.localeCompare(b.file)).forEach(r => {
    console.log(`  ${r.file.padEnd(32)}  logo: ${r.w}×${r.h}  archivo: ${r.size} B`);
  });
  console.log(`\n  Total: ${rows.length} logos normalizados`);
}

main().catch(e => { console.error(e); process.exit(1); });
