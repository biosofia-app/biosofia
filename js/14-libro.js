'use strict';
/* ===== LIBROS: por asignatura de Materiales → unidades → apartados → bloques =====
   Se escribe de forma continua; la app lo trocea sola en pantallas (presentar) y en páginas A4 (PDF). */
const LIB_L = {
  es: { act: 'Actividad', preg: 'Pregunta', sol: 'Solución', resp: 'Respuesta', ver: 'Ver la respuesta', versol: 'Ver la solución', ind: 'Índice', ud: 'Unidad', sols: 'Soluciones', concepto: 'Concepto clave', sabias: '¿Sabías que…?', error: 'Error frecuente', importante: 'Importante', paraque: '¿Para qué sirve?', acc: 'Versión accesible', nuevaU: 'Nueva unidad', primeraU: 'Primera unidad', nuevoA: 'Nuevo apartado', intro: 'Introducción' },
  va: { act: 'Activitat', preg: 'Pregunta', sol: 'Solució', resp: 'Resposta', ver: 'Veure la resposta', versol: 'Veure la solució', ind: 'Índex', ud: 'Unitat', sols: 'Solucions', concepto: 'Concepte clau', sabias: 'Sabies que…?', error: 'Error freqüent', importante: 'Important', paraque: 'Per a què serveix?', acc: 'Versió accessible', nuevaU: 'Nova unitat', primeraU: 'Primera unitat', nuevoA: 'Nou apartat', intro: 'Introducció' } };
const BLOQUES = [['sub', 'Subtítulo'], ['texto', 'Texto'], ['concepto', 'Concepto clave'], ['caja', 'Recuadro'], ['imagen', 'Imagen'], ['actividad', 'Actividad'], ['pregunta', 'Pregunta'], ['salto', 'Salto']];
const BLOQ_N = Object.fromEntries(BLOQUES);
const CAJAS = { sabias: ['💡', '¿Sabías que…?'], error: ['⚠️', 'Error frecuente'], importante: ['❗', 'Importante'], paraque: ['🔧', '¿Para qué sirve?'] };
const libroDe = id => S.libros[id];
const librosMat = mid => Object.values(S.libros).filter(b => b.mat === mid).sort((a, b) => (b.principal ? 1 : 0) - (a.principal ? 1 : 0) || (a.titulo || '').localeCompare(b.titulo || '', 'es'));
const touchLib = b => touch('libro_' + b.id);
const nuevoApartado = t => ({ id: uid(), titulo: t || 'Nuevo apartado', temas: '', bloques: [] });
const nuevaUnidad = (t, lg) => ({ id: uid(), titulo: t || LIB_L[lg === 'va' ? 'va' : 'es'].nuevaU, apartados: [nuevoApartado(LIB_L[lg === 'va' ? 'va' : 'es'].intro)] });
function apDe(b, apId) { for (const u of b?.unidades || []) { const a = u.apartados.find(x => x.id === apId); if (a) return { u, a }; } return null; }
function apsLista(b) { const out = []; (b?.unidades || []).forEach((u, ui) => u.apartados.forEach((a, ai) => out.push({ u, a, ui, ai }))); return out; }
const numAp = (ui, ai) => `${ui + 1}.${ai + 1}`;
function numsUnidad(u) { const m = new Map(); let n = 0; u.apartados.forEach(a => a.bloques.forEach(x => { if (x.t === 'actividad') m.set(x.id, ++n); })); return m; }
const libL = b => LIB_L[b?.idioma === 'va' ? 'va' : 'es'];
/* texto con formato sencillo: **negrita**, *cursiva*, «- » lista, «1. » lista numerada */
function mdInline(s) { return esc(s).replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>').replace(/(^|[^*])\*([^*\s][^*]*)\*/g, '$1<i>$2</i>'); }
function mdLineas(txt, onPara, onItem) {
  let para = [], list = null, items = [];
  const flush = () => { if (para.length) { onPara(para); para = []; } };
  const close = () => { if (list) { onItem(list, items); list = null; items = []; } };
  (txt || '').split(/\r?\n/).forEach(l => { const m1 = l.match(/^\s*[-•]\s+(.*)/), m2 = l.match(/^\s*\d+[.)]\s+(.*)/);
    if (m1 || m2) { flush(); const tg = m1 ? 'ul' : 'ol'; if (list !== tg) close(); list = tg; items.push((m1 || m2)[1]); }
    else if (!l.trim()) { flush(); close(); } else { close(); para.push(l); } });
  flush(); close();
}
function mdHTML(txt) { let out = ''; mdLineas(txt, p => { out += `<p>${p.map(mdInline).join('<br>')}</p>`; }, (tg, it) => { out += `<${tg}>${it.map(x => `<li>${mdInline(x)}</li>`).join('')}</${tg}>`; }); return out; }
const imgSrc = x => x.assetId ? '_blob/' + x.assetId : (x.url || '');
function bloqueVista(b, x, ctx) {
  const L = libL(b);
  if (x.t === 'sub') return `<h3 class="lb-sub">${esc(x.txt || '')}</h3>`;
  if (x.t === 'texto') return `<div class="lb-txt">${mdHTML(x.txt)}</div>`;
  if (x.t === 'concepto') return `<div class="lb-box lb-concepto"><div class="lb-lab">★ ${esc(x.titulo || L.concepto)}</div>${mdHTML(x.txt)}</div>`;
  if (x.t === 'caja') { const e = CAJAS[x.estilo] ? x.estilo : 'sabias'; return `<div class="lb-box lb-${e}"><div class="lb-lab">${CAJAS[e][0]} ${esc(x.titulo || L[e])}</div>${mdHTML(x.txt)}</div>`; }
  if (x.t === 'imagen') { const src = imgSrc(x); return src ? `<figure class="lb-fig" style="max-width:${Number(x.ancho) || 100}%"><img src="${esc(src)}" alt="${esc(x.pie || '')}">${x.pie ? `<figcaption>${esc(x.pie)}</figcaption>` : ''}</figure>` : (ctx.edit ? '<p class="empty">Imagen sin elegir.</p>' : ''); }
  if (x.t === 'actividad' || x.t === 'pregunta') {
    const act = x.t === 'actividad'; const resp = act ? x.sol : x.resp;
    const lab = act ? `${L.act} ${ctx.nums?.get(x.id) || ''}`.trim() : L.preg;
    const sol = (resp || '').trim() ? (ctx.sols === 'show' ? `<div class="lb-sol"><b>${act ? L.sol : L.resp}:</b>${mdHTML(resp)}</div>` : ctx.sols === 'reveal' ? `<details class="lb-rev"><summary>${act ? L.versol : L.ver}</summary><div class="lb-sol">${mdHTML(resp)}</div></details>` : '') : '';
    return `<div class="lb-box lb-${x.t}"><div class="lb-lab">${act ? '✎' : '?'} ${esc(lab)}</div>${mdHTML(x.txt)}${sol}</div>`;
  }
  if (x.t === 'salto') return ctx.edit ? `<div class="lb-salto">salto de ${x.modo === 'pagina' ? 'página (solo PDF)' : x.modo === 'pantalla' ? 'pantalla (solo al presentar)' : 'pantalla y de página'}</div>` : '';
  return '';
}
/* troceado automático en pantallas para presentar */
function pantallasAp(b, o) {
  const MAX = 620; const t0 = `${numAp(o.ui, o.ai)} · ${o.a.titulo}`; const out = []; let cur = { titulo: t0, sub: '', items: [] }, w = 0; out.push(cur);
  const peso = x => x.t === 'imagen' ? 420 : (x.txt || '').length + (x.titulo || '').length + (['concepto', 'caja', 'actividad', 'pregunta'].includes(x.t) ? 110 : 0);
  const nueva = sub => { cur = { titulo: t0, sub: sub ?? cur.sub, items: [] }; out.push(cur); w = 0; };
  o.a.bloques.forEach(x => {
    if (x.t === 'salto') { if (x.modo !== 'pagina' && cur.items.length) nueva(); return; }
    if (x.t === 'sub') { if (cur.items.length || cur.sub) nueva(x.txt || ''); else cur.sub = x.txt || ''; return; }
    const p = peso(x); if (cur.items.length && w + p > MAX) nueva(); cur.items.push(x); w += p;
  });
  return out;
}
function presentar(libId, apId) {
  const b = libroDe(libId); if (!b) return; const L = apsLista(b); if (!L.length) { toast('El libro aún no tiene apartados'); return; }
  UI.pres = { libId, k: Math.max(0, L.findIndex(o => o.a.id === apId)), s: 0 }; presRender();
}
function presRender() {
  const P = UI.pres; const b = P && libroDe(P.libId); if (!b) return; const L = apsLista(b); if (!L.length) return;
  P.k = Math.min(Math.max(0, P.k), L.length - 1); const o = L[P.k]; const scr = pantallasAp(b, o); P.s = Math.min(Math.max(0, P.s), scr.length - 1); const sc = scr[P.s];
  const ctx = { nums: numsUnidad(o.u), sols: 'reveal' };
  let el = document.querySelector('.projector.pres'); if (!el) { el = document.createElement('div'); el.className = 'projector pres'; document.body.appendChild(el); }
  el.lang = b.idioma === 'va' ? 'ca-valencia' : 'es';
  const fin = P.k === L.length - 1 && P.s === scr.length - 1, ini = P.k === 0 && P.s === 0;
  el.innerHTML = `<div class="row between"><span class="label">${esc(b.titulo)} · ${esc(libL(b).ud)} ${o.ui + 1} · ${esc(o.u.titulo)}</span><button class="btn" data-a="cerrarproy" lang="es">Cerrar</button></div>
    <div class="pres-body"><h1>${esc(sc.titulo)}</h1>${sc.sub ? `<h2 class="lb-sub">${esc(sc.sub)}</h2>` : ''}<div class="lb lb-big">${sc.items.map(x => bloqueVista(b, x, ctx)).join('')}</div></div>
    <div class="row between pres-nav" lang="es"><button class="btn" data-a="presnav" data-d="-1" ${ini ? 'disabled' : ''}>‹ Anterior</button><span class="small muted">${P.s + 1} / ${scr.length} · apartado ${numAp(o.ui, o.ai)}</span><button class="btn primary" data-a="presnav" data-d="1" ${fin ? 'disabled' : ''}>${P.s === scr.length - 1 && !fin ? 'Siguiente apartado ›' : 'Siguiente ›'}</button></div>`;
  el.querySelector('.pres-body').scrollTop = 0;
}
function presNav(d) {
  const P = UI.pres; if (!P) return; const b = libroDe(P.libId); const L = apsLista(b); const n = pantallasAp(b, L[P.k]).length;
  if (d > 0) { if (P.s < n - 1) P.s++; else if (P.k < L.length - 1) { P.k++; P.s = 0; } }
  else { if (P.s > 0) P.s--; else if (P.k > 0) { P.k--; P.s = 1e9; } }
  presRender();
}

