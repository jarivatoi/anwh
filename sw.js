const CACHE_NAME = 'xray-anwh-v7';
const urlsToCache = [
  '/anwh/',
  '/anwh/index.html',
  '/anwh/manifest.json'
];

// Install event - cache essential resources
self.addEventListener('install', (event) => {
  console.log('SW: Installing...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('SW: Caching essential files');
        return cache.addAll(urlsToCache).catch((error) => {
          console.log('SW: Cache failed, continuing anyway', error);
          return Promise.resolve();
        });
      })
      .catch((error) => {
        console.log('SW: Install failed, continuing anyway', error);
        return Promise.resolve();
      })
  );
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('SW: Activating...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('SW: Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch event - handle all requests
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  
  // For navigation requests (page loads/refreshes)
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          // If network succeeds, return fresh content
          if (response && response.status === 200) {
            return response;
          }
          // If network fails or returns error, try cache
          return caches.match('/anwh/index.html') || caches.match('/anwh/');
        })
        .catch(() => {
          // Network completely failed, try cache
          return caches.match('/anwh/index.html') || caches.match('/anwh/') || 
                 new Response(`
                   <!DOCTYPE html>
                   <html>
                   <head>
                     <title>X-ray ANWH</title>
                     <meta name="viewport" content="width=device-width, initial-scale=1.0">
                     <style>
                       body { 
                         font-family: -apple-system, BlinkMacSystemFont, sans-serif; 
                         text-align: center; 
                         padding: 50px 20px; 
                         background: white;
                         color: #374151;
                         min-height: 100vh;
                         margin: 0;
                         display: flex;
                         align-items: center;
                         justify-content: center;
                         flex-direction: column;
                       }
                       .container { max-width: 400px; }
                       h1 { font-size: 24px; margin-bottom: 20px; color: #1f2937; }
                       p { font-size: 16px; line-height: 1.5; margin-bottom: 30px; color: #6b7280; }
                       button { 
                         background: #6366f1; 
                         color: white; 
                         border: none; 
                         padding: 12px 24px; 
                         border-radius: 8px; 
                         font-size: 16px; 
                         font-weight: 600;
                         cursor: pointer;
                       }
                     </style>
                   </head>
                   <body>
                     <div class="container">
                       <h1>📱 X-ray ANWH</h1>
                       <p>App is loading... If this persists, please check your connection and try again.</p>
                       <button onclick="window.location.reload()">Reload App</button>
                     </div>
                     <script>
                       // Auto-reload after 3 seconds
                       setTimeout(() => {
                         window.location.reload();
                       }, 3000);
                     </script>
                   </body>
                   </html>
                 `, {
                   headers: { 'Content-Type': 'text/html' }
                 });
        })
    );
    return;
  }
  
  // For all other requests, try cache first, then network
  event.respondWith(
    caches.match(event.request)
      .then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse;
        }
        
        // Not in cache, try network
        return fetch(event.request).catch(() => {
          // Network failed, return minimal response
          return new Response('', {
            status: 200,
            statusText: 'OK',
            headers: { 'Content-Type': 'text/plain' }
          });
        });
      })
  );
});