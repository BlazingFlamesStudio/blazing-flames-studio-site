/* Blazing Flames Studio • offline shell + safe cache strategy
   Never cache original VRM/VRMA motion data, CDN imports or Cloudflare files. */
const VERSION = "bfs-pwa-2026-11-24-layout-fix-v1";
const SHELL = VERSION + "-shell";
const RUNTIME = VERSION + "-runtime";
const BASE = new URL("./", self.registration.scope);
const offlineURL = new URL("offline.html", BASE).href;
const shellPaths = [
  "index.html", "about.html", "amv-game.html", "collaborations.html",
  "viewer.html", "finder.html", "offline.html", "pwa.js", "pwa.css",
  "manifest.webmanifest", "icons/brand-180.png", "icons/brand-192.png",
  "icons/brand-512.png", "icons/brand-512-maskable.png",
  "favicon.svg", "assets/channel-moonlit.webp",
  "styles.css", "theme.css", "cinematic.css", "lunar.css",
  "moonveil.css", "social-links.css", "amv-game.css", "mood-game.css",
  "collaborations.css", "finder.css", "finder.js", "script.js", "amv-game.js",
  "collaborations.js", "oracle-catalog.js", "mood-game-core.js", "mood-game.js", "gallery-catalog.js", "videos.js",
  "videos.json"
];
const shellURLs = shellPaths.map(path => new URL(path, BASE).href);
const uncachedPath = /\.(?:vrm|vrma|glb|gltf|mp4|webm|mov|mp3|ogg|wav|zip)$/i;

self.addEventListener("install", event => {
  event.waitUntil((async () => {
    const cache = await caches.open(SHELL);
    // Guaranteed offline entry points; optional pages/assets cannot block installation.
    const essential = ["index.html", "offline.html"].map(path => new URL(path, BASE).href);
    await cache.addAll(essential);
    await Promise.allSettled(shellURLs.filter(url => !essential.includes(url)).map(url => cache.add(new Request(url, {cache:"reload"}))));
  })());
});

self.addEventListener("activate", event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(key => key.startsWith("bfs-pwa-") && key !== SHELL && key !== RUNTIME).map(key => caches.delete(key)));
    await self.clients.claim();
  })());
});

self.addEventListener("message", event => {
  if(event.data?.type === "SKIP_WAITING") self.skipWaiting();
});

async function store(cacheName, request, response) {
  if(!response || !response.ok || response.type !== "basic") return response;
  try {
    const cache = await caches.open(cacheName);
    await cache.put(request, response.clone());
  } catch(err) {
    // Storage can be full/disabled. Continue serving the network response.
    console.warn("PWA cache skipped:", err);
  }
  return response;
}

async function serveNavigation(request) {
  const cache = await caches.open(SHELL);
  try {
    const response = await fetch(request);
    if(response.ok && response.type === "basic") {
      // Cache only document paths, not query or per-user variants.
      const key = new URL(request.url);
      const plainKey = new URL(key.pathname, BASE).href;
      if(shellURLs.includes(plainKey) || key.pathname === BASE.pathname) {
        await store(SHELL, plainKey === BASE.href ? new URL("index.html", BASE).href : plainKey, response.clone());
      }
    }
    return response;
  } catch(err) {
    const url = new URL(request.url);
    const target = url.pathname === BASE.pathname ? new URL("index.html", BASE).href : new URL(url.pathname, BASE).href;
    return (await cache.match(target)) || (await cache.match(offlineURL)) ||
      new Response("Blazing Flames Studio is offline. Reconnect to continue.",{status:503,headers:{"Content-Type":"text/plain; charset=utf-8"}});
  }
}

// URL query strings are used for cache busting (e.g. styles.css?v=4).
// Save static files by their base path so precached files also work offline.
function cacheKey(request) {
  const url = new URL(request.url);
  url.search = "";
  url.hash = "";
  return url.href;
}

async function freshestCached(key) {
  // Runtime copies are more recent than initial install-shell copies.
  return (await (await caches.open(RUNTIME)).match(key)) ||
    (await (await caches.open(SHELL)).match(key));
}

async function freshOrCached(request) {
  const key=cacheKey(request);
  try {
    const response=await fetch(request);
    if(response.ok && response.type === "basic") await store(RUNTIME,key,response.clone());
    return response;
  } catch(err) {
    return (await freshestCached(key)) || Response.error();
  }
}

async function cachedStatic(request) {
  const key=cacheKey(request);
  try {
    // Network-first prevents old script/style versions from sticking forever.
    const response=await fetch(request);
    if(response.ok && response.type === "basic") await store(RUNTIME,key,response.clone());
    return response;
  } catch(err) {
    return (await freshestCached(key)) || Response.error();
  }
}

self.addEventListener("fetch", event => {
  const request = event.request;
  if(request.method !== "GET") return;
  const url = new URL(request.url);
  if(url.origin !== self.location.origin || !url.pathname.startsWith(BASE.pathname)) return;
  if(uncachedPath.test(url.pathname) || url.pathname.includes("/animations/") || url.pathname.includes("/api/")) return;
  if(request.mode === "navigate") {
    event.respondWith(serveNavigation(request));
    return;
  }
  if(url.pathname.endsWith("/videos.json") || url.pathname.endsWith("/videos.js")) {
    event.respondWith(freshOrCached(request));
    return;
  }
  const extension = url.pathname.split(".").pop().toLowerCase();
  if(["html","js","css","svg","png","webp","webmanifest"].includes(extension)) {
    event.respondWith(cachedStatic(request));
  }
});
