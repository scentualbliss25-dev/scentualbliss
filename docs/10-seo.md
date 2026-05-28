# 10 · SEO y datos estructurados

## Estrategia general

El SEO de ScentualBliss apunta a posicionarse en búsquedas relacionadas con marcas y nombres específicos de fragancias. Las búsquedas tipo "comprar Khamrah Lattafa Colombia" o "Dior Sauvage Elixir precio" son las que más tráfico cualificado traen, y el sitio está optimizado para aparecer ahí.

Las tres palancas principales que usamos son: metadata HTML completa en cada página (title, description, OpenGraph, Twitter Cards), structured data en JSON-LD (Product, Organization, WebSite, BreadcrumbList, FAQPage, ItemList), y un sitemap detallado con imágenes incluidas para que Google Images indexe las fotos de cada producto.

Otras decisiones que apoyan el SEO son: URLs limpias y consistentes (los productos siguen el patrón `/perfume/<slug>`, las categorías `/tienda?cat=<id>`), redirects 301 desde URLs viejas a las nuevas para no perder authority de enlaces externos, y un canonical claro en cada página para evitar contenido duplicado.

## Metadata global

La metadata base del sitio se define en `app/layout.js`. Ahí se exporta un objeto `metadata` con todos los campos que aplican a cualquier página y un objeto `viewport` con configuración de viewport y theme color.

El title tiene un patrón configurado: por defecto es "ScentualBliss — Perfumería Original" y cuando una página específica define su propio title, se compone con el template "%s | ScentualBliss". Por ejemplo, una página de producto puede tener "Comprar Khamrah de Lattafa | Perfume Unisex Dulce | ScentualBliss" donde la parte hasta el primer pipe es lo que define la página y el resto sale del template global.

La description base habla de "fragancias únicas creadas para quienes no se conforman con lo ordinario" y menciona los tipos de perfumes y el envío gratis a Colombia. Las keywords incluyen términos como "perfumes de lujo", "fragancias exclusivas", "oud", "floral", "oriental", "perfumes Colombia", "perfumes Medellín" y nombres de marcas top como "Dior Sauvage", "Creed Aventus", "Lattafa Khamrah", "Tom Ford".

OpenGraph y Twitter Cards heredan el mismo title/description y declaran `siteName: ScentualBliss`, `locale: es_CO`, `type: website`. La URL canónica de la home está configurada en `alternates.canonical: '/'`.

El theme-color va en el viewport y define dos colores según prefer-color-scheme: `#FDFBF7` para light mode (el marfil cálido del sitio) y `#1F1A14` para dark mode (la tinta oscura). Esto pinta la barra superior del navegador móvil con el color de marca en lugar del gris default.

Hay también un `format-detection: telephone-no` que evita que iOS subraye automáticamente los números como teléfono clickeable cuando no queremos ese comportamiento.

Los íconos están configurados: favicon en `/favicon.ico`, íconos PWA en `/icon-32.png`, `/icon-192.png`, `/icon-512.png`, y `/apple-icon.png` para iOS. También hay un manifest en `/manifest.json` para que el sitio se pueda instalar como PWA básica.

## Metadata por página

Cada página define metadata específica que sobrescribe o complementa la global. Las más importantes son las páginas de producto, porque son las que más tráfico SEO reciben.

En `app/perfume/[slug]/page.js`, la función `generateMetadata` genera metadata dinámica para cada producto. El title sigue el patrón "Comprar <Nombre> <Tipo> de <Marca> | Perfume <Género> <Familia> | ScentualBliss". La description combina los primeros 100 caracteres de la descripción del producto con las notas olfativas, la duración y un cierre de "Envío gratis a Colombia". Las keywords incluyen variaciones de búsqueda como "comprar X", "X precio", "X EDP", "perfume <género>", "perfume <familia>", "perfumes <marca>" y cada ocasión del producto como "perfume para Noche", "perfume para Trabajo".

El canonical apunta a la URL absoluta del producto. El OpenGraph incluye la imagen real del producto con dimensiones 800x1000 y un alt descriptivo. También hay un Twitter Card de tipo `summary_large_image`.

Hay además un bloque `other` en la metadata con las facebook product meta tags: `product:brand`, `product:availability`, `product:condition`, `product:price:amount` y `product:price:currency`. Estas las lee Facebook para mostrar previews ricos cuando el link se comparte ahí. Si el precio del producto es 0 o Infinity, las dos últimas se omiten para no generar metadata inválida.

