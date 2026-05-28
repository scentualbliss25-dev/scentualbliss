# 05 · Componentes

## Cómo están organizados

Los componentes React del proyecto viven todos en la carpeta `components` y se dividen en cuatro grupos según su propósito.

En `components/layout` están los elementos que aparecen en todas las páginas del sitio: la barra de anuncios de arriba, el Navbar, el Footer y el wrapper diferido. En `components/pages` están los componentes grandes que constituyen el contenido principal de una página completa, como la home o la página de producto. En `components/ui` están las piezas reutilizables más pequeñas, como tarjetas de producto, modales y breadcrumbs. Y en `components/cart` está solamente el CartDrawer, el carrito lateral.

Adicionalmente hay un `components/seo` que tiene un solo archivo: `ProductSeoContent.jsx`, que es el bloque de contenido SEO extendido que va al final de cada página de producto.

## Los componentes globales del layout

### El Navbar

El Navbar es el componente más complejo del layout. Vive en `components/layout/Navbar.jsx` y tiene más de 1500 líneas porque combina varias funcionalidades en uno: navegación principal, mega menú con filtros, búsqueda en vivo y drawer móvil.

El componente se exporta como una función que envuelve a `NavbarInner` en un `<Suspense>`. Esto es necesario porque `NavbarInner` usa el hook `useSearchParams`, y Next.js 15 exige que ese hook esté dentro de un Suspense boundary. El fallback de Suspense es un `NavbarShell` mínimo (solo el logo) que se muestra mientras el componente real se hidrata.

El menú principal está definido en una constante `NAV_ITEMS` que tiene cinco entradas: Inicio, Perfumes (con mega menú), Tienda, Más Vendidos y Quiz. La entrada "Perfumes" se marca con `isMegaMenu: true` y contiene categorías para filtrar: por marca, por concentración, por familia olfativa, por género, por momento del día y por clima. Cada categoría es una columna dentro del mega menú y cada opción es un link a `/tienda?cat=valor`.

La búsqueda en vivo está en el icono de lupa. Al abrirla, aparece un input que filtra contra todos los productos, marcas, familias y páginas del sitio. Los resultados se agrupan por tipo (productos, marcas, familias, páginas) y se muestran con su imagen miniatura. Hacer clic en un resultado navega y cierra la búsqueda.

En el lado derecho del Navbar están los iconos de wishlist (con badge del número de items) y carrito (también con badge). El de wishlist es un Link a `/wishlist`. El del carrito llama a `toggleCart()` del cartStore para abrir el CartDrawer.

En móvil el menú colapsa a un drawer lateral. El drawer renderiza fuera del `<header>` del Navbar usando un React Fragment, no anidado dentro. Esto era necesario porque el header tiene `backdrop-filter: blur(...)` y eso creaba un nuevo stacking context que rompía el posicionamiento `fixed` del drawer.

### El Footer

El componente Footer en `components/layout/Footer.jsx` es más simple. Tiene cuatro secciones principales: una columna con el logo y la descripción de la marca, y tres columnas de links (Tienda, Aromas, Ayuda). Debajo va una banda con los iconos de redes sociales (Instagram, TikTok, Facebook, WhatsApp) y un copyright.

En móvil cada columna se colapsa con un acordeón: el título es un botón que al tocarlo expande o contrae los links. Esto se maneja con un estado local `openCol` que recuerda cuál está abierta.

El array `SOCIAL` define los iconos y URLs reales de las redes. Las URLs se actualizaron recientemente para apuntar a las cuentas correctas con `_25` al final (`scentualbliss_25` en Instagram y TikTok) y para usar la URL canónica de Facebook en lugar de un link de compartir.

El componente importa una imagen SVG del logo desde `/img/logo-transparent.svg` con `width={220}` y `height={60}`. Inicialmente tenía `priority` en `next/image`, pero se removió porque el logo del footer no está above-the-fold y no debería competir por el ancho de banda con la botella del hero.

### La AnnouncementBar

En `components/layout/AnnouncementBar.jsx` está la barra delgada de arriba del sitio con el marquee horizontal de mensajes. Renderiza cinco mensajes en bucle infinito: "Envío gratis a toda Colombia", "Pago seguro con Wompi", "100% auténticos · Garantía" y un par más. La animación es CSS pura con `@keyframes`.

### El DeferredShell

El `DeferredShell.jsx` es un patrón interesante. Es un Client Component muy delgado cuya única responsabilidad es cargar otros tres componentes con `dynamic({ ssr: false })`: el CartDrawer, el WhatsAppFloat y el ScrollToTop.

Esto se hace porque esos tres componentes no son críticos para el primer paint de ninguna página: el CartDrawer solo se ve si el usuario abre el carrito, los botones flotantes solo importan después de que la página cargó. Cargarlos diferidos significa que su JavaScript no llega al navegador hasta que la página principal ya está renderizada, mejorando la velocidad percibida.

