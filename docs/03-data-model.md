# 03 · Modelo de datos

## Dos fuentes de datos

ScentualBliss combina dos fuentes de datos distintas. El catálogo de productos vive directamente en el código JavaScript, en el archivo `lib/products.js`. Todo lo demás —órdenes, reseñas, inventario y suscripciones— vive en una base de datos Postgres en Supabase.

Esta decisión fue intencional. El catálogo de productos cambia poco (se agregan o quitan fragancias una o dos veces al mes) y mantenerlo en código simplifica mucho el render: no hay que consultar a la base de datos en cada página de producto. En cambio, las órdenes y reseñas sí cambian constantemente y necesitan persistencia real, por eso van en la base de datos.

## El catálogo de productos

El archivo `lib/products.js` tiene aproximadamente 1850 líneas. La mayor parte es un array gigante llamado `products` donde cada elemento es un objeto con toda la información de una fragancia.

Cada producto tiene los siguientes campos principales: un `id` numérico único, un `slug` (la versión URL-friendly del nombre, como `lattafa-khamrah`), el `name` (nombre del perfume), la `brand` (marca), el `type` (la concentración: EDP, EDT, Parfum, etc.), el `price` en pesos colombianos, opcionalmente un `originalPrice` para mostrar tachado cuando hay descuento, el `productType` (uno de tres: `disenador`, `nicho` o `arabe`), la `category` que es la familia olfativa (`floral`, `frutal`, `fresco`, `citrico`, `dulce` o `amaderado`), un array de `sizes` con presentaciones disponibles y precios por talla, un array de `images` con las rutas a las fotos, el `rating` y `reviews` (cantidad), el `stock` declarado, opcionalmente un `badge` con su `badgeColor` para destacarlo en el listado, las `notes` con tres niveles (top, heart, base), una `description` larga, datos olfativos como `longevity`, `sillage`, `season`, el `gender` (Masculino, Femenino o Unisex), un array de `occasion` con etiquetas como "Noche" o "Trabajo", y dos flags booleanas `featured` y `bestseller`.

Hay una nota importante sobre el campo `price`: nunca se debe usar `Infinity`. En el pasado había productos con `price: Infinity` para indicar "consultar precio", pero eso causaba un bug crítico en producción. React Server Components no puede serializar `Infinity` correctamente: lo marca como `"$Infinity"` en el RSC payload y el cliente falla al deserializarlo. La convención actual es usar `price: 0` para productos sin precio definido, y el código se encarga de mostrar "Consultar precio" en lugar del precio.

Además del array `products`, el archivo exporta varios catálogos auxiliares que se usan para los filtros y el menú. `productTypes` define los tres tipos principales (Nicho, Diseñador, Árabe) con sus descripciones e imágenes representativas. `collections` define las seis familias olfativas con sus colores semánticos (rosa para floral, naranja para cítrico, marrón para amaderado, etc.). `momentoOptions` define tres momentos del día (Día, Noche, Ambos) y `climaOptions` define tres climas (Cálido, Templado, Frío).

También hay dos funciones helper interesantes. `deriveMomento(product)` analiza el campo `occasion` del producto con expresiones regulares: si encuentra palabras como "noche", "gala" o "cita", devuelve `'noche'`; si encuentra "día", "trabajo", "casual", devuelve `'dia'`; si encuentra ambos o ninguno, devuelve `'ambos'`. `deriveClima(product)` hace algo similar pero con el campo `season`: si dice "Verano" o "Primavera" devuelve `'calido'`, si dice "Otoño" o "Invierno" devuelve `'frio'`, en cualquier otro caso devuelve `'templado'`. Estas funciones permiten que el filtro por momento o clima funcione sin tener que actualizar manualmente cada producto.

Por último, el archivo exporta un array `testimonials` con cuatro reseñas hardcoded. Estas sirven como fallback en la home si la consulta a Supabase devuelve cero reseñas reales.

## La base de datos en Supabase

Supabase es un servicio que provee Postgres con una API REST encima. Lo usamos para guardar todo lo dinámico del sitio. Las tablas principales son seis.

### Órdenes y items de órdenes

La tabla `orders` guarda cada pedido. Tiene un `id` UUID como clave primaria, una `reference` que es el código de la orden (algo como `SB-1735234567`), un `wompi_tx_id` con el ID de la transacción en Wompi, un `status` que puede ser `pending`, `approved`, `declined`, `voided` o `error`, los datos del cliente (`customer_name`, `customer_email`, `customer_phone`), la dirección de envío (`shipping_address`, `shipping_city`, `shipping_department`), los precios (`subtotal`, `shipping_cost`, `total`, `discount`) y las marcas de tiempo (`created_at`, `updated_at`).

