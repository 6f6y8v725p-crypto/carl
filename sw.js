// Service worker: app-bestanden offline beschikbaar; ALTIJD eerst netwerk (nieuwe versie wint).
// Koers-API's (Finnhub, FMP, JSONBin, ...) worden nooit gecachet: geen oude koersen uit cache.
var CACHE='portefeuille-v2.7';
var FILES=['./','index.html','app.css?v=2.7','app.js?v=2.7','manifest.json','icon-192.png','icon-512.png'];
self.addEventListener('install',function(e){e.waitUntil(caches.open(CACHE).then(function(c){return c.addAll(FILES);}).then(function(){return self.skipWaiting();}));});
self.addEventListener('activate',function(e){e.waitUntil(caches.keys().then(function(ks){return Promise.all(ks.filter(function(k){return k!==CACHE;}).map(function(k){return caches.delete(k);}));}).then(function(){return self.clients.claim();}));});
self.addEventListener('fetch',function(e){
  var u=new URL(e.request.url);
  if(e.request.method!=='GET'||u.origin!==self.location.origin) return; // externe API's: niet aanraken
  e.respondWith(fetch(e.request).then(function(r){
    if(r&&r.ok){var cp=r.clone();caches.open(CACHE).then(function(c){c.put(e.request,cp);});}
    return r;
  }).catch(function(){return caches.match(e.request).then(function(m){return m||caches.match('index.html');});}));
});
self.addEventListener('notificationclick',function(e){e.notification.close();e.waitUntil(self.clients.matchAll({type:'window'}).then(function(cs){if(cs.length)return cs[0].focus();return self.clients.openWindow('./');}));});
