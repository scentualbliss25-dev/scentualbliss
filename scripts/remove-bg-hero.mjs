// Quita el fondo blanco de una imagen y guarda PNG transparente.
// Usado para imágenes del hero que necesitan render limpio sobre fondo oscuro.
// Uso: node scripts/remove-bg-hero.mjs <input> <output> [threshold]
import sharp from 'sharp';
import { resolve } from 'path';

const [, , inputArg, outputArg, thresholdArg] = process.argv;
if (!inputArg || !outputArg) {
  console.error('Uso: node scripts/remove-bg-hero.mjs <input> <output> [threshold=235]');
  process.exit(1);
}

const input = resolve(inputArg);
const output = resolve(outputArg);
// Umbral: cualquier pixel con R,G,B >= threshold se considera fondo y se vuelve transparente.
// 235 es agresivo para fondos blancos limpios; bajar a 220 si la imagen tiene
// sombras suaves que se "comen" demasiado.
const THRESHOLD = Number(thresholdArg) || 235;
// Zona de feather: pixels entre (THRESHOLD - FEATHER) y THRESHOLD se vuelven semi-transparentes.
// Esto suaviza el borde y evita el típico "halo blanco" alrededor de la botella.
const FEATHER = 20;

async function main() {
  const img = sharp(input).ensureAlpha();
  const { data, info } = await img.raw().toBuffer({ resolveWithObject: true });
  const { width, height, channels } = info;
  if (channels !== 4) throw new Error(`Esperaba 4 canales (RGBA), recibí ${channels}`);

  const out = Buffer.from(data); // copia
  const lower = THRESHOLD - FEATHER;
  for (let i = 0; i < out.length; i += 4) {
    const r = out[i], g = out[i + 1], b = out[i + 2];
    const minRGB = Math.min(r, g, b);
    if (minRGB >= THRESHOLD) {
      // Fondo blanco puro → totalmente transparente
      out[i + 3] = 0;
    } else if (minRGB > lower) {
      // Zona de transición: gradiente lineal
      const t = (minRGB - lower) / FEATHER; // 0..1
      out[i + 3] = Math.round(out[i + 3] * (1 - t));
    }
  }

  await sharp(out, { raw: { width, height, channels: 4 } })
    .png({ compressionLevel: 9, quality: 95 })
    .toFile(output);

  console.log(`✓ ${output} generado (${width}×${height}, threshold=${THRESHOLD})`);
}

main().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
