// Reconstruye unmatched.json: productos en products.js que NO estan en mapping.json
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { products } from '../lib/products.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const mapping = JSON.parse(readFileSync(path.join(__dirname, 'mapping.json'), 'utf8'));
const additions = JSON.parse(readFileSync(path.join(__dirname, 'mapping-additions.json'), 'utf8'));

const known = new Set([
  ...mapping.map(m => m.slug),
  ...additions.map(a => a.slug),
]);

const newProducts = products.filter(p => p.brand !== 'ScentualBliss');
const unmatched = newProducts
  .filter(p => !known.has(p.slug))
  .map(p => ({ slug: p.slug, name: p.name, brand: p.brand }));

writeFileSync(path.join(__dirname, 'unmatched.json'), JSON.stringify(unmatched, null, 2), 'utf8');

console.log(`Products en products.js (no-ScentualBliss): ${newProducts.length}`);
console.log(`En mapping.json: ${mapping.length}`);
console.log(`En mapping-additions.json: ${additions.length}`);
console.log(`Unmatched: ${unmatched.length}`);
console.log('\nFirst 5 unmatched:');
unmatched.slice(0, 5).forEach(p => console.log(`  - ${p.brand} ${p.name}`));