/* ---------- PDF generado en la propia app (sin librerías): Helvetica, A4, negrita y cursiva, listas, recuadros e imágenes ---------- */
const PDFW = { r: [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,278,278,355,556,556,889,667,191,333,333,389,584,278,333,278,278,556,556,556,556,556,556,556,556,556,556,278,278,584,584,584,556,1015,667,667,722,722,667,611,778,722,278,500,667,556,833,722,778,667,778,722,667,611,722,667,944,667,667,611,278,278,278,469,556,333,556,556,500,556,556,278,556,556,222,222,500,222,833,556,556,556,556,333,500,278,556,500,722,500,500,500,334,260,334,584,761,556,0,222,556,333,1000,556,556,333,1000,667,333,1000,0,611,0,0,222,222,333,333,350,556,1000,333,1000,500,333,944,0,500,667,278,333,556,556,556,556,260,556,333,737,370,556,584,333,737,333,400,584,333,333,333,556,537,278,333,333,365,556,834,834,834,611,667,667,667,667,667,667,1000,722,667,667,667,667,278,278,278,278,722,722,778,778,778,778,778,584,778,722,722,722,722,667,667,611,556,556,556,556,556,556,889,500,556,556,556,556,278,278,278,278,556,556,556,556,556,556,556,584,611,556,556,556,556,500,556,500], b: [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,278,333,474,556,556,889,722,238,333,333,389,584,278,333,278,278,556,556,556,556,556,556,556,556,556,556,333,333,584,584,584,611,975,722,722,722,722,667,611,778,722,278,556,722,611,833,722,778,667,778,722,667,611,722,667,944,667,667,611,333,278,333,584,556,333,556,611,556,611,556,333,611,611,278,278,556,278,889,611,611,611,611,389,556,333,611,556,778,556,556,500,389,280,389,584,761,556,0,278,556,500,1000,556,556,333,1000,667,333,1000,0,611,0,0,278,278,500,500,350,556,1000,333,1000,556,333,944,0,500,667,278,333,556,556,556,556,280,556,333,737,370,556,584,333,737,333,400,584,333,333,333,611,556,278,333,333,365,556,834,834,834,611,722,722,722,722,722,722,1000,722,667,667,667,667,278,278,278,278,722,722,778,778,778,778,778,584,778,722,722,722,722,667,667,611,556,556,556,556,556,556,889,556,556,556,556,556,278,278,278,278,611,611,611,611,611,611,611,584,611,611,611,611,611,556,611,556] };
const CP1252 = '€\u0081‚ƒ„…†‡ˆ‰Š‹Œ\u008DŽ\u008F\u0090‘’“”•–—˜™š›œ\u009DžŸ';
const PDF_SUST = { '→': '->', '←': '<-', '≥': '>=', '≤': '<=', '−': '-', '≈': '~', '✓': 'v', '★': '*', '✎': '', '→': '->', ' ': ' ', ' ': ' ', ' ': ' ' };
function pdfTxt(s) { return [...String(s ?? '')].map(ch => { const c = ch.codePointAt(0); if (c < 128 || (c >= 160 && c < 256)) return ch; const i = CP1252.indexOf(ch); if (i >= 0) return ch; if (PDF_SUST[ch] !== undefined) return PDF_SUST[ch]; if (c > 0xFFFF || (c >= 0x2600 && c < 0x2800) || c === 0xFE0F) return ''; return '?'; }).join(''); }
const pdfCode = ch => { const c = ch.charCodeAt(0); if (c < 256) return c; const i = CP1252.indexOf(ch); return i >= 0 ? 128 + i : 63; };
const pdfAncho = (s, b, size) => { const W = b ? PDFW.b : PDFW.r; let w = 0; for (const ch of s) w += W[pdfCode(ch)] || 500; return w * size / 1000; };
const pdfStr = s => '(' + [...s].map(ch => { const c = pdfCode(ch); if (c === 40 || c === 41 || c === 92) return '\\' + ch; if (c < 32 || c > 126) return '\\' + c.toString(8).padStart(3, '0'); return ch; }).join('') + ')';
const hexRGB = h => [1, 3, 5].map(i => (parseInt(h.slice(i, i + 2), 16) / 255).toFixed(3)).join(' ');
const PDF_COL = { acc: '#1b6c60', ink: '#16232a', mut: '#6b7a80', concepto: ['#fbf3e2', '#b98222'], sabias: ['#e6f2ee', '#1b6c60'], error: ['#f9e4e4', '#b03737'], importante: ['#f7ecd6', '#9c620a'], paraque: ['#e6ecf7', '#2f5fb3'], actividad: ['#e8eefa', '#2f5fb3'], pregunta: ['#f0e9f7', '#8a5bb5'] };
function runsMdTxt(s) { const out = []; const re = /\*\*([^*]+)\*\*|\*([^*\s][^*]*)\*/g; let i = 0, m; while ((m = re.exec(s))) { if (m.index > i) out.push({ t: s.slice(i, m.index) }); out.push(m[1] !== undefined ? { t: m[1], b: true } : { t: m[2], i: true }); i = re.lastIndex; } if (i < s.length) out.push({ t: s.slice(i) }); return out; }
/* convierte el texto con formato en elementos de párrafo para el maquetador */
function mdElems(txt, st) {
  const out = [];
  mdLineas(txt, p => out.push({ k: 'p', runs: p.flatMap((l, j) => j ? [{ t: '\n' }, ...runsMdTxt(l)] : runsMdTxt(l)), size: st.fs }),
    (tg, it) => it.forEach((x, j) => out.push({ k: 'p', runs: runsMdTxt(x), size: st.fs, bullet: tg === 'ul' ? '•' : (j + 1) + '.', ind: st.fs * 1.4 })));
  return out;
}
/* maquetador: elementos → páginas con operaciones de dibujo */
function pdfMaquetar(elems, st, tocN) {
  const PW = 595.28, PH = 841.89, ML = 56, MR = 56, MT = 58, MB = 66, BW = PW - ML - MR;
  const pages = []; let pg, y;
  const nueva = () => { pg = { bg: [], fg: [], img: [] }; pages.push(pg); y = PH - MT; };
  const texto = (x, yb, s, size, bold, ital, col) => { if (!s) return; const f = bold ? (ital ? 'F4' : 'F2') : (ital ? 'F3' : 'F1'); pg.fg.push(`BT /${f} ${size.toFixed(2)} Tf ${hexRGB(col || PDF_COL.ink)} rg ${x.toFixed(2)} ${yb.toFixed(2)} Td ${pdfStr(s)} Tj ET`); };
  /* parte runs en líneas que caben en el ancho */
  const lineas = (runs, size, width) => {
    const toks = []; runs.forEach(r => String(pdfTxt(r.t)).split(/(\n| +)/).forEach(w => { if (w) toks.push({ t: w, b: !!r.b, i: !!r.i }); }));
    const L = []; let cur = [], cw = 0;
    const push = () => { while (cur.length && /^ +$/.test(cur[cur.length - 1].t)) cur.pop(); L.push(cur); cur = []; cw = 0; };
    toks.forEach(tk => { if (tk.t === '\n') { push(); return; } const sp = /^ +$/.test(tk.t); if (sp && !cur.length) return;
      let w = pdfAncho(tk.t, tk.b, size);
      if (!sp && cw + w > width && cur.length) { push(); }
      if (!sp && w > width) { let s = tk.t; while (s) { let n = s.length; while (n > 1 && pdfAncho(s.slice(0, n), tk.b, size) > width) n--; cur.push({ ...tk, t: s.slice(0, n) }); push(); s = s.slice(n); } return; }
      cur.push(tk); cw += w; });
    if (cur.length) push(); return L.length ? L : [[]];
  };
  const dibLinea = (ln, x, yb, size, col) => { let cx = x; ln.forEach(tk => { texto(cx, yb, tk.t, size, tk.b, tk.i, col); cx += pdfAncho(tk.t, tk.b, size); }); };
  const lh = size => size * st.lh;
  const heads = [];
  nueva();
  for (const e of elems) {
    if (e.k === 'break') { if (y < PH - MT - 1 || pg.fg.length) nueva(); continue; }
    if (e.k === 'space') { y -= e.h; continue; }
    if (e.k === 'head') {
      if (e.newPage && (pg.fg.length || pg.img.length)) nueva();
      const L = lineas([{ t: e.text, b: true }], e.size, BW); const h = L.length * lh(e.size) + (e.gap || 0);
      if (y - h - lh(st.fs) * 2 < MB) nueva(); else if (y < PH - MT - 1) y -= (e.gap || 0);
      if (e.toc) heads.push({ text: e.text, lvl: e.toc, page: pages.length });
      L.forEach(ln => { y -= e.size * 1.05; dibLinea(ln, ML + (e.ind || 0), y, e.size, e.col || PDF_COL.acc); y -= e.size * (st.lh - 1.05); });
      y -= e.after ?? e.size * 0.35; continue;
    }
    if (e.k === 'p') {
      const ind = e.ind || 0; const L = lineas(e.runs, e.size, BW - ind - (e.pad || 0) * 2);
      L.forEach((ln, j) => { if (y - lh(e.size) < MB) nueva(); y -= lh(e.size); if (j === 0 && e.bullet) texto(ML + ind - e.size * 1.1, y + e.size * (st.lh - 1) * 0.5, pdfTxt(e.bullet), e.size, false, false, e.col); dibLinea(ln, ML + ind, y + e.size * (st.lh - 1) * 0.5, e.size, e.col); });
      y -= e.after ?? e.size * 0.55; continue;
    }
    if (e.k === 'box') {
      const pad = 9, inner = BW - pad * 2 - 4; const rows = [];
      if (e.label) lineas([{ t: e.label, b: true }], st.fs * 0.92, inner).forEach(ln => rows.push({ ln, size: st.fs * 0.92, col: e.edge }));
      e.items.forEach((it, j) => { if (it.k === 'gap') { rows.push({ gap: it.h }); return; } const ind = it.ind || 0; lineas(it.runs, it.size, inner - ind).forEach((ln, i) => rows.push({ ln, size: it.size, ind, bullet: i === 0 ? it.bullet : null, col: it.col })); rows.push({ gap: it.size * 0.35 }); });
      while (rows.length && rows[rows.length - 1].gap) rows.pop();
      const alto = r => r.gap || lh(r.size);
      const total = rows.reduce((s, r) => s + alto(r), 0) + pad * 2;
      if (y - Math.min(total, 140) < MB) nueva();
      let segTop = y; y -= pad;
      const cerrar = bottom => { pg.bg.push(`${hexRGB(e.fill)} rg ${ML.toFixed(2)} ${bottom.toFixed(2)} ${BW.toFixed(2)} ${(segTop - bottom).toFixed(2)} re f ${hexRGB(e.edge)} rg ${ML.toFixed(2)} ${bottom.toFixed(2)} 3.5 ${(segTop - bottom).toFixed(2)} re f`); };
      rows.forEach(r => { const h = alto(r); if (y - h < MB + 2) { cerrar(MB - 4); nueva(); segTop = y; y -= pad * 0.6; } y -= h; if (r.ln) { const x = ML + pad + 4 + (r.ind || 0); const yb = y + r.size * (st.lh - 1) * 0.5; if (r.bullet) texto(x - r.size * 1.1, yb, pdfTxt(r.bullet), r.size, false, false, r.col); dibLinea(r.ln, x, yb, r.size, r.col); } });
      y -= pad; cerrar(y); y -= st.fs * 0.8; continue;
    }
    if (e.k === 'img') {
      const maxW = BW * Math.min(1, (e.frac || 100) / 100); let w = Math.min(maxW, e.w * 0.75), h = w * e.h / e.w; const maxH = PH - MT - MB - 40; if (h > maxH) { h = maxH; w = h * e.w / e.h; }
      if (y - h - 6 < MB) nueva(); y -= h; const name = 'Im' + e.ref; pg.img.push(e.ref); pg.fg.push(`q ${w.toFixed(2)} 0 0 ${h.toFixed(2)} ${(ML + (BW - w) / 2).toFixed(2)} ${y.toFixed(2)} cm /${name} Do Q`);
      y -= 6; if (e.pie) { lineas([{ t: e.pie, i: true }], st.fs * 0.85, BW).forEach(ln => { y -= lh(st.fs * 0.85); const lw = ln.reduce((s, t) => s + pdfAncho(t.t, t.b, st.fs * 0.85), 0); dibLinea(ln, ML + (BW - lw) / 2, y, st.fs * 0.85, PDF_COL.mut); }); }
      y -= st.fs * 0.9; continue;
    }
  }
  return { pages, heads, PW, PH, ML, MR, MT, MB, BW, lineas, dibLinea, texto: (p, ...a) => { const k = pg; pg = p; texto(...a); pg = k; } };
}
/* ensambla el archivo PDF */
function pdfArchivo(pages, imgs, meta) {
  const enc = new TextEncoder(); const objs = []; const add = o => { objs.push(o); return objs.length; };
  const cat = add(null), pagesId = add(null);
  const fonts = ['Helvetica', 'Helvetica-Bold', 'Helvetica-Oblique', 'Helvetica-BoldOblique'].map(f => add(`<< /Type /Font /Subtype /Type1 /BaseFont /${f} /Encoding /WinAnsiEncoding >>`));
  const imgIds = imgs.map(im => add({ stream: im.bytes, dict: `/Type /XObject /Subtype /Image /Width ${im.w} /Height ${im.h} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode` }));
  const kids = pages.map(p => { const body = enc.encode(p.bg.concat(p.fg).join('\n')); const cId = add({ stream: body, dict: '' });
    const xo = [...new Set(p.img)].map(r => `/Im${r} ${imgIds[r]} 0 R`).join(' ');
    return add(`<< /Type /Page /Parent ${pagesId} 0 R /MediaBox [0 0 595.28 841.89] /Resources << /Font << /F1 ${fonts[0]} 0 R /F2 ${fonts[1]} 0 R /F3 ${fonts[2]} 0 R /F4 ${fonts[3]} 0 R >>${xo ? ` /XObject << ${xo} >>` : ''} >> /Contents ${cId} 0 R >>`); });
  objs[cat - 1] = `<< /Type /Catalog /Pages ${pagesId} 0 R >>`;
  objs[pagesId - 1] = `<< /Type /Pages /Kids [${kids.map(k => k + ' 0 R').join(' ')}] /Count ${kids.length} >>`;
  const info = add(`<< /Title ${pdfStr(pdfTxt(meta.titulo || ''))} /Producer (BIOSOFIA) >>`);
  const parts = [enc.encode('%PDF-1.4\n%\xE2\xE3\xCF\xD3\n')]; let off = parts[0].length; const xref = [];
  objs.forEach((o, i) => { xref.push(off); let chunk;
    if (o && o.stream) { const head = enc.encode(`${i + 1} 0 obj\n<< ${o.dict} /Length ${o.stream.length} >>\nstream\n`); const tail = enc.encode('\nendstream\nendobj\n'); chunk = new Uint8Array(head.length + o.stream.length + tail.length); chunk.set(head, 0); chunk.set(o.stream, head.length); chunk.set(tail, head.length + o.stream.length); }
    else chunk = enc.encode(`${i + 1} 0 obj\n${o}\nendobj\n`);
    parts.push(chunk); off += chunk.length; });
  const xs = `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n` + xref.map(o => String(o).padStart(10, '0') + ' 00000 n \n').join('') + `trailer\n<< /Size ${objs.length + 1} /Root ${cat} 0 R /Info ${info} 0 R >>\nstartxref\n${off}\n%%EOF`;
  parts.push(enc.encode(xs));
  const out = new Uint8Array(parts.reduce((s, p) => s + p.length, 0)); let p = 0; parts.forEach(x => { out.set(x, p); p += x.length; }); return out;
}
async function imgJPEG(x) {
  try { const r = await fetch(imgSrc(x)); if (!r.ok) return null; const bl = await r.blob(); const bm = await createImageBitmap(bl);
    const k = Math.min(1, 1600 / Math.max(bm.width, bm.height)); const c = document.createElement('canvas'); c.width = Math.max(1, Math.round(bm.width * k)); c.height = Math.max(1, Math.round(bm.height * k));
    const cx = c.getContext('2d'); cx.fillStyle = '#fff'; cx.fillRect(0, 0, c.width, c.height); cx.drawImage(bm, 0, 0, c.width, c.height);
    const jb = await new Promise(res => c.toBlob(res, 'image/jpeg', 0.86)); return { bytes: new Uint8Array(await jb.arrayBuffer()), w: c.width, h: c.height };
  } catch (e) { return null; }
}
/* libro → PDF. opt: { sol: con soluciones, acc: versión accesible, unidad: id o null } */
async function libroPDF(b, opt) {
  const L = libL(b); const st = opt.acc ? { fs: 14, lh: 1.6 } : { fs: 11, lh: 1.4 }; const mat = matDe().find(a => a.id === b.mat);
  const uds = opt.unidad ? b.unidades.filter(u => u.id === opt.unidad) : b.unidades; const imgs = []; const el = [];
  const caja = (estilo, label, txt, extra = []) => ({ k: 'box', fill: PDF_COL[estilo][0], edge: PDF_COL[estilo][1], label, items: [...mdElems(txt, st), ...extra] });
  for (const u of uds) {
    const ui = b.unidades.indexOf(u); const nums = numsUnidad(u); const sols = [];
    el.push({ k: 'head', text: `${L.ud} ${ui + 1}. ${u.titulo}`, size: st.fs + 10, toc: 1, newPage: true, after: st.fs });
    for (const [ai, a] of u.apartados.entries()) {
      el.push({ k: 'head', text: `${numAp(ui, ai)} ${a.titulo}`, size: st.fs + 5, toc: 2, gap: st.fs });
      for (const x of a.bloques) {
        if (x.t === 'sub') el.push({ k: 'head', text: x.txt || '', size: st.fs + 2.5, col: PDF_COL.ink, gap: st.fs * 0.6 });
        else if (x.t === 'texto') el.push(...mdElems(x.txt, st));
        else if (x.t === 'concepto') el.push(caja('concepto', '* ' + (x.titulo || L.concepto), x.txt));
        else if (x.t === 'caja') { const e = CAJAS[x.estilo] ? x.estilo : 'sabias'; el.push(caja(e, x.titulo || L[e], x.txt)); }
        else if (x.t === 'actividad' || x.t === 'pregunta') {
          const act = x.t === 'actividad'; const lab = act ? `${L.act} ${nums.get(x.id)}` : L.preg; const resp = act ? x.sol : x.resp;
          el.push(caja(x.t, lab, x.txt));
          if (opt.sol && (resp || '').trim()) sols.push({ lab: act ? lab : `${L.preg} (${numAp(ui, ai)}): ${(x.txt || '').replace(/[*\n]+/g, ' ').slice(0, 70)}${(x.txt || '').length > 70 ? '…' : ''}`, txt: resp });
        }
        else if (x.t === 'imagen' && imgSrc(x)) { const im = await imgJPEG(x); if (im) { imgs.push(im); el.push({ k: 'img', ref: imgs.length - 1, w: im.w, h: im.h, frac: Number(x.ancho) || 100, pie: x.pie }); } else if (x.pie) el.push({ k: 'p', runs: [{ t: '[Imagen: ' + x.pie + ']', i: true }], size: st.fs, col: PDF_COL.mut }); }
        else if (x.t === 'salto' && x.modo !== 'pantalla') el.push({ k: 'break' });
      }
    }
    if (sols.length) { el.push({ k: 'head', text: `${L.sols} · ${L.ud} ${ui + 1}`, size: st.fs + 5, gap: st.fs * 2, col: PDF_COL.acc }); sols.forEach(s => { el.push({ k: 'p', runs: [{ t: s.lab, b: true }], size: st.fs, after: st.fs * 0.2 }); el.push(...mdElems(s.txt, st)); }); }
  }
  /* índice: se reservan sus páginas antes de maquetar el contenido */
  const nTOC = el.filter(e => e.toc).length; const porPag = Math.floor((841.89 - 58 - 66 - 60) / (st.fs * 1.9)); const tocPags = Math.max(1, Math.ceil(nTOC / porPag));
  const M = pdfMaquetar(el, st); const off = 1 + tocPags; // portada + índice
  const pdfPages = []; const P = () => { const p = { bg: [], fg: [], img: [] }; pdfPages.push(p); return p; };
  /* portada */
  const portada = P(); let yy = 841.89 - 250;
  const centrado = (p, s, size, bold, col, yb) => { M.lineas([{ t: s, b: bold }], size, M.BW).forEach(ln => { const lw = ln.reduce((a, t) => a + pdfAncho(t.t, t.b, size), 0); let cx = M.ML + (M.BW - lw) / 2; ln.forEach(t => { M.texto(p, cx, yb, t.t, size, t.b, false, col); cx += pdfAncho(t.t, t.b, size); }); yb -= size * 1.3; }); return yb; };
  yy = centrado(portada, b.titulo || 'Libro', 30, true, PDF_COL.acc, yy);
  yy = centrado(portada, b.subtitulo || mat?.nombre || '', 15, false, PDF_COL.ink, yy - 12);
  if (b.autor) centrado(portada, b.autor, 12, false, PDF_COL.mut, yy - 40);
  const nota = [opt.unidad ? `${L.ud} ${b.unidades.findIndex(u => u.id === opt.unidad) + 1}` : '', opt.sol ? L.sols : '', opt.acc ? L.acc : ''].filter(Boolean).join(' · ');
  if (nota) centrado(portada, nota, 11, false, PDF_COL.mut, 120);
  portada.bg.push(`${hexRGB(PDF_COL.acc)} rg 0 ${(841.89 - 18).toFixed(2)} 595.28 18 re f`);
  /* índice */
  const tp = []; for (let i = 0; i < tocPags; i++) tp.push(P());
  M.heads.forEach((h, j) => { const p = tp[Math.floor(j / porPag)]; const fila = j % porPag; if (fila === 0) { M.texto(p, M.ML, 841.89 - 58 - 20, pdfTxt(L.ind), st.fs + 10, true, false, PDF_COL.acc); }
    const yb = 841.89 - 58 - 60 - fila * st.fs * 1.9; const ind = h.lvl === 2 ? 16 : 0; const size = h.lvl === 1 ? st.fs : st.fs * 0.95; const num = String(h.page + off);
    const maxW = M.BW - ind - 40; let s = pdfTxt(h.text); while (s.length > 3 && pdfAncho(s, h.lvl === 1, size) > maxW) s = s.slice(0, -2); if (s !== pdfTxt(h.text)) s = s.trimEnd() + '…';
    M.texto(p, M.ML + ind, yb, s, size, h.lvl === 1, false, PDF_COL.ink); const nw = pdfAncho(num, false, size); M.texto(p, M.ML + M.BW - nw, yb, num, size, false, false, PDF_COL.ink);
    const sw = pdfAncho(s, h.lvl === 1, size); const dots = Math.max(0, Math.floor((M.BW - ind - sw - nw - 12) / pdfAncho('.', false, size))); if (dots > 2) M.texto(p, M.ML + ind + sw + 6, yb, '.'.repeat(dots), size, false, false, PDF_COL.mut); });
  if (!M.heads.length) M.texto(tp[0], M.ML, 841.89 - 78, pdfTxt(L.ind), st.fs + 10, true, false, PDF_COL.acc);
  M.pages.forEach(p => pdfPages.push(p));
  /* pie de página */
  pdfPages.forEach((p, i) => { if (i === 0) return; const n = String(i + 1); M.texto(p, (595.28 - pdfAncho(n, false, 9)) / 2, 34, n, 9, false, false, PDF_COL.mut); if (i >= off) M.texto(p, M.ML, 34, pdfTxt((b.titulo || '').slice(0, 60)), 8, false, false, PDF_COL.mut); });
  return pdfArchivo(pdfPages, imgs, { titulo: b.titulo });
}
async function descargarLibroPDF(b, opt) {
  toast('Preparando el PDF…');
  let bytes; try { bytes = await libroPDF(b, opt); } catch (e) { console.error(e); toast('No se ha podido crear el PDF'); return; }
  const nombre = ((b.titulo || 'libro').replace(/[^\p{L}\p{N} _-]/gu, '').trim().slice(0, 60) || 'libro') + (opt.unidad ? ' - ' + libL(b).ud + ' ' + (b.unidades.findIndex(u => u.id === opt.unidad) + 1) : '') + (opt.sol ? ' (con soluciones)' : '') + (opt.acc ? ' (accesible)' : '') + '.pdf';
  let dl = null; try { dl = Nube.descargas; } catch (e) {}
  if (dl) { try { await dl.save({ filename: nombre, data: bytes }); toast('PDF guardado'); } catch (e) { if (e?.code !== 'declined') toast('No se ha podido guardar el PDF'); } return; }
  const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([bytes], { type: 'application/pdf' })); a.download = nombre; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 2000);
}

