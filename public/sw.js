/**
 * CitasYA — Service Worker
 *
 * Estrategia: Cache-first para assets estáticos, Network-first para API.
 * Proporciona experiencia offline básica mostrando una página de fallback.
 */

const CACHE_NAME = 'citasya-v2';
const STATIC_ASSETS = [
  '/',
  '/manifest.json',
  '/logo.png',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
];

// ─── Install: Pre-cachear assets estáticos ──────────────────────────────────

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    })
  );
  // Activar inmediatamente sin esperar a que cierren tabs
  self.skipWaiting();
});

// ─── Activate: Limpiar caches antiguos ──────────────────────────────────────

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    })
  );
  // Tomar control de todas las pestañas inmediatamente
  self.clients.claim();
});

// ─── Fetch: Estrategia de caché ─────────────────────────────────────────────

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // No interceptar llamadas a Supabase ni a APIs externas
  if (
    url.origin !== self.location.origin ||
    url.pathname.startsWith('/rest/') ||
    url.pathname.startsWith('/auth/') ||
    url.pathname.startsWith('/functions/')
  ) {
    return;
  }

  // Para navegación (HTML): Network-first con fallback a cache
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Guardar en cache para offline
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          return response;
        })
        .catch(() => {
          return caches.match(request).then((cached) => {
            return cached || caches.match('/');
          });
        })
    );
    return;
  }

  // Para assets estáticos (JS, CSS, imágenes): Cache-first
  if (
    request.destination === 'script' ||
    request.destination === 'style' ||
    request.destination === 'image' ||
    request.destination === 'font'
  ) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;

        return fetch(request).then((response) => {
          // Cache solo respuestas exitosas
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return response;
        });
      })
    );
    return;
  }
});
