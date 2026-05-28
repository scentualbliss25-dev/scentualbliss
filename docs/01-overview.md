# 01 · Visión general

## Qué es ScentualBliss

ScentualBliss es una tienda online de perfumes con sede en Medellín, Colombia. Se especializa en fragancias originales de tres categorías: diseñador (Dior, Carolina Herrera, Tom Ford, Versace y similares), nicho (Xerjoff, Maison Francis Kurkdjian, Creed) y árabe (Lattafa, Armaf, Afnan).

El catálogo tiene aproximadamente 155 productos repartidos entre 28 marcas. El modelo de negocio es B2C directo: el cliente compra online y la tienda envía el producto a su casa. El envío es gratis a toda Colombia y los pagos se procesan a través de Wompi, la pasarela de Bancolombia.

## El stack tecnológico

El proyecto está construido sobre **Next.js 15** usando el App Router, que es la forma moderna de organizar rutas en Next. Esto significa que la mayoría de los componentes son **Server Components** por defecto: corren en el servidor, no envían JavaScript al cliente y son más rápidos. Los componentes que sí necesitan estado o interactividad se marcan con `'use client'` al principio del archivo.

React 19 maneja la capa de UI. El proyecto no usa TypeScript: todo el código es JavaScript puro con extensiones `.js` y `.jsx`. Tampoco hay tests automatizados.

Para el estado del cliente se usa **Zustand** versión 5, una librería pequeña pero muy expresiva. Maneja el carrito de compras, la lista de favoritos y el modal de vista rápida. Las animaciones se hacen con **framer-motion** versión 12, aunque se usa con moderación: básicamente solo en el modal de QuickView. Los iconos vienen de **lucide-react** y las notificaciones toast de **react-hot-toast**.

La fuente principal es **Montserrat** y se carga a través de `next/font/google`, lo que la sirve self-hosted desde Vercel sin depender de Google Fonts en tiempo real. Esto mejora la performance y evita el flash de texto sin estilo.

## Los servicios externos

El proyecto se apoya en cuatro servicios externos importantes.

**Supabase** funciona como la base de datos Postgres. Guarda las órdenes de compra, las reseñas de productos, el inventario en tiempo real, las suscripciones a notificaciones push del admin y las suscripciones al newsletter. Se accede mediante `@supabase/supabase-js`.

**Wompi** procesa los pagos. Se usa su Web Checkout, lo que significa que cuando el cliente da clic en "Pagar" lo redirigimos a una URL de Wompi y ellos se encargan del cobro. Wompi nos avisa el resultado mediante un webhook firmado.

**Resend** envía los correos transaccionales. Hay dos tipos de correo: uno que llega al admin (a `scentualbliss25@gmail.com`) cuando entra una venta, y otro que llega al cliente con la confirmación de su pedido. El dominio remitente está verificado en Resend como `ventas.scentualbliss.com.co`.

**Web Push** se usa para que el admin reciba notificaciones de venta directamente en su navegador, incluso cuando la pestaña está cerrada. Usa la librería `web-push` y claves VAPID.

## Hosting y deploy

Todo el sitio vive en **Vercel** en el plan free. El dominio `scentualbliss.com.co` está registrado en Seret y apunta a Vercel mediante DNS. Adicionalmente, el subdominio `ventas.scentualbliss.com.co` está verificado en Resend con los tres registros TXT (SPF, DKIM y DMARC) requeridos para poder enviar correos en nombre de la marca.

Una particularidad importante del flujo de deploy es que **no usamos integración con git**. Los deploys se hacen con el comando `vercel deploy --prod` directamente desde la máquina de desarrollo, que lee los archivos locales y los sube a Vercel. Esto significa que hacer `git push` no dispara nada: los commits son solo para historial.

## Estructura general del repositorio

El proyecto sigue las convenciones estándar de Next.js App Router. La carpeta `app` contiene las rutas: cada subcarpeta es una URL y dentro debe haber un archivo `page.js` o `page.jsx`. Las APIs viven en `app/api/<endpoint>/route.js`.

Los componentes React se organizan en `components`, separados en cuatro grupos:

- `components/layout` para los elementos globales como Navbar, Footer y la barra de anuncios.
- `components/pages` para los componentes que son el contenido principal de una página (el HomePageClient, ProductPageClient, etc.).
- `components/ui` para piezas reutilizables como ProductCard, QuickView, Breadcrumbs.
- `components/cart` para el carrito lateral deslizante.

La carpeta `lib` agrupa la lógica que no es React: el catálogo completo de productos, los stores de Zustand, los clientes de Supabase y Wompi, las utilidades de formato y la integración con Resend. Es importante destacar que `lib/products.js` tiene casi 2000 líneas porque contiene los 155 productos hardcoded como objetos JavaScript.

Los assets estáticos viven en `public`. Ahí están las imágenes de productos en formato WebP (con la convención `slug.webp` y `slug-2.webp` para la segunda foto), los logos de marca, los iconos PWA y el service worker para las notificaciones push.

## Scripts disponibles

Durante el desarrollo se usan tres comandos:

`npm run dev` arranca el servidor de desarrollo de Next en el puerto 3000. Cualquier cambio en el código se refleja en caliente sin tener que recargar manualmente.

`npm run build` compila el proyecto y genera la carpeta `.next` con la versión optimizada para producción. Si hay errores de sintaxis o de tipos (aunque no usamos TypeScript, sí hay validaciones de ESLint y Next.js), el build falla.

`npm run start` sirve la versión que generó `build`. Es útil para verificar localmente cómo se va a comportar el sitio en producción antes de desplegar.

Para el deploy se usan los comandos de la CLI de Vercel:

`vercel deploy --prod` despliega a producción. El proceso típico es: hacer los cambios localmente, probar con `npm run build`, y si todo funciona, ejecutar este comando. Tarda alrededor de 50 segundos.

`vercel env ls` lista todas las variables de entorno configuradas. Es útil para verificar que no falte ninguna antes de desplegar.

`vercel env add NOMBRE production` agrega una nueva variable de entorno al ambiente de producción. Pide el valor por stdin.

`vercel logs <deployment-url>` muestra los logs runtime de un deploy. Sirve cuando hay errores en server components o API routes que no se ven desde el navegador.

## Convenciones a tener en cuenta

El idioma del sitio es español colombiano (`es-CO`) y todos los precios están en pesos colombianos (COP). Los textos del UI están en español y los emojis se usan ocasionalmente para darle calidez a los toasts y mensajes.

Los estilos están mayormente inline con la prop `style={...}` o dentro de bloques `<style>{...}</style>` en el mismo componente. Los archivos CSS dedicados son pocos: `app/globals.css` para variables y estilos base, y `components/pages/HomePageClient.css` para la home específicamente.

No hay sistema de diseño formal ni tokens estructurados: la paleta y las medidas se aplican directamente. Si vas a crear un componente nuevo, mira uno parecido que ya exista y copia el patrón.

Las imágenes de productos están en `public/img` con el nombre del slug del producto. El convenio es: si el producto tiene slug `lattafa-khamrah`, su primera foto es `/img/lattafa-khamrah.webp` y la segunda `/img/lattafa-khamrah-2.webp`. Los logos de marca van en `/img/brands/` con el slug de la marca.
