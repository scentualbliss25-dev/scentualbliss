// === Constantes y helpers SÍNCRONOS del catálogo ===
//
// Este archivo es ISOMORFO: lo pueden importar tanto Server Components
// como Client Components sin arrastrar código de Supabase al bundle del
// browser. Aquí solo van valores puros y funciones que no tocan la DB.
//
// Si necesitas datos de productos (async), importa de lib/products.js:
//   import { getAllProducts } from '@/lib/products';

// === Helper síncrono: resolver imagen del producto
// - ScentualBliss originals: usan images[0] (paths personalizados)
// - Productos nuevos: derivan de slug → /img/{slug}.webp
// - Fallback: /img/placeholder-perfume.webp
export function getImagePath(product, fallback = '/img/placeholder-perfume.webp') {
  if (!product) return fallback;
  const first = product.images?.[0];
  if (first && !first.includes('placeholder')) return first;
  return product.slug ? `/img/${product.slug}.webp` : fallback;
}

// === Tipos de perfume (3 categorías principales del menú)
export const productTypes = [
  { id: 'nicho',     slug: 'nicho',     name: 'Perfumes de Nicho',      description: 'Casas exclusivas y artesanales',  color: '#9B59B6', image: '/img/tom-ford-oud-wood.webp' },
  { id: 'disenador', slug: 'disenador', name: 'Perfumes de Diseñador',  description: 'Casas de moda icónicas',          color: '#C9A96E', image: '/img/chanel-coco-mademoiselle.webp' },
  { id: 'arabe',     slug: 'arabe',     name: 'Perfumes Árabes',        description: 'Tradición olfativa de Oriente',   color: '#E8687A', image: '/img/lattafa-khamrah.webp' },
];

// === Familias olfativas (6 categorías para filtrar por aroma)
export const collections = [
  { id: 'floral',     slug: 'florales',   name: 'Florales',   description: 'Feminidad y elegancia',       color: '#E84A6F', image: '/img/chanel-coco-mademoiselle.webp' },
  { id: 'frutal',     slug: 'frutales',   name: 'Frutales',   description: 'Frescura jugosa y vibrante',  color: '#B12842', image: '/img/creed-aventus.webp' },
  { id: 'fresco',     slug: 'frescos',    name: 'Frescos',    description: 'Vitalidad y aire libre',      color: '#2E8B7A', image: '/img/dior-sauvage-edt.webp' },
  { id: 'citrico',    slug: 'citricos',   name: 'Cítricos',   description: 'Energía solar y luminosa',    color: '#F2A015', image: '/img/xerjoff-erba-pura.webp' },
  { id: 'dulce',      slug: 'dulces',     name: 'Dulces',     description: 'Calidez gourmand adictiva',   color: '#8B5A3C', image: '/img/lattafa-khamrah.webp' },
  { id: 'amaderado',  slug: 'amaderados', name: 'Amaderados', description: 'Profundidad y sofisticación', color: '#3D2817', image: '/img/tom-ford-oud-wood.webp' },
];

// === Testimonios hardcoded (fallback si no hay reseñas reales en Supabase)
export const testimonials = [
  { id: 1, name: 'Valentina Reyes',   location: 'Ciudad de México', rating: 5, text: 'Khamrah me cambió la vida. Recibo cumplidos donde quiera que voy. Vale cada centavo.',           avatar: 'https://i.pravatar.cc/80?img=47', product: 'Lattafa Khamrah' },
  { id: 2, name: 'Carlos Mendoza',    location: 'Bogotá',           rating: 5, text: 'Sauvage Elixir es lo más cercano a la perfección. La duración es increíble, 12 horas y sigue fuerte.', avatar: 'https://i.pravatar.cc/80?img=11', product: 'Dior Sauvage Elixir' },
  { id: 3, name: 'Isabella Torres',   location: 'Buenos Aires',     rating: 5, text: 'Coco Mademoiselle huele exactamente como lo describen. El empaque es lujoso y llegó antes de lo esperado.', avatar: 'https://i.pravatar.cc/80?img=25', product: 'Chanel Coco Mademoiselle' },
  { id: 4, name: 'Miguel Ángel Vega', location: 'Lima',             rating: 5, text: 'Primera compra y ya soy cliente fiel. La calidad de Aventus supera a fragancias del doble de precio.', avatar: 'https://i.pravatar.cc/80?img=33', product: 'Creed Aventus' },
];

// === Labels de familia olfativa (id → nombre legible)
export const categoryLabels = {
  floral: 'Floral',
  frutal: 'Frutal',
  fresco: 'Fresco',
  citrico: 'Cítrico',
  dulce: 'Dulce',
  amaderado: 'Amaderado',
};

// === Labels de tipo de producto
export const productTypeLabels = {
  nicho: 'Nicho',
  disenador: 'Diseñador',
  arabe: 'Árabe',
};

// === Momento del día
export const momentoOptions = [
  { id: 'dia',   name: 'Perfumes de Día',   description: 'Frescos y versátiles para llevar a diario',          icon: '☀️' },
  { id: 'noche', name: 'Perfumes de Noche', description: 'Intensos y seductores para cada ocasión especial', icon: '🌙' },
  { id: 'ambos', name: 'Día y Noche',       description: 'Versátiles para cualquier momento',                  icon: '✨' },
];

// === Clima
export const climaOptions = [
  { id: 'calido',   name: 'Clima Cálido',   description: 'Frescos y ligeros para el verano',         icon: '🌞' },
  { id: 'templado', name: 'Clima Templado', description: 'Equilibrados para primavera y otoño',      icon: '🌤️' },
  { id: 'frio',     name: 'Clima Frío',     description: 'Cálidos y envolventes para el invierno',   icon: '❄️' },
];

// === Deriva el momento del día desde occasion (sin modificar productos)
export function deriveMomento(product) {
  if (product.momento) return product.momento;
  const occ = (product.occasion || []).join(' ').toLowerCase();
  const hasNight = /noche|nocturna|gala|formal|cita/.test(occ);
  const hasDay   = /día|trabajo|casual|universidad|oficina|deporte|playa|gimnasio/.test(occ);
  if (hasNight && !hasDay) return 'noche';
  if (hasDay && !hasNight) return 'dia';
  return 'ambos';
}

// === Deriva el clima desde season
export function deriveClima(product) {
  if (product.clima) return product.clima;
  const s = product.season || '';
  if (/Verano|Primavera/.test(s)) return 'calido';
  if (/Otoño|Invierno/.test(s))   return 'frio';
  return 'templado';
}
