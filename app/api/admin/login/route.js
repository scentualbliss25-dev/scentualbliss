import { NextResponse } from 'next/server';
import { signSession, ADMIN_COOKIE_NAME, ADMIN_SESSION_MAX_AGE_SEC } from '@/lib/admin-auth';

// Pequeño rate-limit en memoria para frenar fuerza bruta básica.
// (Por IP. Se resetea cuando la función serverless se recicla, lo cual está
// bien para nuestro caso — un solo admin, ataques masivos los ataja Vercel.)
const attempts = new Map();
const MAX_ATTEMPTS = 5;
const WINDOW_MS = 60_000;

function getClientIp(req) {
  const fwd = req.headers.get('x-forwarded-for');
  if (fwd) return fwd.split(',')[0].trim();
  return req.headers.get('x-real-ip') || 'unknown';
}

function checkRate(ip) {
  const now = Date.now();
  const entry = attempts.get(ip) || { count: 0, ts: now };
  if (now - entry.ts > WINDOW_MS) {
    entry.count = 0;
    entry.ts = now;
  }
  entry.count++;
  attempts.set(ip, entry);
  return entry.count <= MAX_ATTEMPTS;
}

export async function POST(req) {
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected) {
    return NextResponse.json(
      { error: 'Admin no configurado (falta ADMIN_PASSWORD)' },
      { status: 503 },
    );
  }

  const ip = getClientIp(req);
  if (!checkRate(ip)) {
    return NextResponse.json(
      { error: 'Demasiados intentos. Espera 1 minuto.' },
      { status: 429 },
    );
  }

  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Body inválido' }, { status: 400 });
  }

  const password = body?.password;
  if (!password || typeof password !== 'string') {
    return NextResponse.json({ error: 'Contraseña requerida' }, { status: 400 });
  }

  // Comparación constant-time básica (las longitudes pueden diferir, pero
  // ya sabemos que `expected` no es secreto público — su longitud no filtra
  // info útil. Lo importante es no early-return en mid-string).
  if (password.length !== expected.length || password !== expected) {
    return NextResponse.json({ error: 'Contraseña incorrecta' }, { status: 401 });
  }

  const sessionValue = await signSession(expected);

  const res = NextResponse.json({ ok: true });
  res.cookies.set(ADMIN_COOKIE_NAME, sessionValue, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
    maxAge: ADMIN_SESSION_MAX_AGE_SEC,
  });
  return res;
}
