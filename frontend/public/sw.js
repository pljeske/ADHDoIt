self.addEventListener('push', event => {
  let data = {}
  try { data = event.data?.json() ?? {} } catch (_) {}
  event.waitUntil(
    self.registration.showNotification(data.title ?? 'ADHDoIt', {
      body: data.body,
      data: { url: data.url ?? '/' }
    })
  )
})

self.addEventListener('notificationclick', event => {
  event.notification.close()
  event.waitUntil(clients.openWindow(event.notification.data.url))
})
