import './globals.css';
import Script from 'next/script';
import { Montserrat } from 'next/font/google';
import AnnouncementBar from '@/components/layout/AnnouncementBar';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import ToasterWrapper from '@/components/ui/ToasterWrapper';
import DeferredShell from '@/components/layout/DeferredShell';
import { SITE_URL } from '@/lib/site';

const montserrat = Montserrat({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-montserrat',
  display: 'swap',
});

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#FDFBF7' },
    { media: '(prefers-color-scheme: dark)', color: '#1F1A14' },
  ],
};

// Imagen OG estática (1200x630) en /public/og.png — generada con
// scripts/generate-og-image.mjs. La versión dinámica (app/opengraph-image.jsx)
// causaba bugs en SPA navigation, por eso es estática.
const OG_IMAGE = {
  url: '/og.png',
  width: 1200,
  height: 630,
  alt: 'ScentualBliss — Perfumería Original',
};

export const metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: 'ScentualBliss — Perfumería Original',
    template: '%s | ScentualBliss',
  },
  description: 'Fragancias únicas creadas para quienes no se conforman con lo ordinario. Perfumes orientales, florales, amaderados y frescos con envío gratis a toda Colombia.',
  keywords: ['perfumes de lujo', 'fragancias exclusivas', 'perfumería online', 'oud', 'floral', 'oriental', 'perfumes Colombia', 'perfumes Medellín', 'Dior Sauvage', 'Creed Aventus', 'Lattafa Khamrah'],
  authors: [{ name: 'ScentualBliss' }],
  creator: 'ScentualBliss',
  publisher: 'ScentualBliss',
  manifest: '/manifest.json',
  alternates: {
    canonical: '/',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-image-preview': 'large',
      'max-snippet': -1,
      'max-video-preview': -1,
    },
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'ScentualBliss',
  },
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: '32x32', type: 'image/png' },
      { url: '/icon-32.png', sizes: '32x32', type: 'image/png' },
      { url: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [{ url: '/apple-icon.png', sizes: '180x180', type: 'image/png' }],
    shortcut: '/favicon.ico',
  },
  openGraph: {
    siteName: 'ScentualBliss',
    locale: 'es_CO',
    type: 'website',
    url: SITE_URL,
    title: 'ScentualBliss — Perfumería Original',
    description: 'Fragancias únicas que cuentan tu historia. Envío gratis a toda Colombia.',
    images: [OG_IMAGE],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'ScentualBliss — Perfumería Original',
    description: 'Fragancias únicas que cuentan tu historia. Envío gratis a toda Colombia.',
    images: [OG_IMAGE.url],
  },
  formatDetection: {
    telephone: false,
  },
};

// Schema.org Organization: le dice a Google quién es la marca, su logo
// para mostrar en SERP, redes sociales asociadas y formas de contacto.
const organizationSchema = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  '@id': `${SITE_URL}/#organization`,
  name: 'ScentualBliss',
  alternateName: 'ScentualBliss Perfumería',
  url: SITE_URL,
  logo: {
    '@type': 'ImageObject',
    url: `${SITE_URL}/icon-512.png`,
    width: 512,
    height: 512,
  },
  description: 'Perfumería original en Colombia. Fragancias auténticas de diseñador, nicho y árabes con envío gratis a toda Colombia.',
  address: {
    '@type': 'PostalAddress',
    addressLocality: 'Medellín',
    addressRegion: 'Antioquia',
    addressCountry: 'CO',
  },
  contactPoint: {
    '@type': 'ContactPoint',
    telephone: '+57-316-937-6436',
    contactType: 'customer service',
    areaServed: 'CO',
    availableLanguage: ['Spanish'],
  },
  sameAs: [
    'https://www.instagram.com/scentualbliss_25/',
    'https://www.tiktok.com/@scentualbliss_25',
    'https://www.facebook.com/people/Scentual-Bliss/61577971191908/',
  ],
};

const websiteSchema = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  '@id': `${SITE_URL}/#website`,
  url: SITE_URL,
  name: 'ScentualBliss',
  publisher: { '@id': `${SITE_URL}/#organization` },
  inLanguage: 'es-CO',
  potentialAction: {
    '@type': 'SearchAction',
    target: {
      '@type': 'EntryPoint',
      urlTemplate: `${SITE_URL}/tienda?q={search_term_string}`,
    },
    'query-input': 'required name=search_term_string',
  },
};

export default async function RootLayout({ children }) {
  // Carga el catálogo en server-side (cacheado) y se lo pasa al Navbar.
  // El Navbar necesita la lista de marcas para el mega menú y el catálogo
  // completo para la búsqueda en vivo.
  const { getAllProducts } = await import('@/lib/products');
  const products = await getAllProducts();
  return (
    <html lang="es" className={montserrat.variable}>
      <body>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteSchema) }}
        />
        <a href="#main-content" className="skip-link">Saltar al contenido principal</a>
        <AnnouncementBar />
        <Navbar products={products} />
        <ToasterWrapper />
        {children}
        <Footer />
        <DeferredShell />
        <Script
          src="https://www.googletagmanager.com/gtag/js?id=G-512JH5J3JP"
          strategy="lazyOnload"
        />
        <Script id="ga-init" strategy="lazyOnload">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', 'G-512JH5J3JP');
          `}
        </Script>
      </body>
    </html>
  );
}