El `ssr: false` es importante porque Next.js permite cargar componentes así solo dentro de un Client Component. Por eso DeferredShell existe: el layout (`app/layout.js`) es un Server Component y no puede usar `ssr: false` directamente, así que delega esa responsabilidad al DeferredShell que sí es Client.

## Las páginas como componentes

### HomePageClient

El archivo `components/pages/HomePageClient.jsx` es el más grande del proyecto, con casi 1300 líneas. Contiene toda la lógica de la home como un solo Client Component. Dentro define varios sub-componentes locales (Hero, TrustBar, BrandsMarquee, Families, Bestsellers, PCard, Featured, Story, Quiz, Testimonials, Newsletter) que no se exportan, solo se usan internamente.

Una decisión deliberada: el PCard (tarjeta de producto) de la home es un componente local de este archivo, no el `ProductCard` que está en `components/ui`. La razón es que la home necesita un estilo de tarjeta distinto, más editorial y compacto, mientras que el ProductCard de UI está pensado para el grid de la tienda. Mantenerlos separados evita complicar el ProductCard con muchas variantes condicionales.

Toda la lógica del Quiz olfativo está en este archivo. El array `QUIZ_STEPS` define las cuatro preguntas, sus opciones y los pesos. La función `matchReason` genera la etiqueta de "razón" para cada producto recomendado.

### ProductPageClient

El componente cliente de la página de producto está en `components/pages/ProductPageClient.jsx`. Recibe el `product` y `resolvedImages` desde el server component padre y maneja toda la interactividad: galería con miniaturas, selección de talla, agregar al carrito, comprar ahora, mostrar/ocultar tabs.

El componente tiene tabs para alternar entre "Descripción", "Notas" y "Detalles". Esto se maneja con un estado local `tab`. El contenido de cada tab está hardcoded en el JSX condicional.

Más abajo en la página se muestra el `<ProductReviews>` que carga las reseñas reales de Supabase y permite escribir una nueva. Recibe el `productSlug`, el `initialRating` y el `initialCount` desde el padre.

### ShopFilters

El componente más importante de la tienda. Vive en `components/pages/ShopFilters.jsx` y maneja todos los filtros visualmente. Es un Client Component que lee los searchParams actuales con `useSearchParams`, los muestra como pills activas, y al hacer clic construye una nueva URL con los filtros aplicados o quitados.

Tiene una función `toggleMulti` que es la clave del multi-select. Cuando se hace clic en un filtro, esta función lee los valores actuales del param (que pueden venir comma-separated, como `dulce,floral`), agrega o quita el valor correspondiente, y reconstruye el param. Si el array queda vacío, se elimina el param de la URL.

La búsqueda libre tiene debounce de 350ms: el usuario tipea y solo se ejecuta la búsqueda después de pausar. Esto evita que cada tecla dispare un re-render del listado completo.

En móvil los filtros se muestran como un sheet inferior deslizable, controlado por el estado `sheetOpen`. Cuando está abierto se aplica `overflow: hidden` al body para prevenir scroll de fondo.

### CheckoutPageClient

El componente del checkout en `components/pages/CheckoutPageClient.jsx` es un wizard de dos pasos. El primer step recoge los datos personales y de envío. El segundo muestra el resumen y el botón de pagar.

El componente tiene defensive coding contra items corruptos del carrito: usa `Array.isArray(rawItems) ? rawItems : []` para garantizar que `items` siempre sea un array, incluso si el localStorage está dañado. También usa `item.images?.[0] || /img/${item.slug}.webp` para acceder a la imagen, con fallback en caso de que el item no tenga el campo images.

El botón "Pagar" llama a la función `handlePay` que hace POST a `/api/wompi/checkout`. Si Wompi no está configurado o devuelve 503, el código cae a un flujo simulado donde se genera un ID falso y se redirige a `/order-confirm?simulated=1`, útil en desarrollo.

### Otros componentes de página

`WishlistPageClient` renderiza la lista de favoritos desde el store. Es muy simple: solo un grid de ProductCards o un empty state.

`OrderConfirmPageClient` muestra la confirmación post-pago. Lee el `id` de la transacción Wompi desde searchParams y consulta `/api/wompi/transaction` para obtener los detalles.

`FaqPageClient` es la lista de FAQs con elementos `<details>` colapsables. Las preguntas están hardcoded en el componente.

`ContactPageClient` es la página de contacto, mayormente estática con un formulario simple.

## Los componentes UI reutilizables

### ProductCard

El `ProductCard` que vive en `components/ui/ProductCard.jsx` es la tarjeta de producto que se usa en el grid de la tienda y en la wishlist. Recibe un `product` y un `priority` (boolean para indicar si su imagen debe cargar como prioritaria).

La tarjeta tiene tres elementos visuales: la imagen del producto con badges arriba (badge personalizado del producto y badge de "Últimas N" si el stock es ≤ 5), un overlay que aparece en hover con el botón "Agregar" y el icono de vista rápida, y debajo de la imagen la información (marca, nombre, precio).

