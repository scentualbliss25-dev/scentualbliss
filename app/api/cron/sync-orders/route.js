// Cron de Vercel — corre 1 vez al día (6 AM, config en vercel.json).
// Sincroniza todas las órdenes pendientes con Wompi.
// Es respaldo del webhook por si Wompi no notifica (cambios de estado tardíos,
// webhook caído, etc.). Para sync ad-hoc el admin tiene el botón
// "Sincronizar pendientes" en /admin/orders.
//
// Antes existía un GitHub Actions workflow (.github/workflows/sync-orders.yml)
// que llamaba este endpoint cada 10 min, pero se eliminó porque:
//   - El webhook de Wompi cubre el 99.9% de los casos al instante.
//   - El cron diario de Vercel cubre el 0.1% restante.
//   - El botón manual en el admin cubre los casos urgentes.
//   - El workflow generaba emails de "Run failed" sin valor real añadido.
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
