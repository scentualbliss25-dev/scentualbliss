// Script: procesa el logo original
// 1. Recorta whitespace alrededor del contenido
// 2. Genera versión con fondo negro (logo.png)
// 3. Genera versión con fondo transparente (logo-transparent.png)
// Uso: node scripts/process-logo.js

import sharp from 'sharp';
import { readFileSync } from 'fs';

const SRC = 'public/img/logo.jpg';
const OUT_BG = 'public/img/logo.png';
const OUT_TRANSPARENT = 'public/img/logo-transparent.png';

// Umbral de "negro": cualquier pixel donde R+G+B sea menor a este valor → transparente
const BLACK_THRESHOLD = 60;

async function main() {
  // 1. Versión con fondo negro: trim y guardar como PNG
  await sharp(SRC)
    .trim() // elimina bordes uniformes
    .png({ quality: 95 })
    .toFile(OUT_BG);
  console.log('✅ Generado:', OUT_BG);

  // 2. Versión transparente: quitar pixeles negros
  const trimmed = await sharp(SRC).trim().toBuffer();
  const { data, info } = await sharp(trimmed)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const pixels = Buffer.from(data);
  for (let i = 0; i < pixels.length; i += 4) {
    const r = pixels[i];
    const g = pixels[i + 1];
    const b = pixels[i + 2];
    const sum = r + g + b;
    if (sum < BLACK_THRESHOLD) {
      // Pixel oscuro → transparente
      pixels[i + 3] = 0;
    } else if (sum < BLACK_THRESHOLD + 80) {
      // Pixel medio-oscuro → semi-transparente (suaviza bordes)
      pixels[i + 3] = Math.round(((sum - BLACK_THRESHOLD) / 80) * 255);
    }
  }

  await sharp(pixels, {
    raw: { width: info.width, height: info.height, channels: 4 },
  })
    .png({ quality: 95 })
    .toFile(OUT_TRANSPARENT);
  console.log('✅ Generado:', OUT_TRANSPARENT);

  // Reportar dimensiones finales
  const meta1 = await sharp(OUT_BG).metadata();
  const meta2 = await sharp(OUT_TRANSPARENT).metadata();
  console.log(`   ${OUT_BG}: ${meta1.width}x${meta1.height}`);
  console.log(`   ${OUT_TRANSPARENT}: ${meta2.width}x${meta2.height}`);
}

main().catch(err => {
  console.error('❌ Error:', err);
  process.exit(1);
});
