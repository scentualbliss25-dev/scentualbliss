import { products, productTypes, collections } from '@/lib/products';
import { SITE_URL } from '@/lib/site';

export default function sitemap() {
  const now = new Date();
  const staticPages = [
    { url: SITE_URL, lastModified: now, changeFrequency: 'weekly', priority: 1.0 },
    { url: `${SITE_URL}/tienda`, lastModified: now, changeFrequency: 'daily', priority: 0.9 },
    { url: `${SITE_URL}/contacto`, lastModified: now, changeFrequency: 'monthly', priority: 0.4 },
    { url: `${SITE_URL}/faq`, lastModified: now, changeFrequency: 'monthly', priority: 0.4 },
  ];

  // Páginas por tipo (nicho, disenador, arabe)
  const typePages = productTypes.map(t => ({
    url: `${SITE_URL}/tienda?type=${t.id}`,
    lastModified: now,
    changeFrequency: 'weekly',
    priority: 0.7,
  }));

  // Páginas por familia olfativa
  const collectionPages = collections.map(c => ({
    url: `${SITE_URL}/tienda?cat=${c.id}`,
    lastModified: now,
    changeFrequency: 'weekly',
    priority: 0.6,
  }));

  // Páginas por marca (todas las marcas únicas del catálogo)
  const uniqueBrands = [...new Set(products.map(p => p.brand))];
  const brandPages = uniqueBrands.map(b => ({
    url: `${SITE_URL}/tienda?brand=${encodeURIComponent(b)}`,
    lastModified: now,
    changeFrequency: 'weekly',
    priority: 0.65,
  }));

  const productPages = products.map(p => ({
    url: `${SITE_URL}/perfume/${p.slug}`,
    lastModified: now,
    changeFrequency: 'weekly',
    priority: p.featured || p.bestseller ? 0.85 : 0.75,
  }));

  return [...staticPages, ...typePages, ...collectionPages, ...brandPages, ...productPages];
}
