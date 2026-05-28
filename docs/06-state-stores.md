# 06 · Estado del cliente con Zustand

## Por qué Zustand

El proyecto usa Zustand para manejar el estado compartido entre componentes del lado del cliente. Zustand es una librería pequeña pero expresiva: un store es básicamente una función con estado interno que cualquier componente puede leer mediante hooks. A diferencia de Redux, no requiere providers ni reducers ni acciones tipadas: la API es directa.

Hay tres stores en el proyecto y todos viven en `lib/store/`. El carrito de compras (`cartStore`), la lista de favoritos (`wishlistStore`) y el modal de vista rápida (`quickViewStore`). Los dos primeros se persisten automáticamente en `localStorage`, el tercero es volátil.

## El cartStore

El store del carrito es el más complejo de los tres. Está definido en `lib/store/cartStore.js` y maneja todos los items que el cliente ha agregado, junto con el estado del CartDrawer (si está abierto o cerrado).

El estado tiene dos campos: `items` que es un array de items del carrito, e `isOpen` que indica si el drawer está abierto. Cada item del carrito es básicamente una copia del producto con campos extra: `selectedSize` (la talla elegida), `price` (el precio según la talla, que puede ser distinto del precio base del producto), una `key` única que combina id y talla (necesaria porque el mismo producto en distintas tallas son items diferentes), y `quantity` con la cantidad actual.

El store expone varias acciones. `addItem(product, selectedSize)` agrega un producto en la talla indicada; si ya existe ese producto con esa talla, incrementa la cantidad en 1; si es nuevo, lo agrega al array. Después de agregar, marca `isOpen: true` para abrir el drawer automáticamente y mostrarle al usuario que el item se agregó.

`removeItem(key)` elimina el item con esa key del array. `updateQuantity(key, qty)` cambia la cantidad de un item; si la cantidad pasa a ser menor que 1, llama internamente a `removeItem`. `clearCart()` vacía el array. `openCart`, `closeCart` y `toggleCart` solo modifican el flag `isOpen`.

Además del store en sí, el archivo exporta dos selectores: `useCartTotal()` que devuelve el subtotal sumando precio por cantidad, y `useCartCount()` que devuelve la cantidad total de items.

### Persistencia y protección contra datos corruptos

El store usa el middleware `persist` de Zustand para guardar automáticamente en `localStorage` con la key `scentualbliss-cart`. Cada vez que el estado cambia, se serializa y se escribe; cada vez que la página carga, se lee y se hidrata.

Esta persistencia ha sido fuente de bugs en el pasado. Si el formato del estado cambia entre versiones del sitio (por ejemplo, cuando renombramos un campo o cambiamos la estructura de items), el localStorage del usuario queda desactualizado y al deserializar puede generar items con campos undefined que rompen el código que los usa.

Para protegerse contra eso, el store tiene tres capas de defensa.

Primero, una función `safeItems` que toma cualquier valor y devuelve un array válido: si el input es un array, lo devuelve tal cual; si es cualquier otra cosa (null, undefined, un objeto, etc.), devuelve un array vacío. Esta función se aplica dentro de cada acción del store: cuando `addItem` lee `get().items`, lo pasa por `safeItems` primero.

Segundo, en la opción `partialize` del persist se filtra qué se guarda en localStorage. Solo se persisten `items` (pasado por safeItems) e `isOpen`. Si en versiones anteriores se guardaban otros campos (como `total` o `count` que ahora son selectores calculados), esos se descartan al guardar.

Tercero, en el callback `onRehydrateStorage` se hacen dos cosas. Si la deserialización falla por completo (JSON malformado), se elimina el localStorage corrupto para empezar limpio. Si la deserialización fue exitosa pero el resultado tiene `items` no-array (por incompatibilidad de versión), se normaliza a array vacío directamente sobre el estado.

Los selectores `useCartTotal` y `useCartCount` también son defensivos: aplican `safeItems` antes de hacer reduce, y usan `(i.price || 0)` y `(i.quantity || 0)` para que items malformados no rompan el cálculo.

## El wishlistStore

El store de favoritos es mucho más simple. Está en `lib/store/wishlistStore.js` y solo guarda un array de productos. La única acción que expone es `toggle(product)`: si el producto ya está en la lista lo quita, si no está lo agrega.

