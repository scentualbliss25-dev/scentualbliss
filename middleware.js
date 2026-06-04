import { NextResponse } from 'next/server';
import { verifySession, ADMIN_COOKIE_NAME } from '@/lib/admin-auth';

// Parámetros de tracking que Google Shopping / redes añaden y que no deben indexarse
// srsltid = Google Shopping Results Tracking ID
// _gl     = Google Linker (cross-domain)
// igshid  = Instagram Share ID
// mc_eid  = Mailchimp Email ID
// Nota: NO eliminamos gclid/fbclid/ttclid porque pueden romper atribución de anuncios
const STRIP_PARAMS = ['srsltid', '_gl', 'igshid', 'mc_eid'];

// Valores de concentración que antes llegaban como ?type=EDP y ahora deben ser ?conc=EDP
const CONC_VALUES = new Set(['EDP', 'EDT', 'Extrait', 'Parfum', 'Elixir',
  'EDT Intense', 'Parfum Concentré']);

// ── Shopify legacy → Next.js redirects ─────────────────────────────────
// El sitio anterior estuvo en Shopify y Google indexó URLs con su formato
// (/products/<slug>, /collections/<slug>, /pages/<slug>, /policies/<slug>,
// /cart, /search, /blogs/...). Esas URLs ya no existen en el sitio actual
// pero Google las sigue mostrando hasta que se les diga que se movieron.
//
// Respuesta 301 (Moved Permanently) → Google des-indexa la URL vieja y
// adopta la nueva. Si el slug del producto sigue existiendo en el nuevo
// catálogo (mismos handles que en Shopify), el redirect llega a la PDP
// correcta. Si no, Next devolverá 404 normal y Google igualmente
// des-indexará la URL vieja.

// /pages/<handle> → ruta nueva
const SHOPIFY_PAGE_MAP = new Map([
  ['contact',            '/contacto'],
  ['contacto',           '/contacto'],
  ['contactenos',        '/contacto'],
  ['contact-us',         '/contacto'],
  ['faq',                '/faq'],
  ['preguntas',          '/faq'],
  ['preguntas-frecuentes','/faq'],
  ['about',              '/'],
  ['about-us',           '/'],
  ['quienes-somos',      '/'],
  ['nosotros',           '/'],
  ['home',               '/'],
  ['inicio',             '/'],
  ['shop',               '/tienda'],
  ['tienda',             '/tienda'],
  ['all-products',       '/tienda'],
  ['perfumes',           '/tienda'],
]);

// /policies/<handle> → ruta nueva
const SHOPIFY_POLICY_MAP = new Map([
  ['privacy-policy',    '/privacidad'],
  ['privacidad',        '/privacidad'],
  ['terms-of-service',  '/terminos'],
  ['terminos',          '/terminos'],
  ['terms',             '/terminos'],
  ['refund-policy',     '/devoluciones'],
  ['devoluciones',      '/devoluciones'],
  ['shipping-policy',   '/devoluciones'],
  ['envios',            '/devoluciones'],
]);

/**
 * Si la ruta es un patrón Shopify legacy, devuelve la URL nueva
 * equivalente. Si no, retorna null y el middleware sigue normal.
 *
 * Cubre los patrones más comunes de Shopify. Para casos no listados
 * (ej: una URL legacy desconocida), devolvemos `/tienda` como fallback
 * neutro: el usuario aterriza en el catálogo y Google des-indexa la
 * URL vieja porque ya no devuelve el mismo contenido.
 */
