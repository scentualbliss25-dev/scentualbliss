# 04 · Páginas

Cada URL del sitio corresponde a un archivo dentro de la carpeta `app`. Este documento recorre cada una y explica qué hace y cómo se compone.

## La home (`/`)

La home es la página más densa del sitio en términos visuales. El archivo en `app/page.js` es muy simple: solo exporta la metadata para el SEO y renderiza el componente `HomePageClient`. Toda la lógica vive en `components/pages/HomePageClient.jsx`, que tiene casi 1300 líneas.

La página está compuesta por nueve secciones que se renderizan una debajo de otra.

La primera es el **Hero**, una sección visual estilo "editorial futurista". Tiene una botella centrada que rota sutilmente, anillos SVG decorativos a su alrededor con dashes punteados, un HUD lateral que muestra una referencia falsa (`SCT/0001`) y el nombre de la familia olfativa, y un panel vertical con seis atributos del perfume destacado (clima, género, concentración, nota de salida, corazón y fondo). El producto destacado es configurable: actualmente es `montale-arabians-tonka`. Hay dos CTAs: "Explorar colección" que lleva a la tienda, y "Quiz olfativo" que hace scroll a la sección del quiz.

Después viene la **TrustBar**, una banda con cuatro garantías que comunican confianza: envío gratis a toda Colombia, pago seguro con SSL y Wompi, devolución gratis durante 30 días, y autenticidad 100%. Es solo iconos con texto, pero refuerza credibilidad antes de mostrar productos.

A continuación está el **BrandsMarquee**, un carrusel infinito horizontal con los logos de todas las marcas que vende la tienda. La animación es CSS pura usando `@keyframes`, y los logos viven en `/public/img/brands/<slug>.webp`. Si una marca no tiene logo (porque el archivo no existe), el `onError` del `<img>` esconde su contenedor para que no quede un hueco.

La sección **Familias** muestra las seis familias olfativas como cards horizontales. Por defecto se ve la "Dulces" expandida y las otras cinco compactadas a su lado. Al pasar el mouse sobre cualquiera, esa se expande y las demás se compactan. Cada card tiene un link a `/tienda?cat=<familia>` con `prefetch={false}` para evitar que Next intente precargar todas en background.

Los **Bestsellers** muestran los ocho productos más vendidos (filtrados con `products.filter(p => p.bestseller).slice(0, 8)`). Cada producto se renderiza con un componente local llamado `PCard` (no el `ProductCard` del UI compartido, son distintos). Cada tarjeta tiene su botón de agregar al carrito y un icono de ojo para abrir el QuickView.

La sección **Featured** es una oferta flash con countdown. Tiene una imagen grande del producto (`lattafa-khamrah`), un descuento "-30%" en una insignia, y un contador regresivo de 20 horas. El timer arranca la primera vez que el usuario visita la página y se guarda en `localStorage` con la key `sb_flash_offer_end`, así que el mismo usuario ve el mismo countdown si vuelve más tarde.

La sección **Story** narra la historia de la marca con una imagen del Dior J'adore en un lado y texto en el otro, junto con tres stats grandes (155 fragancias, 28 marcas, 4.9 estrellas de valoración).

El **Quiz** olfativo es interactivo. Hace cuatro preguntas: para quién es el perfume (gender), cuándo lo va a usar (occasion), qué tipo de aroma le gusta (familia) y qué tipo de perfumes prefiere (diseñador, nicho, árabe o cualquiera). Cada respuesta aporta dos cosas: peso a ciertas familias olfativas (que se acumula en un score) y filtros duros (género y tipo de producto son obligatorios, ocasión es sugerencia). Al final del quiz, recorre todo el catálogo, descarta los productos sin precio o que no pasen los filtros duros, calcula un score combinando familia + ocasión + rating + bestseller, ordena por score descendente, toma los seis primeros y los re-ordena por precio ascendente. Cada recomendación lleva una etiqueta con la "razón" (la familia que coincide, o "Tu ocasión", o "Bestseller").

