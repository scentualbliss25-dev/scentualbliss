// API route: consulta el estado de una transacción Wompi por ID
// GET /api/wompi/transaction?id=TRX_ID

import { NextResponse } from 'next/server';
import { fetchTransaction, WOMPI_CONFIGURED } from '@/lib/wompi';

export async function GET(req) {
  try {
    if (!WOMPI_CONFIGURED) {
      return NextResponse.json({ error: 'Wompi no configurado' }, { status: 503 });
    }
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'id requerido' }, { status: 400 });

    const tx = await fetchTransaction(id);
    return NextResponse.json(tx);
  } catch (err) {
    console.error('[Wompi tx error]', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
