# 11 · Variables de entorno y deploy

## Las variables de entorno

El proyecto necesita un total de 16 variables de entorno configuradas en Vercel para funcionar completo. Algunas son críticas (sin ellas el sitio no arranca), otras son opcionales (degradan funcionalidades pero no rompen).

Las variables se separan en grupos según el servicio al que pertenecen.

### Supabase (base de datos)

Tres variables son necesarias para conectar a la base de datos. `NEXT_PUBLIC_SUPABASE_URL` es la URL del proyecto de Supabase, algo como `https://abcdefgh.supabase.co`. Lleva el prefijo `NEXT_PUBLIC_` porque también se usa en el cliente (aunque actualmente todo el acceso a Supabase es server-side).

`NEXT_PUBLIC_SUPABASE_ANON_KEY` es la clave anónima, una JWT larga que respeta las políticas Row Level Security. Esta clave es pública: cualquiera con acceso al sitio puede verla. Su seguridad depende enteramente de RLS bien configurado.

`SUPABASE_SERVICE_ROLE_KEY` es la clave de service role. Es secreta y nunca debe llegar al cliente. Tiene permisos absolutos sobre todas las tablas, saltándose RLS. Solo se usa en server components y API routes.

Estas tres están configuradas para Production y Preview environments. Si no están, los stores que dependen de Supabase (órdenes, reseñas, inventario, newsletter) fallan en silencio: el código verifica `if (!supabaseAdmin) return ...` y devuelve respuestas vacías.

### Wompi (pagos)

Cuatro variables relacionadas con la pasarela de pagos. `NEXT_PUBLIC_WOMPI_PUBLIC_KEY` es la clave pública. Empieza con `pub_test_` para sandbox o `pub_prod_` para producción.

`WOMPI_PRIVATE_KEY` es la clave privada, necesaria para consultas server-to-server contra el API de Wompi (consultar estado de transacciones).

`WOMPI_INTEGRITY_SECRET` es el secreto que se usa para firmar cada pago iniciado. Wompi verifica esa firma en su checkout.

`WOMPI_EVENTS_SECRET` es el secreto para validar las firmas de los webhooks que Wompi envía. Sin él, no se puede verificar que un webhook sea legítimo.

Si las cuatro están presentes y la public key empieza con `pub_prod_`, el sitio está cobrando dinero real. Si empieza con `pub_test_`, el sitio cobra con tarjetas de prueba (no pasa dinero). Si falta alguna, el checkout entra en modo simulado.

### Resend (emails)

Tres variables para el sistema de emails. `RESEND_API_KEY` es la clave de API, empieza con `re_`. Sin ella no se envían emails.

`ADMIN_EMAIL` es la dirección a donde llegan los emails de notificación de venta. Actualmente `scentualbliss25@gmail.com`.

`FROM_EMAIL` es la dirección remitente con formato completo: `ScentualBliss <noreply@ventas.scentualbliss.com.co>`. El subdominio `ventas.scentualbliss.com.co` debe estar verificado en Resend para que esto funcione.

### Web Push (notificaciones)

Tres variables para las notificaciones push del admin. `NEXT_PUBLIC_VAPID_PUBLIC_KEY` es la parte pública del par de claves VAPID; se usa en el navegador para que el cliente pueda suscribirse.

`VAPID_PRIVATE_KEY` es la parte privada, usada en el servidor para firmar los pushes.

`VAPID_SUBJECT` es un identificador del proyecto que algunos servicios push exigen. Típicamente un mailto, configurado como `mailto:admin@scentualbliss.com.co`.

Las claves VAPID se generan una sola vez con el comando `npx web-push generate-vapid-keys`. Si las claves cambian, todas las suscripciones existentes quedan inválidas y los admins tienen que volver a activar las notificaciones.

### Otras

`ADMIN_PASSWORD` es la contraseña del panel de admin. Lo lee el middleware para autenticar HTTP Basic. Si no está configurada, el middleware devuelve 503 al intentar entrar a `/admin`.

`CRON_SECRET` es un token compartido entre el cron job de Vercel y el endpoint `/api/cron/sync-orders`. El endpoint verifica que la request traiga este secreto en el header de autorización antes de procesar; previene que cualquiera dispare el cron desde internet.

`NEXT_PUBLIC_SITE_URL` es la URL base del sitio, configurada como `https://scentualbliss.com.co`. Se usa cuando hay que construir URLs absolutas en server code.

`NEXT_PUBLIC_USD_TO_COP_RATE` es una tasa de cambio USD a COP que se usa en algún cálculo legacy. No es crítica actualmente.

## Cómo administrar las variables en Vercel

Hay tres formas de gestionar las variables de entorno: el panel web de Vercel, la CLI, o un archivo `.env.local` para desarrollo local.

Para listar las variables configuradas en producción se usa `vercel env ls`. El comando muestra todas las variables con sus environments (Production, Preview, Development) pero no muestra los valores (están encriptados).

Para agregar una variable nueva se usa `vercel env add NOMBRE production`. El comando pide el valor por stdin. Si la variable ya existe, hay que eliminarla primero con `vercel env rm NOMBRE production` antes de agregarla.

