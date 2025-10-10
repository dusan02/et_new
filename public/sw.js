// Service Worker for performance optimization and offline functionality
const CACHE_NAME = "earnings-table-v1";
const STATIC_CACHE_NAME = "earnings-static-v1";
const DATA_CACHE_NAME = "earnings-data-v1";

// Files to cache for offline functionality
const STATIC_FILES = [
  "/",
  "/favicon.svg",
  "/_next/static/css/app/layout.css",
  "/_next/static/chunks/webpack.js",
  "/_next/static/chunks/main.js",
];

// API endpoints to cache
const API_ENDPOINTS = ["/api/earnings", "/api/earnings/stats"];

// Install event - cache static assets
self.addEventListener("install", (event) => {
  console.log("[SW] Installing service worker");

  event.waitUntil(
    caches
      .open(STATIC_CACHE_NAME)
      .then((cache) => {
        console.log("[SW] Caching static files");
        return cache.addAll(STATIC_FILES);
      })
      .then(() => {
        console.log("[SW] Static files cached successfully");
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error("[SW] Failed to cache static files:", error);
      })
  );
});

// Activate event - clean up old caches
self.addEventListener("activate", (event) => {
  console.log("[SW] Activating service worker");

  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (
              cacheName !== STATIC_CACHE_NAME &&
              cacheName !== DATA_CACHE_NAME &&
              cacheName !== CACHE_NAME
            ) {
              console.log("[SW] Deleting old cache:", cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        console.log("[SW] Service worker activated");
        return self.clients.claim();
      })
  );
});

// Fetch event - implement caching strategies
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip caching for earnings API endpoints (always fresh data)
  if (url.pathname.startsWith("/api/earnings")) {
    console.log("[SW] Bypassing cache for earnings API:", url.pathname);
    return; // Let browser handle normally
  }

  // Handle other API requests with network-first strategy
  if (url.pathname.startsWith("/api/")) {
    event.respondWith(
      caches.open(DATA_CACHE_NAME).then((cache) => {
        return fetch(request)
          .then((response) => {
            // Cache successful API responses
            if (response.status === 200) {
              cache.put(request, response.clone());
            }
            return response;
          })
          .catch(() => {
            // Return cached response if network fails
            console.log("[SW] Network failed, returning cached API response");
            return cache.match(request);
          });
      })
    );
    return;
  }

  // Handle static assets with cache-first strategy
  if (
    request.destination === "script" ||
    request.destination === "style" ||
    request.destination === "image" ||
    url.pathname.startsWith("/_next/static/")
  ) {
    event.respondWith(
      caches.match(request).then((response) => {
        if (response) {
          return response;
        }

        return fetch(request).then((response) => {
          // Cache the asset
          if (response.status === 200) {
            caches.open(STATIC_CACHE_NAME).then((cache) => {
              cache.put(request, response.clone());
            });
          }
          return response;
        });
      })
    );
    return;
  }

  // Handle page requests with network-first, cache fallback
  if (request.destination === "document") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Cache successful page responses
          if (response.status === 200) {
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, response.clone());
            });
          }
          return response;
        })
        .catch(() => {
          // Return cached page if network fails
          console.log("[SW] Network failed, returning cached page");
          return caches.match(request).then((response) => {
            return response || caches.match("/");
          });
        })
    );
    return;
  }

  // Default: just fetch
  event.respondWith(fetch(request));
});

// Handle background sync for data updates
self.addEventListener("sync", (event) => {
  if (event.tag === "background-sync-earnings") {
    console.log("[SW] Background sync triggered");
    event.waitUntil(
      fetch("/api/earnings")
        .then((response) => response.json())
        .then((data) => {
          console.log("[SW] Background sync completed");
          // Optionally notify clients of new data
          return self.clients.matchAll().then((clients) => {
            clients.forEach((client) => {
              client.postMessage({
                type: "DATA_UPDATED",
                payload: data,
              });
            });
          });
        })
        .catch((error) => {
          console.error("[SW] Background sync failed:", error);
        })
    );
  }
});

// Handle push notifications (future enhancement)
self.addEventListener("push", (event) => {
  if (event.data) {
    const data = event.data.json();
    const options = {
      body: data.body,
      icon: "/favicon.svg",
      badge: "/favicon.svg",
      tag: "earnings-update",
      renotify: true,
      requireInteraction: false,
    };

    event.waitUntil(self.registration.showNotification(data.title, options));
  }
});

console.log("[SW] Service worker loaded");