Los **Testimonials** son un carrusel horizontal con flechas a los lados. Al montarse el componente, hace fetch a `/api/reviews?limit=10` para traer reseñas reales de Supabase. Si la API falla o devuelve cero reseñas, usa el array hardcoded `testimonials` del archivo `lib/products.js`. Cada reseña tiene avatar (gradiente generado por hash del nombre), nombre, fecha relativa ("hace 3 días"), estrellas, texto y nombre del producto.

La sección **Newsletter** cierra la página. Es un formulario con un solo input de email. Al enviar, hace POST a `/api/newsletter`, que intenta insertar el email en la tabla `newsletter_subs` de Supabase. Si ya existe (error de unique constraint), muestra "Ya estás suscrito". Si todo va bien, muestra "Revisa tu email para tu código de 10% OFF".

Sobre todo el contenido, en posición absoluta, está el modal de **QuickView** que se abre cuando el usuario hace clic en el icono de ojo de un PCard. Este componente se carga con `dynamic({ ssr: false })`, así que su JavaScript (que incluye framer-motion, ~50 KB) no llega al navegador hasta que efectivamente se necesita.

## La tienda (`/tienda`)

La tienda es la página más compleja del lado del servidor. El archivo `app/tienda/page.js` lee los parámetros de URL, filtra los productos, y devuelve un grid con `ProductCard` por cada uno.

La página soporta nueve filtros distintos a través de query params en la URL. El usuario puede filtrar por familia olfativa (`?cat=dulce`), por tipo de producto (`?type=disenador`), por marca (`?brand=Dior`), por género (`?gender=Femenino`), por momento del día (`?momento=noche`), por clima (`?clima=frio`), por concentración (`?conc=EDP`), hacer búsqueda libre (`?q=khamrah`), y ordenar el resultado (`?sort=bestseller`). Adicionalmente hay `?page=2` para paginación.

Cualquiera de estos filtros acepta múltiples valores separados por coma. Por ejemplo, `?cat=dulce,floral` muestra productos de ambas familias. Esto lo maneja la función `vals()` en `lib/shop-filters.js`, que parsea el string de la URL y devuelve un array.

El componente de filtros (`ShopFilters`) es un Client Component que vive en `components/pages/ShopFilters.jsx`. Lee los searchParams actuales con el hook `useSearchParams` y al hacer clic en un filtro, construye una nueva URL con `URLSearchParams` y la navega con `router.push`.

La paginación funciona de forma híbrida. El SSR renderiza la primera página (24 productos por defecto, definidos en `PAGE_SIZE`). Si hay más resultados, aparece un botón "Cargar más" gestionado por el componente `ShopLoadMore`. Al hacer clic, este componente hace fetch a `/api/products?page=2` y agrega los nuevos productos al grid sin recargar. La URL del navegador se actualiza con `window.history.replaceState` para que sea compartible.

Para el SEO, la página genera title y description dinámicos según el filtro activo. Si el usuario está viendo `?cat=dulce`, el title es "Perfumes Dulces — Familia Olfativa". Si está en `?brand=Dior`, es "Perfumes Dior — Colección Oficial". Adicionalmente hay un JSON-LD de `ItemList` con todos los productos visibles, y un `BreadcrumbList` con la migajas de pan.

Una regla importante de SEO: cuando hay más de un filtro activo, o cuando se usa la búsqueda libre, la página se marca como `noindex`. Esto evita que Google indexe miles de combinaciones de filtros que son contenido delgado y duplicado.

Mientras carga la tienda (al navegar desde otra página), Next muestra un skeleton definido en `app/tienda/loading.js`. Es un esqueleto con tarjetas grises pulsando para que el usuario vea que algo está pasando.

## Las páginas de producto (`/perfume/[slug]`)

Cada producto tiene su propia URL con su slug. Por ejemplo, `/perfume/lattafa-khamrah`. La definición está en `app/perfume/[slug]/page.js`.

