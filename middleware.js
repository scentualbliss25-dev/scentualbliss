import { NextResponse } from 'next/server';

// Protege /admin/* con HTTP Basic Auth (usuario: admin, contraseña: ADMIN_PASSWORD env var)
export function middleware(req) {
  const auth = req.headers.get('authorization');
  const expected = process.env.ADMIN_PASSWORD;

  if (!expected) {
    return new NextResponse('Admin no configurado (falta ADMIN_PASSWORD env var)', { status: 503 });
  }

  if (auth?.startsWith('Basic ')) {
    try {
      const decoded = atob(auth.slice(6));
      const [user, pass] = decoded.split(':');
      if (user === 'admin' && pass === expected) {
        return NextResponse.next();
      }
    } catch {}
  }

  return new NextResponse('Auth required', {
    status: 401,
    headers: { 'WWW-Authenticate': 'Basic realm="ScentualBliss Admin"' },
  });
}

export const config = {
  matcher: '/admin/:path*',
};
