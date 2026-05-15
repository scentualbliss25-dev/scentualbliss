import './globals.css';
import Script from 'next/script';
import { Cormorant_Garamond, DM_Sans } from 'next/font/google';
import AnnouncementBar from '@/components/layout/AnnouncementBar';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import CartDrawer from '@/components/cart/CartDrawer';
import ToasterWrapper from '@/components/ui/ToasterWrapper';
import WhatsAppFloat from '@/components/ui/WhatsAppFloat';
import ScrollToTop from '@/components/ui/ScrollToTop';

const cormorant = Cormorant_Garamond({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600'],
  style: ['normal', 'italic'],
  variable: '--font-cormorant',
  display: 'swap',
});

const dmSans = DM_Sans({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600'],
  style: ['normal', 'italic'],
  variable: '--font-dm-sans',
  display: 'swap',
});

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
  manifest: '/manifest.json',
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
    title: 'ScentualBliss — Perfumería de Lujo',
    description: 'Fragancias únicas que cuentan tu historia. Envío gratis en pedidos +$100.',
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="es" className={`${cormorant.variable} ${dmSans.variable}`}>
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
