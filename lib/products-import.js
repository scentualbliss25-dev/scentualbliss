// Parsing y validación del CSV/XLSX de import masivo de productos.
//
// Diseño: funciones puras (sin Supabase ni I/O). Las server actions
// (_actions.js) las orquestan. Esto permite tests aislados a futuro y
// que el código sea fácil de razonar.

import Papa from 'papaparse';
import ExcelJS from 'exceljs';

// Valores permitidos para campos de enum
export const ALLOWED_PRODUCT_TYPES = ['nicho', 'disenador', 'arabe'];
export const ALLOWED_CATEGORIES = ['floral', 'frutal', 'fresco', 'citrico', 'dulce', 'amaderado'];
export const ALLOWED_GENDERS = ['Hombre', 'Mujer', 'Unisex'];

// Columnas que aceptamos. Las desconocidas se ignoran silenciosamente.
const COLUMNS = new Set([
  'name', 'slug', 'brand', 'product_type', 'category', 'type', 'gender',
  'base_price', 'original_price', 'stock', 'description',
  'notes_top', 'notes_heart', 'notes_base',
  'featured', 'bestseller', 'badge', 'badge_color',
  'longevity', 'sillage', 'season', 'occasion',
  'sizes', 'images',
]);

/**
 * Detecta CSV vs XLSX y devuelve array de objetos (1 por fila).
 * Lanza si el archivo es inválido.
 */
export async function parseImportFile(buffer, filename) {
  const ext = (filename || '').toLowerCase().split('.').pop();

  if (ext === 'xlsx' || ext === 'xls') {
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(buffer);
    const ws = wb.worksheets[0];
    if (!ws) throw new Error('El archivo Excel no tiene hojas');

    const rows = [];
    let headers = null;
    ws.eachRow({ includeEmpty: false }, (row, rowNumber) => {
      const values = row.values.slice(1); // .values[0] siempre es undefined en exceljs
      if (rowNumber === 1) {
        headers = values.map((v) => String(v ?? '').trim().toLowerCase());
        return;
      }
      const obj = {};
      for (let i = 0; i < headers.length; i++) {
        const key = headers[i];
        const cell = values[i];
        // exceljs a veces devuelve { text: '...', richText: [...] } para celdas con formato
        let v = cell;
        if (v && typeof v === 'object') {
          if ('text' in v) v = v.text;
          else if ('result' in v) v = v.result;
          else if ('richText' in v && Array.isArray(v.richText)) v = v.richText.map(r => r.text).join('');
        }
        if (key) obj[key] = v == null ? '' : String(v);
      }
      rows.push(obj);
    });
    return rows;
  }

  // Default → CSV
  const text = typeof buffer === 'string' ? buffer : new TextDecoder('utf-8').decode(buffer);
  const result = Papa.parse(text, {
    header: true,
    skipEmptyLines: 'greedy',
    transformHeader: (h) => h.trim().toLowerCase(),
  });
  if (result.errors?.length) {
    const first = result.errors[0];
    throw new Error(`CSV inválido en fila ${first.row + 2}: ${first.message}`);
  }
  return result.data || [];
}

/**
 * Normaliza booleano flexible: true/false/1/0/si/sí/no/yes/no/y/n/x/✓ → boolean
 */
export function normalizeBoolean(v) {
  if (v === true || v === false) return v;
  if (v == null) return false;
  const s = String(v).trim().toLowerCase();
  if (!s) return false;
  return ['true', '1', 'si', 'sí', 'yes', 'y', 'x', '✓', '✔', 'on'].includes(s);
}

/**
 * Parsea "100ml=250000|50ml=150000" o "100ml:250000;50ml:150000" → [{ml, price}].
 * Acepta tanto `|` como `;` como separador, y tanto `=` como `:` para ml:precio.
 * Filas inválidas se ignoran.
 */
export function parseSizes(v) {
  if (!v) return [];
  const s = String(v).trim();
  if (!s) return [];
  const pairs = s.split(/[|;]/).map(x => x.trim()).filter(Boolean);
  const sizes = [];
  for (const pair of pairs) {
    const m = pair.match(/^([^=:]+)\s*[=:]\s*(\d+(?:\.\d+)?)$/);
    if (!m) continue;
    const ml = m[1].trim();
    const price = Number(m[2]);
    if (!ml || !Number.isFinite(price) || price <= 0) continue;
    sizes.push({ ml, price });
  }
  return sizes;
}

/**
 * Parsea "url1|url2|url3" o "url1,url2" → array. Filtra vacíos.
 * Acepta http(s):// y rutas relativas (/img/...).
 */
export function parseImages(v) {
  if (!v) return [];
  return String(v)
    .split(/[|,\n]/)
    .map(u => u.trim())
    .filter(u => u && (u.startsWith('http://') || u.startsWith('https://') || u.startsWith('/')));
}