Tiene las mismas tres capas de defensa que el cartStore: la función `safeItems` interna, el `partialize` para descartar basura, y el `onRehydrateStorage` que normaliza o limpia.

Se persiste en localStorage con la key `scentualbliss-wishlist`.

### Por qué el wishlist tiene estas protecciones

Estas protecciones se agregaron como respuesta a un bug real. En una versión anterior del sitio, varios usuarios reportaron que el sitio entero reventaba con "Application error" al recargar. La causa era que su localStorage tenía datos viejos del wishlist incompatibles con el código nuevo. Cuando el componente PCard hacía `wishlistItems.some(i => i.id === product.id)`, fallaba con "Cannot read property 'some' of undefined" y eso propagaba hacia arriba hasta romper todo el árbol de React.

El fix de raíz fue endurecer el store con safeItems. Pero también se agregó defensive coding en cada componente que consume el wishlist: en lugar de hacer `const { items } = useWishlistStore()` y usar `items` directo, ahora se hace `const { items: rawItems } = useWishlistStore()` seguido de `const items = Array.isArray(rawItems) ? rawItems : []`. Esa segunda línea garantiza que `items` siempre sea un array, sin importar lo que diga el store.

Esto se aplicó en seis componentes: ProductCard, HomePageClient (en su PCard interno), ProductPageClient, Navbar (para el badge del icono de favoritos), WishlistPageClient y CartDrawer.

## El quickViewStore

El store de vista rápida es el más simple. Está en `lib/store/quickViewStore.js` y solo tiene un producto actual (o `null`) más dos acciones: `open(product)` y `close()`.

No se persiste, porque no tiene sentido: si el usuario recarga la página con el modal abierto, lo normal es que arranque sin modal.

Se usa en dos lugares: el componente `QuickViewModal` (que envuelve al QuickView con dynamic loading) lee el producto del store y abre el modal cuando hay producto; el `ProductCard` y el `PCard` de la home llaman a `openQuickView(product)` cuando el usuario hace clic en el icono de ojo.

## Cómo se consume un store

Zustand expone los stores como hooks. Para leer un valor o suscribirse a cambios:

```js
const items = useCartStore(s => s.items);          // Solo items
const { items, addItem } = useCartStore();         // Items y addItem
const total = useCartTotal();                      // Selector pre-construido
```

Cuando un componente lee un store con un selector funcional (`useCartStore(s => s.items)`), solo se re-renderiza si el valor seleccionado cambia. Esto es más eficiente que destructurar el store completo, especialmente en componentes que solo necesitan un campo.

Las acciones del store se pueden llamar desde cualquier parte del código que sea cliente. No requieren dispatch ni contexto, solo importar el hook y llamarlo. Las acciones son síncronas y mutan el estado, lo que dispara los re-renders correspondientes.

## Cuándo usar un store y cuándo no

No todo el estado debería ir en un store de Zustand. La regla general es: si dos o más componentes en distintas partes del árbol necesitan leer o modificar el mismo dato, va al store. Si es estado local de un componente o un grupo cercano, queda como `useState`.

Por ejemplo, el carrito está en Zustand porque el Navbar muestra el contador, el CartDrawer muestra los items, el ProductCard agrega cosas, y el CheckoutPageClient lee todo. Si fuera `useState` en algún componente padre, habría que pasar props o usar context.

Pero el estado del Quiz olfativo (las respuestas del usuario, el step actual) es `useState` local dentro del componente `Quiz` de la home, porque ningún otro componente necesita esa información.

## Riesgos a tener en cuenta

Hay dos riesgos importantes con la persistencia de stores.

El primero es la **compatibilidad entre versiones del sitio**. Si en el futuro se cambia la estructura de items del carrito (por ejemplo, se agrega un campo obligatorio o se renombra uno existente), los usuarios con la versión vieja en su localStorage pueden ver comportamientos raros. Las tres capas de defensa minimizan esto pero no lo eliminan al 100%. La mejor práctica al cambiar la estructura es agregar un número de versión y hacer migración explícita.

El segundo es la **exposición de datos**. Lo que se guarda en localStorage es legible por cualquier script que corra en el dominio. No guardamos información sensible (no hay tokens de autenticación ni datos de tarjeta), pero sí guardamos los productos del carrito con sus precios y los favoritos. Esto está bien porque es información pública del catálogo.
