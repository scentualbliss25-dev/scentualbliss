# 12 · Problemas conocidos y soluciones aplicadas

Este documento recopila los bugs más relevantes que se han identificado y resuelto. Sirve como referencia rápida para no volver a chocar contra el mismo problema, y como guía si aparece algo similar.

## El bug del localStorage corrupto

Este es el bug que más veces apareció con distintas caras. Se manifestaba con el mensaje "Application error: a client-side exception has occurred" que reemplazaba todo el sitio.

La causa raíz siempre fue similar: el `localStorage` del usuario tenía datos guardados de una versión vieja del sitio que ya no eran compatibles con el código actual. Cuando los stores de Zustand intentaban hidratar esos datos, terminaban con un estado malformado (típicamente con `items` siendo `null` o `undefined` en lugar de un array). Después algún componente que consumía el store hacía algo como `items.map(...)` o `items.reduce(...)` y reventaba con "Cannot read property 'map' of undefined".

Apareció primero en el `cartStore` y la solución fue agregar tres capas de defensa: la función `safeItems` que garantiza array válido, el `partialize` que filtra qué se guarda, y el callback `onRehydrateStorage` que limpia el storage si hay error.

Después apareció el mismo patrón en el `wishlistStore` (que no tenía esas protecciones) y se aplicó la misma solución.

Y finalmente, como medida extra de protección, se agregó **defensive coding en cada componente que consume los stores**: en lugar de `const { items } = useStore()`, ahora se hace `const { items: rawItems } = useStore()` seguido de `const items = Array.isArray(rawItems) ? rawItems : []`. Esto asegura que aunque el store por alguna razón devuelva algo no-array, el componente sigue funcionando.

**Cómo evitar repetirlo:** si en el futuro se cambia la estructura de items del carrito o wishlist (agregar campo obligatorio, renombrar uno, etc.), considera bumpear un número de versión y hacer migración explícita. Y mantén las protecciones defensivas.

## El bug del item.images undefined en checkout

Una variante del bug anterior. El `CheckoutPageClient` hacía `item.images[0]` directamente en cada item del carrito. Si un cliente tenía items viejos en su localStorage que no tenían el campo `images` (porque ese campo se agregó después), el código reventaba.

La solución fue cambiar a `item.images?.[0] || /img/${item.slug}.webp` que usa optional chaining y, si tampoco hay slug, cae a un placeholder genérico mediante el `onError` del tag `<img>`.

Esto es una buena práctica general: nunca acceder a propiedades anidadas sin proteger contra que la propiedad intermedia falte. Optional chaining (`?.`) es prácticamente gratis en JavaScript moderno y previene una clase entera de bugs.

## El bug del Server Components render error

Probablemente el bug más difícil de diagnosticar de toda la historia del proyecto. Se manifestaba como "An error occurred in the Server Components render" en consola, acompañado del error boundary mostrando "No pudimos cargar esto".

El bug aparecía solo en la ruta `/tienda` (cualquier variante con filtros). Las otras rutas funcionaban perfectamente. Y solo aparecía cuando el usuario navegaba via cliente: si entraba directo a `/tienda?cat=dulce` por URL funcionaba, pero si entraba desde la home y hacía clic en un Link a la tienda, fallaba.

El proceso de debugging tomó horas. Se intentaron varias cosas: quitar el error.jsx boundary (para descartarlo como amplificador del problema), quitar el QuickViewModal, deshabilitar el `prefetch` de los Links, simplificar `generateMetadata` a estática, e incluso reemplazar todo el contenido de la tienda por una versión mínima de prueba. Nada de eso lo resolvía.

La causa raíz resultó ser **el archivo `app/opengraph-image.jsx`**. Este archivo generaba dinámicamente la imagen OpenGraph del sitio para previews en redes sociales, usando `ImageResponse` de `next/og` y leyendo el logo del filesystem con `fs.readFileSync`. La generación funcionaba bien al servir la imagen, pero algo en cómo Next.js procesaba la referencia a esa imagen durante la fase de RSC streaming (React Server Components) hacía que el render asociado fallara para la ruta `/tienda` en particular.

La solución fue eliminar los archivos `app/opengraph-image.jsx` y `app/twitter-image.jsx`. Inmediatamente después la tienda volvió a funcionar.

