# 02 · Arquitectura

## Cómo está organizado el código

El proyecto sigue la estructura estándar de Next.js 15 con App Router. Las tres carpetas principales son `app`, `components` y `lib`.

La carpeta `app` define las rutas del sitio. Cada subcarpeta corresponde a una URL y debe contener al menos un archivo `page.js` o `page.jsx`. Por ejemplo, la URL `/tienda` se sirve desde `app/tienda/page.js`. Las rutas dinámicas usan corchetes en el nombre de la carpeta: `app/perfume/[slug]/page.js` responde a `/perfume/cualquier-cosa`. Las APIs siguen una convención similar pero dentro de `app/api`: el endpoint `/api/wompi/checkout` se define en `app/api/wompi/checkout/route.js`.

La carpeta `components` agrupa los componentes React reutilizables y se divide en cuatro grupos. En `components/layout` están los elementos que aparecen en todas las páginas: el Navbar, el Footer y la AnnouncementBar de arriba. En `components/pages` están los componentes que constituyen el contenido principal de una página específica, como `HomePageClient` (que es la home entera en un solo archivo de 1300 líneas) o `ProductPageClient`. En `components/ui` están las piezas más atómicas que se usan en múltiples lugares: ProductCard, QuickView, Breadcrumbs. Finalmente `components/cart` tiene el CartDrawer, el carrito lateral.

La carpeta `lib` reúne toda la lógica que no es directamente React. El archivo más grande es `lib/products.js`, que contiene el catálogo completo de 155 productos como objetos JavaScript. También está `lib/shop-filters.js` con la función que filtra y ordena productos, `lib/supabase.js` con los clientes de la base de datos, `lib/wompi.js` con los helpers para hablar con la pasarela de pagos, y `lib/notifications.js` con el sistema de envío de correos. Los stores de Zustand viven en `lib/store/`.

Los assets estáticos (imágenes, iconos, manifest PWA) están en `public`.

## Cómo se sirve una página: el ciclo completo

Cuando un usuario escribe `https://scentualbliss.com.co/tienda?cat=dulce` en su navegador, la petición pasa por varias capas antes de devolver el HTML.

Primero, la petición llega al CDN de Vercel, que la pasa al **middleware** definido en `middleware.js`. El middleware corre antes de cualquier ruta y hace tres cosas: si la URL comienza con `/admin`, exige autenticación HTTP Basic; si la URL trae parámetros de tracking como `srsltid` o `_gl` los limpia y redirige a la URL sin ellos; y si trae un parámetro `?type=EDP` (de una versión vieja del sitio), redirige a `?conc=EDP`.

Después el middleware llama al **Server Component** que corresponde a esa ruta. Para `/tienda` es `app/tienda/page.js`, que es una función async. Esta función lee los `searchParams`, llama a `filterAndSort` para obtener los productos que pasan los filtros, y renderiza el HTML resultante. Como es Server Component, todo este trabajo ocurre en el servidor de Vercel y el navegador solo recibe HTML.

Una vez que el HTML llega al navegador, **React hidrata** los componentes que tienen `'use client'`. Hidratar significa que React reconecta el HTML estático con sus event listeners y estado interno, para que se vuelva interactivo. Por ejemplo, `ProductCard` es un Client Component y al hidratar permite hacer clic en el botón del corazón para agregar a favoritos.

Algunos componentes se cargan **diferidos** con `dynamic({ ssr: false })`. El más notable es el `DeferredShell` que envuelve el CartDrawer, WhatsAppFloat y ScrollToTop. Estos componentes no son críticos para el primer paint, así que se cargan después de que la página ya se mostró, mejorando la velocidad percibida.

## Modo de renderizado de cada página

Next.js permite tres modos de renderizado y cada página del sitio usa el más apropiado.

La home (`/`) es **estática**. Su contenido principal no depende de parámetros de URL ni de datos de la base de datos al momento de servir. Se pre-genera en el build y se sirve desde el CDN como HTML plano.

La tienda (`/tienda`) es **completamente dinámica** mediante `export const dynamic = 'force-dynamic'`. Esto es necesario porque usa `await searchParams` para leer los filtros, y eso es incompatible con el cacheo estático. Cada visita ejecuta el server component fresco.

Las páginas de producto individuales (`/perfume/[slug]`) usan **ISR** (Incremental Static Regeneration) con `revalidate = 3600`. Los productos marcados como bestseller se pre-generan en el build mediante `generateStaticParams`. El resto se genera bajo demanda la primera vez que alguien los visita, y luego quedan cacheados por una hora.

El admin (`/admin/orders`) es **force-dynamic** con `revalidate = 0`, porque siempre necesita mostrar la lista de órdenes actualizada al segundo.

Las páginas legales y de contacto (`/faq`, `/contacto`, `/terminos`, `/privacidad`, `/devoluciones`) son **estáticas**: su contenido no cambia y se pre-genera en el build.

