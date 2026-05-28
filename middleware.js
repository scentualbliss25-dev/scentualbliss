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

export async function middleware(req) {
  const { pathname } = req.nextUrl;

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
