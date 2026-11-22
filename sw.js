/* Service worker do app: permite instalar no Android e abrir sem internet.
   Rede primeiro (versão nova do index.html chega sozinha); sem rede, usa a
   cópia guardada. Não guarda nada além dos arquivos do próprio app. */
'use strict';

const CACHE = 'notif-pc-v3';
const ARQUIVOS = ['./', './index.html', './manifest.webmanifest', './coelho-blocos.js',
  './icones/icone-192.png', './icones/icone-512.png', './icones/selo-96.png'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ARQUIVOS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((chaves) => Promise.all(chaves.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Tocar na notificação do sistema: traz o app para a frente (ou abre)
self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  e.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((janelas) => {
      const aberta = janelas.find((j) => j.url.startsWith(self.registration.scope));
      return aberta ? aberta.focus() : self.clients.openWindow('./');
    })
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;
  e.respondWith(
    fetch(req)
      .then((resp) => {
        if (resp.ok) {
          const copia = resp.clone();
          caches.open(CACHE).then((c) => c.put(req, copia));
        }
        return resp;
      })
      .catch(() => caches.match(req, { ignoreSearch: true }).then((r) => r || caches.match('./index.html')))
  );
});
