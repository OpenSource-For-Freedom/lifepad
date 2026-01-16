// Service Worker for lifePAD
// Provides offline functionality and caching

const CACHE_VERSION = 'v4';
const CACHE_NAME = `lifepad-cache-${CACHE_VERSION}`;

// Files to cache for offline use
const STATIC_ASSETS = [
    './',
    './index.html',
    './styles.css',
    './app.js',
    './manifest.webmanifest',
    './icons/lifepad.PNG'
];

// Install event - cache static assets
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('Caching static assets');
                return cache.addAll(STATIC_ASSETS);
            })
            .then(() => self.skipWaiting())
    );
});

// Activate event - clean up old caches
self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys()
            .then(cacheNames => {
                return Promise.all(
                    cacheNames
                        .filter(name => name.startsWith('lifepad-') && name !== CACHE_NAME)
                        .map(name => {
                            console.log('Deleting old cache:', name);
                            return caches.delete(name);
                        })
                );
            })
            .then(() => self.clients.claim())
    );
});

// Listen for skip waiting message
self.addEventListener('message', event => {
    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
});

// Fetch event - cache-first for assets, network-first for HTML
self.addEventListener('fetch', event => {
    const url = new URL(event.request.url);
    
    // Network-first for HTML to get updates quickly
    if (event.request.destination === 'document' || url.pathname.endsWith('.html') || url.pathname.endsWith('/')) {
        event.respondWith(
            fetch(event.request)
                .then(response => {
                    if (response && response.status === 200) {
                        const responseToCache = response.clone();
                        caches.open(CACHE_NAME).then(cache => {
                            cache.put(event.request, responseToCache);
                        });
                    }
                    return response;
                })
                .catch(() => {
                    return caches.match(event.request)
                        .then(cachedResponse => cachedResponse || caches.match('./index.html'));
                })
        );
        return;
    }
    
    // Cache-first for all other assets
    event.respondWith(
        caches.match(event.request)
            .then(cachedResponse => {
                if (cachedResponse) {
                    return cachedResponse;
                }
                
                return fetch(event.request)
                    .then(response => {
                        // Don't cache non-successful responses
                        if (!response || response.status !== 200 || response.type !== 'basic') {
                            return response;
                        }
                        
                        // Clone the response
                        const responseToCache = response.clone();
                        
                        // Cache new responses for static assets
                        if (event.request.url.includes('/icons/') || 
                            event.request.url.includes('favicon.png') ||
                            event.request.url.endsWith('.css') ||
                            event.request.url.endsWith('.js') ||
                            event.request.url.endsWith('.webmanifest')) {
                            caches.open(CACHE_NAME)
                                .then(cache => {
                                    cache.put(event.request, responseToCache);
                                })
                                .catch(err => {
                                    console.error('Cache put error:', err);
                                });
                        }
                        
                        return response;
                    });
            })
    );
});
