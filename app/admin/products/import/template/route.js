// GET /admin/products/import/template
// Devuelve un CSV plantilla con los headers + 2 filas de ejemplo, listo
// para descarga. Útil para que el admin sepa el formato exacto.
//
// Esta ruta está dentro de /admin/* → protegida por el middleware
// (requiere cookie de sesión válida).

import { NextResponse } from 'next/server';
import { buildTemplateCsv } from '@/lib/products-import';

export async function GET() {
  // BOM al inicio (﻿) para que Excel detecte UTF-8 al abrir el CSV
  // y muestre tildes/eñes correctamente.
  const body = '﻿' + buildTemplateCsv();
  return new NextResponse(body, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': 'attachment; filename="plantilla-productos-scentualbliss.csv"',
      'Cache-Control': 'no-store',
    },
  });
}
