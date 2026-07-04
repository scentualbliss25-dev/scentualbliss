import { supabaseAdmin } from '@/lib/supabase';
import { AdminHeader, AdminOrdersTable } from './AdminClient';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const metadata = { robots: { index: false, follow: false } };

export default async function AdminOrdersPage() {
  try {
    return await renderOrders();
  } catch (err) {
    console.error('[AdminOrders SSR ERROR]', err);
    return (
      <div className="ord-errpage">
        <h1>Error al cargar órdenes</h1>
        <pre>
{`MESSAGE: ${err?.message || 'unknown'}
NAME: ${err?.name || 'unknown'}
DIGEST: ${err?.digest || 'none'}
CODE: ${err?.code || 'none'}
STACK:
${(err?.stack || '').split('\n').slice(0, 15).join('\n')}`}
        </pre>
        <p>Por favor mándale este mensaje al desarrollador.</p>
        <ErrPageStyles />
      </div>
    );
  }
}

async function renderOrders() {
  if (!supabaseAdmin) {
    return (
      <div className="ord-errpage">
        <h1>Supabase no configurado</h1>
        <p>Falta NEXT_PUBLIC_SUPABASE_URL o claves en las env vars de Vercel.</p>
        <ErrPageStyles />
      </div>
    );
  }

  const { data: orders, error } = await supabaseAdmin
    .from('orders')
    .select('*, order_items(id)')
    .order('created_at', { ascending: false })
    .limit(500);

  if (error) {
    return (
      <div className="ord-errpage">
        <h1>Error consultando órdenes</h1>
        <pre>{JSON.stringify(error, null, 2)}</pre>
        <ErrPageStyles />
      </div>
    );
  }

  return (
    <div className="ord">
      <header className="ord-head">
        <div>
          <p className="ord-eyebrow">Ventas</p>
          <h1 className="ord-title">Órdenes</h1>
          <p className="ord-sub">Últimas {orders?.length || 0} órdenes</p>
        </div>
        <AdminHeader />
      </header>

      <AdminOrdersTable orders={orders || []} />

      <OrdersPageStyles />
    </div>
  );
}

function OrdersPageStyles() {
  return (
    <style>{`
      .ord {
        padding: 2.5rem 2.25rem 3rem;
        max-width: 1400px;
        margin: 0 auto;
        font-family: var(--font-montserrat), ui-sans-serif, system-ui, sans-serif;
        color: #2a1f15;
      }
      .ord-head {
        display: flex;
        justify-content: space-between;
        align-items: flex-end;
        flex-wrap: wrap;
        gap: 1.25rem;
        margin-bottom: 1.75rem;
      }
      .ord-eyebrow {
        margin: 0 0 0.3rem;
        font-size: 0.7rem;
        letter-spacing: 0.2em;
        text-transform: uppercase;
        color: #8a6936;
      }
      .ord-title {
        margin: 0 0 0.35rem;
        font-size: 1.85rem;
        font-weight: 500;
        letter-spacing: -0.01em;
        color: #1c1611;
      }
      .ord-sub {
        margin: 0;
        font-size: 0.83rem;
        color: rgba(28, 22, 17, 0.55);
      }
    `}</style>
  );
}

function ErrPageStyles() {
  return (
    <style>{`
      .ord-errpage {
        padding: 2.5rem 2.25rem;
        max-width: 900px;
        margin: 0 auto;
        font-family: var(--font-montserrat), ui-sans-serif, system-ui, sans-serif;
        color: #2a1f15;
      }
      .ord-errpage h1 {
        color: #aa3232;
        font-size: 1.3rem;
        font-weight: 500;
        margin: 0 0 1rem;
      }
      .ord-errpage pre {
        background: #1c1611;
        color: #f3ead7;
        padding: 1.25rem;
        border-radius: 10px;
        overflow: auto;
        font-size: 0.78rem;
        white-space: pre-wrap;
        word-break: break-word;
      }
      .ord-errpage p {
        margin-top: 1.25rem;
        color: rgba(28, 22, 17, 0.55);
        font-size: 0.85rem;
      }
    `}</style>
  );
}
