// Cron de Vercel — corre cada hora (config en vercel.json).
// Sincroniza todas las órdenes pendientes con Wompi.
// Es respaldo del webhook por si Wompi no notifica (cambios de estado tardíos,
// webhook caído, etc.).
import { NextResponse } from 'next/server';
import { syncAllPendingAction } from '@/app/admin/orders/_actions';

export async function GET(req) {
  // Vercel envía Authorization: Bearer <CRON_SECRET> a los crons configurados
  // en vercel.json. Si la env var existe, validamos.
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = req.headers.get('authorization');
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    }
  }

  try {
    const result = await syncAllPendingAction();
    console.log('[Cron sync-orders]', JSON.stringify(result));
    return NextResponse.json({
      ok: true,
      timestamp: new Date().toISOString(),
      ...result,
    });
  } catch (err) {
    console.error('[Cron sync-orders error]', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
