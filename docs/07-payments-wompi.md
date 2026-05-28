# 07 · Pagos con Wompi

## Qué es Wompi

Wompi es la pasarela de pagos de Bancolombia, una de las más usadas para e-commerce en Colombia. Permite cobrar con tarjeta de crédito o débito (Visa, Mastercard, Amex, Diners), PSE (transferencia bancaria), Nequi, Bancolombia Transfer y otros métodos locales.

ScentualBliss usa el **Web Checkout** de Wompi: cuando el cliente da clic en "Pagar", lo redirigimos a una URL en `checkout.wompi.co` donde Wompi muestra su propio formulario de pago. Después del intento (exitoso o no), Wompi redirige al cliente de vuelta a nuestro sitio en `/order-confirm` y aparte nos avisa mediante un webhook firmado.

Ventaja de este enfoque: no manejamos datos de tarjeta. Toda la información sensible vive en Wompi, lo que nos saca de los requisitos estrictos de PCI compliance.

## Las cuatro variables de entorno

Wompi requiere cuatro variables de entorno configuradas en Vercel para funcionar.

`NEXT_PUBLIC_WOMPI_PUBLIC_KEY` es la clave pública. Empieza con `pub_test_` para el sandbox y con `pub_prod_` para producción. Es la clave que va en el frontend.

`WOMPI_PRIVATE_KEY` es la clave privada, usada para consultas server-to-server contra la API de Wompi. Es opcional para el flujo básico de pago pero necesaria para consultar el estado de transacciones desde el admin.

`WOMPI_INTEGRITY_SECRET` es el secreto usado para firmar cada pago. Cuando construimos la URL del checkout, calculamos una firma SHA256 sobre `referencia + monto + moneda + secreto`. Wompi verifica esa firma del lado del checkout: si no coincide, rechaza el pago. Esto previene que alguien manipule el monto en el frontend antes de que llegue a Wompi.

`WOMPI_EVENTS_SECRET` es el secreto usado para firmar los webhooks que Wompi nos envía. Cada vez que recibimos un evento, recalculamos la firma con este secreto y verificamos que coincida. Si no coincide, rechazamos el evento como falsificado.

El archivo `lib/wompi.js` lee estas variables al iniciar y expone constantes como `WOMPI_CONFIGURED` (boolean que indica si todas las requeridas están presentes), `WOMPI_IS_PROD` (true si estamos en producción según el prefijo de la public key), y la URL del API correspondiente (`production.wompi.co/v1` o `sandbox.wompi.co/v1`).

## El flujo completo del pago

Cuando un usuario decide comprar, el flujo pasa por varias capas distintas. Vale la pena entenderlo paso a paso.

El usuario completa el formulario en `/checkout` y da clic en "Pagar". El componente `CheckoutPageClient` arma un objeto con el monto, los items del carrito, los datos del cliente y la dirección de envío, y hace POST a `/api/wompi/checkout`.

El endpoint del servidor (`app/api/wompi/checkout/route.js`) recibe ese POST. Primero verifica que Wompi esté configurado: si no, devuelve 503. Si está, valida que el monto sea un número positivo y que el email del cliente esté presente.

A continuación genera una **referencia única** para esta orden. La función `generateReference` en `lib/wompi.js` combina la marca de tiempo en base 36 y cuatro caracteres aleatorios, dando algo como `SB-LX7K9M-A3FQ`. Esta referencia se usa para todo: para identificar la orden en Supabase, para que Wompi sepa de cuál orden se trata, y para que el cliente vea su número de pedido.

Después convierte el monto de pesos a centavos (Wompi recibe `amount-in-cents`) y calcula la firma de integridad con SHA256 sobre `referencia + monto + COP + secreto`. La firma se llama "signature de integridad" porque garantiza que ese monto exacto fue el que originamos: si alguien intercepta y modifica el monto en la URL, la firma deja de coincidir y Wompi rechaza el pago.

Con la referencia, el monto y la firma listos, se llama a `buildCheckoutUrl` que construye la URL del Web Checkout con todos los parámetros necesarios: la public key, el monto, la firma, la URL de retorno (`/order-confirm?reference=...`), los datos del cliente y la dirección de envío.

Una sutileza interesante: los parámetros de Wompi usan dos puntos en sus nombres (`signature:integrity`, `customer-data:email`, `shipping-address:address-line-1`). El estándar de URL exige que esos dos puntos se URL-encodeen como `%3A`, pero el CloudFront de Wompi a veces rechaza requests con `%3A` en los nombres. Por eso el código tiene una función `buildQueryPreservingColons` que escapa solo los valores, dejando los dos puntos literales en las keys.

Antes de devolver la URL al cliente, el endpoint guarda la orden en Supabase con status `pending`. También guarda cada item del carrito en la tabla `order_items`. Si la base de datos falla por cualquier motivo, el código no bloquea el checkout: loggea el error y sigue, porque es preferible cobrar al cliente y luego reconciliar manualmente.

Finalmente el endpoint devuelve un JSON con `reference`, `amountInCents`, `currency`, `checkoutUrl` y `isTest`. El componente del checkout lee el `checkoutUrl` y redirige el navegador del cliente con `window.location.href = data.checkoutUrl`.

A partir de ahí el cliente está en `checkout.wompi.co`. Wompi muestra el formulario de pago, el cliente elige método y completa la transacción. Cuando termina (con éxito o no), Wompi hace dos cosas en paralelo: redirige el navegador del cliente a la URL de retorno (`/order-confirm?reference=SB-...&id=tx_...`), y envía un POST al webhook que tengamos configurado en su dashboard.