function getShopifyLegacyRedirect(pathname) {
  // /products/<handle>  →  /perfume/<handle>
  // Mantenemos el handle exacto; los handles de Shopify suelen coincidir
  // con los slugs nuevos (decisión consciente al migrar).
  let m = pathname.match(/^\/products\/([^/?#]+)/);
  if (m) return `/perfume/${m[1]}`;

  // /collections/<handle>/products/<product-handle>  →  /perfume/<product-handle>
  // (ignoramos la collection — el producto importa)
  m = pathname.match(/^\/collections\/[^/]+\/products\/([^/?#]+)/);
  if (m) return `/perfume/${m[1]}`;

  // /collections/<handle>  →  /tienda  (mantiene contexto de catálogo)
  // /collections/all  →  /tienda
  m = pathname.match(/^\/collections(?:\/[^/?#]+)?/);
  if (m) return '/tienda';

  // /pages/<handle>  →  ruta mapeada o /
  m = pathname.match(/^\/pages\/([^/?#]+)/);
  if (m) return SHOPIFY_PAGE_MAP.get(m[1].toLowerCase()) || '/';

  // /policies/<handle>  →  política equivalente o /
  m = pathname.match(/^\/policies\/([^/?#]+)/);
  if (m) return SHOPIFY_POLICY_MAP.get(m[1].toLowerCase()) || '/';

  // /cart  →  /checkout (el flow nuevo va directo a checkout)
  if (pathname === '/cart' || pathname === '/cart/') return '/checkout';

  // /search  →  /tienda  (el query ?q= ya lo soporta /tienda)
  if (pathname === '/search' || pathname === '/search/') return '/tienda';

  // /blogs/<...>  →  / (no tenemos blog migrado)
  if (pathname.startsWith('/blogs/') || pathname === '/blogs') return '/';

  // /account/<...>  →  / (no hay cuentas de cliente todavía)
  if (pathname.startsWith('/account/') || pathname === '/account') return '/';

  // Apps de Shopify embebidas (las indexa Google si quedaron expuestas)
  if (pathname.startsWith('/apps/')) return '/';

  return null;
}

export async function middleware(req) {
  const { pathname } = req.nextUrl;

  // ── Shopify legacy URLs → 301 a equivalente actual ──────────────────────
  // ANTES que el resto: estas URLs nunca deben llegar al renderer de Next.
  const legacy = getShopifyLegacyRedirect(pathname);
  if (legacy) {
    const target = req.nextUrl.clone();
    target.pathname = legacy;
    // Preservamos query params útiles (ej: ?q=... al venir de /search)
    if (pathname === '/search' || pathname === '/search/') {
      const q = req.nextUrl.searchParams.get('q');
      if (q) target.searchParams.set('q', q);
    }
    // Removemos `?variant=NNN` típico de Shopify que ya no tiene sentido
    target.searchParams.delete('variant');
    return NextResponse.redirect(target, { status: 301 });
  }

  // ── Admin: cookie de sesión firmada (ver lib/admin-auth.js) ─────────────
  // Excluimos /admin/login y /api/admin/login del check, sino habría loop.
  const isAdminPath = pathname.startsWith('/admin') || pathname.startsWith('/api/admin');
  const isLoginRoute = pathname === '/admin/login' || pathname === '/api/admin/login';

  if (isAdminPath && !isLoginRoute) {
    const expected = process.env.ADMIN_PASSWORD;
    if (!expected) {
      return new NextResponse('Admin no configurado (falta ADMIN_PASSWORD)', { status: 503 });
    }

    const cookieVal = req.cookies.get(ADMIN_COOKIE_NAME)?.value;
    const valid = await verifySession(cookieVal, expected);

    if (!valid) {
      // Para rutas de API → 401 JSON. Para páginas → redirect a /admin/login.
      if (pathname.startsWith('/api/admin')) {
        return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
      }
      const loginUrl = req.nextUrl.clone();
      loginUrl.pathname = '/admin/login';
      loginUrl.searchParams.set('next', pathname);
      return NextResponse.redirect(loginUrl);
    }
    return NextResponse.next();
  }

  // ── Limpieza de URLs: tracking params + redirecciones antiguas ──────────
  const url = req.nextUrl.clone();
  const params = new URLSearchParams(url.search);

  // Si no hay query string, no hay nada que limpiar
  if (!url.search) return NextResponse.next();

  let changed = false;

  // 1. Eliminar parámetros de tracking que crean URLs duplicadas
  for (const p of STRIP_PARAMS) {
    if (params.has(p)) {
      params.delete(p);
      changed = true;
    }
  }

  // 2. Redirigir URLs antiguas: ?type=EDP/EDT/... → ?conc=EDP/EDT/...
  //    (el parámetro "type" ahora filtra Diseñador/Nicho/Árabe, no concentración)
  const typeVal = params.get('type');
  if (typeVal && CONC_VALUES.has(typeVal)) {
    params.delete('type');
    params.set('conc', typeVal);
    changed = true;
  }

  if (changed) {
    url.search = params.toString();
    return NextResponse.redirect(url, { status: 301 });
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    // Admin auth (páginas y endpoints API admin)
    '/admin/:path*',
    '/api/admin/:path*',
    // Páginas públicas (excluye assets estáticos, imágenes y APIs)
    '/((?!_next/static|_next/image|favicon\\.ico|img/|api/).*)',
  ],
};
