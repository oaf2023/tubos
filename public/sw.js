const CACHE = 'districon-v2'
const STATIC_CACHE = 'districon-static-v2'
const API_CACHE = 'districon-api-v2'

const PRECACHE_URLS = [
  '/',
  '/offline.html',
  '/icon.svg',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/icons/icon-192-maskable.png',
  '/icons/icon-512-maskable.png',
]

self.addEventListener('install', (e) => {
  e.waitUntil(
    Promise.all([
      caches.open(CACHE).then((c) => c.addAll(PRECACHE_URLS)),
      caches.open(STATIC_CACHE),
      caches.open(API_CACHE),
    ]).then(() => self.skipWaiting())
  )
})

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE && k !== STATIC_CACHE && k !== API_CACHE).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  )
})

function isStaticAsset(url) {
  return url.pathname.startsWith('/_next/static/') ||
         url.pathname.startsWith('/icons/') ||
         url.pathname === '/icon.svg' ||
         url.pathname === '/logo.svg'
}

function isApiCall(url) {
  return url.pathname.startsWith('/api/')
}

function isNavigation(url) {
  return url.pathname === '/' || (url.pathname.startsWith('/') && !url.pathname.startsWith('/api/') && !url.pathname.startsWith('/_next/') && !url.pathname.match(/\.\w+$/))
}

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return

  const url = new URL(e.request.url)

  if (isStaticAsset(url)) {
    e.respondWith(
      caches.open(STATIC_CACHE).then((cache) =>
        cache.match(e.request).then((cached) => {
          const fetchPromise = fetch(e.request).then((res) => {
            if (res.ok) cache.put(e.request, res.clone())
            return res
          })
          return cached || fetchPromise
        })
      )
    )
    return
  }

  if (isApiCall(url)) {
    e.respondWith(
      caches.open(API_CACHE).then((cache) =>
        fetch(e.request).then((res) => {
          if (res.ok) cache.put(e.request, res.clone())
          return res
        }).catch(() => cache.match(e.request))
      )
    )
    return
  }

  if (isNavigation(url)) {
    e.respondWith(
      fetch(e.request).catch(() =>
        caches.match(e.request).then((r) => r || caches.match('/offline.html'))
      )
    )
    return
  }

  e.respondWith(
    fetch(e.request).catch(() => caches.match(e.request))
  )
})
