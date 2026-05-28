# 08 · Notificaciones

## Tres canales en paralelo

Cuando una venta se aprueba en Wompi, el sistema dispara hasta tres tipos de notificación distintos. Cada una atiende un caso de uso particular y los tres se ejecutan en paralelo (con `Promise.all`) para no demorar la respuesta del webhook.

El primer canal es **email transaccional via Resend**. Hay dos correos que viajan por este canal: uno al admin de la tienda avisándole de la venta, y otro al cliente confirmándole su pedido.

El segundo canal es **Web Push notifications**. Cuando el admin activa las notificaciones en `/admin/orders`, su navegador queda suscrito y recibe pushes inmediatos cuando entra una venta, incluso si la pestaña está cerrada.

El tercer canal es **WhatsApp via CallMeBot**. Está pensado como notificación al admin pero está deshabilitado en este momento porque puede generar baneo de WhatsApp Business si se usa intensivamente. El código está listo pero las variables de entorno no están configuradas.

Los tres canales conviven en `lib/notifications.js` y `lib/push.js`.

## Configuración de Resend

Resend es el servicio que envía los emails transaccionales. Funciona similar a SendGrid o Mailgun pero más simple y con mejor entregabilidad.

La cuenta está registrada con el correo `scentualbliss25@gmail.com` y el plan free permite enviar 3.000 emails al mes y 100 al día, suficiente para el volumen actual.

Para que Resend pueda enviar emails con el remitente `@ventas.scentualbliss.com.co`, se verificó el subdominio `ventas.scentualbliss.com.co` en su panel. Esto requirió agregar tres registros DNS en Seret (el proveedor del dominio): un TXT de SPF que autoriza a Amazon SES (la infraestructura sobre la que corre Resend), un TXT de DKIM para firmar los correos criptográficamente, y un TXT de DMARC con política básica. Después de que esos tres registros propagaron, el dominio quedó verificado y empezamos a poder enviar.

Las variables de entorno en Vercel son tres. `RESEND_API_KEY` es la clave de API que se crea en el panel de Resend; empieza con `re_`. `ADMIN_EMAIL` es la dirección a donde llegarán las notificaciones de venta (configurado a `scentualbliss25@gmail.com`). `FROM_EMAIL` es la dirección remitente; está configurado como `ScentualBliss <noreply@ventas.scentualbliss.com.co>` para que el cliente vea "ScentualBliss" como nombre del remitente.

## El email al admin

Cuando entra una venta aprobada, el webhook de Wompi llama a `notifyAdminNewOrder(order, items)`, que internamente dispara `sendOrderEmail(order, items)`. Esta función está en `lib/notifications.js`.

El email al admin tiene asunto `🎉 Nueva orden COP $XXX.XXX — SB-XXXX` para que sea fácilmente identificable en la bandeja. El cuerpo es HTML elaborado con un header dorado que dice "Nueva orden aprobada", seguido del nombre de cliente, email, teléfono, dirección de envío, una tabla con los productos comprados (nombre, talla, cantidad, precio), el total cobrado destacado en grande, y un botón que lleva directo al detalle en `/admin/orders/<id>`.

El propósito es que el admin pueda procesar la orden lo más rápido posible. En el email tiene toda la información para preparar el envío sin tener que entrar al panel: nombre, dirección, productos, tallas. Si entra al panel, el botón lo lleva directo a esa orden.

## El email al cliente

Más importante incluso que el email al admin es el que recibe el cliente. Después de pagar, el cliente espera una confirmación inmediata: si no la recibe, escribe preguntando "¿llegó mi pago?" o asume que algo salió mal.

La función `sendCustomerOrderConfirmation(order, items)` envía este correo. El asunto es simple y reconocible: "Tu pedido está confirmado · ScentualBliss". El diseño del correo es premium minimalista, intencionalmente sobrio para no parecer un correo de marketing.

La estructura del email tiene cinco bloques visuales. Arriba un header oscuro con el monograma "SCENTUALBLISS · Perfumería Original" en un marco dorado. Debajo el saludo "Gracias, [Nombre]" seguido de un mensaje corto que confirma la recepción del pedido. A continuación dos cards lado a lado mostrando el número de pedido y la fecha. Luego la lista de productos comprados, en tipografía limpia sin imágenes (para máxima compatibilidad con clientes de email). Después un resumen del pago con subtotal, envío (resaltado en verde si es gratis) y total. La dirección de envío. Y un timeline visual con tres pasos numerados: "Preparamos tu pedido" (activo en oro), "Despachamos a la transportadora" (próximo, gris), "Llega a tu puerta".

Cierra con una card de soporte que invita a contactar por WhatsApp o email, y un footer oscuro con el branding y un disclaimer de que es un email transaccional.

El HTML está construido con tablas en lugar de divs, porque los clientes de email (especialmente Outlook) no soportan bien CSS moderno. El estilo es 100% inline para máxima compatibilidad. Las fuentes son fallbacks del sistema (`-apple-system`, `Segoe UI`, etc.) más Georgia para los acentos serif.

Una decisión consciente: no hay imágenes en el email. Las imágenes en clientes de email tienen dos problemas: muchos clientes las bloquean por defecto (Gmail desktop, Outlook), y el formato WebP no es universalmente soportado. Un email con solo tipografía carga al instante y se ve consistente en cualquier cliente.

## Web Push para el admin

Las notificaciones push son la forma más rápida de avisarle al admin de una venta. A diferencia del email (que puede tardar minutos en aparecer en su bandeja), un push aparece en segundos en su navegador.

El sistema usa el protocolo Web Push estándar con claves VAPID. La librería `web-push` se encarga de la firma criptográfica y el envío al servicio push del navegador (FCM para Chrome, APNs para Safari, etc.).

