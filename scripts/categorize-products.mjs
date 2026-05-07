// Categoriza todos los productos:
//  1. productType: 'nicho' | 'disenador' | 'arabe' (segun brand)
//  2. aromaFamily: 'floral' | 'frutal' | 'fresco' | 'citrico' | 'dulce' | 'amaderado'
//     (analizando las notas para detectar la familia dominante)
//
// Aplica los cambios directamente a lib/products.js manteniendo formato.

import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { products } from '../lib/products.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PRODUCTS_PATH = path.join(__dirname, '..', 'lib', 'products.js');

// === Mapeo brand → productType ===
const BRAND_TYPE = {
  // NICHO (perfumeria de alta gama, exclusiva)
  'Maison Francis Kurkdjian': 'nicho',
  'Xerjoff': 'nicho',
  'Tom Ford': 'nicho',
  'Creed': 'nicho',
  'Louis Vuitton': 'nicho',
  'Maison Crivelli': 'nicho',
  'Lorenzo Pazzaglia': 'nicho',
  'Giardini di Toscana': 'nicho',
  'Montale': 'nicho',
  // DISEÑADOR (casas de moda mainstream)
  'Chanel': 'disenador',
  'Dior': 'disenador',
  'Carolina Herrera': 'disenador',
  'Valentino': 'disenador',
  'Hugo Boss': 'disenador',
  'Jean Paul Gaultier': 'disenador',
  'Versace': 'disenador',
  'Lancôme': 'disenador',
  'Paco Rabanne': 'disenador',
  'Lacoste': 'disenador',
  'Nautica': 'disenador',
  'Giorgio Armani': 'disenador',
  'Dolce & Gabbana': 'disenador',
  // ÁRABE (perfumeria del Medio Oriente)
  'Lattafa': 'arabe',
  'Armaf': 'arabe',
  'Afnan': 'arabe',
  'AHLI': 'arabe',
  'Emper': 'arabe',
  'Bharara': 'arabe',
};

// === Diccionarios de notas por aroma ===
const NOTE_KEYWORDS = {
  floral: [
    'jazmin', 'rosa', 'azahar', 'gardenia', 'iris', 'peonia', 'lirio',
    'magnolia', 'flor', 'frangipani', 'nardo', 'fresia', 'violeta',
    'ylang', 'orquidea', 'tuberosa', 'mimosa', 'lavanda', 'geranio',
    'styrax', 'centifolia', 'damascena', 'damasco', 'narciso', 'tulipan',
    'pivonia', 'florales', 'flores'
  ],
  citrico: [
    'bergamota', 'limon', 'naranja', 'pomelo', 'mandarina', 'lima',
    'toronja', 'yuzu', 'cedrat', 'citrico', 'citricos', 'sanguina',
    'kumquat', 'neroli', 'cítricos', 'cítrica'
  ],
  frutal: [
    'manzana', 'pera', 'durazno', 'mango', 'pina', 'piña', 'maracuya',
    'frambuesa', 'fresa', 'frutas', 'frutal', 'frutos', 'lichi',
    'grosella', 'mora', 'cereza', 'arandano', 'higo', 'kiwi', 'coco',
    'datil', 'papaya', 'tropical', 'tropicales', 'bayas'
  ],
  dulce: [
    'vainilla', 'caramelo', 'miel', 'cacao', 'praline', 'praliné',
    'tonka', 'azucar', 'azúcar', 'chocolate', 'gourmand', 'merengue',
    'helado', 'dulce', 'almendra', 'nuez', 'cafe', 'café',
    'benjui', 'benjuí', 'cremoso', 'lacteo', 'leche', 'crema',
    'algodon', 'malvavisco'
  ],
  amaderado: [
    'oud', 'sandalo', 'sándalo', 'cedro', 'vetiver', 'pachuli', 'pachulí',
    'maderas', 'madera', 'gaiac', 'cipres', 'ciprés', 'pino',
    'cuero', 'tabaco', 'incienso', 'mirra', 'resina', 'amber',
    'ambar', 'ámbar', 'guayacan', 'styrax', 'palisandro', 'caoba',
    'castano', 'castaño', 'bambu'
  ],
  fresco: [
    'marino', 'marina', 'acuatico', 'acuática', 'acuatica', 'acuáticas',
    'mar', 'salado', 'salada', 'sal', 'ozonico', 'ozónico',
    'menta', 'eucalipto', 'romero', 'salvia', 'tomillo', 'albahaca',
    'verde', 'verdes', 'hierba', 'hojas', 'fresca', 'fresco',
    'frescas', 'aromático', 'aromatico', 'limpio', 'limpia',
    'helada', 'cardamomo', 'jengibre', 'enebro', 'pimienta rosa'
  ],
};