En la tienda (`app/tienda/page.js`), la metadata es estática. Esto se debe a que en algún momento se intentó hacer `generateMetadata` dinámica con el filtro activo (para que `?cat=dulce` mostrara "Perfumes Dulces — Familia Olfativa"), pero eso causó un bug crítico en el RSC payload (descrito en el documento de troubleshooting). Por seguridad ahora es estática.

## Structured data con JSON-LD

JSON-LD es el formato preferido por Google para datos estructurados. Lo inyectamos como `<script type="application/ld+json">` dentro del HTML.

### En el layout global

En `app/layout.js` hay dos bloques JSON-LD que se renderizan en TODAS las páginas. El primero es un `Organization` con la información de la marca: nombre, URL, logo (con dimensiones), descripción, dirección postal (Medellín, Antioquia, Colombia), punto de contacto con teléfono y horarios, y un array `sameAs` con los links a las redes sociales. Esto le permite a Google asociar el sitio con su perfil oficial de marca y mostrar el logo en los resultados de búsqueda (Knowledge Graph).

El segundo bloque es un `WebSite` que declara el sitio y, lo más importante, una `SearchAction` que le dice a Google cuál es la URL del buscador interno. Esto puede activar el "sitelinks search box" en SERP (un buscador adicional debajo del resultado principal). La URL del search action apunta a `/tienda?q={search_term_string}`.

### En cada página de producto

Cada PDP renderiza tres bloques JSON-LD adicionales.

El primero es un `Product` con toda la información: nombre, descripción, imágenes (todas las disponibles, con URLs absolutas), SKU (igual al slug), MPN (igual al slug), brand, category, y un `additionalProperty` con todas las características olfativas: tipo, género, categoría, duración, sillage, estación, y las tres familias de notas (salida, corazón, fondo).

Dentro del Product va un objeto `offers` que es donde está la información comercial. Tiene precio, moneda COP, fecha de validez del precio (hasta fin del próximo año), disponibilidad (`InStock` si hay stock, `OutOfStock` si no, `PreOrder` si el precio es 0), condición (`NewCondition`), y el vendedor (`Organization: ScentualBliss`).

El offers también incluye dos sub-objetos importantes. `shippingDetails` declara que el envío cuesta 0 COP, se entrega en Colombia, con tiempo de manejo de 0-1 día y tiempo de tránsito de 1-5 días. `hasMerchantReturnPolicy` declara una política de devolución de 30 días, libre de costo, en Colombia. Estos dos elementos son lo que le permite a Google mostrar etiquetas como "Envío gratis" y "Devolución gratis" directamente en los resultados de búsqueda.

El segundo bloque JSON-LD del PDP es un `BreadcrumbList` que declara la jerarquía Inicio > Tienda > Producto, lo que mejora el snippet de SERP mostrando esa jerarquía en lugar de la URL fea.

El tercer bloque es un `FAQPage` generado por el componente `ProductFAQSchema`. Tiene cinco preguntas auto-generadas para cada producto: "¿Cuánto dura X en la piel?", "¿X es para hombre o mujer?", "¿Para qué ocasiones es ideal X?", "¿Qué notas olfativas tiene X?", "¿X es un perfume <familia>?". Las respuestas se parametrizan con los datos del producto. Las mismas preguntas y respuestas aparecen visualmente en la página (en el componente `ProductSeoContent`), lo cual es importante: si el JSON-LD declara FAQs que no están en la página, Google penaliza.

### En la tienda

La página de tienda renderiza dos JSON-LD. Un `ItemList` con todos los productos visibles, donde cada item tiene posición, URL y nombre. Esto le dice a Google "esta página es un listado de N productos" y puede mejorar la apariencia en SERP.

Y un `BreadcrumbList` con la jerarquía Inicio > Tienda > (Filtro), donde el filtro depende de los searchParams activos.

## El sitemap

El archivo `app/sitemap.js` genera dinámicamente el `/sitemap.xml` que Google y otros buscadores consultan para descubrir todas las URLs del sitio.

La función exporta varios grupos de páginas. El primer grupo son las páginas estáticas principales: home (priority 1.0), tienda (0.9), contacto, faq, devoluciones, terminos, privacidad (todas con priority 0.3-0.4). Cada una declara su frequency de cambio (`weekly`, `monthly`, etc.) y su lastModified actual.

El segundo grupo son las páginas de listado por filtro. Hay una entrada en el sitemap por cada combinación de filtro: una por cada tipo de producto, una por cada familia olfativa, una por cada marca, una por cada género, una por cada concentración, una por cada momento, una por cada clima. Esto genera unas 60-80 URLs adicionales que cubren todas las búsquedas relevantes.

