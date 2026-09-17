const CACHE = "cobro-shell-v1";
const RECURSOS_ESTATICOS = ["/manifest.json", "/icon.svg"];

self.addEventListener("install", (evento) => {
  evento.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(RECURSOS_ESTATICOS)).catch(() => {}),
  );
  self.skipWaiting();
});

self.addEventListener("activate", (evento) => {
  evento.waitUntil(
    caches.keys().then((claves) =>
      Promise.all(claves.filter((c) => c !== CACHE).map((c) => caches.delete(c))),
    ),
  );
  self.clients.claim();
});

// Los datos financieros nunca deben venir de caché: solo se cachean los
// recursos estáticos del shell (ícono, manifest). Todo lo demás va a red.
self.addEventListener("fetch", (evento) => {
  const url = new URL(evento.request.url);
  if (evento.request.method !== "GET" || url.origin !== self.location.origin) return;

  if (RECURSOS_ESTATICOS.includes(url.pathname)) {
    evento.respondWith(
      caches.open(CACHE).then(async (cache) => {
        const enCache = await cache.match(evento.request);
        if (enCache) return enCache;
        const respuesta = await fetch(evento.request);
        cache.put(evento.request, respuesta.clone());
        return respuesta;
      }),
    );
  }
});
