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
  'name', 'slug', 'brand', 'product_type', 'category', 'categories', 'type', 'gender',
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

  // ─── product_type / categories / gender (validar contra allowed)
  const product_type = row.product_type || null;
  if (product_type && !ALLOWED_PRODUCT_TYPES.includes(product_type)) {
    errors.push(`product_type "${product_type}" inválido. Usa: ${ALLOWED_PRODUCT_TYPES.join(', ')}`);
  }

  // Familias olfativas: acepta tanto columna `categories` (lista separada
  // por | o ,) como `category` (singular legacy). Máximo 5 por producto.
  const catsRaw = row.categories ?? row.category ?? '';
  const categories = catsRaw
    ? [...new Set(
        String(catsRaw)
          .split(/[|,;]/)
          .map(s => s.trim())
          .filter(Boolean)
      )]
    : [];
  const invalidCats = categories.filter(c => !ALLOWED_CATEGORIES.includes(c));
  if (invalidCats.length) {
    errors.push(`Familia(s) inválida(s) "${invalidCats.join(', ')}". Usa: ${ALLOWED_CATEGORIES.join(', ')}`);
  }
  if (categories.length > 5) {
    errors.push(`Máximo 5 familias olfativas por producto (recibimos ${categories.length})`);
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
    category: categories[0] || null,  // primera = principal (compat)
    categories,                        // todas las familias (text[] en DB)
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
// ─── Plantilla XLSX para import masivo ──────────────────────────────────
//
// Genera un workbook con 2 hojas:
//   1. "Plantilla"   — fila de headers + 2 ejemplos + 3 filas vacías para
//                       llenar. Headers congelados. Dropdowns de validación
//                       en columnas enum. Comentarios explicativos.
//   2. "Instrucciones" — guía completa: significado de cada columna,
//                        formatos especiales (sizes, images, occasion),
//                        valores permitidos para enums.
//
// Retorna un Buffer listo para servir desde el endpoint.

const TEMPLATE_COLUMNS = [
  { key: 'name',           header: 'name',           width: 32, required: true,  note: 'OBLIGATORIO. Nombre completo del producto. Ej: "Dior Sauvage EDP"' },
  { key: 'slug',           header: 'slug',           width: 26,                  note: 'URL del producto. Si lo dejas vacío se autogenera desde el name.\nSi el slug ya existe en la base de datos, ACTUALIZA ese producto en lugar de crear uno nuevo.' },
  { key: 'brand',          header: 'brand',          width: 18,                  note: 'Marca. Ej: Dior, Chanel, Lattafa.' },
  { key: 'product_type',   header: 'product_type',   width: 14, dropdown: ALLOWED_PRODUCT_TYPES, note: 'Tipo: nicho · disenador · arabe' },
  { key: 'categories',     header: 'categories',     width: 30,                                  note: 'Familias olfativas — una o varias (máx 5). Separa con | (barra vertical).\nValores permitidos: floral, frutal, fresco, citrico, dulce, amaderado.\nEj: "floral|dulce" o "amaderado|dulce|amaderado".\nLa primera será la familia principal.' },
  { key: 'type',           header: 'type',           width: 12,                  note: 'Concentración. Ej: EDP, EDT, Extrait, Parfum.' },
  { key: 'gender',         header: 'gender',         width: 12, dropdown: ALLOWED_GENDERS,      note: 'Género: Hombre · Mujer · Unisex' },
  { key: 'base_price',     header: 'base_price',     width: 14, numFmt: '"$"#,##0', note: 'Precio base en COP. Solo número, sin puntos ni símbolos.' },
  { key: 'original_price', header: 'original_price', width: 16, numFmt: '"$"#,##0', note: 'Precio antes de descuento (opcional). Si lo llenas se muestra tachado en la PDP.' },
  { key: 'stock',          header: 'stock',          width: 10, numFmt: '0',     note: 'Unidades disponibles. Solo número entero.' },
  { key: 'description',    header: 'description',    width: 45,                  note: 'Texto largo para la PDP. Puede tener varias líneas.' },
  { key: 'notes_top',      header: 'notes_top',      width: 30,                  note: 'Notas de salida, separadas por coma. Ej: "Bergamota, Limón, Pimienta"' },
  { key: 'notes_heart',    header: 'notes_heart',    width: 30,                  note: 'Notas de corazón, separadas por coma.' },
  { key: 'notes_base',     header: 'notes_base',     width: 30,                  note: 'Notas de fondo, separadas por coma.' },
  { key: 'featured',       header: 'featured',       width: 10, dropdown: ['true', 'false'], note: 'true / false — aparece en la sección "Destacados" de la home.' },
  { key: 'bestseller',     header: 'bestseller',     width: 10, dropdown: ['true', 'false'], note: 'true / false — aparece en la sección "Más vendidos" de la home.' },
  { key: 'longevity',      header: 'longevity',      width: 16,                  note: 'Texto libre. Ej: "8-10 horas".' },
  { key: 'sillage',        header: 'sillage',        width: 14,                  note: 'Texto libre. Ej: "Moderado", "Fuerte".' },
  { key: 'season',         header: 'season',         width: 22,                  note: 'Texto libre. Ej: "Otoño / Invierno", "Todas".' },
  { key: 'occasion',       header: 'occasion',       width: 24,                  note: 'Ocasiones separadas por coma. Ej: "Noche, Gala, Cita"' },
  { key: 'sizes',          header: 'sizes',          width: 36,                  note: 'Tamaños y precios. Formato: ml=precio separados por |\nEj: 100ml=250000|50ml=150000|30ml=95000' },
  { key: 'images',         header: 'images',         width: 50,                  note: 'URLs de las imágenes separadas por |\nDeben ser URLs públicas (https://...) o rutas /img/...\nLa primera es la principal.' },
];

const EXAMPLE_ROWS = [
  {
    name: 'Lattafa Khamrah Qahwa EDP',
    slug: '',
    brand: 'Lattafa',
    product_type: 'arabe',
    categories: 'dulce|amaderado',
    type: 'EDP',
    gender: 'Unisex',
    base_price: 180000,
    original_price: null,
    stock: 12,
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
    categories: 'dulce|frutal',
    type: 'EDP',
    gender: 'Unisex',
    base_price: 950000,
    original_price: 1100000,
    stock: 5,
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

export async function buildTemplateXlsx() {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'ScentualBliss Admin';
  wb.created = new Date();
  wb.title = 'Plantilla import productos';

  // ── Hoja 1: Plantilla ──────────────────────────────────────────────
  const ws = wb.addWorksheet('Plantilla', {
    views: [{ state: 'frozen', ySplit: 1 }],
  });

  ws.columns = TEMPLATE_COLUMNS.map(c => ({
    key: c.key,
    header: c.header,
    width: c.width,
  }));

  // Header styling: oscuro marca + dorado para texto
  const headerRow = ws.getRow(1);
  headerRow.height = 28;
  headerRow.font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FFC9A96E' } };
  headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F1A14' } };
  headerRow.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
  headerRow.eachCell((cell, colNumber) => {
    const col = TEMPLATE_COLUMNS[colNumber - 1];
    if (!col) return;
    // Asterisco en headers obligatorios
    if (col.required) cell.value = `${col.header} *`;
    // Comentario explicativo (visible al hover)
    cell.note = {
      texts: [{ text: col.note }],
      margins: { insetmode: 'custom', inset: [0.1, 0.1, 0.1, 0.1] },
    };
  });

  // Filas de ejemplo (resaltadas suavemente para distinguirlas)
  for (const ex of EXAMPLE_ROWS) {
    const row = ws.addRow(ex);
    row.height = 22;
    row.alignment = { vertical: 'middle', wrapText: false };
    row.eachCell((cell) => {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFAF6EE' } };
      cell.font = { name: 'Calibri', size: 10, color: { argb: 'FF1F1A14' } };
    });
  }

  // 3 filas vacías para que el usuario empiece a llenar
  for (let i = 0; i < 3; i++) {
    const row = ws.addRow({});
    row.height = 22;
  }

  // Aplicar formato de número en columnas de precio/stock
  for (let i = 0; i < TEMPLATE_COLUMNS.length; i++) {
    const col = TEMPLATE_COLUMNS[i];
    if (col.numFmt) {
      ws.getColumn(i + 1).numFmt = col.numFmt;
    }
  }

  // Validación de datos (dropdowns) para columnas con `dropdown`
  // Aplicar a filas 2-1000 (rango generoso para que el admin pueda añadir muchas)
  const dataValidationRows = 1000;
  for (let colIdx = 0; colIdx < TEMPLATE_COLUMNS.length; colIdx++) {
    const col = TEMPLATE_COLUMNS[colIdx];
    if (!col.dropdown) continue;
    const letter = colLetter(colIdx + 1);
    const formulaList = `"${col.dropdown.join(',')}"`;
    for (let r = 2; r <= dataValidationRows + 1; r++) {
      ws.getCell(`${letter}${r}`).dataValidation = {
        type: 'list',
        allowBlank: true,
        formulae: [formulaList],
        showErrorMessage: true,
        errorStyle: 'warning',
        errorTitle: 'Valor no permitido',
        error: `Usa uno de: ${col.dropdown.join(', ')}`,
      };
    }
  }

  // Auto-filtro sobre todo el rango
  ws.autoFilter = {
    from: { row: 1, column: 1 },
    to: { row: 1, column: TEMPLATE_COLUMNS.length },
  };

  // ── Hoja 2: Instrucciones ──────────────────────────────────────────
  const wsI = wb.addWorksheet('Instrucciones');
  wsI.columns = [{ width: 26 }, { width: 90 }];

  // Título grande
  wsI.mergeCells('A1:B1');
  const t = wsI.getCell('A1');
  t.value = 'Guía para importar productos';
  t.font = { name: 'Calibri', size: 16, bold: true, color: { argb: 'FFC9A96E' } };
  t.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F1A14' } };
  t.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
  wsI.getRow(1).height = 36;

  // Secciones de la guía
  const sections = [
    { title: 'Cómo funciona el import', body: [
      '1. Llena las filas vacías de la hoja "Plantilla" con tus productos.',
      '2. Guarda el archivo (Ctrl+S) — puedes mantenerlo en .xlsx o exportarlo a .csv.',
      '3. Sube el archivo en /admin/products/import.',
      '4. Revisa el preview con las marcas verde (crear), azul (actualizar) o rojo (error).',
      '5. Confirma. Los cambios se reflejan al instante en la tienda.',
    ]},
    { title: 'Crear vs Actualizar', body: [
      'El sistema decide por el campo `slug`:',
      '• Si dejas slug vacío → se autogenera desde el name y crea un producto NUEVO.',
      '• Si el slug ya existe en la base de datos → ACTUALIZA ese producto (reemplaza sizes/images también).',
      '• Si el slug es nuevo → CREA un producto nuevo con ese slug.',
    ]},
    { title: 'Campos obligatorios', body: [
      '• name — el único realmente requerido. Todos los demás son opcionales.',
      'Pero te recomendamos llenar mínimo: brand, product_type, category, base_price, sizes e images.',
    ]},
    { title: 'Valores permitidos para enums', body: [
      `• product_type: ${ALLOWED_PRODUCT_TYPES.join(', ')}`,
      `• category:     ${ALLOWED_CATEGORIES.join(', ')}`,
      `• gender:       ${ALLOWED_GENDERS.join(', ')}`,
      '• featured / bestseller: true, false, 1, 0, si, sí, yes (cualquier "verdadero" se acepta)',
    ]},
    { title: 'Formato de "sizes" (tamaños y precios)', body: [
      'Estructura: ml=precio separados por |',
      'Ejemplo: 100ml=250000|50ml=150000|30ml=95000',
      'Cada tamaño tiene un precio independiente. El precio base es solo fallback.',
    ]},
    { title: 'Formato de "images" (galería)', body: [
      'URLs separadas por |',
      'Pueden ser URLs externas (https://…) o rutas locales (/img/...)',
      'La primera URL es la imagen principal.',
      'Si necesitas subir imágenes desde tu computador, hazlo desde el form individual del producto (no es posible vía CSV).',
    ]},
    { title: 'Formato de "occasion"', body: [
      'Texto separado por comas. Ejemplo: "Noche, Gala, Cita"',
    ]},
    { title: 'Límites', body: [
      '• Máximo 500 filas por archivo.',
      '• Tamaño máximo: 5 MB.',
      '• Si una fila tiene errores se omite, las demás continúan.',
    ]},
  ];

  let r = 3;
  for (const section of sections) {
    // Título de sección
    wsI.mergeCells(`A${r}:B${r}`);
    const titleCell = wsI.getCell(`A${r}`);
    titleCell.value = section.title;
    titleCell.font = { name: 'Calibri', size: 12, bold: true, color: { argb: 'FF1F1A14' } };
    titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFAF6EE' } };
    titleCell.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
    wsI.getRow(r).height = 22;
    r++;
    // Líneas del cuerpo
    for (const line of section.body) {
      const cell = wsI.getCell(`B${r}`);
      cell.value = line;
      cell.font = { name: 'Calibri', size: 10, color: { argb: 'FF1F1A14' } };
      cell.alignment = { vertical: 'top', horizontal: 'left', wrapText: true };
      wsI.getRow(r).height = 18;
      r++;
    }
    r++; // espacio entre secciones
  }

  // Genera buffer
  const arrayBuffer = await wb.xlsx.writeBuffer();
  return Buffer.from(arrayBuffer);
}

// Convierte índice de columna (1-based) a letra de Excel: 1=A, 27=AA, etc.
function colLetter(n) {
  let s = '';
  while (n > 0) {
    const m = (n - 1) % 26;
    s = String.fromCharCode(65 + m) + s;
    n = Math.floor((n - 1) / 26);
  }
  return s;
}
