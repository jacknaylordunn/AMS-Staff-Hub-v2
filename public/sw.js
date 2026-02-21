
const CACHE_NAME = 'aegis-shell-v3';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/manifest.json'
];

// Install Event: Cache App Shell
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[ServiceWorker] Caching App Shell');
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
  self.skipWaiting();
});

// Activate Event: Cleanup Old Caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keyList) => {
      return Promise.all(
        keyList.map((key) => {
          if (key !== CACHE_NAME) {
            console.log('[ServiceWorker] Removing old cache', key);
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch Event: Network First for Data, Cache First for Assets
self.addEventListener('fetch', (event) => {
  // Navigation requests (HTML) - Network first, fall back to cache
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).catch(() => {
        return caches.match('/index.html');
      })
    );
    return;
  }

  // Static Assets - Cache first, fall back to network
  event.respondWith(
    caches.match(event.request).then((response) => {
      // If found in cache, return it. Otherwise, fetch from network.
      // We catch the fetch error to prevent "Uncaught (in promise)" console noise when offline.
      return response || fetch(event.request).catch((e) => {
          // Return a 404 response or similar to satisfy the promise chain
          // This prevents the "Uncaught (in promise)" error in the SW console
          return new Response(null, { status: 404, statusText: "Offline/Not Found" });
      });
    })
  );
});

// Push Notification Listener
self.addEventListener('push', (event) => {
  const data = event.data ? event.data.json() : { title: 'Aegis Update', body: 'New notification received.' };
  
  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: 'https://145955222.fs1.hubspotusercontent-eu1.net/hubfs/145955222/AMS/Logo%20FINAL%20(2).png',
      badge: 'https://145955222.fs1.hubspotusercontent-eu1.net/hubfs/145955222/AMS/Logo%20FINAL%20(2).png',
      data: { url: data.link || '/' }
    })
  );
});

// Notification Click Handler
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.openWindow(event.notification.data.url)
  );
});