**Cómo evitar repetirlo:** si en el futuro se quieren reactivar previews de redes sociales, hay dos caminos. El más seguro es pre-generar una imagen PNG estática 1200x630 con Photoshop o Canva, guardarla en `/public/og.png` y referenciarla en `metadata.openGraph.images` de `app/layout.js`. Esto evita la generación dinámica que causaba problemas. El otro camino es investigar más a fondo qué hace `ImageResponse` con el filesystem read y por qué choca con SPA navigation a tienda, pero esto requeriría debug profundo en el internals de Next.js.

## El bug del Infinity en RSC payload

Antes de descubrir el verdadero culpable (opengraph-image), se identificó un bug menor relacionado: 44 productos del catálogo tenían `price: Infinity` para indicar "consultar precio". El problema es que `Infinity` no es un valor JSON válido, y React Server Components lo serializa como un símbolo especial `"$Infinity"` en el RSC payload.

Cuando el cliente intentaba deserializar ese payload, podía fallar (no siempre, pero en algunos casos). Se cambió todo a `price: 0` y se ajustó el Schema.org del producto para que en ese caso marcara `availability: PreOrder` y omitiera el precio numérico, en lugar de incluir un precio inválido.

**Cómo evitar repetirlo:** nunca usar `Infinity`, `NaN` o `undefined` en datos que vayan a serializarse a través del límite server/client. Usar valores nullables como `null` o `0` (con lógica que los interprete) en su lugar.

## El bug del modal QuickView desplazado

El modal de vista rápida aparecía descentrado en la pantalla, especialmente notable en móvil donde se cortaba la mitad. La causa era una colisión entre dos transforms CSS que se sobrescribían entre sí.

El modal usaba `style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)' }}` para centrarse en pantalla. Pero `framer-motion` aplica su propio `transform` para animar `scale` y `y`, y al hacerlo borraba el `translate(-50%, -50%)`. El resultado era que el modal quedaba con su esquina superior izquierda en el centro de la pantalla, en lugar de su centro real.

La solución fue cambiar el patrón de centrado: ahora hay un wrapper externo con `display: flex; align-items: center; justify-content: center` que centra al modal mediante flexbox, y framer-motion solo maneja las animaciones de `scale` y `y` sin tocar el centrado.

**Lección general:** cuando un componente con animaciones de framer-motion necesita posicionamiento, no usar `transform` directamente porque framer-motion lo va a sobrescribir. Usar flexbox o grid del padre, o las props `x` e `y` de framer-motion en lugar de transform.

## El bug del logo del footer con priority

En algún momento el `next/image` del logo del Footer estaba marcado con `priority`, lo que le decía a Next.js que lo cargara con la prioridad más alta posible. El problema es que el logo del Footer no está above-the-fold: está al fondo de cualquier página. Tener priority ahí significaba que competía con la imagen real prioritaria (la botella del hero, por ejemplo) por el ancho de banda.

La solución fue cambiar `priority` por `loading="lazy"`. El logo del Footer ahora se carga solo cuando el usuario hace scroll y se acerca.

**Cómo evitar repetirlo:** la prop `priority` de `next/image` solo debe usarse en imágenes que están above-the-fold y son críticas para el LCP (Largest Contentful Paint). El resto debe usar lazy loading.

## El conflicto de revalidate con searchParams

En un punto, `app/tienda/page.js` tenía `export const revalidate = 300` (intentando hacer cache de 5 minutos) junto con `await searchParams` (que es dinámico). Estas dos directivas son incompatibles en Next.js 15: `revalidate` requiere que la página sea SSG con parámetros estáticos, pero `searchParams` la hace inherentemente dinámica.

El conflicto generaba el error "Dynamic server usage: Route /tienda couldn't be rendered statically because it used await searchParams". La solución fue cambiar a `export const dynamic = 'force-dynamic'`, que le dice explícitamente a Next que la página es dinámica y no debe intentar cachearla.

**Cómo evitar repetirlo:** si una página usa `searchParams`, no puede tener `revalidate`. Debe usar `dynamic = 'force-dynamic'` o ninguna directiva (Next.js detecta el uso de searchParams y la marca como dinámica automáticamente).

## El bug de PushToggle reventando hidratación