Para que funcione, hace falta generar un par de claves VAPID. Esto se hace una sola vez con `npx web-push generate-vapid-keys`. Las dos claves se guardan como variables de entorno: `NEXT_PUBLIC_VAPID_PUBLIC_KEY` (la pública, accesible al frontend) y `VAPID_PRIVATE_KEY` (la privada, solo server-side). También se configura un `VAPID_SUBJECT` con un email de contacto (por defecto `mailto:admin@scentualbliss.com.co`) que algunos servicios push exigen.

El admin activa las notificaciones desde `/admin/orders` usando el botón `PushToggle`. Al darle clic, el navegador pide permiso (Notification.requestPermission), el admin acepta, y entonces el código llama a `pushManager.subscribe` que devuelve un objeto con un endpoint único y dos claves criptográficas. Ese objeto se envía a `/api/push/subscribe` que lo guarda en la tabla `push_subscriptions` de Supabase.

Cuando entra una venta, la función `sendOrderPush(order)` en `lib/push.js` lee todas las suscripciones de la tabla, construye un payload con el título (`💰 Nueva orden COP $XXX.XXX`), el body (`Cliente — SB-XXXX`) y la URL del detalle, y llama a `webpush.sendNotification` para cada suscripción.

Si el envío falla con código 410 (Gone) o 404 (Not Found), significa que la suscripción ya no es válida (el admin desinstaló el navegador, borró las cookies, o canceló desde Configuración). Esas suscripciones se eliminan automáticamente de la tabla para que no crezca indefinidamente con basura.

El service worker que recibe los pushes está en `public/sw.js`. Cuando llega un push, el service worker muestra una notificación nativa con título, body e icono. Al hacer clic en la notificación, abre el sitio en la URL indicada (típicamente `/admin/orders/<id>`).

## WhatsApp via CallMeBot (deshabilitado)

El código tiene preparado un canal por WhatsApp pero actualmente no se usa. Funciona a través de CallMeBot, un servicio gratuito que permite enviar mensajes de WhatsApp programáticamente.

La función `sendOrderWhatsApp(order, items)` arma un mensaje con emojis y formato Markdown de WhatsApp (negritas con asteriscos) y lo envía mediante un GET a `api.callmebot.com/whatsapp.php` con tres parámetros: el teléfono del destinatario, el texto del mensaje y la API key.

La razón por la que está deshabilitado es que CallMeBot funciona haciendo scraping del WhatsApp Web del propio CallMeBot, lo cual va contra los términos de servicio de WhatsApp. En la práctica para volumen bajo (un mensaje por venta) no suele dar problemas, pero existe el riesgo de que WhatsApp banee el número que recibe los mensajes. Por eso decidimos no activarlo: el email y el push cubren la necesidad.

Si se quisiera activar, hay que setear `CALLMEBOT_PHONE` (el número del admin con código de país, sin el más: `573169376436`) y `CALLMEBOT_APIKEY` (siete dígitos que CallMeBot devuelve después de un setup inicial).

## La función unificada

El webhook de Wompi no llama directamente a las tres funciones por separado. En lugar de eso, llama a `notifyAdminNewOrder(order, items)` que es un wrapper. Internamente ese wrapper dispara las tres en paralelo:

- `sendOrderEmail(order, items)` — email al admin
- `sendOrderWhatsApp(order, items)` — WhatsApp al admin (si está configurado)
- `sendCustomerOrderConfirmation(order, items)` — email al cliente

Las tres se ejecutan con `Promise.all` y cada una tiene su propio `.catch` para que un fallo no derrumbe las otras. La función final loggea cuántos canales lograron enviar exitosamente.

El push notification se llama por separado desde el webhook (`sendOrderPush(fullOrder)`), no dentro de `notifyAdminNewOrder`. Esto es solo organización: el push es un canal completamente distinto que no comparte ninguna dependencia con los emails.

## Limitación de Resend sin dominio verificado

Hay una limitación importante del plan free de Resend que conviene tener presente. Antes de verificar un dominio propio, Resend solo permite enviar emails a la dirección con la que se registró la cuenta (`scentualbliss25@gmail.com` en este caso).

Esto fue motivo de un susto durante el setup: el email al admin funcionaba perfecto, pero el email al cliente no llegaba a nadie excepto si el cliente coincidía con la cuenta de Resend. La solución fue verificar el subdominio `ventas.scentualbliss.com.co`. Una vez verificado, se puede enviar a cualquier dirección de email del mundo.

Por eso es importante mantener el dominio verificado. Si por alguna razón se pierde la verificación (por ejemplo, si se modifican los registros DNS), los emails al cliente dejarán de funcionar silenciosamente y solo se reportarán los errores en los logs de Resend.

## Cómo probar las notificaciones manualmente

Para probar el sistema sin completar una compra real existen varios caminos.

Para probar el envío de email directamente, basta con hacer una petición POST al API de Resend con curl, usando la API key como Bearer token. Hay un ejemplo en el historial del proyecto cuando se hizo el setup inicial.

Para probar todo el flujo del webhook, se puede simular un POST a `/api/wompi/webhook` con un payload de prueba. Wompi tiene documentación de la estructura esperada. El problema es que sin la firma correcta el webhook rechaza el evento, así que hay que calcular la firma a mano con el `WOMPI_EVENTS_SECRET` o desactivar temporalmente la validación.

La forma más limpia es hacer una venta real en modo sandbox de Wompi (con `pub_test_` y tarjeta de prueba). Wompi tiene tarjetas de prueba documentadas que aprueban o rechazan automáticamente. Eso dispara el webhook completo y se puede ver el flujo end-to-end.
