// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
//  SERVICE WORKER â€” Network-First con Cache Versionado
//  Cambia CACHE_VERSION en cada deploy para forzar actualizaciÃ³n
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

const CACHE_VERSION = 'album-ceramico-v5';

// Al instalarse, toma control inmediatamente (no espera a que cierren la pestaÃ±a)
self.addEventListener('install', (e) => {
  self.skipWaiting();
});

// Al activarse, borra caches viejos y toma control de todas las pestaÃ±as
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
// 1. Intenta descargar de la red (siempre obtiene la versiÃ³n mÃ¡s reciente)
// 2. Si la red falla (offline), usa la copia en cachÃ©
// 3. Guarda cada respuesta exitosa en cachÃ© para uso offline
self.addEventListener('fetch', (e) => {
  // Solo cachear requests GET del mismo origen
  if (e.request.method !== 'GET') return;

  e.respondWith(
    fetch(e.request)
      .then((networkResponse) => {
        // Guardar copia fresca en cachÃ©
        const clone = networkResponse.clone();
        caches.open(CACHE_VERSION).then((cache) => {
          cache.put(e.request, clone);
        });
        return networkResponse;
      })
      .catch(() => {
        // Sin red â†’ servir desde cachÃ© (modo offline)
        return caches.match(e.request);
      })
  );
});

