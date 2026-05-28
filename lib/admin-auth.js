/**
 * Auth del panel admin: cookie HttpOnly firmada con HMAC-SHA256.
 *
 * Diseño:
 * - El "secret" para firmar es ADMIN_PASSWORD. Si el password cambia,
 *   todas las sesiones se invalidan automáticamente (deseable).
 * - La cookie contiene `<expiresAt>.<hmac>`. Verificamos firma + expiración.
 * - Usa Web Crypto API (compatible con edge middleware y route handlers).
 */

const COOKIE_NAME = 'sb_admin';
const SESSION_MAX_AGE_SEC = 60 * 60 * 24 * 7; // 7 días

// Importa la clave HMAC desde el password admin.
async function getKey(password) {
  const enc = new TextEncoder();
  return crypto.subtle.importKey(
    'raw',
    enc.encode(password),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify'],
  );
}

// Convierte ArrayBuffer → string hex.
function bufToHex(buf) {
  return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('');
}

// Comparación constant-time para evitar timing attacks.
function timingSafeEqual(a, b) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/**
 * Firma un valor de sesión válido por SESSION_MAX_AGE_SEC.
 * Retorna el string que va dentro de la cookie.
 */
export async function signSession(password) {
  if (!password) throw new Error('ADMIN_PASSWORD no configurado');
  const expiresAt = Math.floor(Date.now() / 1000) + SESSION_MAX_AGE_SEC;
  const key = await getKey(password);
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(String(expiresAt)));
  return `${expiresAt}.${bufToHex(sig)}`;
}

/**
 * Verifica un valor de cookie. Retorna true si la firma es válida y no expiró.
 */
export async function verifySession(cookieValue, password) {
  if (!cookieValue || !password) return false;
  const [expiresAtStr, providedHex] = cookieValue.split('.');
  if (!expiresAtStr || !providedHex) return false;

  const expiresAt = parseInt(expiresAtStr, 10);
  if (!Number.isFinite(expiresAt)) return false;
  if (Math.floor(Date.now() / 1000) >= expiresAt) return false;

  const key = await getKey(password);
  const expectedBuf = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(expiresAtStr));
  const expectedHex = bufToHex(expectedBuf);

  return timingSafeEqual(providedHex, expectedHex);
}

export const ADMIN_COOKIE_NAME = COOKIE_NAME;
export const ADMIN_SESSION_MAX_AGE_SEC = SESSION_MAX_AGE_SEC;