/** Slugify igual que el server action de productos */
export function slugify(s) {
  return String(s || '')
    .toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

/**
 * Valida y normaliza UNA fila del CSV.
 *
 * Retorna { ok: boolean, data?: object, sizes?: [], images?: [], errors: string[] }
 *
 * `data` tiene la shape lista para INSERT/UPDATE en Supabase.
 * `errors` siempre se devuelve (vacío si ok=true).
 */
export function validateRow(raw, { rowNumber, slugsInFile = new Set() } = {}) {
  const errors = [];
  // Filtrar a las columnas conocidas, normalizar trimming
  const row = {};
  for (const [k, v] of Object.entries(raw)) {
    const key = String(k || '').trim().toLowerCase();
    if (COLUMNS.has(key)) row[key] = typeof v === 'string' ? v.trim() : v;
  }

  // ─── name (requerido)
  const name = row.name;
  if (!name) errors.push('Falta `name`');

  // ─── slug (autogenera si vacío)
  let slug = row.slug || (name ? slugify(name) : '');
  if (slug && !/^[a-z0-9-]+$/.test(slug)) {
    errors.push(`Slug inválido "${slug}" — solo minúsculas, números y guiones`);
  }
  if (slug && slugsInFile.has(slug)) {
    errors.push(`Slug "${slug}" está duplicado en el archivo (fila anterior ya lo usa)`);
  }

  // ─── product_type / category / gender (validar contra allowed)
  const product_type = row.product_type || null;
  if (product_type && !ALLOWED_PRODUCT_TYPES.includes(product_type)) {
    errors.push(`product_type "${product_type}" inválido. Usa: ${ALLOWED_PRODUCT_TYPES.join(', ')}`);
  }
  const category = row.category || null;
  if (category && !ALLOWED_CATEGORIES.includes(category)) {
    errors.push(`category "${category}" inválido. Usa: ${ALLOWED_CATEGORIES.join(', ')}`);
  }
  const gender = row.gender || null;
  if (gender && !ALLOWED_GENDERS.includes(gender)) {
    errors.push(`gender "${gender}" inválido. Usa: ${ALLOWED_GENDERS.join(', ')}`);
  }

  // ─── números
  const base_price = parseOptionalNumber(row.base_price);
  if (row.base_price && base_price == null) errors.push(`base_price "${row.base_price}" no es número`);
  const original_price = parseOptionalNumber(row.original_price);
  if (row.original_price && original_price == null) errors.push(`original_price "${row.original_price}" no es número`);
  const stock = parseOptionalNumber(row.stock) ?? 0;

  // ─── sizes / images
  const sizes = parseSizes(row.sizes);
  const images = parseImages(row.images);

  // ─── occasion (CSV → array)
  const occasion = row.occasion
    ? String(row.occasion).split(',').map(s => s.trim()).filter(Boolean)
    : null;

  if (errors.length) {
    return { ok: false, errors, slug, name };
  }

  const data = {
    name,
    slug,
    brand: row.brand || null,
    product_type,
    category,
    type: row.type || null,
    gender,
    description: row.description || null,
    base_price,
    original_price,
    stock,
    notes_top: row.notes_top || null,
    notes_heart: row.notes_heart || null,
    notes_base: row.notes_base || null,
    featured: normalizeBoolean(row.featured),
    bestseller: normalizeBoolean(row.bestseller),
    badge: row.badge || null,
    badge_color: row.badge_color || null,
    longevity: row.longevity || null,
    sillage: row.sillage || null,
    season: row.season || null,
    occasion,
  };

  return { ok: true, errors: [], data, sizes, images, slug, name };
}

function parseOptionalNumber(v) {
  if (v == null || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

/**
 * Genera el contenido del CSV plantilla con headers + 2 filas de ejemplo.
 */
export function buildTemplateCsv() {
  const headers = [
    'name', 'slug', 'brand', 'product_type', 'category', 'type', 'gender',
    'base_price', 'stock', 'description',
    'notes_top', 'notes_heart', 'notes_base',
    'featured', 'bestseller',
    'longevity', 'sillage', 'season', 'occasion',
    'sizes', 'images',
  ];
  const examples = [
    {
      name: 'Lattafa Khamrah Qahwa EDP',
      slug: '',
      brand: 'Lattafa',
      product_type: 'arabe',
      category: 'dulce',
      type: 'EDP',
      gender: 'Unisex',
      base_price: '180000',
      stock: '12',
      description: 'Inspirado en el café arabesco con notas gourmand y especiadas.',
      notes_top: 'Cardamomo, Café, Canela',
      notes_heart: 'Praliné, Caramelo, Vainilla',
      notes_base: 'Almizcle, Ámbar, Tonka',
      featured: 'true',
      bestseller: 'false',
      longevity: '8-10 horas',
      sillage: 'Fuerte',
      season: 'Otoño / Invierno',
      occasion: 'Noche, Gala',
      sizes: '100ml=180000|50ml=120000',
      images: 'https://miweb.com/khamrah-qahwa-1.webp|https://miweb.com/khamrah-qahwa-2.webp',
    },
    {
      name: 'Tom Ford Lost Cherry',
      slug: 'tom-ford-lost-cherry',
      brand: 'Tom Ford',
      product_type: 'nicho',
      category: 'dulce',
      type: 'EDP',
      gender: 'Unisex',
      base_price: '950000',
      stock: '5',
      description: 'Cereza negra licorosa sobre fondo de almendra y madera.',
      notes_top: 'Cereza Negra, Almendra Amarga, Licor de Cereza',
      notes_heart: 'Rosa Turca, Jazmín Sambac',
      notes_base: 'Vainilla, Sándalo, Cedro',
      featured: 'true',
      bestseller: 'true',
      longevity: '10-12 horas',
      sillage: 'Muy fuerte',
      season: 'Todas',
      occasion: 'Noche, Cita, Gala',
      sizes: '100ml=950000|50ml=620000|30ml=420000',
      images: '/img/tom-ford-lost-cherry.webp',
    },
  ];

  return Papa.unparse([headers, ...examples.map(ex => headers.map(h => ex[h] ?? ''))], {
    quotes: true,
  });
}
