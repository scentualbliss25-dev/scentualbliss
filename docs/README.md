# Documentación de ScentualBliss

Esta carpeta tiene todo lo que necesitas saber sobre el proyecto. Está organizada en doce documentos numerados que puedes leer en orden o saltarte directo al tema que te interese.

El sitio en producción vive en **https://scentualbliss.com.co** y está alojado en Vercel.

## Por dónde empezar

Si nunca has visto el proyecto, lee los documentos en orden. El primero explica de qué se trata, el segundo cómo está montado, y de ahí en adelante cada tema se profundiza por separado.

Si ya conoces el proyecto y quieres consultar algo puntual, salta al documento correspondiente:

1. **Visión general** — qué es el producto, qué tecnologías usa.
2. **Arquitectura** — cómo está organizado el código, qué hace cada carpeta.
3. **Modelo de datos** — qué información se guarda y dónde.
4. **Páginas** — qué hace cada URL del sitio.
5. **Componentes** — los bloques visuales que se reutilizan.
6. **Estado en el cliente** — el carrito, los favoritos, la vista rápida.
7. **Pagos con Wompi** — cómo funciona el checkout.
8. **Notificaciones** — emails al admin y al cliente.
9. **Panel de admin** — la zona privada de órdenes.
10. **SEO** — cómo aparece el sitio en Google.
11. **Variables de entorno y deploy** — qué necesitas configurar.
12. **Problemas conocidos** — los bugs que se han resuelto y cómo evitar repetirlos.

## Lo esencial en una página

**ScentualBliss** es una tienda online de perfumes que opera desde Medellín, Colombia. Vende fragancias de diseñador, de nicho y árabes, con envío gratis a todo el país. El catálogo tiene aproximadamente 155 productos de 28 marcas.

El sitio está construido sobre **Next.js 15** con el App Router, usando **React 19** y **Vercel** como plataforma de hosting. La base de datos es **Supabase**, los pagos los procesa **Wompi** de Bancolombia, y los correos transaccionales los envía **Resend**.

El catálogo de productos vive directamente en código (en `lib/products.js`) en lugar de en la base de datos. Esto se hizo a propósito porque el catálogo cambia poco y queda mucho más rápido al renderizar. Lo que sí está en la base de datos son las cosas dinámicas: órdenes, reseñas, inventario y suscripciones al newsletter.

El estado del lado del cliente (el carrito, los favoritos, la vista rápida de productos) se maneja con **Zustand**, una librería pequeña pero potente. El carrito y los favoritos persisten en `localStorage`, así que sobreviven a recargas de página.

## Comandos básicos

Para trabajar localmente:

- `npm run dev` arranca el servidor de desarrollo en el puerto 3000.
- `npm run build` genera la versión optimizada para producción.
- `npm run start` sirve esa versión de producción localmente (útil para verificar antes de desplegar).

Para desplegar a Vercel:

- `vercel deploy --prod` sube directamente a producción desde tu máquina. No hace falta hacer git push: el deploy lee los archivos locales.
- `vercel env ls` lista las variables de entorno que están configuradas.
- `vercel logs <url>` muestra los logs en vivo de un deploy específico.

## Paleta de marca y tipografía

La identidad visual gira alrededor del dorado y los marfiles cálidos.

Los tonos principales son tres dorados (`#C9A96E` el principal, `#D4B68A` el claro y `#A07840` el oscuro) y tres tintas (`#1F1A14` para texto principal, `#4A3F33` para texto secundario, `#7A6E5E` para terciario). El fondo del sitio es un marfil cálido (`#FDFBF7`) que se acompaña con un "sand" (`#F5EFE3`) y un "papel" (`#FAF6EE`) para crear contrastes sutiles.

La tipografía es **Montserrat** en cinco pesos (300, 400, 500, 600 y 700). Se sirve self-hosted desde Vercel a través de `next/font/google`, lo que evita el flash de fuente sin estilo.
