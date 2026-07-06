// Rate-limit simple en memoria, por clave (normalmente `ruta:IP`).
//
// Limitación conocida: en Vercel cada instancia serverless tiene su propia
// memoria, así que el límite es por-instancia y se resetea al reciclar.
// Aun así frena el abuso básico (spam de formularios, fuerza bruta burda)
// sin agregar dependencias externas. Para un límite global haría falta
// Redis/Upstash — no lo justifica el tráfico actual.

const buckets = new Map();
const MAX_BUCKETS = 5000;

/**
 * @returns {boolean} true si la petición está dentro del límite.
 */
export function rateLimit(key, { max = 10, windowMs = 60_000 } = {}) {
  const now = Date.now();

  // Poda ocasional para que el Map no crezca sin límite.
  if (buckets.size > MAX_BUCKETS) {
    for (const [k, b] of buckets) {
      if (now - b.ts > windowMs) buckets.delete(k);
    }
    if (buckets.size > MAX_BUCKETS) buckets.clear();
  }

  const bucket = buckets.get(key);
  if (!bucket || now - bucket.ts > windowMs) {
    buckets.set(key, { count: 1, ts: now });
    return true;
  }
  bucket.count++;
  return bucket.count <= max;
}

export function clientIp(req) {
  const fwd = req.headers.get('x-forwarded-for');
  if (fwd) return fwd.split(',')[0].trim();
  return req.headers.get('x-real-ip') || 'unknown';
}
