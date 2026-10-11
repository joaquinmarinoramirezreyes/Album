// ═══════════════════════════════════════════════════════════
//  SERVICE WORKER — Network-First con Cache Versionado
//  Cambia CACHE_VERSION en cada deploy para forzar actualización
// ═══════════════════════════════════════════════════════════

const CACHE_VERSION = 'album-ceramico-v8';

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
// 1. Atiende solo peticiones GET del mismo origen
// 2. Excluye Firebase / Firestore, Google APIs, SSO de Vercel y rutas reservadas /__/
// 3. No cachea respuestas no OK ni redirecciones
// 4. Fallback a Response válida (Response.error()) si falla la red y no hay caché
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;

  const url = new URL(e.request.url);

  // Solo mismo origen
  if (url.origin !== self.location.origin) return;

  // Excluir rutas reservadas y APIs externas / SSO
  if (
    url.pathname.startsWith('/__/') ||
    url.pathname.startsWith('/sso-api') ||
    url.hostname.includes('firebase') ||
    url.hostname.includes('googleapis.com')
  ) {
    return;
  }

  e.respondWith(
    fetch(e.request)
      .then((networkResponse) => {
        // No cachear respuestas no OK (status < 200 o >= 300) ni redirecciones
        if (networkResponse && networkResponse.ok && networkResponse.status === 200) {
          const clone = networkResponse.clone();
          caches.open(CACHE_VERSION).then((cache) => {
            cache.put(e.request, clone);
          });
        }
        return networkResponse;
      })
      .catch(async () => {
        // Sin red → servir desde caché si existe
        const cached = await caches.match(e.request);
        if (cached) return cached;

        // Fallback seguro a Response.error() para evitar "Failed to convert value to 'Response'"
        return Response.error();
      })
  );
});