/* ---------- editor del libro ---------- */
function bloqueEditor(b, x, i, n) {
  const f = (k, ph, rows) => `<textarea data-f="lb" data-b="${x.id}" data-k="${k}" rows="${rows || 3}" placeholder="${esc(ph)}">${esc(x[k] || '')}</textarea>`;
  const inp = (k, ph) => `<input type="text" data-f="lb" data-b="${x.id}" data-k="${k}" value="${esc(x[k] || '')}" placeholder="${esc(ph)}">`;
  let body = '';
  if (x.t === 'sub') body = inp('txt', 'Subtítulo');
  else if (x.t === 'texto') body = f('txt', 'Escribe aquí. **negrita**, *cursiva*, «- » para una lista, «1. » para una lista numerada', 5);
  else if (x.t === 'concepto') body = inp('titulo', 'Nombre del concepto (opcional)') + f('txt', 'Definición o idea clave');
  else if (x.t === 'caja') body = `<div class="row"><select data-f="lbsel" data-b="${x.id}" data-k="estilo" style="width:auto">${Object.entries(CAJAS).map(([k, [ic, t]]) => `<option value="${k}" ${(x.estilo || 'sabias') === k ? 'selected' : ''}>${ic} ${t}</option>`).join('')}</select>${inp('titulo', 'Título propio (opcional)')}</div>` + f('txt', 'Contenido del recuadro');
  else if (x.t === 'actividad') body = f('txt', 'Enunciado de la actividad', 4) + `<label class="f">Solución (no sale al alumnado si descargas el PDF sin soluciones)${f('sol', 'Solución o puntos clave', 2)}</label>`;
  else if (x.t === 'pregunta') body = f('txt', 'Pregunta para lanzar a la clase', 2) + `<label class="f">Respuesta (se descubre al pulsar cuando presentas)${f('resp', 'Respuesta', 2)}</label>`;
  else if (x.t === 'imagen') { const src = imgSrc(x);
    body = `<div class="row">${src ? `<img src="${esc(src)}" alt="" class="lb-thumb">` : '<span class="small muted">Sin imagen</span>'}<div class="stack" style="gap:6px;flex:1;min-width:200px"><div class="row">${ARCH.assets ? `<button class="btn sm" data-a="libimgup" data-b="${x.id}">⬆ Subir imagen</button>` : ''}<button class="btn sm" data-a="libimgmat" data-b="${x.id}">De Materiales</button>${src ? `<button class="btn sm ghost" data-a="libimgx" data-b="${x.id}">Quitar</button>` : ''}</div>
      ${x.assetId ? '' : `<input type="url" data-f="lb" data-b="${x.id}" data-k="url" value="${esc(x.url || '')}" placeholder="…o pega la dirección de una imagen (https://…)">`}
      <div class="row">${inp('pie', 'Pie de foto (opcional)')}<select data-f="lbsel" data-b="${x.id}" data-k="ancho" style="width:auto" aria-label="Tamaño">${[[40, 'Pequeña'], [60, 'Mediana'], [80, 'Grande'], [100, 'Todo el ancho']].map(([v, t]) => `<option value="${v}" ${(Number(x.ancho) || 100) === v ? 'selected' : ''}>${t}</option>`).join('')}</select></div></div></div>`; }
  else if (x.t === 'salto') body = `<select data-f="lbsel" data-b="${x.id}" data-k="modo" style="width:auto">${[['ambos', 'Pantalla nueva al presentar y página nueva en el PDF'], ['pantalla', 'Solo pantalla nueva al presentar'], ['pagina', 'Solo página nueva en el PDF']].map(([v, t]) => `<option value="${v}" ${(x.modo || 'ambos') === v ? 'selected' : ''}>${t}</option>`).join('')}</select>`;
  const conf = UI.confirm === 'libb:' + x.id;
  return `<div class="lb-ed lb-ed-${x.t}" data-bid="${x.id}"><div class="row between" style="margin-bottom:6px"><span class="label">${esc(BLOQ_N[x.t] || x.t)}${x.t === 'actividad' ? ' ' + (UI._nums?.get(x.id) || '') : ''}</span>
    <span class="row" style="gap:2px"><button class="iconbtn" data-a="libbmov" data-b="${x.id}" data-d="-1" ${i === 0 ? 'disabled' : ''} aria-label="Subir bloque" title="Subir">↑</button><button class="iconbtn" data-a="libbmov" data-b="${x.id}" data-d="1" ${i === n - 1 ? 'disabled' : ''} aria-label="Bajar bloque" title="Bajar">↓</button><button class="iconbtn" data-a="libbdup" data-b="${x.id}" aria-label="Duplicar bloque" title="Duplicar">⧉</button><button class="iconbtn" data-a="libbdel" data-b="${x.id}" aria-label="Borrar bloque" title="Borrar">✕</button></span></div>
    ${conf ? `<div class="alert bad small" style="margin-bottom:6px"><span class="grow">¿Borrar este bloque?</span><button class="btn sm danger" data-a="libbdelok" data-b="${x.id}">Borrar</button><button class="btn sm" data-a="cancel">Cancelar</button></div>` : ''}
    <div class="stack" style="gap:6px">${body}</div></div>`;
}
const libPicker = pos => `<div class="lb-ins">${BLOQUES.map(([t, n]) => `<button class="btn sm" data-a="libaddb" data-t="${t}" data-pos="${pos}">${n}</button>`).join('')}${pos !== 'fin' ? '<button class="btn sm ghost" data-a="libplus" data-pos="">✕</button>' : ''}</div>`;
VIEWS.libro = () => {
  const b = libroDe(UI.libro); if (!b) { UI.view = 'materiales'; return VIEWS.materiales(); }
  const mat = matDe().find(a => a.id === b.mat); const L = apsLista(b);
  if (!apDe(b, UI.libAp)) UI.libAp = L[0]?.a.id || null; const cur = UI.libAp ? apDe(b, UI.libAp) : null;
  const ui = cur ? b.unidades.indexOf(cur.u) : -1, ai = cur ? cur.u.apartados.indexOf(cur.a) : -1; const conf = UI.confirm || '';
  const modo = UI.libModo || 'editar';
  const indice = `<div class="panel stack lb-ind"><div class="row between"><h3 style="margin:0">Índice</h3><button class="btn sm" data-a="libaddu">+ Unidad</button></div>
    ${b.unidades.length ? b.unidades.map((u, i) => `<div class="lb-iu"><div class="row" style="flex-wrap:nowrap;gap:2px"><b class="grow small">${i + 1}. ${esc(u.titulo)}</b><button class="iconbtn" data-a="libmovu" data-u="${u.id}" data-d="-1" ${i === 0 ? 'disabled' : ''} aria-label="Subir unidad" title="Subir unidad">↑</button><button class="iconbtn" data-a="libmovu" data-u="${u.id}" data-d="1" ${i === b.unidades.length - 1 ? 'disabled' : ''} aria-label="Bajar unidad" title="Bajar unidad">↓</button></div>
      ${u.apartados.map((a, j) => `<button class="lb-ia ${cur && a.id === cur.a.id ? 'on' : ''}" data-a="libap" data-id="${a.id}">${numAp(i, j)} ${esc(a.titulo)}</button>`).join('')}
      <button class="linkbtn tiny" data-a="libadda" data-u="${u.id}">+ Apartado</button></div>`).join('') : '<p class="empty">Empieza añadiendo una unidad.</p>'}</div>`;
  let main;
  if (!cur) main = `<div class="panel empty">Este libro está vacío. Añade la primera unidad con «+ Unidad».</div>`;
  else {
    const nums = numsUnidad(cur.u); UI._nums = nums; const n = cur.a.bloques.length;
    const cab = `<div class="panel stack"><div class="fgrid"><label class="f">${esc(libL(b).ud)} ${ui + 1}<input type="text" value="${esc(cur.u.titulo)}" data-f="libu" data-id="${cur.u.id}"></label>
        <label class="f">Apartado ${numAp(ui, ai)}<input type="text" value="${esc(cur.a.titulo)}" data-f="liba" data-k="titulo"></label></div>
      <label class="f">Temas del apartado (para proponerlo en las sesiones que traten estos temas)<input type="text" value="${esc(cur.a.temas || '')}" data-f="liba" data-k="temas" placeholder="células, orgánulos, microscopio"></label>
      <div class="row between"><div class="seg">${[['editar', 'Editar'], ['ver', 'Ver']].map(([v, t]) => `<button data-a="libmodo" data-v="${v}" aria-pressed="${modo === v}">${t}</button>`).join('')}</div>
        <div class="row"><button class="btn sm primary" data-a="libpres" data-id="${b.id}" data-ap="${cur.a.id}">▶ Presentar desde aquí</button>
        <button class="iconbtn" data-a="libmova" data-d="-1" ${ai === 0 ? 'disabled' : ''} aria-label="Subir apartado" title="Subir apartado">↑</button><button class="iconbtn" data-a="libmova" data-d="1" ${ai === cur.u.apartados.length - 1 ? 'disabled' : ''} aria-label="Bajar apartado" title="Bajar apartado">↓</button>
        <button class="btn sm ghost danger" data-a="confirm" data-c="libdela">Borrar apartado</button><button class="btn sm ghost danger" data-a="confirm" data-c="libdelu">Borrar unidad</button></div></div>
      ${conf === 'libdela' ? `<div class="alert bad small"><span class="grow">Se borrará el apartado <b>${esc(cur.a.titulo)}</b> con sus ${n} bloques.</span><button class="btn sm danger" data-a="libdela">Borrar</button><button class="btn sm" data-a="cancel">Cancelar</button></div>` : ''}
      ${conf === 'libdelu' ? `<div class="alert bad small"><span class="grow">Se borrará la unidad <b>${esc(cur.u.titulo)}</b> con todos sus apartados.</span><button class="btn sm danger" data-a="libdelu">Borrar</button><button class="btn sm" data-a="cancel">Cancelar</button></div>` : ''}</div>`;
    const cuerpo = modo === 'ver'
      ? `<div class="panel"><h2 style="margin-bottom:12px">${numAp(ui, ai)} ${esc(cur.a.titulo)}</h2>${n ? `<div class="lb">${cur.a.bloques.map(x => bloqueVista(b, x, { nums, sols: 'reveal' })).join('')}</div>` : '<p class="empty">Este apartado aún no tiene contenido.</p>'}</div>`
      : `<div class="stack" style="gap:4px">${cur.a.bloques.map((x, i) => `${UI.libIns === String(i) ? libPicker(i) : `<button class="lb-plus" data-a="libplus" data-pos="${i}" aria-label="Insertar un bloque aquí">＋ insertar aquí</button>`}${bloqueEditor(b, x, i, n)}`).join('')}
        <div class="panel stack" style="gap:6px"><span class="small muted">${n ? 'Añadir al final:' : 'Empieza el apartado añadiendo un bloque:'}</span>${libPicker('fin')}</div></div>`;
    main = `<div class="stack">${cab}${cuerpo}</div>`;
  }
  const lib = librosMat(b.mat);
  const side = `<div class="stack lb-side"><div class="panel stack"><h3>Libro</h3>
      <label class="f">Título<input type="text" value="${esc(b.titulo)}" data-f="libt" data-k="titulo"></label>
      <label class="f">Subtítulo (portada del PDF)<input type="text" value="${esc(b.subtitulo || '')}" data-f="libt" data-k="subtitulo" placeholder="${esc(mat?.nombre || '')}"></label>
      <label class="f">Autor o autora<input type="text" value="${esc(b.autor || '')}" data-f="libt" data-k="autor"></label>
      <label class="f">Idioma del libro<select data-f="libt" data-k="idioma">${Object.entries(IDIOMAS).map(([k, t]) => `<option value="${k}" ${(b.idioma || 'es') === k ? 'selected' : ''}>${t}</option>`).join('')}</select></label>
      ${lib.length > 1 ? `<label class="check small"><input type="checkbox" data-f="libprin" ${b.principal ? 'checked' : ''}>Libro principal de la asignatura (el que se abre desde las sesiones)</label>` : `<p class="tiny muted" style="margin:0">Es el libro principal de la asignatura: se abre desde las sesiones de sus grupos.</p>`}
      <div class="row"><button class="btn sm primary" data-a="libpres" data-id="${b.id}">▶ Presentar</button><button class="btn sm" data-a="libpdf">⬇ Descargar PDF</button></div>
      ${conf === 'libdel' ? `<div class="alert bad small"><span class="grow">Se borrará el libro entero. No se puede deshacer.</span><button class="btn sm danger" data-a="libdel">Borrar</button><button class="btn sm" data-a="cancel">Cancelar</button></div>` : `<button class="btn sm ghost danger" data-a="confirm" data-c="libdel" style="align-self:flex-start">Borrar libro</button>`}</div>
    <div class="panel small"><h3>Cómo se ve</h3><p class="muted" style="margin:0">Escribe el apartado de arriba abajo. Al <b>presentar</b>, la app lo reparte en pantallas (cada subtítulo empieza una nueva y las soluciones salen al pulsar). En el <b>PDF</b> lo reparte en páginas A4 con portada, índice y números de página. Usa el bloque «Salto» si quieres cortar en un punto concreto.</p></div></div>`;
  return `<div class="page-head"><div><a href="#" data-a="go" data-v="materiales" class="small">‹ Materiales${mat ? ' · ' + esc(mat.nombre) : ''}</a><h1 style="margin-top:4px">📖 ${esc(b.titulo || 'Libro')}</h1><div class="sub">${b.unidades.length} ${b.unidades.length === 1 ? 'unidad' : 'unidades'} · ${L.length} ${L.length === 1 ? 'apartado' : 'apartados'} · ${IDIOMAS[b.idioma || 'es']}</div></div></div>
    <div class="libcols">${indice}${main}${side}</div>`;
};
function libPdfModal() {
  const b = libroDe(UI.libro); if (!b) return;
  modal(`<h2>Descargar PDF</h2><div class="stack" style="gap:12px">
    <label class="f">Qué<select id="pdf-u"><option value="">El libro entero</option>${b.unidades.map((u, i) => `<option value="${u.id}">${esc(libL(b).ud)} ${i + 1}. ${esc(u.titulo)}</option>`).join('')}</select></label>
    <div><div class="label" style="margin-bottom:6px">Soluciones</div><label class="check"><input type="radio" name="pdf-s" value="0" checked>Sin soluciones (para el alumnado)</label><br><label class="check"><input type="radio" name="pdf-s" value="1">Con soluciones al final de cada unidad</label></div>
    <div><div class="label" style="margin-bottom:6px">Versión</div><label class="check"><input type="radio" name="pdf-a" value="0" checked>Normal</label><br><label class="check"><input type="radio" name="pdf-a" value="1">Accesible: letra más grande y más espacio (TDAH, lectura fácil)</label></div>
    <div class="row"><button class="btn primary" data-a="libpdfok">Descargar</button><button class="btn" data-a="close">Cancelar</button></div></div>`);
}
function libImgMatModal(bid) {
  const b = libroDe(UI.libro); const mat = matDe().find(a => a.id === b?.mat); const L = (mat?.archivos || []).filter(f => (f.tipo || '').startsWith('image') && f.assetId);
  modal(`<div class="row between"><h2 style="margin:0">Imágenes de ${esc(mat?.nombre || 'la asignatura')}</h2><button class="iconbtn" data-a="close" aria-label="Cerrar">✕</button></div>
    ${L.length ? `<div class="lb-galeria">${L.map(f => `<button class="lb-gimg" data-a="libimgsel" data-b="${bid}" data-asset="${f.assetId}" data-pie="${esc(f.nombre)}"><img src="_blob/${esc(f.assetId)}" alt=""><span class="tiny">${esc(f.nombre)}</span></button>`).join('')}</div>` : '<p class="empty">No hay imágenes en los Materiales de esta asignatura. Súbelas allí o directamente en el bloque.</p>'}`, false, 'wide');
}
/* bloque y apartado activos */
const libCur = () => { const b = libroDe(UI.libro); const c = b && apDe(b, UI.libAp); return c ? { b, ...c } : null; };
const libBloque = id => { const c = libCur(); return c ? c.a.bloques.find(x => x.id === id) : null; };
const libRe = () => { UI.keepScroll = true; render(); };
const BLOQ_DEF = { sub: { txt: '' }, texto: { txt: '' }, concepto: { titulo: '', txt: '' }, caja: { estilo: 'sabias', titulo: '', txt: '' }, imagen: { url: '', pie: '', ancho: 80 }, actividad: { txt: '', sol: '' }, pregunta: { txt: '', resp: '' }, salto: { modo: 'ambos' } };
Object.assign(A, {
  libnuevo() { const a = matA(); if (!a) return; modal(`<h2>Nuevo libro</h2><div class="stack" style="gap:10px"><label class="f">Título<input type="text" id="lib-t" placeholder="Apuntes de ${esc(a.nombre)}"></label>
      <label class="f">Idioma<select id="lib-i">${Object.entries(IDIOMAS).map(([k, t]) => `<option value="${k}">${t}</option>`).join('')}</select></label>
      <div class="row"><button class="btn primary" data-a="libnuevook">Crear</button><button class="btn" data-a="close">Cancelar</button></div></div>`); setTimeout(() => $('#lib-t')?.focus(), 30); },
  libnuevook() { const a = matA(); const t = $('#lib-t').value.trim() || 'Apuntes de ' + a.nombre;
    const b = { id: uid(), mat: a.id, titulo: t, subtitulo: '', autor: '', idioma: $('#lib-i').value, principal: !librosMat(a.id).length, unidades: [] }; b.unidades.push(nuevaUnidad(libL(b).primeraU, b.idioma));
    S.libros[b.id] = b; touchLib(b); closeModal(); UI.libro = b.id; UI.libAp = b.unidades[0].apartados[0].id; UI.libModo = 'editar'; UI.view = 'libro'; render(); scrollA(0); },
  libabrir(el) { UI.libro = el.dataset.id; UI.libAp = el.dataset.ap || null; UI.libModo = 'editar'; UI.libIns = null; UI.confirm = null; closeModal(); document.querySelector('.projector')?.remove(); UI.view = 'libro'; render(); scrollA(0); },
  libpres(el) { presentar(el.dataset.id, el.dataset.ap || null); },
  presnav(el) { presNav(Number(el.dataset.d)); },
  libprincipal(el) { const b = libroDe(el.dataset.id); librosMat(b.mat).forEach(x => { if (x.principal !== (x === b)) { x.principal = x === b; touchLib(x); } }); libRe(); },
  libap(el) { UI.libAp = el.dataset.id; UI.libIns = null; UI.confirm = null; render(); scrollA(0); },
  libmodo(el) { UI.libModo = el.dataset.v; UI.libIns = null; libRe(); },
  libaddu() { const b = libroDe(UI.libro); const u = nuevaUnidad('', b.idioma); b.unidades.push(u); touchLib(b); UI.libAp = u.apartados[0].id; UI.libModo = 'editar'; render(); scrollA(0); setTimeout(() => { const i = document.querySelector('[data-f="libu"]'); if (i) { i.focus(); i.select(); } }, 0); },
  libadda(el) { const b = libroDe(UI.libro); const u = b.unidades.find(x => x.id === el.dataset.u); const a = nuevoApartado(libL(b).nuevoA); u.apartados.push(a); touchLib(b); UI.libAp = a.id; UI.libModo = 'editar'; render(); scrollA(0); setTimeout(() => { const i = document.querySelector('[data-f="liba"][data-k="titulo"]'); if (i) { i.focus(); i.select(); } }, 0); },
  libmovu(el) { const b = libroDe(UI.libro); const L = b.unidades; const i = L.findIndex(u => u.id === el.dataset.u); const j = i + Number(el.dataset.d); if (j < 0 || j >= L.length) return; [L[i], L[j]] = [L[j], L[i]]; touchLib(b); libRe(); },
  libmova(el) { const c = libCur(); if (!c) return; const L = c.u.apartados; const i = L.indexOf(c.a); const j = i + Number(el.dataset.d); if (j < 0 || j >= L.length) return; [L[i], L[j]] = [L[j], L[i]]; touchLib(c.b); libRe(); },
  libdela() { const c = libCur(); if (!c) return; c.u.apartados = c.u.apartados.filter(a => a !== c.a); if (!c.u.apartados.length) c.u.apartados.push(nuevoApartado(libL(c.b).intro)); touchLib(c.b); UI.libAp = c.u.apartados[0].id; UI.confirm = null; libRe(); toast('Apartado borrado'); },
  libdelu() { const c = libCur(); if (!c) return; c.b.unidades = c.b.unidades.filter(u => u !== c.u); touchLib(c.b); UI.libAp = null; UI.confirm = null; libRe(); toast('Unidad borrada'); },
  libdel() { const b = libroDe(UI.libro); if (!b) return; const eraP = b.principal; delete S.libros[b.id]; Save.dirty.delete('libro_' + b.id); Store.remove('libro_' + b.id).catch(() => {}); if (eraP) { const o = librosMat(b.mat)[0]; if (o) { o.principal = true; touchLib(o); } } UI.confirm = null; UI.libro = null; UI.view = 'materiales'; render(); toast('Libro borrado'); },
  libplus(el) { UI.libIns = el.dataset.pos === '' || UI.libIns === el.dataset.pos ? null : el.dataset.pos; libRe(); },
  libaddb(el) { const c = libCur(); if (!c) return; const x = { id: uid(), t: el.dataset.t, ...JSON.parse(JSON.stringify(BLOQ_DEF[el.dataset.t] || {})) };
    const pos = el.dataset.pos === 'fin' ? c.a.bloques.length : Number(el.dataset.pos); c.a.bloques.splice(pos, 0, x); touchLib(c.b); UI.libIns = null; libRe();
    setTimeout(() => { const f = document.querySelector(`[data-bid="${x.id}"] textarea, [data-bid="${x.id}"] input`); if (f && x.t !== 'imagen') f.focus(); document.querySelector(`[data-bid="${x.id}"]`)?.scrollIntoView({ block: 'nearest' }); }, 0); },
  libbmov(el) { const c = libCur(); const L = c.a.bloques; const i = L.findIndex(x => x.id === el.dataset.b); const j = i + Number(el.dataset.d); if (j < 0 || j >= L.length) return; [L[i], L[j]] = [L[j], L[i]]; touchLib(c.b); libRe(); },
  libbdup(el) { const c = libCur(); const L = c.a.bloques; const i = L.findIndex(x => x.id === el.dataset.b); L.splice(i + 1, 0, { ...JSON.parse(JSON.stringify(L[i])), id: uid() }); touchLib(c.b); libRe(); },
  libbdel(el) { const x = libBloque(el.dataset.b); if (!x) return; const vacio = !['txt', 'titulo', 'sol', 'resp', 'pie', 'url', 'assetId'].some(k => (x[k] || '').toString().trim()); if (vacio || x.t === 'salto') A.libbdelok(el); else { UI.confirm = 'libb:' + x.id; libRe(); } },
  libbdelok(el) { const c = libCur(); c.a.bloques = c.a.bloques.filter(x => x.id !== el.dataset.b); touchLib(c.b); UI.confirm = null; libRe(); },
  libimgup(el) { UI.libImgB = el.dataset.b; $('#libimg').click(); },
  libimgmat(el) { libImgMatModal(el.dataset.b); },
  libimgsel(el) { const x = libBloque(el.dataset.b); if (!x) return; x.assetId = el.dataset.asset; x.url = ''; if (!x.pie) x.pie = el.dataset.pie || ''; touchLib(libroDe(UI.libro)); closeModal(); libRe(); },
  libimgx(el) { const x = libBloque(el.dataset.b); if (!x) return; delete x.assetId; x.url = ''; touchLib(libroDe(UI.libro)); libRe(); },
  libpdf() { libPdfModal(); },
  libpdfok() { const b = libroDe(UI.libro); const opt = { unidad: $('#pdf-u').value || null, sol: document.querySelector('input[name="pdf-s"]:checked')?.value === '1', acc: document.querySelector('input[name="pdf-a"]:checked')?.value === '1' }; closeModal(); descargarLibroPDF(b, opt); },
  seslibpres() { const r = libroSesion(UI.sesion); if (r?.b) presentar(r.b.id, r.ap); },
});
Object.assign(Fd, {
  libt(el) { const b = libroDe(UI.libro); b[el.dataset.k] = el.value; touchLib(b); if (el.tagName === 'SELECT') libRe(); },
  libprin(el) { const b = libroDe(UI.libro); if (el.checked) A.libprincipal({ dataset: { id: b.id } }); else { b.principal = false; touchLib(b); const o = librosMat(b.mat).find(x => x !== b); if (o) { o.principal = true; touchLib(o); } libRe(); } },
  libu(el) { const b = libroDe(UI.libro); const u = b.unidades.find(x => x.id === el.dataset.id); if (u) { u.titulo = el.value; touchLib(b); } },
  liba(el) { const c = libCur(); if (c) { c.a[el.dataset.k] = el.value; touchLib(c.b); } },
  lb(el) { const x = libBloque(el.dataset.b); if (x) { x[el.dataset.k] = el.value; touchLib(libroDe(UI.libro)); } },
  lbsel(el) { const x = libBloque(el.dataset.b); if (x) { x[el.dataset.k] = el.dataset.k === 'ancho' ? Number(el.value) : el.value; touchLib(libroDe(UI.libro)); libRe(); } },
  seslib(el) { const p = plan(UI.sesion); const [lib, ap] = (el.value || '').split('|'); if (el.value === '_no') p.libro = { lib: '', ap: '', no: true }; else if (lib) p.libro = { lib, ap }; else delete p.libro; touchPlan(UI.sesion); libRe(); },
});
$('#libimg').addEventListener('change', async e => { const f = e.target.files[0]; e.target.value = ''; const x = UI.libImgB && libBloque(UI.libImgB); if (!f || !x) return;
  if (!ARCH.assets) { toast('Para subir imágenes entra con tu cuenta de Google o Microsoft'); return; } if (!f.type.startsWith('image')) { toast('Elige un archivo de imagen'); return; }
  toast('Subiendo la imagen…'); try { const r = await ARCH.assets.upload(f); x.assetId = r.id; x.url = ''; if (!x.pie) x.pie = ''; touchLib(libroDe(UI.libro)); libRe(); toast('Imagen añadida'); } catch (er) { toast(er?.code === 'too_large' ? `La imagen es demasiado grande (máximo ${Nube.MAX_MB} MB).` : 'No se ha podido subir la imagen.'); } });
