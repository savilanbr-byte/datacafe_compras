// DataCafé service worker: app disponible sin conexión, datos siempre frescos cuando hay red.
const VERSION = "datacafe-v3";
const SHELL = ["./", "index.html", "manifest.webmanifest", "icons/icon-192.png", "icons/icon-512.png", "icons/apple-touch-icon.png", "icons/favicon-32.png"];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== VERSION).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  // Datos: la app ya guarda la última copia; no los cacheamos aquí.
  if (url.origin === location.origin && url.pathname.includes("/data/")) return;
  // Página: red primero, para recibir versiones nuevas; si no hay red, la copia guardada.
  // Solo la app (raíz o index.html) se guarda como copia sin conexión; otras páginas van directo a la red.
  if (req.mode === "navigate" && !/\/(index\.html)?$/.test(url.pathname)) return;
  if (req.mode === "navigate") {
    e.respondWith(fetch(req).then(r => { const cp = r.clone(); caches.open(VERSION).then(c => c.put("index.html", cp)); return r; })
      .catch(() => caches.match("index.html")));
    return;
  }
  // Resto (íconos, fuentes, jsPDF): copia guardada y se refresca en segundo plano.
  e.respondWith(caches.match(req).then(hit => {
    const net = fetch(req).then(r => { if (r && (r.ok || r.type === "opaque")) { const cp = r.clone(); caches.open(VERSION).then(c => c.put(req, cp)); } return r; }).catch(() => hit);
    return hit || net;
  }));
});