function normalize(s) {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

// Cuenta keywords de cada familia en una seccion de notas
function countMatches(notes, family) {
  if (!notes) return 0;
  const text = normalize(notes);
  return NOTE_KEYWORDS[family].reduce((sum, kw) => sum + (text.includes(kw) ? 1 : 0), 0);
}

// Clasificacion JERARQUICA: prioriza la familia dominante real,
// no la base que casi siempre es amaderada
function scoreFamily(product) {
  const top = product.notes?.top || '';
  const heart = product.notes?.heart || '';
  const base = product.notes?.base || '';

  const counts = {
    floral: { top: countMatches(top, 'floral'), heart: countMatches(heart, 'floral'), base: countMatches(base, 'floral') },
    citrico: { top: countMatches(top, 'citrico'), heart: countMatches(heart, 'citrico'), base: countMatches(base, 'citrico') },
    frutal: { top: countMatches(top, 'frutal'), heart: countMatches(heart, 'frutal'), base: countMatches(base, 'frutal') },
    dulce: { top: countMatches(top, 'dulce'), heart: countMatches(heart, 'dulce'), base: countMatches(base, 'dulce') },
    amaderado: { top: countMatches(top, 'amaderado'), heart: countMatches(heart, 'amaderado'), base: countMatches(base, 'amaderado') },
    fresco: { top: countMatches(top, 'fresco'), heart: countMatches(heart, 'fresco'), base: countMatches(base, 'fresco') },
  };

  const total = (f) => counts[f].top + counts[f].heart + counts[f].base;
  const description = normalize(product.description || '');
  const seasonText = normalize(product.season || '');
  const isSummer = /verano|primavera|todo el a/i.test(seasonText);

  // === REGLAS JERARQUICAS ===

  // 1) FLORAL: si flores dominan el corazón con 2+ matches
  if (counts.floral.heart >= 2 && counts.floral.heart >= counts.amaderado.heart) {
    return 'floral';
  }

  // 2) DULCE/GOURMAND: vainilla/caramelo/chocolate/praline DOMINAN heart o base
  if (counts.dulce.heart >= 2 || counts.dulce.base >= 2) {
    return 'dulce';
  }
  if (/(gourmand|dulce|adicti)/i.test(description) && (counts.dulce.top + counts.dulce.heart + counts.dulce.base) >= 2) {
    return 'dulce';
  }

  // 3) FRUTAL: frutas dominan top o heart con 2+ matches y no hay floral fuerte
  if ((counts.frutal.top >= 2 || counts.frutal.heart >= 2) && counts.floral.heart < 2) {
    return 'frutal';
  }
  // Frutal tropical especifico (mango, coco, maracuya, pina)
  if (/(tropical|piña|pina|coco|maracuya|mango|frutas tropicales)/i.test(top + ' ' + heart) && total('frutal') >= 1) {
    if (counts.floral.heart < counts.frutal.top + counts.frutal.heart) {
      return 'frutal';
    }
  }

  // 4) CITRICO: 2+ citricos en top o description menciona "citrico/fresca cítrica"
  if (counts.citrico.top >= 2 && counts.floral.heart < 2 && counts.dulce.heart < 2) {
    return 'citrico';
  }
  if (/(citrico|cítrico|cítrica|citrica|cítricos)/i.test(description) && counts.citrico.top >= 1 && total('floral') < 2) {
    return 'citrico';
  }

  // 5) FRESCO: notas marinas/acuaticas/aromaticas/menta/verdes
  if (counts.fresco.top + counts.fresco.heart >= 2) {
    return 'fresco';
  }
  if (/(marina|acuatic|fresco|fresca|aromatica|aromatico)/i.test(description) && counts.fresco.top + counts.fresco.heart >= 1) {
    return 'fresco';
  }

  // 6) AMADERADO: por defecto si tiene maderas/oud/cuero dominantes en base
  if (counts.amaderado.base >= 2 || counts.amaderado.heart >= 2) {
    return 'amaderado';
  }

  // === FALLBACKS ===
  if (counts.floral.heart >= 1 && counts.floral.heart >= counts.amaderado.heart) return 'floral';
  if (counts.frutal.top >= 1) return 'frutal';
  if (counts.citrico.top >= 1) return 'citrico';
  if (counts.fresco.top >= 1) return 'fresco';
  if (counts.dulce.heart + counts.dulce.base >= 1) return 'dulce';
  return 'amaderado';
}

// === MAIN ===
const updates = [];

for (const p of products) {
  const productType = BRAND_TYPE[p.brand] || 'disenador';
  const aromaFamily = scoreFamily(p);
  updates.push({
    slug: p.slug,
    productType,
    aromaFamily,
    oldCategory: p.category,
  });
}

console.log(`\n📊 Categorizacion:`);
console.log(`   Total productos: ${products.length}`);

const byType = {};
const byAroma = {};
for (const u of updates) {
  byType[u.productType] = (byType[u.productType] || 0) + 1;
  byAroma[u.aromaFamily] = (byAroma[u.aromaFamily] || 0) + 1;
}
console.log(`\n   Por tipo:`);
Object.entries(byType).sort((a,b) => b[1]-a[1]).forEach(([t, c]) => console.log(`     ${t}: ${c}`));
console.log(`\n   Por aroma:`);
Object.entries(byAroma).sort((a,b) => b[1]-a[1]).forEach(([a, c]) => console.log(`     ${a}: ${c}`));

// === Aplicar a products.js ===
let content = readFileSync(PRODUCTS_PATH, 'utf8');
let applied = 0;

for (const u of updates) {
  // El script anterior ya agrego productType. Solo actualizamos productType y category.
  // Patron: productType: "X", category: "Y"  o  category: "Y" (si fuera primera ejecucion)
  const slugEsc = u.slug.replace(/-/g, '[-]');

  // Caso 1: ya tiene productType
  const re1 = new RegExp(`(slug:\\s*['"]${slugEsc}['"][^}]*?)productType:\\s*['"][^'"]*['"]\\s*,\\s*category:\\s*['"][^'"]*['"]`, 's');
  if (re1.test(content)) {
    content = content.replace(re1, `$1productType: "${u.productType}", category: "${u.aromaFamily}"`);
    applied++;
    continue;
  }
  // Caso 2: solo tiene category (primera ejecucion)
  const re2 = new RegExp(`(slug:\\s*['"]${slugEsc}['"][^}]*?)category:\\s*['"][^'"]*['"]`, 's');
  if (re2.test(content)) {
    content = content.replace(re2, `$1productType: "${u.productType}", category: "${u.aromaFamily}"`);
    applied++;
    continue;
  }
  console.log(`❌ No se encontro bloque para ${u.slug}`);
}

writeFileSync(PRODUCTS_PATH, content, 'utf8');
console.log(`\n✅ Aplicados ${applied}/${updates.length} cambios a products.js`);