document.addEventListener('keydown', e => { if (!UI.pres || !document.querySelector('.projector.pres')) return; if (e.target.matches?.('input,textarea,select')) return;
  if (['ArrowRight', 'PageDown', ' '].includes(e.key)) { e.preventDefault(); presNav(1); } else if (['ArrowLeft', 'PageUp'].includes(e.key)) { e.preventDefault(); presNav(-1); } });

/* ---------- libro en las sesiones ---------- */
const palabrasTema = s => new Set(words(s).replace(/[^a-z0-9ñ]+/g, ' ').split(' ').filter(w => w.length >= 4));
function libroSesion(key) {
  const g = grupo(parseKey(key).grupoId); if (!g || !g.asig || esTutoria(g)) return null;
  const mat = matDe().find(a => a.asig && a.asig === g.asig); if (!mat) return { mat: null };
  const p = S.planes[key] || {}; const libs = librosMat(mat.id); if (!libs.length) return { mat, b: null };
  const el = p.libro && !p.libro.no && libroDe(p.libro.lib); const b = el && el.mat === mat.id ? el : libs[0];
  if (p.libro?.no) return { mat, b, libs, ap: null, no: true };
  if (el && apDe(b, p.libro.ap)) return { mat, b, libs, ap: p.libro.ap };
  const ws = palabrasTema([p.titulo, p.unidad, p.etiquetas].join(' ')); let best = null, bs = 0;
  if (ws.size) apsLista(b).forEach(o => { const t = palabrasTema([o.a.titulo, o.a.temas, o.u.titulo].join(' ')); let s = 0; t.forEach(w => { if (ws.has(w)) s++; }); if (s > bs) { bs = s; best = o.a.id; } });
  return { mat, b, libs, ap: best, propuesto: !!best };
}
function libroSesionHTML(key) {
  const r = libroSesion(key); if (!r) return '';
  if (!r.mat) return `<p class="tiny muted" style="margin:0">📖 Para tener el libro aquí, crea la asignatura en <a href="#" data-a="go" data-v="materiales">Materiales</a> y escríbelo allí.</p>`;
  if (!r.b) return `<p class="tiny muted" style="margin:0">📖 La asignatura aún no tiene libro. <a href="#" data-a="go" data-v="materiales">Créalo en Materiales</a>.</p>`;
  const opts = r.libs.map(b => `<optgroup label="${esc(b.titulo)}">${apsLista(b).map(o => `<option value="${b.id}|${o.a.id}" ${b === r.b && o.a.id === r.ap ? 'selected' : ''}>${numAp(o.ui, o.ai)} ${esc(o.a.titulo)}</option>`).join('')}</optgroup>`).join('');
  return `<div class="row"><span class="label">📖 Libro</span><select data-f="seslib" style="flex:1;min-width:200px;width:auto" aria-label="Apartado del libro para esta sesión"><option value="_no" ${r.no || !r.ap ? 'selected' : ''}>— Ningún apartado —</option>${opts}</select>${r.propuesto ? '<span class="tiny muted">propuesto por los temas</span>' : ''}
    <button class="btn sm" data-a="seslibpres">▶ Presentar</button><button class="btn sm ghost" data-a="libabrir" data-id="${r.b.id}" data-ap="${r.ap || ''}">Abrir en el editor</button></div>`;
}
/* lista de libros en Materiales */
function librosPanel(a) {
  const L = librosMat(a.id);
  return `<div class="panel stack"><div class="row between"><h3 style="margin:0">📖 Libros</h3><button class="btn sm" data-a="libnuevo">+ Nuevo libro</button></div>
    ${L.length ? `<div class="list">${L.map(b => { const n = apsLista(b).length; return `<div class="li matrow"><button class="matopen grow" data-a="libabrir" data-id="${b.id}"><b>${esc(b.titulo || 'Sin título')}</b> ${b.principal ? pill('acc', 'Principal') : ''} <span class="tiny muted">${b.unidades.length} ${b.unidades.length === 1 ? 'unidad' : 'unidades'} · ${n} ${n === 1 ? 'apartado' : 'apartados'}</span></button>
      ${!b.principal ? `<button class="btn sm ghost" data-a="libprincipal" data-id="${b.id}">Hacer principal</button>` : ''}<button class="btn sm" data-a="libpres" data-id="${b.id}">▶ Presentar</button></div>`; }).join('')}</div>` : `<p class="empty">Crea tus apuntes, compendios de actividades o esquemas. El libro principal se abre desde las sesiones de los grupos de ${a.asig ? 'esta asignatura' : 'esta asignatura (vincúlala al currículo en el panel de la derecha)'}.</p>`}</div>`;
}

/* ---------- arranque ---------- */
