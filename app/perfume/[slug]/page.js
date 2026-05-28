import { getProductBySlug, getBestsellers, getAllProducts, categoryLabels, getImagePath } from '@/lib/products';
import ProductPageClient from '@/components/pages/ProductPageClient';
import ProductSeoContent, { ProductFAQSchema } from '@/components/seo/ProductSeoContent';
import { notFound } from 'next/navigation';
import fs from 'node:fs';
import path from 'node:path';
import { SITE_URL } from '@/lib/site';
const MAX_PRODUCT_IMAGES = 4;

// Server-only: escanea public/img/ para resolver imagenes reales del producto
function resolveProductImages(product) {
  const first = product.images?.[0];
  // Si products.js tiene imagenes reales (no placeholder), usar esas
  if (first && !first.includes('placeholder')) return product.images;

  // Sino, escanear filesystem por {slug}.webp, {slug}-2.webp, etc.
  const found = [];
  for (let i = 1; i <= MAX_PRODUCT_IMAGES; i++) {
    const file = i === 1 ? `${product.slug}.webp` : `${product.slug}-${i}.webp`;
    const fsPath = path.join(process.cwd(), 'public', 'img', file);
    if (fs.existsSync(fsPath)) found.push(`/img/${file}`);
  }
  return found.length ? found : ['/img/placeholder-perfume.webp'];
}

// Solo pre-generamos bestsellers para mantener el build dentro de los límites
// de CloudLinux/Hostinger. El resto usa ISR (Incremental Static Regeneration).
export async function generateStaticParams() {
  const bestsellers = await getBestsellers(50);
  return bestsellers.map(p => ({ slug: p.slug }));
}

// Permitir generación on-demand de páginas no pre-generadas
export const dynamicParams = true;
// Re-generar páginas cada hora
export const revalidate = 3600;

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) return {};

  const categoryLabel = categoryLabels[product.category] || '';
  const typeLabel = product.type ? `${product.type} ` : '';
  const url = `${SITE_URL}/perfume/${product.slug}`;
  const image = getImagePath(product);

  // Title programático: "Comprar X EDP de Brand | Perfume Hombre Oriental | ScentualBliss"
  const title = `Comprar ${product.name} ${typeLabel}de ${product.brand} | Perfume ${product.gender} ${categoryLabel} | ScentualBliss`;

  // Meta description: descripción + notas + duración + CTA (max ~160 chars)
  const notesShort = `${product.notes.top}, ${product.notes.heart}, ${product.notes.base}`;
  const description = `${product.description.substring(0, 100).trim()}... Notas: ${notesShort.substring(0, 60)}. Duración ${product.longevity}. Envío gratis a Colombia.`.substring(0, 160);

  // Keywords array para SEO
  const keywords = [
    product.name,
    `${product.name} ${product.brand}`,
    `${product.brand} ${product.name}`,
    `comprar ${product.name}`,
    `${product.name} precio`,
    `${product.name} ${product.type}`,
    `perfume ${product.gender.toLowerCase()}`,
    `perfume ${categoryLabel.toLowerCase()}`,
    product.brand,
    `perfumes ${product.brand}`,
    ...(product.occasion || []).map(o => `perfume para ${o.toLowerCase()}`),
    'perfumes Colombia',
    'fragancias de lujo',
  ];

  return {
    title,
    description,
    keywords: keywords.join(', '),
    alternates: {
      canonical: url,
    },
    openGraph: {
      title: `${product.name} ${product.type || ''} | ${product.brand}`,
      description: product.description,
      url,
      type: 'website',
      siteName: 'ScentualBliss',
      images: [{
        url: image,
        width: 800,
        height: 1000,
        alt: `${product.name} de ${product.brand} - Perfume ${product.gender}`,
      }],
      locale: 'es_CO',
    },
    twitter: {
      card: 'summary_large_image',
      title: `${product.name} | ${product.brand}`,
      description: product.description.substring(0, 200),
      images: [image],
    },
    other: {
      'product:brand': product.brand,
      'product:availability': product.stock > 0 ? 'in stock' : 'out of stock',
      'product:condition': 'new',
      ...(Number.isFinite(product.price) && product.price > 0
        ? {
            'product:price:amount': String(product.price),
            'product:price:currency': 'COP',
          }
        : {}),
    },
  };
}

