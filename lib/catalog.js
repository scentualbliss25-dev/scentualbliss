import { supabaseAdmin } from '@/lib/supabase';

// Compartido entre /admin/catalog (armar y descargar PDF) y /catalogo
// (enlace público en vivo para compartir con clientes).
export async function fetchCatalogProducts() {
  if (!supabaseAdmin) return { rows: [], error: 'Supabase no configurado' };

  const { data, error } = await supabaseAdmin
    .from('products')
    .select(`
      id, slug, name, brand, product_type, type, gender,
      base_price, stock,
      product_sizes ( ml, price, order_index ),
      product_images ( url, order_index )
    `)
    .order('brand', { ascending: true })
    .order('name', { ascending: true })
    .limit(1000);

  if (error) return { rows: [], error: error.message };

  const rows = (data || []).map((p) => {
    // Tamaños vendibles (precio > 0), ordenados de menor a mayor precio.
    const sizes = (p.product_sizes || [])
      .filter((s) => Number(s.price) > 0)
      .sort((a, b) => Number(a.price) - Number(b.price))
      .map((s) => ({ ml: s.ml, price: Number(s.price) }));

    // Fallback: sin tamaños con precio pero con base_price → una sola línea.
    const displaySizes = sizes.length
      ? sizes
      : (Number(p.base_price) > 0 ? [{ ml: '', price: Number(p.base_price) }] : []);

    const images = (p.product_images || [])
      .slice()
      .sort((a, b) => (a.order_index ?? 99) - (b.order_index ?? 99));
    const thumb = images[0]?.url || (p.slug ? `/img/${p.slug}.webp` : '/img/placeholder-perfume.webp');

    return {
      id: p.id,
      slug: p.slug,
      name: p.name,
      brand: p.brand || '',
      productType: p.product_type || '',
      conc: p.type || '',
      gender: p.gender || '',
      thumb,
      displaySizes,
      fromPrice: displaySizes[0]?.price || 0,
    };
  });

  return { rows, error: null };
}

// Aplica los mismos filtros que la UI del admin, pero a partir de
// query params planos (para el enlace público /catalogo?...).
export function applyCatalogFilters(rows, params) {
  const type = params.type || '';
  const gender = params.gender || '';
  const min = params.min !== undefined && params.min !== '' ? Number(params.min) : null;
  const max = params.max !== undefined && params.max !== '' ? Number(params.max) : null;
  const brands = params.brands ? params.brands.split(',').map((b) => b.trim()).filter(Boolean) : [];
  const includeNoPrice = params.noPrice === '1';
  const sort = params.sort || 'brand';

  let list = rows.filter((p) => {
    if (type && p.productType !== type) return false;
    if (gender && p.gender !== gender) return false;
    if (brands.length > 0 && !brands.includes(p.brand)) return false;
    if (p.fromPrice <= 0) return includeNoPrice;
    if (min != null && Number.isFinite(min) && p.fromPrice < min) return false;
    if (max != null && Number.isFinite(max) && p.fromPrice > max) return false;
    return true;
  });

  list = list.slice().sort((a, b) => {
    if (sort === 'price-asc') return (a.fromPrice || Infinity) - (b.fromPrice || Infinity);
    if (sort === 'price-desc') return (b.fromPrice || 0) - (a.fromPrice || 0);
    if (sort === 'name') return a.name.localeCompare(b.name);
    return (a.brand || '').localeCompare(b.brand || '') || a.name.localeCompare(b.name);
  });

  return { list, sort };
}

// Resume los filtros activos en texto legible (para la portada del PDF).
export function buildFilterSummary({ type, gender, min, max, brands }) {
  const TYPE_LABELS = { arabe: 'Árabes', disenador: 'Diseñador', nicho: 'Nicho' };
  const summary = [];
  if (type) summary.push(`Perfumes ${TYPE_LABELS[type] || type}`);
  if (gender) summary.push(gender);
  if (brands?.length) summary.push(brands.join(' · '));
  if (min || max) {
    const cop = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 });
    const minTxt = min ? cop.format(Number(min)) : '';
    const maxTxt = max ? cop.format(Number(max)) : '';
    summary.push(minTxt && maxTxt ? `${minTxt} – ${maxTxt}` : minTxt ? `Desde ${minTxt}` : `Hasta ${maxTxt}`);
  }
  return summary;
}