## El middleware al detalle

El archivo `middleware.js` en la raíz se ejecuta antes de cada request que coincida con su matcher. Está configurado para correr en todas las rutas excepto los assets estáticos (`_next/static`, `_next/image`, imágenes en `/img/`, el favicon y las rutas API).

Cuando la URL empieza con `/admin`, el middleware exige autenticación HTTP Basic. Lee el header `Authorization`, decodifica las credenciales y las compara contra `process.env.ADMIN_PASSWORD`. Si no coinciden, devuelve un 401 con el header `WWW-Authenticate` apropiado para que el navegador muestre el diálogo de login.

Después del check de admin, el middleware mira si la URL trae parámetros de tracking innecesarios. Hay una lista de cuatro: `srsltid` (Google Shopping), `_gl` (Google Linker), `igshid` (Instagram) y `mc_eid` (Mailchimp). Estos los crea automáticamente Google al hacer clic desde resultados de Shopping, o las redes sociales al compartir links. Si Google encuentra dos URLs distintas con el mismo contenido (una con `?srsltid=xxx` y otra sin), las trata como duplicadas y penaliza el SEO. Por eso las eliminamos con un redirect 301.

La tercera función del middleware es manejar URLs viejas. Antes el parámetro `?type=EDP` significaba "concentración EDP", pero después se cambió: ahora `type` significa "diseñador/nicho/árabe" y la concentración pasó a llamarse `conc`. Para no romper enlaces externos que apuntan a la versión vieja, si llega un `?type=EDP` (o cualquier otra concentración), se redirige a `?conc=EDP`.

## Cómo se renderiza la home paso a paso

La home es un buen ejemplo del modelo Server Component + Client Component, porque tiene los dos.

El archivo `app/page.js` es un Server Component muy simple: exporta el objeto `metadata` para el SEO y devuelve `<HomePageClient />`. No hace más.

`HomePageClient.jsx` sí es un Client Component (lleva `'use client'` al inicio) y es donde está toda la lógica. Tiene casi 1300 líneas. Adentro hay varios componentes locales (no exportados) que se montan en orden: el Hero con la botella destacada, la TrustBar con las cuatro garantías, el BrandsMarquee con los logos en scroll horizontal, la sección de Familias olfativas con hover expandible, los Bestsellers (top 8 más vendidos), el Featured con la oferta flash y countdown, el Story con la historia de la marca, el Quiz olfativo, los Testimonials y el formulario de Newsletter.

Por debajo, en `app/layout.js`, ya están renderizados los elementos globales: la AnnouncementBar con el marquee de mensajes, el Navbar sticky, el ToasterWrapper para las notificaciones toast, y al final el DeferredShell con el CartDrawer, WhatsAppFloat y ScrollToTop.

Cuando el usuario hace clic en una tarjeta de producto en los Bestsellers, no se navega: en vez de eso se abre el modal de QuickView. Si hace clic en el nombre del producto, sí se navega a la página de detalle. Esa navegación es client-side: Next.js descarga solo el "RSC payload" de la nueva ruta y reemplaza el contenido sin recargar la página completa.

## Resumen visual de las rutas

El sitio tiene rutas públicas, rutas de admin y rutas de API.

Las rutas públicas son las que ve el usuario final: la home (`/`), la tienda con filtros (`/tienda`, `/tienda?cat=dulce`, `/tienda?brand=Dior`, etc.), las páginas de producto (`/perfume/<slug>`), el checkout (`/checkout`), la confirmación post-pago (`/order-confirm`), la lista de favoritos (`/wishlist`) y las páginas informativas (`/contacto`, `/faq`, `/devoluciones`, `/terminos`, `/privacidad`).

Las rutas de admin están protegidas por HTTP Basic Auth e incluyen la lista de órdenes (`/admin/orders`) y el detalle de cada una (`/admin/orders/<id>`).

Las rutas de API son endpoints que reciben y devuelven JSON. Las principales son las de Wompi (checkout, webhook y consulta de transacción), las de reseñas, la de productos paginados, la de suscripción al newsletter, la de suscripción a notificaciones push y el cron que sincroniza órdenes pendientes con Wompi.

Adicionalmente Next.js genera dinámicamente `/sitemap.xml` desde `app/sitemap.js` y `/robots.txt` desde `app/robots.js`.

Hay dos archivos que vale la pena mencionar pero **están desactivados**: `app/opengraph-image.jsx` y `app/twitter-image.jsx`. Estos generaban las imágenes de preview para redes sociales, pero causaron un bug crítico donde la navegación cliente-side hacia la tienda se rompía con un error de "Server Components render". Por ahora están eliminados; si se quieren rehabilitar, hay que investigar más a fondo por qué chocan con SPA navigation.
