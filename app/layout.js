import './globals.css';
import Script from 'next/script';
import AnnouncementBar from '@/components/layout/AnnouncementBar';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import CartDrawer from '@/components/cart/CartDrawer';
import ToasterWrapper from '@/components/ui/ToasterWrapper';
import WhatsAppFloat from '@/components/ui/WhatsAppFloat';
import ScrollToTop from '@/components/ui/ScrollToTop';

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
};

export const metadata = {
  metadataBase: new URL('https://scentualbliss.com'),
  title: {
    default: 'ScentualBliss — Perfumería de Lujo',
    template: '%s | ScentualBliss',
  },
  description: 'Fragancias únicas creadas para quienes no se conforman con lo ordinario. Perfumes orientales, florales, amaderados y frescos con envío express a todo LATAM.',
  keywords: ['perfumes de lujo', 'fragancias exclusivas', 'perfumería online', 'oud', 'floral', 'oriental', 'perfumes Colombia'],
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
    title: 'ScentualBliss — Perfumería de Lujo',
    description: 'Fragancias únicas que cuentan tu historia. Envío gratis en pedidos +$100.',
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;0,600;1,300;1,400;1,600&family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;1,9..40,300&display=swap" rel="stylesheet" />
      </head>
      <body>
        <AnnouncementBar />
        <Navbar />
        <CartDrawer />
        <ToasterWrapper />
        {children}
        <Footer />
        <WhatsAppFloat />
        <ScrollToTop />
        <Script
          src="https://www.googletagmanager.com/gtag/js?id=G-512JH5J3JP"
          strategy="afterInteractive"
        />
        <Script id="ga-init" strategy="afterInteractive">
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
