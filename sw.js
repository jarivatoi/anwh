// Service Worker for PWA auto-updates
const CACHE_NAME = 'xray-anwh-v1.0.0';
const STATIC_CACHE_NAME = 'xray-anwh-static-v1.0.0';

// Files to cache for offline functionality
const STATIC_FILES = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icon.png',
  '/icon.svg'
];

// Helper function to check if request is for Supabase
const isSupabaseRequest = (request) => {
  try {
    if (!request || !request.url) {
      return false;
    }
    
    // Handle both string URLs and URL objects
    const urlString = typeof request.url === 'string' ? request.url : request.url.toString();
    if (!urlString || typeof urlString !== 'string') {
      return false;
    }
    
    const url = new URL(urlString);
    return url.hostname && (url.hostname.includes('supabase.co') || url.hostname.includes('supabase.com'));
  } catch (error) {
    console.warn('SW: Invalid URL in request:', request?.url, error);
    return false;
  }
};

// Helper function to check if request is for WebSocket or real-time
const isRealtimeRequest = (request) => {
  try {
    if (!request || !request.url) {
      return false;
    }
    
    // Handle both string URLs and URL objects
    const urlString = typeof request.url === 'string' ? request.url : request.url.toString();
    if (!urlString || typeof urlString !== 'string') {
      return false;
    }
    
    const url = new URL(urlString);
    return url.protocol === 'wss:' || 
           url.pathname.includes('/realtime/') ||
           url.pathname.includes('/socket/') ||
           (request.headers && request.headers.get('upgrade') === 'websocket') ||
           (request.headers && request.headers.get('connection')?.toLowerCase().includes('upgrade'));
  } catch (error) {
    console.warn('SW: Error checking realtime request:', error);
    return false;
  }
};

// Install event - cache static files
self.addEventListener('install', (event) => {
  console.log('SW: Installing service worker');
  
  event.waitUntil(
    caches.open(STATIC_CACHE_NAME)
      .then((cache) => {
        console.log('SW: Caching static files');
        return cache.addAll(STATIC_FILES);
      })
      .then(() => {
        console.log('SW: Skip waiting to activate immediately');
        return self.skipWaiting();
      })
  );
});

// Activate event - clean up old caches and take control
self.addEventListener('activate', (event) => {
  console.log('SW: Activating service worker');
  
  event.waitUntil(
    Promise.all([
      // Clean up old caches
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== CACHE_NAME && cacheName !== STATIC_CACHE_NAME) {
              console.log('SW: Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      }),
      // Take control of all clients immediately
      self.clients.claim()
    ]
    )
  );
});

// Fetch event - handle different types of requests appropriately
self.addEventListener('fetch', (event) => {
  const { request } = event;
  
  // Validate request object
  if (!request || !request.url) {
    console.warn('SW: Invalid request object:', request);
    return;
  }
  
  let url;
  try {
    url = new URL(request.url);
  } catch (error) {
    console.warn('SW: Invalid URL in request:', request.url, error);
    return;
  }
  
  // Skip non-GET requests
  if (request.method !== 'GET') {
    console.log('SW: Skipping non-GET request:', request.method, request.url);
    return;
  }
  
  // CRITICAL: Skip ALL Supabase requests to allow real-time connections
  if (isSupabaseRequest(request)) {
    console.log('SW: Bypassing cache for Supabase request:', request.url);
    return; // Let the request go directly to network
  }
  
  // CRITICAL: Skip WebSocket and real-time requests
  if (isRealtimeRequest(request)) {
    console.log('SW: Bypassing cache for real-time request:', request.url);
    return; // Let WebSocket requests go directly to network
  }
  
  // Skip other external requests
  if (url.origin !== self.location.origin) {
    console.log('SW: Skipping external request:', request.url);
    return;
  }
  
  // Network first strategy for HTML files (to get updates quickly)
  if (request.destination === 'document' || url.pathname.endsWith('.html')) {
    console.log('SW: Using network-first for HTML:', request.url);
    event.respondWith(
      fetch(request)
        .then((response) => {
          // If network succeeds, update cache and return response
          if (response.ok) {
            const responseClone = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, responseClone);
            });
          }
          return response;
        })
        .catch(() => {
          // If network fails, try cache
          console.log('SW: Network failed for HTML, trying cache:', request.url);
          return caches.match(request);
        })
    );
    return;
  }
  
  // Cache first strategy for static assets
  console.log('SW: Using cache-first for static asset:', request.url);
  event.respondWith(
    caches.match(request)
      .then((cachedResponse) => {
        if (cachedResponse) {
          console.log('SW: Serving from cache:', request.url);
          // Return cached version immediately
          return cachedResponse;
        }
        
        console.log('SW: Not in cache, fetching from network:', request.url);
        // If not in cache, fetch from network
        return fetch(request)
          .then((response) => {
            // Cache successful responses
            if (response.ok) {
              const responseClone = response.clone();
              caches.open(CACHE_NAME).then((cache) => {
                cache.put(request, responseClone);
              });
            }
            return response;
          });
      })
  );
});

// Listen for messages from the main app
self.addEventListener('message', (event) => {
  console.log('SW: Received message:', event.data);
  
  if (event.data && event.data.type === 'SKIP_WAITING') {
    console.log('SW: Skipping waiting and activating immediately');
    self.skipWaiting();
  }
  
  if (event.data && event.data.type === 'CHECK_UPDATE') {
    console.log('SW: Checking for updates');
    // Force update check by clearing cache
    caches.delete(CACHE_NAME).then(() => {
      console.log('SW: Cache cleared, updates will be fetched');
      // Notify all clients to reload
      self.clients.matchAll().then((clients) => {
        clients.forEach((client) => {
          client.postMessage({ type: 'RELOAD_PAGE' });
        });
      });
    });
  }
});

// Background sync for when connection is restored
self.addEventListener('sync', (event) => {
  console.log('SW: Background sync triggered');
  
  if (event.tag === 'background-sync') {
    event.waitUntil(
      // Perform any background tasks here
      console.log('SW: Performing background sync')
    );
  }
});

// Push notification support (for future use)
self.addEventListener('push', (event) => {
  console.log('SW: Push notification received');
  
  if (event.data) {
    const data = event.data.json();
    
    const options = {
      body: data.body || 'Roster has been updated',
      icon: '/icon.png',
      badge: '/icon.png',
      tag: 'roster-update',
      requireInteraction: true,
      actions: [
        {
          action: 'open',
          title: 'Open App'
        },
        {
          action: 'dismiss',
          title: 'Dismiss'
        }
      ]
    };
    
    event.waitUntil(
      self.registration.showNotification(data.title || 'X-ray ROSTER', options)
    );
  }
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  console.log('SW: Notification clicked');
  
  event.notification.close();
  
  if (event.action === 'open' || !event.action) {
    event.waitUntil(
      self.clients.matchAll({ type: 'window' }).then((clients) => {
        // Check if app is already open
        for (const client of clients) {
          if (client.url.includes(self.location.origin) && 'focus' in client) {
            return client.focus();
          }
        }
        
        // If app is not open, open it
        if (self.clients.openWindow) {
          return self.clients.openWindow('/');
        }
      })
    );
  }
});

console.log('SW: Service worker script loaded');