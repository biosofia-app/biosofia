/* BIOSOFÍA · service worker
   - Guarda la app para abrirla sin conexión (primero red, si no hay, caché).
   - Sirve los archivos subidos (_blob/<id>) desde Drive u OneDrive con el
     token de la página, y los guarda para verlos sin conexión. */
'use strict';
const V = 'biosofia-v3';
const BLOBS = 'biosofia-blobs';
const SHELL = ['./', 'index.html', 'nube.js', 'config.js', 'manifest.webmanifest', 'icon.svg', 'icon-192.png', 'icon-512.png', 'privacidad.html'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(V).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(ks => Promise.all(ks.filter(k => k.startsWith('biosofia-v') && k !== V).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener('fetch', e => {
  const req = e.request; if (req.method !== 'GET') return;
  const u = new URL(req.url);
  if (u.origin === location.origin && u.pathname.includes('/_blob/')) { e.respondWith(archivo(req, u, e.clientId)); return; }
  if (u.origin === location.origin) { e.respondWith(redPrimero(req)); return; }
  if (/^fonts\.(googleapis|gstatic)\.com$/.test(u.hostname)) e.respondWith(cachePrimero(req));
});

async function redPrimero(req) {
  const c = await caches.open(V);
  try {
    const r = await fetch(req);
    if (r.ok && new URL(req.url).search === '') c.put(req, r.clone());
    return r;
  } catch (e) {
    const hit = await c.match(req, { ignoreSearch: true }) || (req.mode === 'navigate' ? await c.match('index.html') : null);
    return hit || new Response('Sin conexión', { status: 503 });
  }
}
async function cachePrimero(req) {
  const c = await caches.open(V); const hit = await c.match(req); if (hit) return hit;
  try { const r = await fetch(req); if (r.ok || r.type === 'opaque') c.put(req, r.clone()); return r; } catch (e) { return new Response('', { status: 503 }); }
}

/* la página contesta con el token vigente */
async function pedirToken(clientId) {
  const lista = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
  lista.sort((a, b) => (b.id === clientId) - (a.id === clientId));
  for (const cl of lista) {
    const t = await new Promise(res => {
      const ch = new MessageChannel(); const to = setTimeout(() => res(null), 5000);
      ch.port1.onmessage = ev => { clearTimeout(to); res(ev.data); };
      try { cl.postMessage({ tipo: 'token?' }, [ch.port2]); } catch (e) { clearTimeout(to); res(null); }
    });
    if (t && t.token) return t;
  }
  return null;
}

const texto = (t, status) => new Response(`<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width"><body style="font:16px system-ui;padding:24px;color:#16232a">${t}</body>`, { status, headers: { 'Content-Type': 'text/html; charset=utf-8' } });

async function archivo(req, u, clientId) {
  const id = decodeURIComponent(u.pathname.split('/_blob/')[1] || '');
  const key = new URL('_blob/' + encodeURIComponent(id), self.registration.scope).href;
  const c = await caches.open(BLOBS);
  let resp = await c.match(key);
  if (!resp) {
    const t = await pedirToken(clientId);
    if (!t) return texto('Abre BIOSOFÍA y entra con tu cuenta para ver este archivo.', 401);
    let r, tipo = '';
    try {
      if (t.prov === 'google') {
        r = await fetch('https://www.googleapis.com/drive/v3/files/' + encodeURIComponent(id) + '?alt=media', { headers: { Authorization: 'Bearer ' + t.token } });
      } else {
        const m = await fetch('https://graph.microsoft.com/v1.0/me/drive/items/' + encodeURIComponent(id) + '?select=id,file,@microsoft.graph.downloadUrl', { headers: { Authorization: 'Bearer ' + t.token } });
        if (!m.ok) return texto(m.status === 404 ? 'Este archivo ya no está en tu OneDrive.' : 'No se ha podido abrir el archivo.', m.status);
        const j = await m.json(); tipo = j.file?.mimeType || '';
        r = await fetch(j['@microsoft.graph.downloadUrl']);
      }
    } catch (e) { return texto('Sin conexión: este archivo todavía no se ha guardado en el dispositivo.', 503); }
    if (!r.ok) return texto(r.status === 404 ? 'Este archivo ya no está en tu nube (o es de una copia importada de otra cuenta).' : 'No se ha podido abrir el archivo.', r.status);
    const blob = await r.blob();
    resp = new Response(blob, { headers: { 'Content-Type': tipo || r.headers.get('Content-Type') || blob.type || 'application/octet-stream' } });
    try { await c.put(key, resp.clone()); } catch (e) {}
  }
  /* nombre del archivo al descargarlo (?n=) */
  const n = u.searchParams.get('n');
  if (n) { const h = new Headers(resp.headers); h.set('Content-Disposition', "inline; filename*=UTF-8''" + encodeURIComponent(n)); resp = new Response(await resp.blob(), { headers: h }); }
  /* vídeo: el navegador pide trozos (Range) */
  const range = req.headers.get('Range');
  if (range) {
    const blob = await resp.blob(); const m = /bytes=(\d*)-(\d*)/.exec(range);
    let ini = m && m[1] ? +m[1] : 0, fin = m && m[2] ? +m[2] : blob.size - 1;
    if (m && !m[1] && m[2]) { ini = Math.max(0, blob.size - +m[2]); fin = blob.size - 1; }
    fin = Math.min(fin, blob.size - 1);
    if (ini > fin) return new Response('', { status: 416, headers: { 'Content-Range': `bytes */${blob.size}` } });
    return new Response(blob.slice(ini, fin + 1), { status: 206, headers: {
      'Content-Type': resp.headers.get('Content-Type'), 'Content-Range': `bytes ${ini}-${fin}/${blob.size}`, 'Content-Length': String(fin - ini + 1), 'Accept-Ranges': 'bytes' } });
  }
  return resp;
}
