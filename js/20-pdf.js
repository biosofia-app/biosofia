'use strict';
/* ===== ANOTAR SOBRE UN PDF =====
   Botón «✎ Anotar» junto a los PDF de Materiales y de las sesiones. Abre el PDF a pantalla completa con:
   mover, bolígrafo, subrayador, texto y borrador; colores, grosor, deshacer/rehacer, zoom y «solo lápiz»
   (si se detecta un lápiz, el dedo sirve para moverse por el documento y no pinta).
   - El PDF original no se toca. Los trazos se guardan aparte (documento anot_<id>) en coordenadas relativas
     a la página (0–1), así que se ven igual con cualquier zoom y en cualquier dispositivo.
   - «Descargar con anotaciones» crea un PDF nuevo con los trazos incorporados (pdf-lib).
   Librerías incluidas en la propia app (vendor/): PDF.js (Mozilla, Apache 2.0) y pdf-lib (MIT). Solo se cargan al abrir un PDF. */
const PDFV = { lib: null };
const ANOT_TINTA = ['#1B2230', '#B0324F', '#2f5fb3', '#2F7D4F'];
const ANOT_SUBR = ['#F7D64A', '#F2A0BC', '#93DB9B', '#8FC2F2'];
const ANOT_GROSOR = [['fino', 0.0022], ['medio', 0.0038], ['grueso', 0.0065]];
const ANOT_HERR = [['mano', '✋', 'Mover'], ['boli', '✎', 'Bolígrafo'], ['subr', '▮', 'Subrayador'], ['texto', 'T', 'Texto'], ['borrar', '⌫', 'Borrador']];
const urlApp = p => new URL(p, document.baseURI).href;
async function cargarPdfjs() {
  if (!PDFV.lib) { const m = await import(urlApp('vendor/pdfjs/pdf.min.mjs')); m.GlobalWorkerOptions.workerSrc = urlApp('vendor/pdfjs/pdf.worker.min.mjs'); PDFV.lib = m; }
  return PDFV.lib;
}
function cargarScript(src) { return new Promise((res, rej) => { const s = document.createElement('script'); s.src = src; s.onload = res; s.onerror = () => rej(new Error('No se ha podido cargar ' + src)); document.head.appendChild(s); }); }
async function cargarPdfLib() { if (!window.PDFLib) await cargarScript(urlApp('vendor/pdf-lib/pdf-lib.min.js')); return window.PDFLib; }
function botonAnotar(id, nombre, cls) { return id ? `<button class="${cls || 'btn sm ghost'}" data-a="pdfanotar" data-id="${esc(id)}" data-n="${esc(nombre || 'documento')}" title="Escribir y subrayar sobre el PDF">✎ Anotar</button>` : ''; }
const anotDe = id => { S.anot = S.anot || {}; return S.anot[id] || (S.anot[id] = { pages: {} }); };