Un bug sutil del panel de admin. El componente `PushToggle` accedía a `Notification.permission` directamente. En navegadores que no tienen `Notification` (Brave, iOS Safari en algunos casos, modo incógnito de Firefox), esa lectura tira un `ReferenceError`. Cuando ese error ocurre durante la hidratación, se propagaba hacia arriba y mataba todo el árbol del admin: las órdenes aparecían un segundo y desaparecían reemplazadas por el error boundary.

La solución tuvo dos partes. Primero, el `PushToggle` se hizo defensivo: envuelve todo el código que toca APIs del navegador en try/catch, verifica explícitamente `typeof Notification === 'undefined'` antes de leerlo, y maneja errores silenciosamente cayendo al estado 'unsupported'.

Segundo, los tres componentes interactivos del admin (`PushToggle`, `OrdersTable`, `SyncAllPendingButton`) se cargan ahora con `dynamic({ ssr: false })` a través del wrapper `AdminClient.jsx`. Así, si uno revienta, los otros siguen vivos.

## El bug del error.jsx que enmascaraba navegación

Durante el debugging del bug de Server Components, se descubrió que el `app/error.jsx` route boundary estaba **enmascarando** comportamiento normal de Next.js. Next maneja silenciosamente ciertos errores transitorios durante la hidratación (especialmente al hacer SPA navigation), pero el error boundary los atrapaba y los presentaba al usuario como un error crítico.

La solución fue eliminar `app/error.jsx`. El `app/global-error.jsx` se mantiene porque sí es útil para errores catastróficos del root layout, pero el route-level fue removido.

**Lección general:** los error boundaries de Next.js no siempre son tu amigo. Pueden atrapar errores que Next ya estaba manejando y volverlos visibles. Si tu app empieza a mostrar el error boundary en situaciones raras, prueba removerlo temporalmente para ver si el problema persiste sin él.

## Cómo identificar la causa de un error misterioso

Si en el futuro aparece un error que no entiendes, este es el flujo que ha funcionado.

Primero, intenta reproducirlo localmente con `npm run dev`. Si se reproduce en local, los logs del servidor en la terminal te dan la línea exacta. Si solo aparece en producción Vercel pero no en local, el debugging es más complicado.

Segundo, abre el DevTools del navegador (F12) y mira la consola. Cualquier error tiene un mensaje y un stack trace. Si el mensaje dice "Server Components render" sin más detalle, es porque Next.js oculta los mensajes en producción para no filtrar información sensible. Hay que usar el `digest` del error para buscar en Vercel logs.

Tercero, `vercel logs <deployment-url>` muestra los logs runtime del servidor. Filtra por errores con `| grep -i error` para encontrar rápido lo relevante.

Cuarto, si el error es en RSC payload, abre el Network tab del DevTools y busca la request que devuelve `text/x-component` (es el formato del payload). Inspecciona el contenido: busca referencias `$Z`, `$A`, etc., que indican errores. Cualquier `"error":"$X"` donde `$X` no se define más abajo en el payload es un error real.

Quinto, si nada de lo anterior ayuda, prueba **bisectar el código**: comenta partes hasta que el bug desaparezca, después descomenta gradualmente hasta encontrar la línea exacta. Es tedioso pero garantizado.

## Limitaciones del plan free de Vercel

Vale la pena tener presente las restricciones del plan free de Vercel, porque algunas afectan el desarrollo cotidiano.

El rollback solo permite ir un deploy hacia atrás. Si necesitas volver dos o tres deploys, no hay forma directa: tienes que recuperar el código fuente correspondiente (idealmente desde git) y hacer un nuevo deploy.

Los cron jobs en el plan free son limitados en frecuencia. Para una frecuencia mayor a cada hora hay que estar en plan Pro.

El bandwidth tiene un límite mensual generoso pero no infinito. Si el sitio crece mucho en tráfico, eventualmente habrá que upgrade.

Los logs runtime se guardan solo unas horas. Para retención más larga hay que configurar drains a un servicio externo (Datadog, Logtail, etc.).

## Limitaciones del plan free de Resend

Tres mil emails al mes, cien por día. Suficiente para el volumen actual pero conviene monitorear: si la tienda crece, eventualmente habrá que pasar a plan paid.

El dominio remitente debe estar verificado para enviar a destinatarios distintos del email de la cuenta. Esto se hizo con `ventas.scentualbliss.com.co`. Si por alguna razón se pierden los registros DNS, los emails al cliente dejan de funcionar silenciosamente (solo se ve el error en los logs de Resend).
