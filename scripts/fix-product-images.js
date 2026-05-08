// Script: actualiza el campo images[] de cada producto para apuntar
// directamente al archivo webp real en lugar de placeholder.
// También agrega la segunda imagen ({slug}-2.webp) si existe.
// Uso: node scripts/fix-product-images.js

import { readFileSync, writeFileSync, existsSync } from 'fs';

const SRC = 'lib/products.js';
let content = readFileSync(SRC, 'utf-8');

// Importar productos de forma dinámica para obtener los slugs
const { products } = await import('../lib/products.js');

let updated = 0;
let noImage = [];

for (const p of products) {
  const primary = `public/img/${p.slug}.webp`;
  const secondary = `public/img/${p.slug}-2.webp`;

  if (!existsSync(primary)) {
    noImage.push(p.slug);
    continue;
  }

  const imgs = [`/img/${p.slug}.webp`];
  if (existsSync(secondary)) imgs.push(`/img/${p.slug}-2.webp`);

  // Reemplazar el campo images del producto en el texto del archivo
  // Busca: images: ["/img/placeholder-perfume.png"] o images: ["/img/placeholder-perfume.webp"]
  // O cualquier images: [...] para este producto específico
  // Usamos el slug como contexto para localizar la línea correcta

  const slugPattern = new RegExp(
    `(slug: '${p.slug}'[\\s\\S]*?images: )\\[[^\\]]*\\]`,
    'm'
  );

  const replacement = `$1[${imgs.map(i => `"${i}"`).join(', ')}]`;

  if (slugPattern.test(content)) {
    content = content.replace(slugPattern, replacement);
    updated++;
  }
}

writeFileSync(SRC, content, 'utf-8');

console.log(`✅ Actualizados: ${updated} productos`);
if (noImage.length > 0) {
  console.log(`⚠️  Sin imagen webp: ${noImage.join(', ')}`);
}