async function abrirPDF(o) {
  cerrarPDF(true);
  const V = PDFV.v = { id: o.id, nombre: o.nombre || 'documento', url: o.url || ('_blob/' + o.id), herr: 'boli', tinta: ANOT_TINTA[0], subr: ANOT_SUBR[0], grosor: 1, solo: false, lapiz: false, zoom: 1, pags: [], hist: [], rehacer: [] };
  const el = V.el = document.createElement('div'); el.className = 'pdfv'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-label', 'Anotar ' + V.nombre);
  el.innerHTML = `<div class="pdfv-bar"></div><div class="pdfv-scroll"><div class="pdfv-pags"><p class="pdfv-msg">Abriendo el PDF…</p></div></div>`;
  document.body.appendChild(el); document.documentElement.classList.add('pdfv-on');
  pdfBarra();
  try {
    const lib = await cargarPdfjs();
    const r = await fetch(V.url); if (!r.ok) throw new Error('No se ha podido abrir el archivo (' + r.status + ')');
    const buf = await r.arrayBuffer(); V.bytes = buf.slice(0);
    V.doc = await lib.getDocument({ data: new Uint8Array(buf), standardFontDataUrl: urlApp('vendor/pdfjs/standard_fonts/'), isEvalSupported: false }).promise;
    if (PDFV.v !== V) return;
    await pdfMontar();
  } catch (e) {
    const m = el.querySelector('.pdfv-pags'); if (m) m.innerHTML = `<p class="pdfv-msg">No se ha podido abrir este PDF. ${esc(e.message || '')}${navigator.onLine === false ? ' Sin conexión: ábrelo una vez con conexión para tenerlo en el dispositivo.' : ''}</p>`;
  }
}
async function pdfMontar() {
  const V = PDFV.v; const cont = V.el.querySelector('.pdfv-pags'); cont.innerHTML = '';
  V.pags = [];
  for (let i = 1; i <= V.doc.numPages; i++) {
    const pg = await V.doc.getPage(i); const vp = pg.getViewport({ scale: 1 });
    const w = document.createElement('div'); w.className = 'pdfv-pag'; w.dataset.n = i;
    w.innerHTML = `<canvas class="pdfv-fondo"></canvas><canvas class="pdfv-tinta"></canvas><span class="pdfv-num">${i} / ${V.doc.numPages}</span>`;
    cont.appendChild(w);
    const P = { n: i, pg, ratio: vp.height / vp.width, w, fondo: w.children[0], tinta: w.children[1], hecho: 0 };
    V.pags.push(P); pdfPunteros(P);
  }
  pdfMedidas();
  V.obs = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) pdfPintarFondo(V.pags[+e.target.dataset.n - 1]); }), { root: V.el.querySelector('.pdfv-scroll'), rootMargin: '800px 0px' });
  V.pags.forEach(P => V.obs.observe(P.w));
  V.onResize = () => { clearTimeout(V.rt); V.rt = setTimeout(() => { pdfMedidas(); V.pags.forEach(P => { P.hecho = 0; }); V.pags.forEach(P => { const r = P.w.getBoundingClientRect(); if (r.bottom > -800 && r.top < innerHeight + 800) pdfPintarFondo(P); }); }, 200); };
  addEventListener('resize', V.onResize);
}
/* ancho de página = ancho disponible × zoom (máx. 1000 px a zoom 1) */
function pdfMedidas() {
  const V = PDFV.v; const sc = V.el.querySelector('.pdfv-scroll'); const base = Math.min(sc.clientWidth - 24, 1000);
  V.ancho = Math.max(240, Math.round(base * V.zoom));
  V.pags.forEach(P => { const h = Math.round(V.ancho * P.ratio); P.w.style.width = V.ancho + 'px'; P.w.style.height = h + 'px'; P.css = [V.ancho, h]; pdfTamTinta(P); pdfPintarTinta(P); });
}
function pdfTamTinta(P) { const dpr = Math.min(devicePixelRatio || 1, 2.5); const [w, h] = P.css; P.tinta.width = Math.round(w * dpr); P.tinta.height = Math.round(h * dpr); P.tinta.style.width = w + 'px'; P.tinta.style.height = h + 'px'; P.dpr = dpr; }
async function pdfPintarFondo(P) {
  const V = PDFV.v; if (!V || !P || P.hecho === V.ancho || P.pintando) return; P.pintando = true;
  try {
    const dpr = Math.min(devicePixelRatio || 1, 2.5); const vp1 = P.pg.getViewport({ scale: 1 }); const vp = P.pg.getViewport({ scale: (V.ancho / vp1.width) * dpr });
    const c = document.createElement('canvas'); c.width = Math.round(vp.width); c.height = Math.round(vp.height);
    await P.pg.render({ canvasContext: c.getContext('2d'), viewport: vp }).promise;
    if (PDFV.v !== V) return;
    P.fondo.width = c.width; P.fondo.height = c.height; P.fondo.getContext('2d').drawImage(c, 0, 0); P.fondo.style.width = P.css[0] + 'px'; P.fondo.style.height = P.css[1] + 'px';
    P.hecho = V.ancho;
  } catch (e) { /* página que no se puede pintar: queda en blanco */ } finally { P.pintando = false; }
}
/* ---- dibujo ---- */
function anotDibujar(ctx, it, W, H) {
  ctx.save();
  if (it.t === 'texto') { const fs = it.s * W; ctx.fillStyle = it.c; ctx.font = `500 ${fs}px "IBM Plex Sans", Arial, sans-serif`; ctx.textBaseline = 'top'; String(it.txt || '').split('\n').forEach((l, k) => ctx.fillText(l, it.x * W, it.y * H + k * fs * 1.25)); ctx.restore(); return; }
  const p = it.p; if (!p || p.length < 2) { ctx.restore(); return; }
  ctx.strokeStyle = it.c; ctx.lineWidth = it.w * W; ctx.lineCap = it.t === 'subr' ? 'butt' : 'round'; ctx.lineJoin = 'round';
  if (it.t === 'subr') { ctx.globalAlpha = 0.38; ctx.globalCompositeOperation = 'multiply'; }
  ctx.beginPath(); ctx.moveTo(p[0] * W, p[1] * H);
  if (p.length === 2) ctx.lineTo(p[0] * W + 0.1, p[1] * H);
  for (let i = 2; i < p.length - 2; i += 2) { const mx = (p[i] + p[i + 2]) / 2, my = (p[i + 1] + p[i + 3]) / 2; ctx.quadraticCurveTo(p[i] * W, p[i + 1] * H, mx * W, my * H); }
  if (p.length >= 4) ctx.lineTo(p[p.length - 2] * W, p[p.length - 1] * H);
  ctx.stroke(); ctx.restore();
}
function pdfPintarTinta(P, extra) {
  const ctx = P.tinta.getContext('2d'); const W = P.tinta.width, H = P.tinta.height;
  ctx.clearRect(0, 0, W, H);
  (anotDe(PDFV.v.id).pages[P.n] || []).forEach(it => anotDibujar(ctx, it, W, H));
  if (extra) anotDibujar(ctx, extra, W, H);
}
function pdfPunto(P, e) { const r = P.tinta.getBoundingClientRect(); return [Math.max(0, Math.min(1, (e.clientX - r.left) / r.width)), Math.max(0, Math.min(1, (e.clientY - r.top) / r.height))]; }
function pdfTouchAction(P) { const V = PDFV.v; P.tinta.style.touchAction = (V.herr === 'mano' || V.solo) ? 'pan-x pan-y pinch-zoom' : 'none'; P.tinta.style.cursor = V.herr === 'mano' ? 'grab' : V.herr === 'texto' ? 'text' : V.herr === 'borrar' ? 'cell' : 'crosshair'; }
function pdfPunteros(P) {
  const cv = P.tinta; pdfTouchAction(P);
  /* con «solo lápiz», el Apple Pencil no debe desplazar la página */
  cv.addEventListener('touchstart', e => { const V = PDFV.v; if (V && V.solo && V.herr !== 'mano' && [...e.touches].some(t => t.touchType === 'stylus')) e.preventDefault(); }, { passive: false });
  cv.addEventListener('pointerdown', e => {
    const V = PDFV.v; if (!V || V.herr === 'mano') return;
    if (e.pointerType === 'pen' && !V.lapiz) { V.lapiz = true; V.solo = true; V.pags.forEach(pdfTouchAction); pdfBarra(); toast('Lápiz detectado: con el dedo te mueves por el documento'); }
    if (V.solo && e.pointerType === 'touch') return;
    if (V.herr === 'texto') { e.preventDefault(); pdfTexto(P, pdfPunto(P, e)); return; }
    e.preventDefault(); try { cv.setPointerCapture(e.pointerId); } catch (err) {}
    const [x, y] = pdfPunto(P, e);
    if (V.herr === 'borrar') { V.trazo = { borrar: true, P, borrados: [] }; pdfBorrar(P, x, y); return; }
    V.trazo = { P, it: { t: V.herr, c: V.herr === 'subr' ? V.subr : V.tinta, w: V.herr === 'subr' ? 0.016 * [0.7, 1, 1.5][V.grosor] : ANOT_GROSOR[V.grosor][1], p: [r4(x), r4(y)] } };
  });
  cv.addEventListener('pointermove', e => {
    const V = PDFV.v; const T = V?.trazo; if (!T || T.P !== P) return; e.preventDefault();
    const evs = e.getCoalescedEvents ? e.getCoalescedEvents() : [e];
    for (const ev of (evs.length ? evs : [e])) {
      const [x, y] = pdfPunto(P, ev);
      if (T.borrar) { pdfBorrar(P, x, y); continue; }
      const p = T.it.p; const dx = x - p[p.length - 2], dy = y - p[p.length - 1];
      if (dx * dx + dy * dy > 0.0000015) p.push(r4(x), r4(y));
    }
    if (!T.borrar) pdfPintarTinta(P, T.it);
  });
  const fin = () => {
    const V = PDFV.v; const T = V?.trazo; if (!T || T.P !== P) return; V.trazo = null;
    if (T.borrar) { if (T.borrados.length) { V.hist.push({ op: 'del', n: P.n, items: T.borrados }); V.rehacer = []; anotGuardar(); pdfBarra(); } return; }
    const it = T.it; if (it.t === 'subr' && it.p.length > 4) { /* el subrayador va recto si el trazo es casi horizontal */ const p = it.p; const y0 = p[1], y1 = p[p.length - 1]; if (Math.abs(y1 - y0) < 0.012) { const ym = (y0 + y1) / 2; it.p = [p[0], ym, p[p.length - 2], ym]; } }
    const L = anotDe(V.id).pages[P.n] = anotDe(V.id).pages[P.n] || []; L.push(it);
    V.hist.push({ op: 'add', n: P.n, items: [it] }); V.rehacer = []; pdfPintarTinta(P); anotGuardar(); pdfBarra();
  };
  cv.addEventListener('pointerup', fin); cv.addEventListener('pointercancel', fin); cv.addEventListener('lostpointercapture', fin);
}
const r4 = v => Math.round(v * 10000) / 10000;
function pdfBorrar(P, x, y) {
  const V = PDFV.v; const L = anotDe(V.id).pages[P.n] || []; const tol = 0.012; const quitar = [];
  L.forEach(it => {
    if (it.t === 'texto') { const lines = String(it.txt || '').split('\n'); const w = Math.max(...lines.map(l => l.length)) * it.s * 0.55, h = lines.length * it.s * 1.25 / P.ratio; if (x >= it.x - tol && x <= it.x + w + tol && y >= it.y - tol && y <= it.y + h + tol) quitar.push(it); return; }
    const p = it.p; const t2 = Math.max(tol, it.w) ** 2;
    for (let i = 0; i < p.length; i += 2) { const dx = p[i] - x, dy = (p[i + 1] - y) * P.ratio; if (dx * dx + dy * dy < t2) { quitar.push(it); return; } }
  });
  if (!quitar.length) return;
  anotDe(V.id).pages[P.n] = L.filter(it => !quitar.includes(it)); V.trazo?.borrados?.push(...quitar); pdfPintarTinta(P);
}
function pdfTexto(P, [x, y]) {
  const V = PDFV.v; const ta = document.createElement('textarea'); ta.className = 'pdfv-txt'; ta.rows = 1;
  const fs = 0.022 * [0.8, 1, 1.4][V.grosor];
  Object.assign(ta.style, { left: (x * 100) + '%', top: (y * 100) + '%', color: V.tinta, fontSize: (fs * P.css[0]) + 'px' });
  P.w.appendChild(ta); setTimeout(() => ta.focus(), 0);
  const ok = () => { const t = ta.value.replace(/\s+$/, ''); ta.remove(); if (!t) return; const it = { t: 'texto', c: V.tinta, s: r4(fs), x: r4(x), y: r4(y), txt: t };
    const L = anotDe(V.id).pages[P.n] = anotDe(V.id).pages[P.n] || []; L.push(it); V.hist.push({ op: 'add', n: P.n, items: [it] }); V.rehacer = []; pdfPintarTinta(P); anotGuardar(); pdfBarra(); };
  ta.addEventListener('blur', ok, { once: true });
  ta.addEventListener('keydown', e => { if (e.key === 'Escape') { ta.value = ''; ta.blur(); } if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); ta.blur(); } e.stopPropagation(); });
  ta.addEventListener('input', () => { ta.style.height = 'auto'; ta.style.height = ta.scrollHeight + 'px'; });
}
function anotGuardar() { const V = PDFV.v; if (!V) return; const A0 = anotDe(V.id); A0.nombre = V.nombre; A0.act = todayStr(); clearTimeout(V.st); V.st = setTimeout(() => touch('anot_' + V.id), 500); }
function pdfDeshacer(rehacer) {
  const V = PDFV.v; const de = rehacer ? V.rehacer : V.hist, a = rehacer ? V.hist : V.rehacer; const h = de.pop(); if (!h) return;
  const A0 = anotDe(V.id); const L = A0.pages[h.n] = A0.pages[h.n] || [];
  const quitar = (h.op === 'add') !== !!rehacer;
  if (quitar) A0.pages[h.n] = L.filter(it => !h.items.includes(it)); else L.push(...h.items);
  a.push(h); const P = V.pags[h.n - 1]; if (P) pdfPintarTinta(P); anotGuardar(); pdfBarra();
}
function pdfBarra() {
  const V = PDFV.v; if (!V) return; const b = V.el.querySelector('.pdfv-bar'); const n = Object.values(anotDe(V.id).pages || {}).reduce((s, L) => s + L.length, 0);
  const paleta = V.herr === 'subr' ? ANOT_SUBR : ANOT_TINTA; const actual = V.herr === 'subr' ? V.subr : V.tinta;
  b.innerHTML = `<button class="btn sm" data-a="pdfcerrar">‹ Cerrar</button><span class="pdfv-nom" title="${esc(V.nombre)}">${esc(V.nombre)}</span>
    <div class="pdfv-grupo" role="group" aria-label="Herramienta">${ANOT_HERR.map(([k, ic, t]) => `<button class="pdfv-h" data-a="pdfherr" data-v="${k}" aria-pressed="${V.herr === k}" title="${t}"><span aria-hidden="true">${ic}</span><span class="pdfv-ht">${t}</span></button>`).join('')}</div>
    ${V.herr !== 'mano' && V.herr !== 'borrar' ? `<div class="pdfv-grupo" role="group" aria-label="Color">${paleta.map(c => `<button class="pdfv-col" data-a="pdfcol" data-v="${c}" aria-pressed="${actual === c}" style="--c:${c}" title="Color"></button>`).join('')}</div>
    <div class="pdfv-grupo" role="group" aria-label="Grosor">${ANOT_GROSOR.map(([t], i) => `<button class="pdfv-h" data-a="pdfgro" data-v="${i}" aria-pressed="${V.grosor === i}" title="${t}"><span class="pdfv-dot" style="width:${5 + i * 4}px;height:${5 + i * 4}px"></span></button>`).join('')}</div>` : ''}
    <div class="pdfv-grupo"><button class="pdfv-h" data-a="pdfdesh" ${V.hist.length ? '' : 'disabled'} title="Deshacer">↶</button><button class="pdfv-h" data-a="pdfreh" ${V.rehacer.length ? '' : 'disabled'} title="Rehacer">↷</button>
      <button class="pdfv-h" data-a="pdfzoom" data-v="-1" title="Alejar">−</button><button class="pdfv-h" data-a="pdfzoom" data-v="1" title="Acercar">+</button></div>
    <label class="check small pdfv-solo" title="El dedo mueve el documento y solo pinta el lápiz"><input type="checkbox" data-f="pdfsolo" ${V.solo ? 'checked' : ''}>Solo lápiz</label>
    <button class="btn sm primary" data-a="pdfexport" ${n ? '' : 'disabled'} title="Descargar el PDF con lo que has escrito">Descargar con anotaciones</button>`;
}
function cerrarPDF(silencio) {
  const V = PDFV.v; if (!V) return;
  if (V.st) { clearTimeout(V.st); touch('anot_' + V.id); }
  V.obs?.disconnect(); removeEventListener('resize', V.onResize || (() => {})); try { V.doc?.destroy(); } catch (e) {}
  V.el.remove(); document.documentElement.classList.remove('pdfv-on'); PDFV.v = null;
  if (!silencio) { UI.keepScroll = true; render(); }
}
/* ---- PDF nuevo con las anotaciones ---- */
const anotRGB = h => { const n = parseInt(h.slice(1), 16); return [(n >> 16 & 255) / 255, (n >> 8 & 255) / 255, (n & 255) / 255]; };
const winAnsi = s => String(s).replace(/[‘’]/g, "'").replace(/[“”]/g, '"').replace(/[–—]/g, '-').replace(/…/g, '...').replace(/[^\x20-\x7E\xA0-\xFF\n]/g, '?');
async function pdfExportar() {
  const V = PDFV.v; if (!V?.bytes) return; toast('Preparando el PDF…');
  try {
    const PL = await cargarPdfLib(); const doc = await PL.PDFDocument.load(V.bytes, { ignoreEncryption: true }); const font = await doc.embedFont(PL.StandardFonts.Helvetica);
    const pages = anotDe(V.id).pages || {};
    doc.getPages().forEach((pg, i) => {
      const L = pages[i + 1] || []; if (!L.length) return;
      const rot = ((pg.getRotation().angle % 360) + 360) % 360; const sz = pg.getSize(); const mb = pg.getMediaBox();
      /* tamaño tal y como se ve (con el giro aplicado) */
      const W = rot % 180 ? sz.height : sz.width, H = rot % 180 ? sz.width : sz.height;
      const aPdf = (x, y) => { const X = x * W, Y = y * H; let px, py;
        if (rot === 90) { px = Y; py = X; } else if (rot === 180) { px = W - X; py = Y; } else if (rot === 270) { px = H - Y; py = W - X; } else { px = X; py = H - Y; }
        return [px + mb.x, py + mb.y]; };
      L.forEach(it => {
        const [r, g, b] = anotRGB(it.c || '#000000'); const color = PL.rgb(r, g, b);
        if (it.t === 'texto') { const size = it.s * W; String(it.txt || '').split('\n').forEach((l, k) => { const [px, py] = aPdf(it.x, it.y + (k * 1.25 + 0.8) * it.s * W / H); try { pg.drawText(winAnsi(l), { x: px, y: py, size, font, color, rotate: PL.degrees(rot) }); } catch (e) {} }); return; }
        const p = it.p; if (!p || p.length < 2) return; const op = it.t === 'subr' ? 0.38 : 1; const th = it.w * W;
        if (p.length === 2) { const [px, py] = aPdf(p[0], p[1]); pg.drawCircle({ x: px, y: py, size: th / 2, color, opacity: op }); return; }
        /* un solo trazo por línea (así el subrayador no se oscurece en las uniones); en el trazado SVG la «y» va hacia abajo */
        let d = ''; for (let k = 0; k < p.length; k += 2) { const [px, py] = aPdf(p[k], p[k + 1]); d += (k ? ' L ' : 'M ') + px.toFixed(2) + ' ' + (-py).toFixed(2); }
        pg.drawSvgPath(d, { x: 0, y: 0, borderColor: color, borderWidth: th, borderOpacity: op, borderLineCap: it.t === 'subr' ? PL.LineCapStyle.Butt : PL.LineCapStyle.Round });
      });
    });
    const bytes = await doc.save();
    const fn = (V.nombre || 'documento').replace(/\.pdf$/i, '').replace(/[^\p{L}\p{N} ._-]/gu, '').trim().slice(0, 70) + ' (anotado).pdf';
    let dl = null; try { dl = Nube.descargas; } catch (e) {}
    if (!dl) { toast('Aquí no se pueden descargar archivos'); return; }
    await dl.save({ filename: fn, data: bytes }); toast('PDF con anotaciones guardado');
  } catch (e) { if (e?.code !== 'declined') toast('No se ha podido crear el PDF: ' + (e.message || '')); }
}
Object.assign(A, {
  pdfanotar(el) { closeModal(); abrirPDF({ id: el.dataset.id, nombre: el.dataset.n }); },
  pdfcerrar() { cerrarPDF(); },
  pdfherr(el) { const V = PDFV.v; V.herr = el.dataset.v; V.pags.forEach(pdfTouchAction); pdfBarra(); },
  pdfcol(el) { const V = PDFV.v; if (V.herr === 'subr') V.subr = el.dataset.v; else V.tinta = el.dataset.v; pdfBarra(); },
  pdfgro(el) { PDFV.v.grosor = +el.dataset.v; pdfBarra(); },
  pdfdesh() { pdfDeshacer(false); }, pdfreh() { pdfDeshacer(true); },
  pdfzoom(el) { const V = PDFV.v; const sc = V.el.querySelector('.pdfv-scroll'); const rel = sc.scrollTop / Math.max(1, sc.scrollHeight);
    V.zoom = Math.max(0.5, Math.min(3, Math.round((V.zoom + (+el.dataset.v) * 0.25) * 100) / 100)); pdfMedidas(); sc.scrollTop = rel * sc.scrollHeight;
    V.pags.forEach(P => { const r = P.w.getBoundingClientRect(); if (r.bottom > -800 && r.top < innerHeight + 800) pdfPintarFondo(P); }); },
  pdfexport() { pdfExportar(); }
});
Object.assign(Fd, { pdfsolo(el) { const V = PDFV.v; V.solo = el.checked; V.pags.forEach(pdfTouchAction); } });
document.addEventListener('keydown', e => {
  const V = PDFV.v; if (!V || e.target.closest?.('textarea,input')) return;
  if (e.key === 'Escape') { e.preventDefault(); cerrarPDF(); }
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') { e.preventDefault(); e.stopImmediatePropagation(); pdfDeshacer(e.shiftKey); }
}, true);
