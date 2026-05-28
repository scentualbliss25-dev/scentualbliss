# 09 · Panel de admin

## Acceso y protección

El panel de administración vive en `/admin/orders` y está protegido por autenticación HTTP Basic. Cuando alguien intenta entrar, el navegador muestra un diálogo nativo pidiendo usuario y contraseña. El usuario es siempre `admin` y la contraseña está en la variable de entorno `ADMIN_PASSWORD` de Vercel.

La protección se aplica desde `middleware.js`: cuando la URL empieza con `/admin`, el middleware lee el header `Authorization`, decodifica las credenciales en base64 y las compara contra el `ADMIN_PASSWORD`. Si no coinciden, devuelve un 401 con el header `WWW-Authenticate: Basic realm="ScentualBliss Admin"` para que el navegador muestre el diálogo.

Adicionalmente, el layout específico del admin (`app/admin/layout.jsx`) tiene `metadata.robots: { index: false, follow: false }` para asegurarse de que Google nunca indexe el panel ni siga sus enlaces, aunque el robots.txt ya lo bloquea.

El layout del admin es mínimo: solo registra el service worker para las notificaciones push y renderiza los children. No tiene Navbar, Footer, ni nada del layout del sitio público, para que la interfaz sea más limpia y enfocada en la tarea.

## La página de lista de órdenes

El archivo `app/admin/orders/page.jsx` es un Server Component que carga las últimas 500 órdenes desde Supabase. La consulta usa `supabaseAdmin` (no el cliente público) para saltarse las políticas Row Level Security y poder ver todas las órdenes sin importar de qué cliente sean.

La consulta es directa: selecciona todos los campos de `orders`, hace join con `order_items(id)` para tener el conteo de items por orden, ordena por `created_at` descendente y limita a 500 resultados. Es suficiente para el volumen actual; si en el futuro la tabla crece mucho, se puede agregar paginación.

Después de cargar las órdenes, el componente renderiza un header con el título "Órdenes" y el conteo total, junto con dos botones (`PushToggle` para activar notificaciones, `SyncAllPendingButton` para resincronizar). Debajo va la tabla con todas las órdenes.

Una decisión técnica importante: los tres componentes interactivos (la tabla y los dos botones) se cargan con `dynamic({ ssr: false })` a través del wrapper `AdminClient.jsx`. Esto se hizo porque un bug pasado mostró que si uno de los tres reventaba durante la hidratación (por ejemplo `PushToggle` cuando el navegador no soporta Notifications API), los otros dos también morían y aparecía un error boundary global. Aislándolos con dynamic, cada componente se hidrata de forma independiente: si uno falla, los demás siguen funcionando.

## La tabla de órdenes

El componente `OrdersTable.jsx` es el corazón del admin. Recibe el array de órdenes y construye una tabla con todas las funcionalidades necesarias para gestionar el negocio.

Arriba de la tabla hay una barra de búsqueda y filtros por status. La búsqueda funciona sobre cuatro campos simultáneamente: referencia, email, nombre y teléfono. Cualquier coincidencia parcial (case-insensitive) muestra la fila. Los filtros por status son cinco: Todas, Aprobadas, Pendientes, Rechazadas y otras. Al cambiar de filtro o búsqueda, la tabla se filtra en tiempo real con `useMemo`.

Cada fila de la tabla muestra: un checkbox para selección, la fecha de la orden, la referencia, el nombre del cliente con su email pequeño debajo, el teléfono con un link clickeable a WhatsApp, la ciudad y departamento, el número de items, el total formateado en COP, el status como badge de color, y un menú de acciones.

Los badges de status tienen colores semánticos: verde para aprobada, ámbar para pendiente, rojo para rechazada o error, gris para anulada. Esto permite al admin escanear visualmente la tabla y ver de un vistazo qué necesita atención.

El menú de acciones de cada orden permite verla en detalle, sincronizarla con Wompi, abrir su WhatsApp prellenado con un mensaje del tipo "Hola María, te escribo de ScentualBliss sobre tu pedido SB-XXXX", y eliminarla.

Para acciones en lote, hay un checkbox global que selecciona todas las órdenes visibles. Una vez seleccionadas, aparece una barra de acciones en lote con un solo botón: "Eliminar seleccionadas". Esto llama a la server action `bulkDeleteOrdersAction` que borra de Supabase en una sola transacción.

La función `exportToCSV` permite descargar todas las órdenes actualmente filtradas como un archivo CSV. Genera el archivo en el cliente usando Blob y URL.createObjectURL, así no requiere round-trip al servidor. El CSV tiene las columnas: Referencia, Estado, Cliente, Email, Teléfono, Ciudad, Items, Total y Fecha.

## El detalle de cada orden

Hacer clic en una orden lleva a `/admin/orders/[id]`. El archivo `app/admin/orders/[id]/page.jsx` carga la orden completa con sus items mediante una consulta a Supabase con join: `select * from orders join order_items where orders.id = ?`.

