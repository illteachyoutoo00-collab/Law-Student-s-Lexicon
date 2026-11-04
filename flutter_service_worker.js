self.addEventListener('install',e=>e.waitUntil(self.skipWaiting()));
self.addEventListener('activate',e=>e.waitUntil(self.clients.claim()));
self.addEventListener('fetch',e=>{
  if(e.request.method!=='GET'||new URL(e.request.url).origin!==self.location.origin)return;
  e.respondWith(fetch(e.request).catch(async()=>{
    const hit=await caches.match(e.request,{ignoreSearch:true});
    if(hit)return hit;
    if(e.request.mode==='navigate'){
      const page=await caches.match(new URL('index.html',self.registration.scope).href);
      if(page)return page;
    }
    return Response.error();
  }));
});
