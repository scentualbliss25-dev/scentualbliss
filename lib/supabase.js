import { createClient } from '@supabase/supabase-js';

// El SDK espera solo el dominio (https://xxx.supabase.co) sin path.
// En la configuración actual de Vercel la URL trae /rest/v1/ al final,
// lo cual causa "Invalid path specified in request URL". Lo sanitizamos.
const url = (process.env.NEXT_PUBLIC_SUPABASE_URL || '')
  .replace(/\/+$/, '')
  .replace(/\/rest\/v1\/?$/, '');
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Cliente público — para componentes y API routes de lectura
export const supabase = url && anonKey ? createClient(url, anonKey) : null;

// Cliente admin — para API routes que escriben datos (orders, webhook)
// Usa service role key si está disponible, si no cae al anon key
export const supabaseAdmin = url
  ? createClient(url, serviceKey || anonKey, { auth: { persistSession: false } })
  : null;
