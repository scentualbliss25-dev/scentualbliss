// Service Worker: maneja push notifications + cache offline básica
// Auto-actualización: usa skipWaiting para activar la versión nueva inmediatamente

const CACHE_VERSION = 'v1';

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// Push notification recibida
self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data?.json() || {};
  } catch {
    data = { title: 'ScentualBliss', body: event.data?.text() || 'Nueva notificación' };
  }

  const options = {
    body: data.body || '',
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    tag: data.tag || 'scentualbliss-order',
    requireInteraction: true,
    data: { url: data.url || '/admin/orders' },
    actions: [
      { action: 'view', title: 'Ver orden' },
    ],
  };

  event.waitUntil(
    self.registration.showNotification(data.title || 'Nueva orden', options)
  );
});

// Click en notificación: abrir el admin
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || '/admin/orders';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Si ya hay una ventana abierta, enfocarla y navegar
      for (const client of clientList) {
        if ('focus' in client) {
          client.focus();
          if ('navigate' in client) client.navigate(targetUrl);
          return;
        }
      }
      // Si no hay ventana, abrir una nueva
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })
  );
});
