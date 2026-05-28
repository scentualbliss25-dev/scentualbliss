import { getAllProducts, getAllBrands, productTypes, collections, momentoOptions, climaOptions } from '@/lib/products';
import { SITE_URL } from '@/lib/site';
import fs from 'node:fs';
import path from 'node:path';

const CONC_IDS = ['EDP', 'EDT', 'Extrait', 'Parfum', 'Elixir'];
const GENDER_IDS = ['Masculino', 'Femenino', 'Unisex'];

export default async function sitemap() {
  const now = new Date();
  // Catálogo y marcas desde Supabase (cacheado).
  const [products, allBrands] = await Promise.all([
    getAllProducts(),
    getAllBrands(),
  ]);

  const staticPages = [
    { url: SITE_URL,                             lastModified: now, changeFrequency: 'weekly',  priority: 1.0 },
    { url: `${SITE_URL}/tienda`,                 lastModified: now, changeFrequency: 'daily',   priority: 0.9 },
    { url: `${SITE_URL}/contacto`,               lastModified: now, changeFrequency: 'monthly', priority: 0.4 },
    { url: `${SITE_URL}/faq`,                    lastModified: now, changeFrequency: 'monthly', priority: 0.4 },
    { url: `${SITE_URL}/devoluciones`,           lastModified: now, changeFrequency: 'monthly', priority: 0.3 },
    { url: `${SITE_URL}/terminos`,               lastModified: now, changeFrequency: 'monthly', priority: 0.3 },
    { url: `${SITE_URL}/privacidad`,             lastModified: now, changeFrequency: 'monthly', priority: 0.3 },
  ];

  // Por tipo (nicho, diseñador, árabe)
  const typePages = productTypes.map(t => ({
    url: `${SITE_URL}/tienda?type=${t.id}`,
    lastModified: now, changeFrequency: 'weekly', priority: 0.75,
  }));

  // Por familia olfativa
  const collectionPages = collections.map(c => ({
    url: `${SITE_URL}/tienda?cat=${c.id}`,
    lastModified: now, changeFrequency: 'weekly', priority: 0.65,
  }));

  // Por marca
  const brandPages = allBrands.map(b => ({
    url: `${SITE_URL}/tienda?brand=${encodeURIComponent(b)}`,
    lastModified: now, changeFrequency: 'weekly', priority: 0.7,
  }));

  // Por género
  const genderPages = GENDER_IDS.map(g => ({
    url: `${SITE_URL}/tienda?gender=${encodeURIComponent(g)}`,
    lastModified: now, changeFrequency: 'weekly', priority: 0.6,
  }));

  // Por concentración
  const concPages = CONC_IDS.map(c => ({
    url: `${SITE_URL}/tienda?conc=${c}`,
    lastModified: now, changeFrequency: 'weekly', priority: 0.55,
  }));

  // Por momento del día
  const momentoPages = momentoOptions.map(m => ({
    url: `${SITE_URL}/tienda?momento=${m.id}`,
    lastModified: now, changeFrequency: 'weekly', priority: 0.55,
  }));

  // Por clima
  const climaPages = climaOptions.map(c => ({
    url: `${SITE_URL}/tienda?clima=${c.id}`,
    lastModified: now, changeFrequency: 'weekly', priority: 0.55,
  }));

  // Páginas de producto individuales con imágenes (Google Images las indexa).
  // Resolvemos hasta 4 imágenes reales del filesystem por producto.
  const productPages = products.map(p => {
    const images = [];
    // Primero, las del campo images si no son placeholder
    if (p.images?.[0] && !p.images[0].includes('placeholder')) {
      images.push(...p.images.slice(0, 4));
    } else {
      // Si no, escanear filesystem por {slug}.webp, {slug}-2.webp, etc.
      for (let i = 1; i <= 4; i++) {
        const file = i === 1 ? `${p.slug}.webp` : `${p.slug}-${i}.webp`;
        const fsPath = path.join(process.cwd(), 'public', 'img', file);
        if (fs.existsSync(fsPath)) images.push(`/img/${file}`);
      }
    }

    const absoluteImages = images.map(img =>
      img.startsWith('http') ? img : `${SITE_URL}${img}`
    );

    return {
      url: `${SITE_URL}/perfume/${p.slug}`,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: p.featured || p.bestseller ? 0.9 : 0.8,
      images: absoluteImages.length ? absoluteImages : undefined,
    };
  });

  return [
    ...staticPages,
    ...typePages,
    ...collectionPages,
    ...brandPages,
    ...genderPages,
    ...concPages,
    ...momentoPages,
    ...climaPages,
    ...productPages,
  ];
}
