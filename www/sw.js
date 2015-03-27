'use strict';

importScripts('serviceworker-cache-polyfill.js');
importScripts('handlebars-v3.0.0.js');

var CACHE_NAME = 'service-worker-side-rendering-01',
    urlsToCache = [
      '/swsr'
    ],
    renderTemplate;

self.addEventListener('install', function (event) {
  console.log('ServiceWorker.oninstall: ', event);
  event.waitUntil(
    caches.open(CACHE_NAME)
    .then(function (cache) {
      console.log('Opened cache');
      return cache.addAll(urlsToCache);
    })
  );
});

self.addEventListener('activate', function(event) {
  console.log('ServiceWorker.onactive: ', event);
  event.waitUntil(
    caches.keys()
    .then(function (cacheNames) {
      return Promise.all(
        cacheNames.map(function (cacheName) {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

function doSWSideRendering(data, templateText) {
  if (!renderTemplate) {
    // Compile the template into a function.
    renderTemplate = Handlebars.compile(templateText);
  }

  // Do Service-Worker-side rendering.
  data.place = 'Service-Worker';
  return new Response(renderTemplate(data), {
    headers: {
      'Content-Type': 'text/html'
    }
  });
}

self.addEventListener('fetch', function (event) {
  var url = event.request.url,
      offset = url.indexOf(location.host) + location.host.length,
      path = url.slice(offset);

  if (path.indexOf('/ssr') === 0) {
    // Always from network.
    event.respondWith(fetch(event.request));

  } else if (path.indexOf('/api') === 0) {
    // Always from network.
    event.respondWith(fetch(event.request));

  } else if (path.indexOf('/swsr') === 0) {

    // Cache first.
    event.respondWith(
      Promise.all([
        caches.match(event.request).then(function (response) {
          return response.text();
        }),
        fetch('/api/random').then(function(response) {
          return response.json();
        })
      ]).then(function(responses) {
        var template = responses[0],
            data = responses[1],
            fetchRequest;

        if (template) {
          console.log('ServiceWorker.onfetch: Loaded from cache:', url);
          // Do Service-Worker-side rendering.
          return doSWSideRendering(data, template);
        } else {
          // If not found in cache, fetch from network.
          fetchRequest = event.request.clone();
          return fetch(fetchRequest).then(function(res) {
            var responseToCache;

            if (!res || res.status !== 200 || res.type !== 'basic') {
              console.log('do not cache: ', res);
              return res.text();
            }

            console.log('ServiceWorker.onfetch: Loaded from network:', url);
            // Store the response to cache.
            caches.open(CACHE_NAME).then(function(cache) {
              console.log('\tAnd cache it!');
              responseToCache = res.clone();
              cache.put(fetchRequest, responseToCache);
            });
            return res.text();
          }).then(function (res) {
            // Do Service-Worker-side rendering.
            return doSWSideRendering(data, res);
          });
        }
      })
    );
  }
});
