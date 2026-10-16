'use strict';
/* ===== BÚSQUEDA GLOBAL =====
   Lupa de la barra superior, Ctrl+K (Cmd+K en Mac) o «/». Busca en lo que ya está en el dispositivo:
   grupos y alumnado, sesiones (título, unidad, temas, guion, explicación, notas), ideas, tareas de la agenda,
   materiales (nombres de archivos y carpetas) y libros. Sin tildes ni mayúsculas. */
const BUS_MAX = 8;
function busTextoSesion(p) {
  return [p.titulo, p.unidad, p.etiquetas, p.explicacion, p.consejosNotas, p.motivarNotas, p.objetivos,
    ...(p.bloques || []).map(b => b.fase), ...(p.actividades || []).map(a => a.texto), ...(p.recursos || []).map(r => r.t),
    ...(p.eventos || []).map(e => e.titulo), p.cierre?.visto].filter(Boolean).join(' · ');
}
/* todas las palabras tienen que aparecer (en cualquier orden) */
function busCoincide(texto, palabras) { const t = words(texto); return palabras.every(w => t.includes(w)); }
function busFragmento(texto, palabras) {
  const t = String(texto || ''); const n = words(t); const i = n.indexOf(palabras[0]);
  const ini = Math.max(0, i - 30); const frag = (ini ? '…' : '') + t.slice(ini, ini + 110) + (t.length > ini + 110 ? '…' : '');
  return busResaltar(frag, palabras);
}
function busResaltar(texto, palabras) {
  let h = esc(texto); const n = words(texto);
  /* marca cada palabra buscada sobre el texto original (las posiciones coinciden: words() solo quita tildes) */
  const marcas = [];
  palabras.forEach(w => { let i = n.indexOf(w); while (i >= 0 && w) { marcas.push([i, i + w.length]); i = n.indexOf(w, i + w.length); } });
  if (!marcas.length || n.length !== texto.length) return h;
  marcas.sort((a, b) => a[0] - b[0]); const out = []; let pos = 0;
  for (const [a, b] of marcas) { if (a < pos) continue; out.push(esc(texto.slice(pos, a)), '<mark>', esc(texto.slice(a, b)), '</mark>'); pos = b; }
  out.push(esc(texto.slice(pos))); return out.join('');
}
function buscarTodo(q) {
  const palabras = words(q).split(/\s+/).filter(Boolean); if (!palabras.length) return [];
  const R = [];
  const grupoR = { t: 'Grupos y alumnado', items: [] };
  S.grupos.forEach(g => {
    if (busCoincide([g.nombre, g.materia, g.nivel].join(' '), palabras)) grupoR.items.push({ html: `${gchip(g)}`, sub: `${g.alumnos.length} alumnos`, a: `data-a="go" data-v="grupo" data-g="${g.id}" data-gt="alumnado"` });
    g.alumnos.forEach(al => { if (busCoincide([al.nombre, al.apellidos, (al.tags || []).join(' ')].join(' '), palabras)) grupoR.items.push({ html: busResaltar(al.nombre, palabras), sub: esc(g.nombre) + ((al.tags || []).length ? ' · ' + esc(al.tags.join(', ')) : ''), a: `data-a="go" data-v="grupo" data-g="${g.id}" data-gt="alumnado"` }); });
  });
  R.push(grupoR);
  const sesR = { t: 'Sesiones', items: [] };
  Object.entries(S.planes).filter(([k, p]) => p && !p.sinClase && grupo(parseKey(k).grupoId)).sort((a, b) => parseKey(b[0]).fecha.localeCompare(parseKey(a[0]).fecha)).forEach(([k, p]) => {
    const t = busTextoSesion(p); if (!t || !busCoincide(t, palabras)) return;
    const { grupoId, fecha } = parseKey(k);
    sesR.items.push({ html: busResaltar(p.titulo || 'Sin título', palabras), sub: `${esc(grupo(grupoId).nombre)} · ${fShort(fecha)}${busCoincide(p.titulo || '', palabras) ? '' : ' · ' + busFragmento(t, palabras)}`, a: `data-a="sesion" data-k="${esc(k)}"` });
  });
  R.push(sesR);
  const idR = { t: 'Ideas', items: [] };
  S.ideas.forEach(i => { const t = [i.titulo, i.texto, i.tipo, (i.etiquetas || []).join(' ')].join(' · '); if (busCoincide(t, palabras)) idR.items.push({ html: busResaltar(i.titulo || (i.texto || '').slice(0, 60) || 'Idea', palabras), sub: esc(i.tipo || '') + (i.texto && i.titulo ? ' · ' + busFragmento(i.texto, palabras) : ''), a: `data-a="busidea" data-q="${esc(q)}"` }); });
  R.push(idR);
  const agR = { t: 'Agenda', items: [] };
  S.agenda.slice().sort((a, b) => (b.fecha || '').localeCompare(a.fecha || '')).forEach(a => { if (busCoincide([a.titulo, a.notas].join(' · '), palabras)) agR.items.push({ html: busResaltar(a.titulo || '', palabras), sub: `${TIPOS_AG[a.tipo] || ''}${a.grupoId ? ' · ' + esc(grupo(a.grupoId)?.nombre || '') : ''} · ${a.fecha ? fShort(a.fecha) : 'sin fecha'}${a.done ? ' · hecha' : ''}`, a: `data-a="busag" data-d="${a.fecha || ''}"` }); });
  R.push(agR);
  const matR = { t: 'Materiales y libros', items: [] };
  (S.materiales.asigs || []).forEach(as => {
    (as.carpetas || []).forEach(c => { if (busCoincide(c.nombre, palabras)) matR.items.push({ html: '📁 ' + busResaltar(c.nombre, palabras), sub: esc(as.nombre), a: `data-a="busmat" data-id="${as.id}" data-c="${c.id}"` }); });
    (as.archivos || []).forEach(f => { if (busCoincide(f.nombre, palabras)) matR.items.push({ html: busResaltar(f.nombre, palabras), sub: esc(as.nombre) + (f.carpeta ? ' · ' + esc(as.carpetas.find(c => c.id === f.carpeta)?.nombre || '') : ''), a: `data-a="busmat" data-id="${as.id}" data-c="${f.carpeta || ''}"` }); });
  });
  Object.values(S.libros || {}).forEach(b => { if (busCoincide(b.titulo || '', palabras)) matR.items.push({ html: '📖 ' + busResaltar(b.titulo, palabras), sub: 'Libro', a: `data-a="libabrir" data-id="${b.id}"` }); });
  R.push(matR);
  return R.filter(r => r.items.length);
}
function buscarHTML(q) {
  if (!words(q).trim()) return `<p class="empty">Escribe un nombre, un tema, una idea o un archivo.</p>`;
  const R = buscarTodo(q);
  if (!R.length) return `<p class="empty">No hay nada que coincida con «${esc(q)}».</p>`;
  return R.map(r => `<div class="bus-g"><div class="label">${r.t} <span class="muted">${r.items.length}</span></div>${r.items.slice(0, UI.busTodo === r.t ? 200 : BUS_MAX).map(it => `<button class="bus-it" ${it.a}><span class="bus-t">${it.html}</span>${it.sub ? `<span class="bus-s">${it.sub}</span>` : ''}</button>`).join('')}${r.items.length > BUS_MAX && UI.busTodo !== r.t ? `<button class="linkbtn small" data-a="bustodo" data-t="${esc(r.t)}">Ver los ${r.items.length}</button>` : ''}</div>`).join('');
}
function abrirBuscar() {
  UI.busTodo = null;
  modal(`<div class="bus"><div class="row" style="flex-wrap:nowrap"><input type="search" id="bus-q" placeholder="Buscar en Biosofía" autocomplete="off" aria-label="Buscar" value="${esc(UI.busQ || '')}"><button class="btn sm ghost" data-a="close">Cerrar</button></div><div id="bus-r" class="bus-r">${buscarHTML(UI.busQ || '')}</div></div>`, false, 'bus-modal');
  const i = $('#bus-q'); i.focus(); i.select();
  i.addEventListener('input', () => { UI.busQ = i.value; UI.busTodo = null; clearTimeout(UI.busT); UI.busT = setTimeout(() => { const r = $('#bus-r'); if (r) r.innerHTML = buscarHTML(i.value); }, 120); });
  i.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); $('#bus-r .bus-it')?.click(); } });
}
Object.assign(A, {
  buscar() { abrirBuscar(); },
  bustodo(el) { UI.busTodo = el.dataset.t; const r = $('#bus-r'); if (r) r.innerHTML = buscarHTML($('#bus-q')?.value || ''); },
  busidea(el) { closeModal(); UI.ideasF = Object.assign(UI.ideasF || {}, { q: el.dataset.q, tipo: '', apt: '', sin: false }); UI.view = 'ideas'; render(); scrollA(0); },
  busag(el) { closeModal(); UI.view = 'agenda'; if (el.dataset.d) UI.agMonth = el.dataset.d; render(); scrollA(0); if (el.dataset.d) agModal(el.dataset.d); },
  busmat(el) { closeModal(); UI.view = 'materiales'; UI.matAsig = el.dataset.id; UI.matCarpeta = el.dataset.c || null; UI.matForm = null; UI.matRen = null; render(); scrollA(0); }
});
document.addEventListener('keydown', e => {
  const enCampo = e.target.closest?.('input,textarea,select,[contenteditable="true"]');
  if (((e.ctrlKey || e.metaKey) && !e.shiftKey && !e.altKey && e.key.toLowerCase() === 'k') || (e.key === '/' && !enCampo && !e.ctrlKey && !e.metaKey)) {
    if ($('#bus-q')) { $('#bus-q').focus(); e.preventDefault(); return; }
    e.preventDefault(); abrirBuscar();
  }
});
/* al elegir un resultado, se cierra la ventana de búsqueda (después de que el botón haga lo suyo) */
document.addEventListener('click', e => { if (e.target.closest?.('.bus-it') && $('#bus-q')) closeModal(); });
