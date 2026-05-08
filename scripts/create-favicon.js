// Script: genera favicons desde el logo existente
// Extrae solo el isologo (llama+hojas) y genera los tamaños necesarios
// Uso: node scripts/create-favicon.js

import sharp from 'sharp';
import { mkdirSync } from 'fs';

const LOGO_SRC = 'public/img/logo.png';

async function main() {
  // Inspeccionar dimensiones del logo base
  const meta = await sharp(LOGO_SRC).metadata();
  console.log(`Logo original: ${meta.width}x${meta.height}px`);

  // El logo es 198x70. El isologo (llama+hojas) ocupa aprox los primeros 42px.
  // El texto "SCENTUALBLISS" empieza alrededor de px 45.
  const iconCrop = { left: 0, top: 0, width: 42, height: meta.height };

  // Buffer del isologo recortado
  const iconBuf = await sharp(LOGO_SRC)
    .extract(iconCrop)
    .toBuffer();

  // Cuadrado 70x70 con padding para que el símbolo respire
  const squareSize = meta.height;
  const padding = Math.round(squareSize * 0.1);
  const innerSize = squareSize - padding * 2;

  const paddedBuf = await sharp(iconBuf)
    .resize(innerSize, innerSize, { fit: 'contain', background: '#0F0C09' })
    .extend({ top: padding, bottom: padding, left: padding, right: padding, background: '#0F0C09' })
    .resize(squareSize, squareSize)
    .toBuffer();

  // 1. favicon 32x32 → public/favicon.ico (PNG renombrado, funciona en la mayoría de browsers)
  await sharp(paddedBuf)
    .resize(32, 32)
    .png()
    .toFile('public/favicon.ico');
  console.log('✅ public/favicon.ico (32x32)');

  // 2. icon.png 32x32 → app/icon.png (Next.js lo linkea automáticamente)
  await sharp(paddedBuf)
    .resize(32, 32)
    .png()
    .toFile('app/icon.png');
  console.log('✅ app/icon.png (32x32)');

  // 3. icon-192.png → app/icon192.png
  await sharp(paddedBuf)
    .resize(192, 192)
    .png()
    .toFile('public/icon-192.png');
  console.log('✅ public/icon-192.png (192x192)');

  // 4. apple-icon 180x180 → app/apple-icon.png
  await sharp(paddedBuf)
    .resize(180, 180)
    .png()
    .toFile('app/apple-icon.png');
  console.log('✅ app/apple-icon.png (180x180)');

  // 5. OG icon 512x512 → public/icon-512.png
  await sharp(paddedBuf)
    .resize(512, 512)
    .png()
    .toFile('public/icon-512.png');
  console.log('✅ public/icon-512.png (512x512)');

  console.log('\n✅ Todos los favicons generados correctamente.');
}

main().catch(err => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});