Esta página usa ISR (Incremental Static Regeneration). Los productos marcados como `bestseller` se pre-generan durante el build mediante `generateStaticParams`, así que son instantáneos. Los demás productos se generan bajo demanda la primera vez que alguien los visita, y luego quedan cacheados por una hora (`revalidate = 3600`).

Si el slug no existe en el catálogo, la función `notFound()` redirige a la página 404 estándar de Next.

El componente del servidor hace varias cosas. Primero busca el producto en `products`. Después llama a `resolveProductImages(product)`, una función que escanea el filesystem en `/public/img` buscando archivos que coincidan con el slug. Por ejemplo, para `lattafa-khamrah` busca `/img/lattafa-khamrah.webp`, `/img/lattafa-khamrah-2.webp`, `/img/lattafa-khamrah-3.webp` y `/img/lattafa-khamrah-4.webp`. Si encuentra archivos los usa; si no, cae al placeholder genérico.

Esta página renderiza tres bloques de JSON-LD en su HTML para que Google muestre rich snippets en los resultados de búsqueda. El primero es un `Product` con todas las propiedades olfativas (notas de salida, corazón, fondo, duración, sillage, etc.), su precio, disponibilidad, vendedor, política de envío gratis con tiempo de entrega de 1-5 días, y política de devolución de 30 días gratis. El segundo es un `BreadcrumbList` con la jerarquía Inicio > Tienda > Producto. El tercero es un `FAQPage` con preguntas auto-generadas como "¿Cuánto dura X en la piel?" o "¿Es para hombre o mujer?".

Si el producto tiene `price: 0`, el Schema.org cambia la disponibilidad a `PreOrder` en lugar de `InStock`, y no incluye un precio numérico (lo cual sería inválido y Google lo marcaría como error).

El componente cliente `ProductPageClient` recibe el producto y las imágenes resueltas, y renderiza la galería con miniaturas, la información principal (marca, nombre, precio, descripción), tabs con notas y detalles, un sistema de selección de talla, y los botones de agregar al carrito y comprar ahora. Más abajo hay una sección de social proof con las cuatro stats grandes (50,000+ clientes, 100% auténticos, Gratis envío, 4.9 estrellas), el componente `ProductReviews` que carga reseñas reales de Supabase y permite escribir una nueva, y un `ProductSeoContent` con descripción extendida y FAQ visible para humanos.

## El checkout (`/checkout`)

El archivo `app/checkout/page.js` renderiza `CheckoutPageClient`, que es un Client Component porque el checkout es 100% interactivo.

Si el carrito está vacío, en lugar del checkout muestra una pantalla con un mensaje y un CTA para ir a la tienda.

Si hay items, el flujo tiene dos pasos. En el primero el usuario llena sus datos: nombre, email, teléfono, dirección, ciudad y departamento. Hay validación inline: el nombre debe tener al menos tres caracteres, el email debe matchear un regex básico, el teléfono debe tener al menos siete dígitos. Si alguno falla, el campo se marca en rojo y un scroll automático lleva al primero con error.

En el segundo paso aparece el resumen de pago y el botón "Pagar con Wompi". Cuando se da clic, el frontend hace POST a `/api/wompi/checkout` con el contenido del carrito, los datos del cliente y los precios calculados. El endpoint crea la orden en Supabase con status `pending`, llama a Wompi para generar una URL de pago, y devuelve esa URL. El navegador hace redirect a Wompi, donde el cliente termina el pago.

El cálculo de precios funciona así: el subtotal es la suma de cada item por su cantidad. Si el usuario aplicó el cupón `BLISS15` se descuenta el 15%. Si el subtotal con descuento es mayor o igual a 350.000 COP, el envío es gratis; si no, cuesta 15.000 COP. El total es subtotal con descuento más envío.

