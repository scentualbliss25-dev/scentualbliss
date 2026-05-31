// GET /admin/products/import/template
// Devuelve un .xlsx plantilla con:
//   - Hoja "Plantilla": headers congelados, 2 ejemplos resaltados,
//     dropdowns de validación en columnas con valores fijos, formato
//     número en precios, comentarios explicativos al hover de cada header.
//   - Hoja "Instrucciones": guía completa de uso (cómo funciona, qué
//     significa cada columna, valores permitidos, límites).
//
// Esta ruta está dentro de /admin/* → protegida por el middleware
// (requiere cookie de sesión válida).

import { NextResponse } from 'next/server';
import { buildTemplateXlsx } from '@/lib/products-import';

export async function GET() {
  const buffer = await buildTemplateXlsx();
  return new NextResponse(buffer, {
    status: 200,
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': 'attachment; filename="plantilla-productos-scentualbliss.xlsx"',
      'Content-Length': String(buffer.length),
      'Cache-Control': 'no-store',
    },
  });
}