export default async function ProductPage({ params }) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) notFound();

  // Productos relacionados (misma familia o misma concentración).
  const allProducts = await getAllProducts();
  const related = allProducts.filter(p =>
    (p.category === product.category || p.type === product.type) && p.id !== product.id
  ).slice(0, 4);

  const categoryLabel = categoryLabels[product.category] || '';
  const url = `${SITE_URL}/perfume/${product.slug}`;
  const resolvedImages = resolveProductImages(product);

  // URLs absolutas para Schema.org (Google requiere https://...)
  const absoluteImages = resolvedImages.map(img =>
    img.startsWith('http') ? img : `${SITE_URL}${img}`
  );

  // Precio válido para Schema: si es Infinity/0/NaN, marcamos PreOrder sin precio.
  // De lo contrario, InStock con precio real y validez hasta fin del próximo año.
  const hasValidPrice = Number.isFinite(product.price) && product.price > 0;
  const inStock = (product.stock ?? 0) > 0;
  const nextYearEnd = new Date(new Date().getFullYear() + 1, 11, 31).toISOString().split('T')[0];

  const offer = hasValidPrice
    ? {
        '@type': 'Offer',
        url,
        price: product.price,
        priceCurrency: 'COP',
        priceValidUntil: nextYearEnd,
        availability: inStock
          ? 'https://schema.org/InStock'
          : 'https://schema.org/OutOfStock',
        itemCondition: 'https://schema.org/NewCondition',
        shippingDetails: {
          '@type': 'OfferShippingDetails',
          shippingRate: {
            '@type': 'MonetaryAmount',
            value: 0,
            currency: 'COP',
          },
          shippingDestination: {
            '@type': 'DefinedRegion',
            addressCountry: 'CO',
          },
          deliveryTime: {
            '@type': 'ShippingDeliveryTime',
            handlingTime: { '@type': 'QuantitativeValue', minValue: 0, maxValue: 1, unitCode: 'DAY' },
            transitTime: { '@type': 'QuantitativeValue', minValue: 1, maxValue: 5, unitCode: 'DAY' },
          },
        },
        hasMerchantReturnPolicy: {
          '@type': 'MerchantReturnPolicy',
          applicableCountry: 'CO',
          returnPolicyCategory: 'https://schema.org/MerchantReturnFiniteReturnWindow',
          merchantReturnDays: 30,
          returnMethod: 'https://schema.org/ReturnByMail',
          returnFees: 'https://schema.org/FreeReturn',
        },
        seller: {
          '@type': 'Organization',
          name: 'ScentualBliss',
        },
      }
    : {
        '@type': 'Offer',
        url,
        priceCurrency: 'COP',
        availability: 'https://schema.org/PreOrder',
        itemCondition: 'https://schema.org/NewCondition',
        seller: { '@type': 'Organization', name: 'ScentualBliss' },
      };

  // JSON-LD enriquecido (Product + BreadcrumbList)
  const productSchema = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    '@id': url,
    name: product.name,
    description: product.description,
    image: absoluteImages,
    sku: product.slug,
    mpn: product.slug,
    brand: {
      '@type': 'Brand',
      name: product.brand,
    },
    category: `Perfume ${categoryLabel} ${product.gender}`,
    offers: offer,
    // aggregateRating intencionalmente omitido: las reseñas reales viven
    // en Supabase y se cargan en cliente; hasta que existan no falseamos
    // señales para Google.
    additionalProperty: [
      { '@type': 'PropertyValue', name: 'Tipo', value: product.type || 'EDP' },
      { '@type': 'PropertyValue', name: 'Género', value: product.gender },
      { '@type': 'PropertyValue', name: 'Categoría', value: categoryLabel },
      { '@type': 'PropertyValue', name: 'Duración', value: product.longevity },
      { '@type': 'PropertyValue', name: 'Estela', value: product.sillage },
      { '@type': 'PropertyValue', name: 'Estación', value: product.season },
      { '@type': 'PropertyValue', name: 'Notas de salida', value: product.notes.top },
      { '@type': 'PropertyValue', name: 'Notas de corazón', value: product.notes.heart },
      { '@type': 'PropertyValue', name: 'Notas de fondo', value: product.notes.base },
    ],
  };

  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Inicio', item: SITE_URL },
      { '@type': 'ListItem', position: 2, name: 'Tienda', item: `${SITE_URL}/tienda` },
      { '@type': 'ListItem', position: 3, name: product.name, item: url },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(productSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />
      <ProductFAQSchema product={product} />
      <ProductPageClient product={product} resolvedImages={resolvedImages} related={related} />
      <ProductSeoContent product={product} />
    </>
  );
}
