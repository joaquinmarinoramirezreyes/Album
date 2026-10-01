// ═══════════════════════════════════════════════════════════
//  SERVICE WORKER — Network-First con Cache Versionado
//  Cambia CACHE_VERSION en cada deploy para forzar actualización
// ═══════════════════════════════════════════════════════════

const CACHE_VERSION = 'album-ceramico-v3';

// Al instalarse, toma control inmediatamente (no espera a que cierren la pestaña)
self.addEventListener('install', (e) => {
  self.skipWaiting();
});

// Al activarse, borra caches viejos y toma control de todas las pestañas
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_VERSION)
          .map((key) => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

// Estrategia: Network-First
// 1. Intenta descargar de la red (siempre obtiene la versión más reciente)
// 2. Si la red falla (offline), usa la copia en caché
// 3. Guarda cada respuesta exitosa en caché para uso offline
self.addEventListener('fetch', (e) => {
  // Solo cachear requests GET del mismo origen
  if (e.request.method !== 'GET') return;

  e.respondWith(
    fetch(e.request)
      .then((networkResponse) => {
        // Guardar copia fresca en caché
        const clone = networkResponse.clone();
        caches.open(CACHE_VERSION).then((cache) => {
          cache.put(e.request, clone);
        });
        return networkResponse;
      })
      .catch(() => {
        // Sin red → servir desde caché (modo offline)
        return caches.match(e.request);
      })
  );
});