Tiene defensive coding similar al CheckoutPageClient: el wishlist se destructura como `rawWishlist` y se valida con `Array.isArray`. El acceso a propiedades del item usa optional chaining.

El click en la tarjeta entera es un `<Link>` que va a `/perfume/<slug>`. El botón de agregar y el de vista rápida tienen `e.preventDefault()` y `e.stopPropagation()` para que no naveguen al detalle.

### QuickView

El modal de vista rápida está en `components/ui/QuickView.jsx`. Se carga con `dynamic({ ssr: false })` desde el componente `QuickViewModal` para evitar que framer-motion llegue al bundle inicial.

El modal usa `AnimatePresence` y `motion.div` de framer-motion para animar la entrada y salida. Por dentro tiene un grid de dos columnas: imagen grande a la izquierda, información a la derecha. En móvil colapsa a una sola columna apilada verticalmente.

Hubo un bug notable que afectó este componente. Originalmente el modal usaba `transform: translate(-50%, -50%)` para centrarse, pero framer-motion aplica su propio `transform` para animar `scale` y `y`, y ese override hacía que el `translate` se perdiera. El modal aparecía desplazado a una esquina. El fix fue usar un wrapper externo con flexbox para el centrado y dejar a framer-motion manejar solo las animaciones.

El usuario puede cambiar de imagen con miniaturas si el producto tiene varias fotos, seleccionar talla, y agregar al carrito. Si el precio es 0 o la talla seleccionada no tiene precio, el botón se desactiva y muestra "Consultar precio" en lugar de "Agregar".

### CartDrawer

El carrito lateral en `components/cart/CartDrawer.jsx` es un drawer que se desliza desde la derecha. Lee del cartStore y muestra cada item con su miniatura, nombre, talla, controles de cantidad y precio.

Tiene un indicador de progreso hacia el envío gratis: si el subtotal está por debajo de 350.000 COP, muestra cuánto falta para llegar y una barra de progreso. Si ya pasó el umbral, muestra "¡Envío GRATIS desbloqueado!" con un mensaje verde.

Defensive coding aplicado: `items` se valida con `Array.isArray` antes de hacer reduce, y las propiedades de cada item se acceden con optional chaining (`i?.price`, `i?.quantity`).

El drawer también escucha la tecla Escape para cerrarse, y bloquea el scroll del body cuando está abierto.

### Otros componentes UI

`ProductReviews` carga reseñas desde Supabase y permite escribir nuevas. Tiene un sistema de estrellas con rating promedio, conteo total, y un breakdown por rating (cuántas son 5 estrellas, cuántas 4, etc.).

`Breadcrumbs` renderiza las migajas de pan con structured data. Recibe un array de items `{ name, url }` y renderiza tanto el HTML visual como el JSON-LD `BreadcrumbList`.

`BrandLogo` muestra el logo de una marca con fallback. Intenta cargar `/img/brands/<slug>.webp`, y si falla intenta una segunda variante, y si esa también falla muestra solo el nombre como texto.

`ScrollAnimations` exporta varios componentes para animaciones: `PageTransition` (fade-in al cambiar de página), `Reveal` (fade-in al hacer scroll, basado en IntersectionObserver), `CountUp` (animar números).

`ShopLoadMore` es el botón "Cargar más" de la tienda. Mantiene un estado local con los productos adicionales descargados y mantiene la URL sincronizada con la página actual usando `window.history.replaceState`.

`CountdownTimer` es un contador regresivo reutilizable. Se usa en el Featured de la home para la oferta flash y en el checkout para el timer de reserva.

`WhatsAppFloat` y `ScrollToTop` son los botones flotantes que aparecen en todas las páginas. Ambos son simples: el de WhatsApp es un link a `wa.me/57316...`, el de scroll-to-top aparece solo cuando el scroll vertical es mayor a 400px.

`ToasterWrapper` envuelve el `<Toaster>` de react-hot-toast con la configuración global de posición y estilo.

## El componente SEO

El `ProductSeoContent` en `components/seo/ProductSeoContent.jsx` es el bloque grande que aparece al final de cada página de producto. Tiene cinco secciones: descripción narrativa del producto, pirámide olfativa explicada nota por nota, recomendación de uso (cuándo usarlo, en qué ocasiones), razones para elegirlo, y un FAQ específico del producto con cinco preguntas autogeneradas.

Todo el contenido es server-side y se calcula al renderizar la página de producto. Las preguntas del FAQ están parametrizadas con los datos del producto: "¿Cuánto dura X en la piel?", "¿X es para hombre o mujer?", "¿Para qué ocasiones es ideal X?", etc.

Este componente también exporta `ProductFAQSchema`, que genera el JSON-LD `FAQPage` para Google. Es importante que el FAQ visible en la página coincida exactamente con el de Schema.org, porque Google penaliza si encuentra discrepancias.
