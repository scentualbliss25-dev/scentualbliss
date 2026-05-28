'use client';

/**
 * Chrome público (AnnouncementBar + Navbar + Footer) que se auto-oculta
 * en las rutas del panel admin. Permite reutilizar el root layout sin
 * recurrir a route groups y sin que el admin herede el header/footer de
 * la tienda.
 *
 * Uso desde app/layout.js:
 *   <PublicHeader products={products} />
 *   {children}
 *   <PublicFooter />
 */

import { usePathname } from 'next/navigation';
import AnnouncementBar from './AnnouncementBar';
import Navbar from './Navbar';
import Footer from './Footer';

function isAdminRoute(pathname) {
  return pathname === '/admin' || pathname?.startsWith('/admin/');
}

export function PublicHeader({ products }) {
  const pathname = usePathname();
  if (isAdminRoute(pathname)) return null;
  return (
    <>
      <AnnouncementBar />
      <Navbar products={products} />
    </>
  );
}

export function PublicFooter() {
  const pathname = usePathname();
  if (isAdminRoute(pathname)) return null;
  return <Footer />;
}