## El webhook

El webhook está en `app/api/wompi/webhook/route.js`. Wompi le pega con cada evento de transacción: cuando se aprueba, cuando se rechaza, cuando se anula, cuando hay error.

Lo primero que hace el endpoint es **validar la firma del webhook**. Wompi incluye en el body una `signature.checksum` y una lista de `signature.properties` (los campos que se firmaron). La función `validateWebhookSignature` en `lib/wompi.js` reconstruye el string firmado siguiendo el orden de `properties`, lo concatena con el timestamp y el `WOMPI_EVENTS_SECRET`, calcula su SHA256, y compara con el checksum. Si no coincide, devuelve 401 y descarta el evento.

Si la firma es válida y el evento es `transaction.updated` (el único que nos interesa), el endpoint extrae el status (aprobada, rechazada, etc.) y actualiza la orden en Supabase buscándola por su `reference`. Si la orden no se encuentra (caso raro pero posible), devuelve OK y sigue: probablemente sea un webhook duplicado.

Si el status es `approved`, ocurren tres acciones en paralelo. Primero se carga la orden completa con todos sus items. Después se llama a `notifyAdminNewOrder(fullOrder, items)` que envía el email al admin, el email al cliente y el WhatsApp (si está configurado). En paralelo se llama a `sendOrderPush(fullOrder)` que dispara las notificaciones push web a todas las suscripciones del admin.

Por último se ejecuta `decrementInventory(orderId)` que recorre los items de la orden, lee el stock actual de cada producto en la tabla `inventory`, lo decrementa por la cantidad comprada, y guarda el nuevo valor. Si un producto no tiene registro previo en inventory, se crea uno con stock negativo (lo cual sirve como alerta de que se vendió sin tener stock registrado).

Todas estas acciones se hacen con `.catch(...)` para que un fallo en una no bloquee las otras. Si el email al cliente falla, el push y la actualización de inventario siguen. La orden ya quedó actualizada en Supabase, que es lo crítico.

## La URL de retorno

Cuando Wompi redirige al cliente a `/order-confirm`, la URL trae varios parámetros que Wompi agrega automáticamente: el `id` de la transacción, el `reference`, el `env` (test o production), el `status` y otros.

El componente `OrderConfirmPageClient` lee esos parámetros con `useSearchParams`. Hace fetch a `/api/wompi/transaction?id=<tx_id>` para obtener los detalles oficiales desde la API de Wompi (no confía en el status que vino en la URL, porque podría ser manipulado).

El endpoint `/api/wompi/transaction` llama a `fetchTransaction(id)` que es un wrapper sobre la API de Wompi: hace GET a `production.wompi.co/v1/transactions/<id>` con el header de autorización, y devuelve la data.

Con esa data el componente muestra la confirmación: el número de pedido, el total cobrado, el método de pago, el tiempo estimado de entrega, y el status. Si el status es approved muestra una pantalla verde con confirmación; si es declined o error muestra una pantalla roja con instrucciones para reintentar.

Al renderizar la página también se llama a `clearCart()` para vaciar el carrito, así si el cliente vuelve a la home no ve los items de la compra que ya completó.

## El cron de sincronización

Hay un endpoint adicional para casos donde el webhook falla: `/api/cron/sync-orders`. Este endpoint está pensado para ser llamado periódicamente (típicamente cada 15 minutos) por un cron job de Vercel o un servicio externo.

Lo que hace es buscar en Supabase todas las órdenes con status `pending` que llevan más de cierto tiempo (por defecto 10 minutos), y para cada una consulta a Wompi su estado actual mediante `fetchTransactionByReference(reference)`. Si Wompi reporta un estado distinto al que tenemos guardado, se actualiza la orden y se disparan las mismas acciones que el webhook (email, push, decremento de inventario).

Esto es una red de seguridad: si Wompi falla en enviar el webhook, o si nuestro endpoint estaba caído cuando llegó, el cron eventualmente sincroniza el estado.

## El modo simulado para desarrollo

En desarrollo local muchas veces no se quieren configurar las claves reales de Wompi (especialmente porque exponen el negocio a transacciones de prueba). Para esos casos, el código tiene un modo simulado.

En `CheckoutPageClient`, si la llamada a `/api/wompi/checkout` devuelve 503 (porque Wompi no está configurado), el código entra en un flujo donde genera un ID de orden falso (`SB-` + timestamp en base 36) y redirige a `/order-confirm?orderId=...&total=...&simulated=1`.

El `OrderConfirmPageClient` detecta el `?simulated=1` y muestra una confirmación dummy. La orden no se guarda en Supabase ni se cobra dinero. Esto permite probar el flujo de UX completo sin tocar Wompi.

## El admin puede resincronizar manualmente

En `/admin/orders` hay dos botones relevantes. El botón "Sincronizar pendientes" en el header hace lo mismo que el cron: itera sobre las órdenes pendientes y consulta a Wompi.

En el detalle de cada orden hay un botón "Resync con Wompi" que consulta el estado actual de esa orden específica. Esto es útil cuando el admin sospecha que el webhook falló para una orden particular.

Ambas acciones están implementadas como Server Actions en `app/admin/orders/_actions.js`, con la directiva `'use server'`. Esto significa que el código corre en el servidor, tiene acceso a `supabaseAdmin` y a las claves privadas de Wompi, y el cliente solo dispara la acción sin tener que pasar por una API route convencional.
