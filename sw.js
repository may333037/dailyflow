const CACHE = 'dailyflow-v2';

self.addEventListener('install', e => {
  e.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  e.respondWith(
    caches.match(e.request).then(cached => {
      if (cached) return cached;
      return fetch(e.request).then(res => {
        if (res && res.status === 200 && e.request.method === 'GET') {
          const clone = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, clone));
        }
        return res;
      }).catch(() => caches.match('/dailyflow/index.html'));
    })
  );
});

self.addEventListener('push', e => {
  const data = e.data ? e.data.json() : {title:'每日任務',body:'記得打卡今天的習慣！'};
  e.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: '/dailyflow/icons/icon-192x192.png',
      badge: '/dailyflow/icons/icon-72x72.png',
      vibrate: [200,100,200],
      tag: 'dailyflow-reminder'
    })
  );
});

self.addEventListener('notificationclick', e => {
  e.notification.close();
  e.waitUntil(clients.openWindow('/dailyflow/index.html'));
});
