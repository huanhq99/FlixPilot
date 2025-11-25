// StreamHub Service Worker - 基础版本
const CACHE_NAME = 'streamhub-v1';
const STATIC_ASSETS = [
  '/',
  '/favicon.svg',
  '/manifest.json'
];

// 安装时缓存静态资源
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting();
});

// 激活时清理旧缓存
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    })
  );
  self.clients.claim();
});

// 网络优先策略（适合动态内容）
self.addEventListener('fetch', (event) => {
  // 跳过 API 请求的缓存
  if (event.request.url.includes('/api/') || 
      event.request.url.includes('/tmdb/')) {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // 如果获取成功，克隆并缓存
        if (response.status === 200) {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone);
          });
        }
        return response;
      })
      .catch(() => {
        // 网络失败时尝试从缓存获取
        return caches.match(event.request);
      })
  );
});
