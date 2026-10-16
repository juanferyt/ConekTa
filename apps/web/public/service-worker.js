self.addEventListener('push', event => {
  const data = event.data ? event.data.json() : {};
  event.waitUntil(self.registration.showNotification(data.title || 'ConekTa', {
    body: data.body || 'Tienes una nueva notificación', icon: '/brand/conekta-icon.png', badge: '/brand/conekta-icon.png',
    data: { link: data.link || '/' }, tag: data.link || 'conekta-notification',
  }));
});
self.addEventListener('notificationclick', event => {
  event.notification.close(); const link = event.notification.data?.link || '/';
  event.waitUntil(clients.matchAll({ type: 'window', includeUncontrolled: true }).then(items => {
    const existing = items.find(client => new URL(client.url).origin === self.location.origin);
    return existing ? existing.focus().then(() => existing.navigate(link)) : clients.openWindow(link);
  }));
});
