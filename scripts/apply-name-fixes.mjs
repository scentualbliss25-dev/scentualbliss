// Aplica correcciones de nombre a products.js basado en name-diff-report.json
// Estrategia:
//  1. Fixes de mapping incorrecto (URLs apuntando a producto erroneo)
//  2. Para cada diff: limpia parentesis del title canonical
//  3. Si el slug del producto debe cambiar (ej. dior-sauvage-edt → name "Sauvage EDT"), aplica
//  4. NO toca brand (ej. "Giorgio Armani" → mantener aunque Disfragancias diga solo "Armani")
//  5. Productos casos especiales (mismatches): saltarlos

import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PRODUCTS_PATH = path.join(__dirname, '..', 'lib', 'products.js');
const REPORT = JSON.parse(readFileSync(path.join(__dirname, 'name-diff-report.json'), 'utf8'));

// Mappings que estaban incorrectos: arregla URL y luego se re-scrapearan imagenes
const MAPPING_FIXES = {
  'lattafa-khamrah': {
    correctUrl: 'https://disfragancias.com/products/lattafa-khamrah-alternativa-kilian-angels-share',
    correctTitle: 'Lattafa Khamrah',
  },
  'hugo-boss-the-scent-for-men': {
    correctUrl: 'https://disfragancias.com/products/hugo-boss-boss-the-scent',
    correctTitle: 'Hugo Boss BOSS The Scent For Men',
  },
};

// Limpia title: quita parentesis con descripcion + normaliza
function cleanTitle(title) {
  return title.replace(/\s*\([^)]*\)/g, '').trim();
}

// Para cada diff, calcula el new name (sin brand prefix, sin parentesis)
function suggestNewName(brand, canonicalTitle) {
  const cleaned = cleanTitle(canonicalTitle);
  const brandLower = brand.toLowerCase();
  if (cleaned.toLowerCase().startsWith(brandLower)) {
    return cleaned.slice(brand.length).trim();
  }
  return cleaned;
}

// === Aplicar mapping fixes en mapping.json ===
const mappingPath = path.join(__dirname, 'mapping.json');
const mapping = JSON.parse(readFileSync(mappingPath, 'utf8'));
let mappingChanges = 0;
for (const m of mapping) {
  const fix = MAPPING_FIXES[m.slug];
  if (fix) {
    m.url = fix.correctUrl;
    mappingChanges++;
  }
}
writeFileSync(mappingPath, JSON.stringify(mapping, null, 2), 'utf8');
console.log(`✅ Fixed ${mappingChanges} mappings incorrectos`);

// === Calcular cambios de nombre para products.js ===
const fixes = [];
for (const d of REPORT.diffs) {
  // Si tiene mapping fix, usa el title correcto del fix (no el canonical actual que esta mal)
  const fix = MAPPING_FIXES[d.slug];
  const titleToUse = fix ? fix.correctTitle : d.canonicalTitle;
  const newName = suggestNewName(d.brand, titleToUse);

  if (newName !== d.currentName) {
    fixes.push({
      slug: d.slug,
      brand: d.brand,
      oldName: d.currentName,
      newName,
      canonicalTitle: titleToUse,
    });
  }
}

console.log(`📝 ${fixes.length} cambios de nombre a aplicar:\n`);

// === Leer products.js y aplicar reemplazos ===
let content = readFileSync(PRODUCTS_PATH, 'utf8');
let applied = 0;
const failed = [];

for (const f of fixes) {
  // Encuentra el bloque del producto por slug
  const slugRegex = new RegExp(`(slug:\\s*['"]${f.slug.replace(/[-]/g, '[\\-]')}['"][\\s\\S]*?name:\\s*)(["'])([^"']*?)(\\2)`);
  const match = content.match(slugRegex);
  if (!match) {
    failed.push({ slug: f.slug, reason: 'no se encontró bloque' });
    continue;
  }
  const oldQuote = match[2];
  // Escapa comillas en newName si conflictan con el quote
  let newNameEscaped = f.newName;
  if (oldQuote === '"') newNameEscaped = newNameEscaped.replace(/"/g, '\\"');
  if (oldQuote === "'") newNameEscaped = newNameEscaped.replace(/'/g, "\\'");

  content = content.replace(slugRegex, `$1${oldQuote}${newNameEscaped}${oldQuote}`);
  console.log(`  ✓ ${f.slug}: "${f.oldName}" → "${f.newName}"`);
  applied++;
}

writeFileSync(PRODUCTS_PATH, content, 'utf8');
console.log(`\n✅ Aplicados ${applied}/${fixes.length} cambios`);
if (failed.length) {
  console.log(`❌ Fallidos: ${failed.length}`);
  failed.forEach(f => console.log(`   - ${f.slug}: ${f.reason}`));
}