La página muestra toda la información disponible. Arriba hay un header con la referencia y un badge grande con el status actual. Debajo en dos columnas se muestran los datos del cliente (nombre, email, teléfono, link a WhatsApp) y los datos del envío (dirección, ciudad, departamento, país).

A continuación la lista de items con el nombre del producto, la talla seleccionada, la cantidad y el precio total. Cada item es clickeable y abre la página pública del producto en una nueva pestaña.

Más abajo el resumen de pago: subtotal, descuento aplicado (si lo hubo), costo de envío, y total cobrado. También el método de pago (Wompi/Tarjeta/PSE), el ID de transacción Wompi, y la fecha de creación y última actualización.

Por último, el componente `OrderActions` agrupa las acciones que se pueden hacer sobre la orden. Cambiar manualmente el status (útil cuando una orden quedó en pending pero el admin sabe que sí se cobró), forzar un resync con Wompi (consulta el estado actual en Wompi y actualiza la orden si difiere), marcar como enviada con un número de guía, y eliminar la orden.

Todas estas acciones son Server Actions definidas en `app/admin/orders/_actions.js`. La directiva `'use server'` al inicio del archivo permite que se llamen desde Client Components pero corran en el servidor con acceso a `supabaseAdmin` y a las claves privadas de Wompi.

## Las notificaciones push del admin

El botón `PushToggle` en el header del admin permite activar o desactivar las notificaciones push del navegador. Cuando el admin lo activa por primera vez, el navegador pide permiso (aparece el diálogo nativo de "scentualbliss.com.co quiere mostrar notificaciones"). Si el admin acepta, el navegador genera una suscripción única con un endpoint y dos claves criptográficas, y el código las envía a `/api/push/subscribe` que las guarda en Supabase.

A partir de ese momento, cada vez que entra una venta aprobada, el webhook de Wompi llama a `sendOrderPush(order)` que recorre todas las suscripciones activas y envía un push a cada una.

El push aparece como notificación nativa del sistema operativo, incluso si la pestaña del admin está cerrada o si el navegador está minimizado. Hacer clic en la notificación abre el sitio en `/admin/orders/<id>` (la URL específica de la orden que acaba de entrar).

El `PushToggle` también permite desactivar las notificaciones: hace `pushManager.getSubscription()` para encontrar la suscripción actual del navegador, llama a `pushManager.unsubscribe()` para invalidarla localmente, y luego hace DELETE a `/api/push/subscribe` para que el servidor la elimine de la tabla.

El componente es defensivo contra browsers que no soportan push (Safari iOS antiguo, browsers en modo incógnito, etc.). Tiene un try/catch envolviendo todo el código que toca APIs del navegador, y verifica explícitamente que `Notification`, `serviceWorker` y `PushManager` existan antes de usarlos. Si alguno falta, muestra un estado "no soportado" sin reventar.

## La sincronización con Wompi

El botón `SyncAllPendingButton` en el header del admin permite re-sincronizar manualmente todas las órdenes que están en estado `pending`. Esto es una red de seguridad para casos donde el webhook de Wompi falló.

Cuando se le da clic, llama a la server action `syncAllPendingAction` que hace dos cosas. Primero consulta a Supabase todas las órdenes con `status = 'pending'`. Para cada una, llama a `fetchTransactionByReference(reference)` que pregunta a Wompi cuál es el estado actual de esa orden. Si Wompi reporta un estado distinto (aprobada, rechazada, etc.), actualiza la orden en Supabase y dispara las acciones correspondientes (email al cliente si fue aprobada, decremento de inventario, etc.).

Esto puede tardar unos segundos si hay muchas órdenes pendientes, porque hace una consulta a Wompi por cada una. Mientras procesa, el botón muestra un spinner.

Adicionalmente hay un cron job configurado en Vercel que llama a `/api/cron/sync-orders` periódicamente (cada cierto tiempo). Ese endpoint hace la misma sincronización automáticamente, así que el botón manual es más una herramienta para casos puntuales que la operación normal.

## Mejoras potenciales

El panel actual es funcional pero hay áreas donde podría mejorarse. La paginación de la tabla está implícita en el límite de 500 órdenes; si el volumen crece, hay que implementar paginación real. La búsqueda es client-side (filtra el array ya cargado), lo cual no escala bien con más datos. Las acciones en lote solo permiten eliminar; podrían agregarse otras como "marcar como enviadas" o "exportar selección a CSV".

No hay un dashboard con métricas (ventas del día, del mes, productos más vendidos). El admin actualmente tiene que hacer ese análisis manualmente exportando el CSV.

Tampoco hay sistema de roles: cualquiera con el `ADMIN_PASSWORD` tiene acceso total. Si el equipo crece y se quieren niveles (vendedor que solo ve órdenes, gerente que ve métricas, etc.), habría que implementar autenticación más sofisticada, probablemente con Supabase Auth y políticas RLS.