En la barra lateral del checkout hay tres elementos de urgencia y prueba social que **son simulados intencionalmente**: un timer de "reserva" que cuenta 15 minutos hacia abajo, un contador de "viewers" que oscila aleatoriamente entre 3 y 18 personas, y un toast ocasional que dice "María en Bogotá acaba de comprar". Son recursos de marketing para aumentar la conversión, no funcionalidad real.

## La confirmación post-pago (`/order-confirm`)

Después de pagar en Wompi, el cliente regresa a `/order-confirm`. La URL incluye un parámetro `?id=` con el ID de la transacción Wompi, que el componente lee con `useSearchParams`. Hace fetch a `/api/wompi/transaction?id=...` para obtener los datos completos de la transacción y mostrarle al cliente el número de pedido, el total cobrado, el tiempo de entrega y el estado.

Si Wompi no está configurado (por ejemplo, en desarrollo local sin las env vars), el flujo cae al "simulated" donde se genera un ID dummy y se muestra una confirmación falsa.

Al renderizar esta página, también se limpia el carrito automáticamente (`clearCart()`).

## La lista de favoritos (`/wishlist`)

La página `app/wishlist/page.js` renderiza `WishlistPageClient`, que lee los items del `wishlistStore` (que viene de localStorage).

Si la lista está vacía, muestra un empty state con un CTA "Explorar tienda". Si tiene items, los muestra como `ProductCard` cada uno. Hay un botón global "Agregar todo al carrito" que recorre los favoritos y los agrega uno a uno.

## Las páginas legales y de soporte

Hay cinco páginas estáticas de información: `/contacto`, `/faq`, `/devoluciones`, `/terminos` y `/privacidad`. Cada una tiene su archivo en `app/<ruta>/page.js` y su contenido es texto plano sin interactividad.

La de contacto muestra los datos de la tienda: dirección en Medellín, teléfono, WhatsApp, email, y enlaces a las redes sociales. La de FAQ tiene preguntas frecuentes agrupadas por categoría (Pedidos, Envíos, Devoluciones, Productos) implementadas con elementos `<details>` colapsables nativos. Las tres legales son texto narrativo con secciones.

## El panel de admin (`/admin/orders`)

La URL `/admin/orders` está protegida por HTTP Basic Auth: el middleware exige usuario `admin` y contraseña tomada de la variable de entorno `ADMIN_PASSWORD`. Si no coincide, devuelve 401 y el navegador muestra el diálogo nativo de login.

Una vez dentro, el componente del servidor carga las últimas 500 órdenes desde Supabase (ordenadas por fecha descendente) y se las pasa al `AdminOrdersTable`, un Client Component.

La tabla permite buscar por referencia, email, nombre o teléfono; filtrar por status (Aprobadas, Pendientes, Rechazadas o Todas); seleccionar múltiples órdenes para eliminación en bulk; exportar todo lo filtrado a CSV; y hacer clic en cada orden para ir al detalle.

En el header del admin hay dos botones más. El `PushToggle` permite activar o desactivar las notificaciones push del navegador: cuando está activo, cada venta nueva genera un push en tiempo real. El `SyncAllPendingButton` recorre las órdenes pendientes y consulta a Wompi su estado actual, útil cuando el webhook falló por alguna razón.

Cada orden tiene su propia página de detalle en `/admin/orders/[id]`, donde se ve la lista completa de items, los datos del cliente, la dirección de envío y los `OrderActions` que permiten cambiar manualmente el status, forzar resync con Wompi, marcar como enviada o eliminar.

Una sutileza técnica importante: los tres Client Components del admin (`OrdersTable`, `PushToggle`, `SyncAllPendingButton`) se cargan con `dynamic({ ssr: false })` a través del wrapper `AdminClient.jsx`. Esto se hizo porque en un bug pasado, si uno de los tres reventaba durante la hidratación (por ejemplo `PushToggle` cuando el navegador no soportaba Notifications), los otros dos también morían y aparecía un error boundary. Aislarlos con dynamic significa que cada uno se hidrata independiente: si uno falla, los demás siguen funcionando.