Esta tabla la crea inicialmente el endpoint `/api/wompi/checkout` cuando el cliente da clic en "Pagar" (con status `pending`). Después el webhook de Wompi (`/api/wompi/webhook`) la actualiza con el resultado del pago.

Cada orden tiene varios items, que viven en la tabla `order_items`. Cada item guarda referencia al `order_id`, el `product_id`, el `product_name`, el `product_slug`, la `selected_size` que eligió el cliente, la `quantity`, el `unit_price` y el `total_price` (cantidad multiplicada por precio).

### Reseñas

La tabla `reviews` guarda las reseñas que escriben los clientes en las páginas de producto. Cada reseña tiene un `id`, el `product_slug` al que se refiere, el `author_name`, un `rating` entero del 1 al 5, el `text` libre y el `created_at`.

Se accede a través de los endpoints `/api/reviews`: con GET y un parámetro `?slug=foo` devuelve las reseñas de un producto, y con POST crea una nueva reseña.

### Inventario

La tabla `inventory` lleva el stock en tiempo real, separado del `stock` declarado en `lib/products.js`. Esta tabla se modifica automáticamente: cuando una orden pasa a `approved` en el webhook de Wompi, la función `decrementInventory` resta la cantidad comprada del stock disponible.

Si el producto no tiene un registro previo en la tabla, se crea uno nuevo (con stock negativo si la venta excedió lo registrado, lo cual sirve como alerta para el admin).

### Suscripciones push

La tabla `push_subscriptions` guarda las suscripciones a notificaciones push del admin. Cuando el admin activa las notificaciones en `/admin/orders`, su navegador genera un endpoint único y dos claves criptográficas (`keys_p256dh` y `keys_auth`) que se guardan en esta tabla. Después, cuando llega una venta nueva, el servidor recorre todas las suscripciones y le envía push a cada una.

### Newsletter

La tabla `newsletter_subs` simplemente guarda emails únicos de quienes se suscribieron al newsletter desde la home. La columna `email` tiene un constraint UNIQUE, así que si alguien intenta suscribirse dos veces con el mismo email, Postgres devuelve el código de error `23505` (unique_violation) y el endpoint `/api/newsletter` responde con `{ already: true }` para que el frontend muestre "Ya estás suscrito".

## Los clientes de Supabase

En `lib/supabase.js` se crean dos clientes distintos según el nivel de privilegios.

El cliente público se llama `supabase` y usa el `ANON_KEY`, que respeta las políticas Row Level Security configuradas en Supabase. Este cliente es seguro de usar en código que llegue al navegador, aunque en la práctica no lo usamos en el cliente.

El cliente administrador se llama `supabaseAdmin` y usa el `SERVICE_ROLE_KEY`, que tiene permisos totales y se salta cualquier política de seguridad. Este cliente nunca debe importarse en un componente cliente, solo en server components o en API routes. Si por accidente se importara en un client component, la service key quedaría expuesta en el bundle de JavaScript que se envía al navegador, lo cual sería un agujero de seguridad serio.

Ambos clientes son `null` si las variables de entorno correspondientes no están configuradas, por eso el código siempre verifica `if (!supabaseAdmin) return ...` antes de usarlo.

## El estado del cliente con Zustand

Aparte de la base de datos, el sitio mantiene tres "stores" en el navegador del usuario usando la librería Zustand. Estos son volátiles (existen solo durante la sesión) pero dos de ellos se persisten en `localStorage`.

El **cartStore** es el más importante. Guarda los items del carrito, cuántos hay, y si el drawer del carrito está abierto o cerrado. Expone funciones para agregar items, removerlos, actualizar cantidades, vaciar el carrito completo y abrir/cerrar el drawer. Se persiste en `localStorage` con la key `scentualbliss-cart`, así que el carrito sobrevive a recargas de página y a cerrar el navegador.

El **wishlistStore** maneja la lista de favoritos. Es más simple: solo tiene un array de productos y una función `toggle` que agrega o quita un producto según ya esté o no en la lista. También se persiste en `localStorage` con la key `scentualbliss-wishlist`.

El **quickViewStore** maneja el producto que se muestra en el modal de vista rápida. Solo tiene un producto (o `null`) y dos funciones: `open(product)` y `close()`. No se persiste, porque el modal cerrado al recargar la página es lo esperado.

Los dos stores persistidos tienen protecciones especiales contra datos corruptos en `localStorage`. Hay una función llamada `safeItems` que garantiza que el array de items siempre sea un array válido (no `null`, no `undefined`, no un objeto malformado). Y hay un callback `onRehydrateStorage` que si detecta un error al deserializar lo guardado, limpia el localStorage automáticamente. Esto previene un bug que se reportó dos veces en el pasado: cuando había datos viejos incompatibles en localStorage, todo el sitio reventaba con "Application error".

Más detalles sobre el comportamiento exacto de cada store están en el documento 06.