Para usar las variables en desarrollo local, se puede hacer `vercel env pull .env.local`. Esto descarga las variables de Vercel y las guarda en un archivo local que Next.js lee al arrancar `npm run dev`. No es necesario hacer esto si el .env.local ya está configurado manualmente.

Después de cambiar cualquier variable, **hay que hacer un nuevo deploy** para que el sitio en producción la lea. Las variables se inyectan en el build de Vercel, no se leen dinámicamente. Si cambias `RESEND_API_KEY` pero no haces deploy, el sitio sigue usando la anterior.

## El proceso de deploy

El deploy a producción se hace ejecutando `vercel deploy --prod` desde la máquina local. El comando hace varias cosas en orden.

Primero sube los archivos del directorio actual a Vercel (excluyendo `node_modules`, `.next`, y los listados en `.gitignore`). Esto incluye todo el código fuente y los assets en `public/`.

Después Vercel arranca un build en su infraestructura. Corre `npm install` para instalar dependencias, luego `npm run build` que es `next build`. Si el build falla por cualquier error de sintaxis, importación o type, el deploy aborta y se queda el deploy anterior activo.

Si el build tiene éxito, Vercel genera la nueva URL del deploy (algo como `https://scentualbliss-xyz123.vercel.app`) y, como pasamos `--prod`, también asocia esa URL al dominio principal `scentualbliss.com.co`. El cambio toma 1-2 segundos en propagar globalmente por la red de CDN.

El comando devuelve la URL del nuevo deploy. Útil para verificar que efectivamente está activo.

Tres detalles a considerar. Primero: el deploy lee los archivos LOCALES, no los del último commit en git. Si tienes cambios sin commitear pero quieres desplegar, está bien: vercel los sube tal cual están en disco. Pero también significa que si olvidas guardar un archivo en VSCode antes de desplegar, esos cambios no van. Conviene hacer git commit antes para tener historial reproducible.

Segundo: Vercel no tiene integración con git activada para este proyecto. Hacer `git push` a la rama main no dispara nada automático. Para desplegar, siempre hay que correr `vercel deploy --prod`.

Tercero: en el plan free de Vercel solo se puede hacer rollback al deploy inmediatamente anterior. Si necesitas volver a un deploy más viejo, hay que re-desplegar desde el código fuente correspondiente (idealmente recuperándolo de git con `git checkout`).

## Verificación post-deploy

Después de cada deploy es buena práctica hacer una verificación rápida.

El primer paso es chequear que el sitio responde. Un `curl -I https://scentualbliss.com.co` debería devolver 200. Si devuelve 500, algo se rompió en el build o en el runtime.

El segundo paso es abrir el sitio en el navegador y navegar por las rutas principales: home, tienda con algún filtro, una página de producto, el checkout (sin pagar). Cualquier error que aparezca en consola del navegador indica un bug client-side.

Para revisar logs en tiempo real durante el desarrollo, `vercel logs <deployment-url>` muestra los logs runtime: cada server component que renderiza, cada API route que se llama, y cualquier error que ocurra. Es la mejor forma de debuggear errores que no se ven desde el navegador.

Si algo está mal y hay que volver atrás, `vercel rollback` revierte al deploy inmediatamente anterior. Es rápido (segundos), pero como se mencionó, solo permite un paso atrás en el plan free.

## Configurar un proyecto desde cero

Si necesitaras configurar el proyecto desde cero en otra cuenta de Vercel o como nuevo proyecto, este sería el orden de pasos.

Primero crear el proyecto en Vercel: `vercel link` desde el directorio del proyecto, que crea un `.vercel/project.json` con la configuración.

Después configurar todas las variables de entorno. Las críticas (sin las cuales el sitio no funciona) son las tres de Supabase y `ADMIN_PASSWORD`. Las de Wompi se pueden agregar después si se quiere probar primero sin pagos reales. Las de Resend solo si se quieren los emails transaccionales.

Hacer un primer deploy con `vercel deploy --prod`. Si hay errores de build, los logs los muestran.

Si el deploy funciona, agregar el dominio personalizado: en el dashboard de Vercel, Settings > Domains > Add. Vercel da las instrucciones específicas para configurar DNS en el proveedor del dominio (típicamente un registro A o CNAME).

Para Resend, además de configurar la API key, hay que verificar el dominio remitente. En el panel de Resend, agregar `scentualbliss.com.co` o un subdominio dedicado, y agregar los tres registros TXT que Resend indica (SPF, DKIM, DMARC) en el DNS del dominio.

Para Wompi, configurar la URL del webhook en el dashboard de Wompi apuntando a `https://scentualbliss.com.co/api/wompi/webhook`. Sin esto, los pagos se procesan pero el sitio nunca se entera de su resultado.

Por último, configurar el cron job para sincronización. En el dashboard de Vercel, Settings > Cron Jobs, agregar un job que llame a `/api/cron/sync-orders` cada cierto tiempo (recomendado: cada 15 minutos).
