/*
 * Offline support for the installed web app.
 *
 * Two strategies, because the two kinds of request have opposite needs:
 *  - Page loads go to the network first, so a fresh deploy is picked up
 *    immediately; the cache is only the fallback when there is no signal.
 *  - Everything else (JS, fonts, sounds, images) is content-hashed by the
 *    bundler, so a cached copy can never be stale — serve it straight away.
 */
const CACHE = 'beerpong-v1';

self.addEventListener('install', () => {
  // Take over as soon as this version is ready rather than waiting for every
  // tab to close — a party is no time to explain browser tab lifecycles.
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const names = await caches.keys();
      await Promise.all(names.filter((name) => name !== CACHE).map((name) => caches.delete(name)));
      await self.clients.claim();
    })()
  );
});

async function cacheIfOk(request, response) {
  // Opaque and error responses would poison the cache.
  if (!response || !response.ok || response.type !== 'basic') return response;
  const cache = await caches.open(CACHE);
  cache.put(request, response.clone());
  return response;
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === 'navigate') {
    event.respondWith(
      (async () => {
        try {
          return await cacheIfOk(request, await fetch(request));
        } catch {
          return (await caches.match(request)) ?? (await caches.match('./')) ?? Response.error();
        }
      })()
    );
    return;
  }

  event.respondWith(
    (async () => {
      const hit = await caches.match(request);
      if (hit) return hit;
      try {
        return await cacheIfOk(request, await fetch(request));
      } catch {
        return Response.error();
      }
    })()
  );
});
