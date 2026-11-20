const CACHE_NAME = 'money-planner-v7';
self.addEventListener('install', event => { self.skipWaiting(); });
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', event => {
  const request = event.request, url = new URL(request.url);
  if (request.method !== 'GET' || url.origin !== location.origin || url.pathname.startsWith('/api')) return;
  event.respondWith(fetch(request, { cache: 'no-store' }).then(response => {
    if (response.ok) { const copy = response.clone(); caches.open(CACHE_NAME).then(cache => cache.put(request, copy)); }
    return response;
  }).catch(() => caches.match(request)));
});

self.addEventListener('push', event => {
  let data={title:'PocketPlan reminder',body:'Open PocketPlan to review your upcoming payments.',url:'/'};
  try { data={...data,...event.data.json()}; } catch (_) {}
  const url=typeof data.url==='string'&&data.url.startsWith('/')&&!data.url.startsWith('//')?data.url:'/';
  event.waitUntil((async()=>{
    await self.registration.showNotification(String(data.title||'PocketPlan reminder').slice(0,100),{
      body:String(data.body||'Review your upcoming payments.').slice(0,200),
      icon:'/icon-192.png',badge:'/icon-192.png',tag:String(data.tag||'pocketplan-reminder').slice(0,150),
      data:{url},renotify:false
    });
    if(self.navigator?.setAppBadge && Number.isInteger(data.badgeCount)){
      try{if(data.badgeCount>0)await self.navigator.setAppBadge(data.badgeCount);else await self.navigator.clearAppBadge()}catch(_){}
    }
  })());
});
self.addEventListener('notificationclick',event=>{
  event.notification.close();
  const target=event.notification.data?.url||'/';
  event.waitUntil((async()=>{
    const windows=await self.clients.matchAll({type:'window',includeUncontrolled:true});
    for(const client of windows){if(new URL(client.url).origin===self.location.origin){await client.focus();return}}
    await self.clients.openWindow(target);
  })());
});
