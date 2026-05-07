// Mueve los primeros N items de mapping-additions.json a mapping.json
// Uso: node scripts/merge-batch.mjs [count]
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ADDITIONS = path.join(__dirname, 'mapping-additions.json');
const MAPPING = path.join(__dirname, 'mapping.json');

const count = parseInt(process.argv[2], 10) || 10;
const additions = JSON.parse(readFileSync(ADDITIONS, 'utf8'));
const mapping = JSON.parse(readFileSync(MAPPING, 'utf8'));

const batch = additions.slice(0, count);
const remaining = additions.slice(count);

mapping.push(...batch.map(b => ({
  slug: b.slug,
  name: b.name,
  brand: b.brand,
  url: b.url,
  score: b.score,
})));

writeFileSync(MAPPING, JSON.stringify(mapping, null, 2), 'utf8');
writeFileSync(ADDITIONS, JSON.stringify(remaining, null, 2), 'utf8');

console.log(`✅ Movidos ${batch.length} a mapping.json`);
console.log(`   Mapping ahora: ${mapping.length} productos`);
console.log(`   Additions restantes: ${remaining.length}`);
console.log(`\nProductos en este batch:`);
batch.forEach((b, i) => console.log(`  ${i+1}. ${b.brand} ${b.name}`));