El tercer grupo son las páginas de producto individuales. Una entrada por cada producto, con `lastModified: now`, `changeFrequency: weekly`, y priority 0.9 si es featured o bestseller, 0.8 para el resto.

Una particularidad importante: cada entrada de producto también incluye sus imágenes en el sub-elemento `images`. Esto es una extensión del estándar de sitemaps que permite que Google Images indexe las fotos. Para cada producto, el sitemap.js escanea el filesystem buscando `/img/<slug>.webp`, `/img/<slug>-2.webp`, etc. (hasta 4 imágenes) y las agrega todas como URLs absolutas.

Esta inclusión de imágenes es importante para SEO porque parte del tráfico viene de búsquedas en Google Images: alguien busca "khamrah perfume" en imágenes, ve la foto, hace clic y termina en el sitio.

## El robots.txt

El archivo `app/robots.js` genera `/robots.txt` dinámicamente. Es simple: permite que cualquier user-agent rastree todo el sitio excepto cinco rutas que tienen disallow.

Las rutas bloqueadas son `/api/` (las APIs no son páginas que deba indexar Google), `/admin/` (el panel privado), `/checkout` (no tiene contenido que indexar, solo formulario), `/order-confirm` (solo accesible post-pago) y `/wishlist` (es contenido personal, no relevante para búsquedas).

Adicionalmente declara la URL del sitemap (`https://scentualbliss.com.co/sitemap.xml`) y el host preferido del sitio.

## Las imágenes OpenGraph (desactivadas)

Originalmente el proyecto tenía imágenes OpenGraph generadas dinámicamente con `next/og`. Los archivos `app/opengraph-image.jsx` y `app/twitter-image.jsx` generaban imágenes 1200x630 con el logo, un mensaje "Perfumería Original", el tagline "El aroma que te define" y stats clave. Estas imágenes se servían cuando alguien compartía el link en WhatsApp, Facebook o Twitter.

Sin embargo, estas dos rutas causaron un bug crítico: la navegación cliente-side hacia la tienda se rompía con un error "Server Components render". La razón exacta no quedó del todo clara, pero se reproducía consistentemente: con los archivos activos, hacer clic en un link a `/tienda?cat=X` desde la home disparaba el error. Sin los archivos, todo funcionaba.

Por eso ambos archivos están actualmente desactivados (no existen en el repo). Si en el futuro se quieren reactivar para mejorar el preview en redes sociales, hay que investigar más a fondo qué causa el conflicto. Una alternativa más segura sería pre-generar una imagen estática 1200x630 con Photoshop o Canva, subirla a `/public/og.png` y referenciarla en metadata.openGraph.images. Eso es lo que recomiendo si vuelve a hacer falta.

## URLs canónicas y noindex

Cada página declara su URL canónica para evitar que Google indexe versiones duplicadas. La home tiene canonical `/`. Las páginas de producto tienen canonical absoluto a `https://scentualbliss.com.co/perfume/<slug>`.

La tienda tiene una regla de noindex configurada: cuando hay más de un filtro activo simultáneamente, o cuando alguno de los filtros usa multi-valor (comma-separated), o cuando hay paginación más allá de la primera página, o cuando es una búsqueda libre, la página se marca como `robots: { index: false, follow: true }`. Esto evita que Google indexe combinaciones de filtros que serían contenido delgado y duplicado de la página base.

El follow se mantiene en true porque queremos que Google siga los enlaces hacia los productos individuales, incluso si no indexa la combinación particular.

## Cómo verificar el SEO

Después de cualquier cambio importante, conviene verificar que el SEO sigue correcto. Hay tres herramientas que ayudan.

El **Rich Results Test** de Google (https://search.google.com/test/rich-results) toma una URL y muestra qué structured data detecta, qué errores hay y cómo se vería el snippet en resultados. Es la primera herramienta a usar después de cambiar un Schema.org.

El **OpenGraph Debugger** de Facebook (https://developers.facebook.com/tools/debug/) muestra el preview que aparecería si alguien compartiera el link en Facebook o WhatsApp. También permite forzar un re-scrape para ver cambios en producción.

Google Search Console (https://search.google.com/search-console) es la herramienta a largo plazo. Una vez agregado y verificado el sitio, muestra qué páginas están indexadas, cuáles tienen errores, qué consultas traen tráfico, qué páginas tienen rich results activos, etc. Es donde se ven los resultados reales del trabajo de SEO con un delay de unas semanas.
