'use strict';
/* ---------- modales ---------- */
function modal(html, still, cls) { $('#modal').innerHTML = `<div class="modal-bg" data-a="closebg"><div class="modal ${cls || ''}" role="dialog" aria-modal="true" ${still ? 'style="animation:none"' : ''}>${html}</div></div>`; }
function closeModal() { $('#modal').innerHTML = ''; UI.agModalDay = null; UI.bi = null; if (UI.cr) { UI.cr.ctl?.abort(); UI.cr = null; } }
function toast(t) { Deshacer.msg = { t: Deshacer.accion?.t, texto: t }; document.querySelectorAll('.toast').forEach(x => x.remove()); const el = document.createElement('div'); el.className = 'toast'; el.textContent = t; document.body.appendChild(el); setTimeout(() => el.remove(), 2200); }

function sortear() {
  const key = UI.sesion; const g = grupo(parseKey(key).grupoId); const r = reg(key);
  const pres = g.alumnos.filter(a => !['F', 'J'].includes(r.asis[a.id]) && !r.bano.some(b => b.alumnoId === a.id && b.permitido && !b.vuelve));
  if (!pres.length) { toast('No hay alumnos presentes'); return; }
  const cnt = {}; Object.keys(S.regs).filter(k => k.startsWith(g.id + '|')).forEach(k => (S.regs[k].sorteos || []).forEach(x => cnt[x.alumnoId] = (cnt[x.alumnoId] || 0) + 1));
  const w = pres.map(a => 1 / (1 + (cnt[a.id] || 0)) ** 2); const tot = w.reduce((s, x) => s + x, 0);
  let rnd = Math.random() * tot, pick = pres[0]; for (let i = 0; i < pres.length; i++) { rnd -= w[i]; if (rnd <= 0) { pick = pres[i]; break; } }
  UI.sorteado = pick.id;
  modal(`<div class="label" style="text-align:center">Pregunta para</div><div class="bigname">${esc(pick.nombre)}</div>
    <div class="small muted" style="text-align:center;margin-bottom:12px">Ha salido ${cnt[pick.id] || 0} ${cnt[pick.id] === 1 ? 'vez' : 'veces'} antes en este grupo</div>
    <h3 style="text-align:center;margin-bottom:10px">¿Cómo ha respondido?</h3>
    <div class="bigbtns"><button class="v-si" data-a="valorar" data-v="bien">Bien</button><button class="v-medias" data-a="valorar" data-v="regular">Regular</button><button class="v-no" data-a="valorar" data-v="no">No sabe</button></div>
    <div class="row between" style="margin-top:12px"><button class="btn ghost" data-a="valorar" data-v="skip">Saltar sin valorar</button><button class="btn" data-a="sortear">Sortear otro</button></div>`);
}
function banoModal(a) {
  const key = UI.sesion; const { grupoId, fecha, franjaId } = parseKey(key); const g = grupo(grupoId); const r = reg(key);
  const out = r.bano.find(b => b.alumnoId === a.id && b.permitido && !b.vuelve);
  if (out) { modal(`<h2>${esc(a.nombre)} ha vuelto</h2><p>Salió hace ${Math.max(0, Math.round((Date.now() - out.sale) / 60000))} minutos.</p><div class="row"><button class="btn primary" data-a="banovuelve" data-id="${a.id}">Registrar vuelta</button><button class="btn" data-a="close">Cancelar</button></div>`); return; }
  const lun = mondayOf(fecha); let semana = 0;
  Object.keys(S.regs).filter(k => k.startsWith(grupoId + '|') && mondayOf(parseKey(k).fecha) === lun).forEach(k => semana += (S.regs[k].bano || []).filter(b => b.alumnoId === a.id && b.permitido !== undefined).length);
  const fuera = r.bano.filter(b => b.permitido && !b.vuelve && b.alumnoId !== a.id);
  const exam = S.agenda.some(x => x.grupoId === grupoId && x.tipo === 'examen' && x.fecha === fecha);
  const f = franja(franjaId); const nm = nowMin(); const esHoy = fecha === todayStr();
  const avisos = [];
  if (fuera.length) avisos.push(['warn', `Ya está fuera: ${fuera.map(b => esc(alNombre(g, b.alumnoId))).join(', ')}`]);
  if (exam) avisos.push(['warn', 'Hoy hay examen con este grupo']);
  if (esHoy && (nm - tmin(f.inicio) < 10 && nm >= tmin(f.inicio))) avisos.push(['info', 'Acaba de empezar la clase']);
  if (esHoy && (tmin(f.fin) - nm <= 10 && tmin(f.fin) - nm >= 0)) avisos.push(['info', 'Quedan menos de 10 minutos']);
  modal(`<h2>${esc(a.nombre)} pide ir al baño</h2><p class="small muted">Esta semana lo ha pedido ${semana} ${semana === 1 ? 'vez' : 'veces'} en tus clases.</p>
    ${avisos.map(([c, t]) => `<div class="alert ${c === 'ok' ? 'info' : c}" style="margin-bottom:6px">${t}</div>`).join('')}
    <h3 style="margin:12px 0 8px">¿Le dejas ir?</h3><div class="bigbtns"><button class="v-si" data-a="bano" data-id="${a.id}" data-v="si">Sí</button><button class="v-no" data-a="bano" data-id="${a.id}" data-v="no">No</button><button class="v-medias" data-a="bano" data-id="${a.id}" data-v="luego">Más tarde</button></div>`);
}
function actitudModal(a, key) {
  key = key || UI.sesion; const r = reg(key); const v = actVal(r.actitud[a.id]) || { n: null, tags: [] }; UI.actDraft = { id: a.id, key, n: v.n, tags: [...(v.tags || [])] }; actitudRender(a, true);
}
function actitudRender(a, anim) {
  const d = UI.actDraft; const chip = (t, pos) => `<button class="btn sm ${d.tags.includes(t) ? '' : 'ghost'}" data-a="acttag" data-t="${esc(t)}" aria-pressed="${d.tags.includes(t)}" style="${d.tags.includes(t) ? `background:var(--${pos ? 'ok' : 'bad'}-soft);border-color:var(--${pos ? 'ok' : 'bad'});color:var(--${pos ? 'ok' : 'bad'})` : ''}">${pos ? '+' : '−'} ${esc(t)}</button>`;
  modal(`<h2>Actitud de ${esc(a.nombre)}</h2>
    <div class="label" style="margin-bottom:6px">Nota</div>
    <div class="bigbtns" style="grid-template-columns:repeat(5,1fr)">${[1, 2, 3, 4, 5].map(n => `<button data-a="actn" data-v="${n}" class="${d.n === n ? (n >= 4 ? 'v-si' : n === 3 ? 'v-medias' : 'v-no') : ''}" style="${d.n === n ? '' : 'background:var(--surface-2);color:var(--ink)'}">${n}</button>`).join('')}</div>
    <div class="label" style="margin:14px 0 6px">Negativas</div><div class="row">${ACT_NEG.map(t => chip(t, false)).join('')}</div>
    <div class="label" style="margin:12px 0 6px">Positivas</div><div class="row">${ACT_POS.map(t => chip(t, true)).join('')}</div>
    <div class="row between" style="margin-top:16px"><button class="btn ghost" data-a="actclear">Quitar valoración</button><div class="row"><button class="btn" data-a="close">Cancelar</button><button class="btn primary" data-a="actsave">Guardar</button></div></div>`, !anim);
}
function notaModal(a) { modal(`<h2>Nota sobre ${esc(a.nombre)}</h2><textarea id="nota-t" rows="4" placeholder="Qué ha pasado"></textarea><div class="row" style="margin-top:10px"><button class="btn primary" data-a="savenota" data-id="${a.id}">Guardar</button><button class="btn" data-a="close">Cancelar</button></div>`); setTimeout(() => $('#nota-t')?.focus(), 30); }

function proyectar() {
  const key = UI.sesion; const { grupoId, fecha } = parseKey(key); const p = plan(key); const fechas = fechasGrupo(grupoId, fecha);
  const lg = idiomaG(grupoId); const T = L10N[lg];
  const el = document.createElement('div'); el.className = 'projector'; el.lang = lg === 'va' ? 'ca-valencia' : 'es'; el.innerHTML = `<div class="row between"><span class="label">${esc(grupo(grupoId).nombre)} · ${cap(fLongL(fecha, lg))}</span><button class="btn" data-a="cerrarproy" lang="es">Cerrar</button></div>
    <h1 style="margin-top:20px">${esc(p.titulo || T.hoy)}</h1>${(p.resumenInicio ?? resumenAnterior(key)?.txt) ? `<div class="label" style="font-size:1rem;margin-bottom:8px">${T.anterior}</div><div class="p-body" style="white-space:pre-wrap">${esc(p.resumenInicio ?? resumenAnterior(key)?.txt)}</div>` : ''}
    ${fechas.length ? `<div class="label" style="font-size:1rem;margin:30px 0 0">${T.fechas}</div><div class="p-dates" style="margin-top:10px">${fechas.map(a => `<div><b>${a.tipo === 'examen' ? '📝' : '📦'} ${esc(a.titulo)}</b> · ${cap(fLongL(a.fecha, lg))} <span class="muted">(${T.rel(diffDays(fecha, a.fecha))})</span></div>`).join('')}</div>` : ''}`;
  document.body.appendChild(el);
}

/* ---------- acciones (clic) ---------- */
const A = {
  tbmas() { modal(`<div class="row between"><h2 style="margin:0">Más</h2><button class="iconbtn" data-a="close" aria-label="Cerrar">✕</button></div>
      <div class="sheetlist">${TAB_MAS.map(([v, t, e]) => `<button data-a="tbgo" data-v="${v}"><span aria-hidden="true">${e}</span>${t}</button>`).join('')}</div>`); },
  tbgo(el) { closeModal(); A.go(el); },
  tbadd() { const hoy = todayStr(); const man = addDays(hoy, 1);
    modal(`<div class="row between"><h2 style="margin:0">Apuntar</h2><button class="iconbtn" data-a="close" aria-label="Cerrar">✕</button></div>
      <div class="stack" style="margin-top:12px"><label class="f">Idea para clase<textarea id="qi-x" rows="3" placeholder="Una actividad, una noticia, un dato curioso…"></textarea></label>
        <div class="row"><input type="text" id="qi-e" placeholder="Etiquetas (p. ej. volcanes, agua)" style="flex:1;min-width:0"><button class="btn primary" data-a="qidea">Guardar idea</button></div>
        <hr style="margin:4px 0"><div class="label">En la agenda</div>
        <div class="row"><button class="btn" data-a="agday" data-d="${hoy}">Para hoy</button><button class="btn" data-a="agday" data-d="${man}">Para mañana</button><button class="btn" data-a="tbgo" data-v="agenda">Otro día…</button></div></div>`);
    setTimeout(() => $('#qi-x')?.focus(), 50); },
  qidea() { const x = $('#qi-x').value.trim(); if (!x) { $('#qi-x').focus(); return; }
    const [t, ...rest] = x.split('\n'); S.ideas.push({ id: uid(), creada: new Date().toISOString(), usos: [], titulo: rest.length ? t.trim() : '', texto: rest.length ? rest.join('\n').trim() : x, apartado: '', url: (x.match(/https?:\/\/\S+/) || [''])[0], tipo: '',
      etiquetas: $('#qi-e').value.split(',').map(s => s.trim()).filter(Boolean), ambito: 'todos', grupoId: null, nivel: null });
    touch('ideas'); closeModal(); toast('Idea guardada (está en Ideas › Sin clasificar)'); UI.keepScroll = true; render(); },
  go(el) { UI.view = el.dataset.v; if (el.dataset.g) { UI.grupoId = el.dataset.g; UI.grupoTab = el.dataset.gt || 'alumnado'; } UI.confirm = null; UI.editIdea = null; render(); scrollA(0); },
  dia(el) { const d = +el.dataset.d; UI.date = d === 0 ? todayStr() : addDays(UI.date, d); if (d) { let g = 0; while (dow(UI.date) > 5 && g++ < 3) UI.date = addDays(UI.date, d); } render(); },
  pmode(el) { UI.planMode = el.dataset.v; render(); },
  pnav(el) { const d = +el.dataset.d; if (!d) UI.planDate = todayStr(); else if (UI.planMode === 'semana') UI.planDate = addDays(UI.planDate, 7 * d); else if (UI.planMode === 'rapida') { const x = parseD(UI.planDate); UI.planDate = ymd(new Date(x.getFullYear(), x.getMonth() + d, 1)); } else if (UI.planMode === 'dia') { UI.planDate = addDays(UI.planDate, d); let g = 0; while (dow(UI.planDate) > 5 && g++ < 3) UI.planDate = addDays(UI.planDate, d); } else { const x = parseD(UI.planDate); UI.planDate = ymd(new Date(x.getFullYear(), x.getMonth() + d, 1)); } render(); },
  verdia(el) { UI.planMode = 'semana'; UI.planDate = el.dataset.d; render(); },
  sesion(el) { closeModal(); UI.sesion = el.dataset.k; UI.view = 'sesion'; const { fecha } = parseKey(UI.sesion); const hoy = todayStr();
    UI.sesTab = tabNorm(el.dataset.tab || tabPorHora(UI.sesion)); UI.liveMode = 'capa'; render(); scrollA(0); },
  secoculta(el) { S.config.prepOcultas = [...new Set([...(S.config.prepOcultas || []), el.dataset.id])]; touch('config'); UI.keepScroll = true; render(); toast('Sección oculta mientras esté vacía'); },
  secfija(el) { S.config.prepOcultas = (S.config.prepOcultas || []).filter(x => x !== el.dataset.id); touch('config'); UI.keepScroll = true; render(); toast('Sección visible en todas las sesiones'); },
  secver(el) { UI.secMostrar = UI.secMostrar || {}; const k = UI.sesion + ':' + el.dataset.id; UI.secMostrar[k] = true; UI.secOpen[k] = true; UI.keepScroll = true; render(); },
  planificardia(el) { UI.view = 'plan'; UI.planMode = 'semana'; UI.planDate = el.dataset.d; render(); scrollA(0); },
  stab(el) { UI.sesTab = tabNorm(el.dataset.v); render(); },
  gtab(el) { UI.grupoTab = el.dataset.v; UI.confirm = null; render(); },
  vertodas() { UI.verTodas = !UI.verTodas; render(); },
  capa(el) { UI.capa = el.dataset.v; UI.liveMode = 'capa'; render(); },
  lmode(el) { UI.liveMode = UI.liveMode === el.dataset.v ? 'capa' : el.dataset.v; render(); },
  tapal(el) {
    const key = UI.sesion; const g = grupo(parseKey(key).grupoId); const a = g.alumnos.find(x => x.id === el.dataset.id); const r = reg(key);
    if (UI.liveMode === 'bano') return banoModal(a);
    if (UI.liveMode === 'nota') return notaModal(a);
    if (UI.capa === 'asis') { const cyc = [undefined, 'R', 'F', 'J']; const i = cyc.indexOf(r.asis[a.id]); const nv = cyc[(i + 1) % cyc.length]; if (nv) r.asis[a.id] = nv; else delete r.asis[a.id]; }
    else if (UI.capa === 'actitud') return actitudModal(a);
    else { const cyc = [undefined, 'si', 'medias', 'no']; const m = r[UI.capa]; const i = cyc.indexOf(m[a.id]); const nv = cyc[(i + 1) % cyc.length]; if (nv) m[a.id] = nv; else delete m[a.id]; }
    r.tocado = true; touchReg(key); UI.keepScroll = true; render();
  },
  reglaset(el) { UI.reglaForm[el.dataset.k] = el.dataset.v; UI.keepScroll = true; render(); },
  addregla() { const g = grupo(UI.grupoId); const f = UI.reglaForm; if (!f.a || (['separar', 'juntos'].includes(f.tipo) && (!f.b || f.b === f.a))) { toast('Elige ' + (['separar', 'juntos'].includes(f.tipo) ? 'los dos alumnos' : 'el alumno')); return; }
    if (f.tipo === 'fijo' && !Object.values(g.plano.asientos).includes(f.a)) { toast('Ese alumno todavía no tiene sitio en el plano'); return; }
    const r = { id: uid(), tipo: f.tipo, a: f.a, b: ['separar', 'juntos'].includes(f.tipo) ? f.b : null, filas: Number(f.filas) || 1, lejos: !!f.lejos, peso: Number(f.peso) || 2 };
    reglasDe(g)[f.clase].push(r); touch('grupos'); UI.reglaForm = { ...f, a: '', b: '' }; UI.keepScroll = true; render(); },
  delregla(el) { const g = grupo(UI.grupoId); const R = reglasDe(g); R[el.dataset.c] = R[el.dataset.c].filter(r => r.id !== el.dataset.id); touch('grupos'); UI.keepScroll = true; render(); },
  sugerirsitios() { const g = grupo(UI.grupoId); UI.semillaSitios = (UI.semillaSitios || Date.now() % 100000) + 7919; const res = sugerirSitios(g, UI.semillaSitios); if (res.error) { toast(res.error); return; } UI.propSitios = res; modalSitios(g, res); },
  aplicarsitios() { const g = grupo(UI.grupoId); if (!UI.propSitios) return; g.plano.asientos = UI.propSitios.asientos; UI.propSitios = null; touch('grupos'); closeModal(); toast('Sitios aplicados'); UI.keepScroll = true; render(); },
  proysitios() { const g = grupo(parseKey(UI.sesion).grupoId); const el = document.createElement('div'); el.className = 'projector';
    el.innerHTML = `<div class="row between"><span class="label">${esc(g.nombre)}</span><button class="btn" data-a="cerrarproy">Cerrar</button></div><div style="margin-top:20px;zoom:1.4">${planoHTML(g, a => `<div class="seat ${a ? '' : 'empty'}" style="cursor:default">${a ? `${esc(a.pila || a.nombre)}<span class="tg">${esc(a.apellidos || '')}</span>` : ''}</div>`)}</div>`;
    document.body.appendChild(el); },
  liveview(el) { UI.liveView = el.dataset.v; render(); },
  planosel(el) { UI.planoSel = UI.planoSel === el.dataset.id ? null : el.dataset.id; UI.keepScroll = true; render(); },
  seat(el) { const g = grupo(UI.grupoId); const pl = g.plano; const k = el.dataset.k; const ocupa = pl.asientos[k]; const sel = UI.planoSel;
    if (!sel) { UI.planoSel = ocupa ? ocupa : null; UI.keepScroll = true; render(); return; }
    if (sel === ocupa) { UI.planoSel = null; UI.keepScroll = true; render(); return; }
    moverAlumno(g, sel, k); UI.planoSel = null; UI.keepScroll = true; render(); },
  planoauto(el) { const g = grupo(UI.grupoId); const pl = g.plano; const v = el.dataset.v; pl.asientos = {};
    if (v !== 'vaciar') { const prio = a => (a.tags || []).some(t => TAGS_DELANTE.includes(t)) ? 0 : 1;
      let lista = [...g.alumnos]; if (v === 'azar') lista.sort(() => Math.random() - .5); lista = lista.map((a, i) => [a, i]).sort((x, y) => prio(x[0]) - prio(y[0]) || x[1] - y[1]).map(x => x[0]);
      const sitios = asientosOrden(pl); lista.forEach((a, i) => { if (sitios[i]) pl.asientos[sitios[i]] = a.id; }); }
    touch('grupos'); UI.planoSel = null; UI.keepScroll = true; render(); },
  segvista(el) { UI.segVista = el.dataset.v; render(); },
  segcapa(el) { UI.segCapa = el.dataset.v; render(); },
  segmes(el) { const x = parseD(UI.segMes || todayStr()); UI.segMes = ymd(new Date(x.getFullYear(), x.getMonth() + (+el.dataset.d), 1)); render(); },
  segcell(el) { const key = el.dataset.k; const r = reg(key); const id = el.dataset.id; const capa = UI.segCapa || 'deberes';
    if (capa === 'asis') { const cyc = [undefined, 'R', 'F', 'J']; const nv = cyc[(cyc.indexOf(r.asis[id]) + 1) % 4]; if (nv) r.asis[id] = nv; else delete r.asis[id]; }
    else if (capa === 'actitud') { const g = grupo(parseKey(key).grupoId); return actitudModal(g.alumnos.find(x => x.id === id), key); }
    else if (capa === 'preguntas') { const mine = r.sorteos.filter(x => x.alumnoId === id && x.val !== 'skip'); const lastV = mine[mine.length - 1]?.val;
      if (!mine.length) r.sorteos.push({ alumnoId: id, val: 'bien', t: Date.now(), manual: true });
      else { const nxt = { bien: 'regular', regular: 'no', no: null }[lastV]; const i = r.sorteos.lastIndexOf(mine[mine.length - 1]); if (nxt) r.sorteos[i].val = nxt; else r.sorteos.splice(i, 1); } }
    else { const cyc = [undefined, 'si', 'medias', 'no']; const nv = cyc[(cyc.indexOf(r[capa][id]) + 1) % 4]; if (nv) r[capa][id] = nv; else delete r[capa][id]; }
    touchReg(key); UI.keepScroll = true; render(); },
  sortear() { sortear(); },
  actn(el) { const d = UI.actDraft; const n = +el.dataset.v; d.n = d.n === n ? null : n; actitudRender(grupo(parseKey(d.key).grupoId).alumnos.find(x => x.id === d.id)); },
  acttag(el) { const d = UI.actDraft; const t = el.dataset.t; d.tags = d.tags.includes(t) ? d.tags.filter(x => x !== t) : [...d.tags, t]; actitudRender(grupo(parseKey(d.key).grupoId).alumnos.find(x => x.id === d.id)); },
  actsave() { const d = UI.actDraft; const r = reg(d.key); if (d.n || d.tags.length) r.actitud[d.id] = { n: d.n, tags: d.tags }; else delete r.actitud[d.id]; touchReg(d.key); closeModal(); UI.keepScroll = true; render(); },
  actclear() { const d = UI.actDraft; delete reg(d.key).actitud[d.id]; touchReg(d.key); closeModal(); UI.keepScroll = true; render(); },
  valorar(el) { const r = reg(UI.sesion); r.sorteos.push({ alumnoId: UI.sorteado, val: el.dataset.v, t: Date.now() }); touchReg(UI.sesion); closeModal(); UI.keepScroll = true; render(); if (el.dataset.v !== 'skip') toast('Respuesta registrada'); },
  bano(el) { const r = reg(UI.sesion); const v = el.dataset.v; const id = el.dataset.id;
    r.espera = (r.espera || []).filter(e => e.alumnoId !== id);
    if (v === 'luego') { r.espera.push({ alumnoId: id, t: Date.now() }); }
    else r.bano.push({ alumnoId: id, permitido: v === 'si', sale: Date.now(), vuelve: v === 'si' ? null : Date.now() });
    touchReg(UI.sesion); closeModal(); UI.keepScroll = true; render(); },
  banovuelve(el) { const r = reg(UI.sesion); const b = r.bano.find(x => x.alumnoId === el.dataset.id && x.permitido && !x.vuelve); if (b) { b.vuelve = Date.now(); b.min = Math.round((b.vuelve - b.sale) / 60000); } touchReg(UI.sesion); closeModal(); UI.keepScroll = true; render(); },
  savenota(el) { const t = $('#nota-t').value.trim(); if (t) { reg(UI.sesion).notas.push({ alumnoId: el.dataset.id, texto: t, t: Date.now() }); touchReg(UI.sesion); } closeModal(); UI.keepScroll = true; render(); },
  close() { closeModal(); },
  closebg(el, e) { if (e.target === el && !UI.cr) closeModal(); },
  proyectar() { proyectar(); },
  cerrarproy() { document.querySelectorAll('.projector').forEach(x => x.remove()); UI.pres = null; },
  addpend() { const v = $('#newpend').value.trim(); if (!v) return; const { grupoId, fecha } = parseKey(UI.sesion); nuevaTareaClase(grupoId, v, fecha, { origen: UI.sesion, creado: fecha }); touch('agenda'); toast('Añadido'); render(); },
  additem(el) { const p = plan(UI.sesion); const l = el.dataset.list; (p[l] = p[l] || []).push(l === 'actividades' ? { id: uid(), texto: '', tipo: 'Individual' } : { id: uid() }); touchPlan(UI.sesion); UI.keepScroll = true; render(); },
  delitem(el) { const p = plan(UI.sesion); const l = el.dataset.list; const it = (p[l] || []).find(x => x.id === el.dataset.id); if (it?.assetId && ARCH.assets) ARCH.assets.delete(it.assetId).catch(() => {}); if (it?.archivo?.assetId && ARCH.assets) ARCH.assets.delete(it.archivo.assetId).catch(() => {}); p[l] = (p[l] || []).filter(x => x.id !== el.dataset.id); touchPlan(UI.sesion); UI.keepScroll = true; render(); },
  usaridea(el) { const i = S.ideas.find(x => x.id === el.dataset.id); if (!i) return; fijarIdea(el.dataset.k || UI.sesion, i, el.dataset.apt || apartadoIdea(i)); },
  desfijar(el) { desfijarIdea(el.dataset.k || UI.sesion, el.dataset.id); },
  bancoideas(el) { UI.bi = { key: el.dataset.k || UI.sesion, q: '', apt: '' }; biModal(true); },
  bifijar(el) { const i = S.ideas.find(x => x.id === el.dataset.id); if (!i || !UI.bi) return; const s = document.getElementById('bi-apt-' + i.id); fijarIdea(UI.bi.key, i, s?.value || apartadoIdea(i), true); biModal(); },
  bidesfijar(el) { if (!UI.bi) return; desfijarIdea(UI.bi.key, el.dataset.id, true); biModal(); },
  biapt(el) { UI.bi.apt = el.dataset.v; biModal(); },
  biir() { closeModal(); UI.view = 'ideas'; render(); scrollA(0); },
  ocultaridea(el) { const p = plan(UI.sesion); p.ideasOcultas = [...(p.ideasOcultas || []), el.dataset.id]; touchPlan(UI.sesion); UI.keepScroll = true; render(); },
  desplazar() { modal(`<h2>Desplazar la planificación</h2><p>Esta sesión quedará marcada como <b>sin clase</b> y su contenido, y el de todas las siguientes de este grupo, pasará a la siguiente clase disponible.</p>
    <label class="f">Motivo<input type="text" id="desp-m" placeholder="Huelga, excursión, simulacro…"></label>
    <div class="row" style="margin-top:12px"><button class="btn primary" data-a="desplazar-ok">Desplazar</button><button class="btn" data-a="close">Cancelar</button></div>`); },
  'desplazar-ok'() { const n = desplazar(UI.sesion, $('#desp-m').value.trim()); closeModal(); toast(`${n} ${n === 1 ? 'sesión desplazada' : 'sesiones desplazadas'}`); render(); },
  consinclase() { delete S.planes[UI.sesion]; touchPlan(UI.sesion); UI.sesTab = 'preparar'; render(); },
  addtareacierre() { const t = $('#c-tarea').value.trim(); if (!t) { $('#c-tarea').focus(); return; } const key = UI.sesion; guardarBorradorCierre();
    S.agenda.push({ id: uid(), titulo: t, tipo: 'tarea', grupoId: parseKey(key).grupoId, fecha: $('#c-tarea-f').value || '', hora: '', notas: '', done: false, comunicado: false, origen: key, recordar: { antes: true, mismo: true } });
    touch('agenda'); toast('Añadida a tu agenda'); UI.keepScroll = true; render(); setTimeout(() => $('#c-tarea')?.focus(), 0); },
  'cierre-estado'(el) { const p = plan(UI.sesion); if ($('#c-deberes')) { p.deberes = $('#c-deberes').value; if ($('#c-debpara')) p.deberesPara = $('#c-debpara').value; } p.cierre = Object.assign(p.cierre || {}, { estado: el.dataset.v, visto: $('#c-visto')?.value, dificultades: $('#c-dif')?.value, nota: $('#c-nota')?.value }); touchPlan(UI.sesion); UI.keepScroll = true; render(); },
  cerrar() {
    const key = UI.sesion; const p = plan(key); const { grupoId, fecha } = parseKey(key); const c = p.cierre || {};
    const estado = c.estado || 'completa'; const pend = $('#c-pend')?.value.trim() || '';
    p.deberes = $('#c-deberes').value.trim(); p.deberesPara = $('#c-debpara')?.value || ''; const deb = !!p.deberes;
    const prox = siguienteClase(grupoId, fecha), extra = { origen: key, creado: fecha };
    if (estado !== 'completa' && pend && c.pendAdded !== pend) { nuevaTareaClase(grupoId, 'Terminar: ' + pend, prox, extra); c.pendAdded = pend; }
    if (deb && p.deberes && c.debAdded !== p.deberes) { nuevaTareaClase(grupoId, 'Corregir deberes: ' + p.deberes, p.deberesPara ? parseKey(p.deberesPara).fecha || prox : prox, extra); c.debAdded = p.deberes; }
    p.cierre = Object.assign(c, { estado, visto: $('#c-visto').value.trim(), pendiente: pend, deberes: deb, dificultades: $('#c-dif').value.trim(), nota: $('#c-nota').value.trim(), hecho: true, en: todayStr() });
    touchPlan(key); touch('agenda'); toast('Guardado'); render();
  },
  addag() { const t = $('#ag-t').value.trim(); if (!t) { $('#ag-t').focus(); return; }
    S.agenda.push({ id: uid(), titulo: t, tipo: $('#ag-tipo').value, grupoId: $('#ag-g').value || null, fecha: UI.agModalDay, hora: $('#ag-h').value, notas: $('#ag-n').value.trim(), done: false, comunicado: false, recordar: { semana: $('#ag-r7').checked, tres: $('#ag-r3').checked, antes: $('#ag-r1').checked, mismo: $('#ag-r0').checked } });
    const vinc = vincularExamenAgenda(S.agenda[S.agenda.length - 1]);
    touch('agenda'); toast(vinc ? 'Apuntado y añadido a la sesión de ese día' : 'Apuntado'); UI.keepScroll = true; render(); refreshAgModal(); },
  revisardeberes() { UI.sesTab = 'directo'; UI.capa = 'deberes'; UI.liveMode = 'capa'; render(); },
  veract(el) { abrirCreador({}, el.dataset.id); },
  wordact(el) { const it = plan(UI.sesion).actividades.find(x => x.id === el.dataset.id); if (it?.creada) descargarWord(it.creada, el.dataset.v); },
  proyact(el) { const it = plan(UI.sesion).actividades.find(x => x.id === el.dataset.id); if (it?.creada) proyectarActividad(it.creada); },
  crset(el) { UI.cr[el.dataset.k] = el.dataset.v; crRender(); },
  crclose() { closeModal(); },
  crtab(el) { UI.cr.tab = el.dataset.v; crRender(); },
  crword(el) { descargarWord(UI.cr.res, el.dataset.v); },
  crproy() { proyectarActividad(UI.cr.res, UI.cr.tab === 'adaptada' ? 'adaptada' : 'enunciado'); },
  crsave() { guardarCreada(); },
  subiract(el) { UI.uploadList = 'act:' + el.dataset.id; $('#fileup').click(); },
  delactfile(el) { const p = plan(UI.sesion); const it = p.actividades.find(x => x.id === el.dataset.id); if (it?.archivo?.assetId && ARCH.assets) ARCH.assets.delete(it.archivo.assetId).catch(() => {}); delete it.archivo; touchPlan(UI.sesion); UI.keepScroll = true; render(); },
  delsol(el) { const p = plan(UI.sesion); const it = p.actividades.find(x => x.id === el.dataset.id); if (it) delete it.solucion; touchPlan(UI.sesion); UI.keepScroll = true; render(); },
  fuentes(el) { const k = UI.sesion + ':' + el.dataset.t; UI.fuentes[k] = !UI.fuentes[k]; UI.secOpen[UI.sesion + ':' + secDe(el.dataset.t)] = true; UI.keepScroll = true; render(); },
  bancoadd(el) { bancoAnadir(el.dataset.t, el.dataset.tema, +el.dataset.i); },
  usaresquema() { const p = plan(UI.sesion); p.explicacion = (p.explicacion ? p.explicacion.trimEnd() + '\n\n' : '') + p.sug.esquema; delete p.sug.esquema; touchPlan(UI.sesion); toast('Esquema añadido'); UI.keepScroll = true; render(); },
  descartar(el) { const p = plan(UI.sesion); if (p.sug) delete p.sug[el.dataset.t]; touchPlan(UI.sesion); UI.keepScroll = true; render(); },
  quitarsug(el) { const p = plan(UI.sesion); const { s: sc, c: ca } = el.dataset; const L = p.sug?.[sc]?.[ca]; if (!L) return; const [x] = L.splice(+el.dataset.i, 1); const rm = JSON.stringify(x);
    p.bancoUsado = (p.bancoUsado || []).filter(u => { const [tid, s2, c2, i2] = u.split(':'); if (s2 !== sc || c2 !== ca) return true; const t = BANCO.find(b => b.id === tid); return JSON.stringify(t?.[sc]?.[ca]?.[+i2]) !== rm; });
    touchPlan(UI.sesion); UI.keepScroll = true; render(); },
  usarsug(el) { const p = plan(UI.sesion); const t = el.dataset.t; const it = (p.sug?.[t] || []).find(x => x.id === el.dataset.id); if (!it) return;
    if (t === 'actividades') p.actividades.push({ id: uid(), texto: it.titulo + (it.descripcion ? ': ' + it.descripcion : '') + (it.minutos ? ` (${it.minutos} min)` : ''), tipo: ['Individual', 'Parejas', 'Grupo', 'Casa', 'Laboratorio', 'Campo'].includes(it.tipo) ? it.tipo : 'Individual' });
    else p.recursos.push({ id: uid(), t: it.titulo + (it.descripcion ? ' — ' + it.descripcion : ''), url: it.busqueda ? 'https://www.google.com/search?q=' + encodeURIComponent(it.busqueda) : '' });
    p.sug[t] = p.sug[t].filter(x => x.id !== it.id); touchPlan(UI.sesion); UI.keepScroll = true; render(); },
  subir(el) { UI.uploadList = el.dataset.list; $('#fileup').click(); },
  guardaridea(el) { const p = plan(UI.sesion); const g = grupo(parseKey(UI.sesion).grupoId);
    const tags = (p.etiquetas || '').split(',').map(x => x.trim()).filter(Boolean);
    const sec = el.closest('[data-sec]')?.dataset.sec; const apt = APT[sec] ? sec : apartadoIdea({ tipo: el.dataset.tipo });
    S.ideas.push({ id: uid(), creada: new Date().toISOString(), usos: [], titulo: '', texto: el.dataset.txt, tipo: el.dataset.tipo, apartado: apt, etiquetas: tags.length ? tags : [p.titulo].filter(Boolean), ambito: g?.nivel ? 'nivel' : 'todos', nivel: g?.nivel || null, url: '' });
    touch('ideas'); el.textContent = '✓ Guardada'; el.disabled = true; },
  addev(el) { const key = UI.sesion; const p = plan(key); const t = el.dataset.t;
    const next = sesionVecina(key, 1);
    const ev = { id: uid(), tipo: t, titulo: t === 'examen' ? ('Examen ' + (p.unidad || '')).trim() : '', fecha: t === 'entrega' ? (next?.fecha || addDays(parseKey(key).fecha, 7)) : '' };
    if (t === 'examen') { p.tituloPrevio = p.titulo; p.titulo = ev.titulo; }
    (p.eventos = p.eventos || []).push(ev); syncEvento(key, ev); touchPlan(key); toast(t === 'examen' ? 'Examen apuntado en la agenda' : 'Entrega apuntada en la agenda'); UI.keepScroll = true; render(); },
  delev(el) { const p = plan(UI.sesion); const ev0 = (p.eventos || []).find(e => e.id === el.dataset.id); if (ev0?.tipo === 'examen' && p.titulo === ev0.titulo) { p.titulo = p.tituloPrevio || ''; delete p.tituloPrevio; } p.eventos = (p.eventos || []).filter(e => e.id !== el.dataset.id); quitarEvento(el.dataset.id); touchPlan(UI.sesion); UI.keepScroll = true; render(); },
  delag(el) { if (UI.view === 'sesion' && UI.sesTab === 'cierre') guardarBorradorCierre(); const ag = S.agenda.find(a => a.id === el.dataset.id); if (ag?.planKey && S.planes[ag.planKey]) { const pp = S.planes[ag.planKey]; if (ag.tipo === 'examen' && pp.titulo === ag.titulo) { pp.titulo = pp.tituloPrevio || ''; delete pp.tituloPrevio; } S.planes[ag.planKey].eventos = (S.planes[ag.planKey].eventos || []).filter(e => e.id !== ag.eventoId); touchPlan(ag.planKey); }
    S.agenda = S.agenda.filter(a => a.id !== el.dataset.id); touch('agenda'); UI.keepScroll = true; render(); refreshAgModal(); },
  agday(el) { agModal(el.dataset.d); },
  agnav(el) { const d = +el.dataset.d; if (!d) UI.agMonth = todayStr(); else { const x = parseD(UI.agMonth || todayStr()); UI.agMonth = ymd(new Date(x.getFullYear(), x.getMonth() + d, 1)); } render(); },
  'agdone-toggle'() { UI.agShowDone = !UI.agShowDone; render(); },
  saveidea(el) {
    const t = $('#id-t').value.trim(), x = $('#id-x').value.trim(); if (!t && !x) { $('#id-x').focus(); return; }
    const apt = $('#id-apt').value; if (!apt) { toast('Elige para qué apartado de la sesión es la idea'); $('#id-apt').focus(); return; }
    const amb = $('#id-amb').value; const o = { titulo: t, texto: x, apartado: apt, url: $('#id-u').value.trim(), tipo: $('#id-tipo').value, etiquetas: $('#id-e').value.split(',').map(s => s.trim()).filter(Boolean),
      ambito: amb.startsWith('grupo:') ? 'grupo' : amb.startsWith('nivel:') ? 'nivel' : 'todos', grupoId: amb.startsWith('grupo:') ? amb.slice(6) : null, nivel: amb.startsWith('nivel:') ? amb.slice(6) : null };
    if (el.dataset.id) Object.assign(S.ideas.find(i => i.id === el.dataset.id), o); else S.ideas.push(Object.assign({ id: uid(), creada: new Date().toISOString(), usos: [] }, o));
    UI.editIdea = null; touch('ideas'); toast('Idea guardada'); render(); },
  editidea(el) { UI.editIdea = el.dataset.id; render(); $('#ideaform')?.scrollIntoView({ behavior: 'smooth', block: 'start' }); },
  canceledit() { UI.editIdea = null; render(); },
  delidea(el) { S.ideas = S.ideas.filter(i => i.id !== el.dataset.id); touch('ideas'); UI.keepScroll = true; render(); },
  expideas() { exportar({ tipo: 'banco-ideas', version: 1, exportado: new Date().toISOString(), ideas: S.ideas.map(({ grupoId, usos, ...i }) => ({ ...i, ambito: i.ambito === 'grupo' ? 'todos' : i.ambito })) }, 'banco-de-ideas'); },
  impideas() { UI.importMode = 'ideas'; $('#filein').click(); },
  recup(el) { const p = S.pendientes.find(x => x.id === el.dataset.id); p.recuperada = el.dataset.v === '1'; touch('pendientes'); UI.keepScroll = true; render(); },
  addpendal() { const n = $('#pd-n').value.trim(); if (!n) { $('#pd-n').focus(); return; } S.pendientes.push({ id: uid(), nombre: n, grupoActual: $('#pd-g').value.trim(), materia: $('#pd-m').value.trim(), recuperada: false, obs: '' }); touch('pendientes'); render(); },
  delpend(el) { S.pendientes = S.pendientes.filter(p => p.id !== el.dataset.id); touch('pendientes'); UI.keepScroll = true; render(); },
  nuevogrupo() { modal(`<h2>Nuevo grupo</h2><div class="stack" style="gap:10px">
    <label class="f">Nombre del grupo<input type="text" id="ng-n" placeholder="3.º ESO B"></label>
    <label class="f">Asignatura (decide las competencias en Calificaciones y las ideas del banco)${asigSelect('', 'id="ng-a"')}</label>
    <div class="fgrid"><label class="f">Nombre de la materia<input type="text" id="ng-m" value="Biología y Geología"></label><label class="f">Nivel<input type="text" id="ng-v" placeholder="3.º ESO"></label></div>
    <div><div class="label" style="margin-bottom:6px">Idioma de la asignatura</div><div class="row"><label class="check"><input type="radio" name="ng-i" value="es" checked>Castellano</label><label class="check"><input type="radio" name="ng-i" value="va">Valenciano</label></div>
    <p class="tiny muted" style="margin:4px 0 0">Los materiales para el alumnado se harán en este idioma; el menú sigue en castellano.</p></div>
    <div class="row"><button class="btn primary" data-a="nuevogrupo-ok">Crear grupo</button><button class="btn" data-a="close">Cancelar</button></div></div>`); setTimeout(() => $('#ng-n')?.focus(), 30); },
  'nuevogrupo-ok'() { const n = $('#ng-n').value.trim(); if (!n) { $('#ng-n').focus(); return; }
    const asg = $('#ng-a').value; if (!asg) { toast('Elige la asignatura del grupo'); $('#ng-a').focus(); return; }
    const g = { id: uid(), nombre: n, materia: asg === 'tutoria' && $('#ng-m').value.trim() === 'Biología y Geología' ? 'Tutoría' : $('#ng-m').value.trim(), nivel: $('#ng-v').value.trim() || ASIG[asg]?.nivel || '', asig: asg, idioma: document.querySelector('input[name="ng-i"]:checked')?.value || 'es', color: (GCOLORS.find(([c]) => !S.grupos.some(x => x.color === c)) || GCOLORS[S.grupos.length % GCOLORS.length])[0], alumnos: [] };
    S.grupos.push(g); touch('grupos'); closeModal(); UI.view = 'grupo'; UI.grupoId = g.id; UI.grupoTab = 'alumnado'; toast('Grupo creado'); render(); },
  gidioma(el) { grupo(UI.grupoId).idioma = el.dataset.v; touch('grupos'); UI.keepScroll = true; render(); },
  alnumerar() { const g = grupo(UI.grupoId); const hay = g.alumnos.some(a => a.num); const go = () => { g.alumnos.forEach((a, i) => { a.num = i + 1; }); touch('grupos'); UI.keepScroll = true; render(); toast('Números de lista puestos'); };
    if (!hay) return go(); modal(`<h2>¿Volver a numerar?</h2><p>Se sustituyen los números de lista actuales por 1–${g.alumnos.length} en el orden en que aparecen ahora.</p><div class="row"><button class="btn primary" data-a="alnumerarok">Numerar</button><button class="btn" data-a="close">Cancelar</button></div>`); UI._numerar = go; },
  alnumerarok() { closeModal(); UI._numerar?.(); UI._numerar = null; },
  alsinnum() { const g = grupo(UI.grupoId); g.alumnos.forEach(a => { delete a.num; }); ordenarAlumnos(g); touch('grupos'); UI.keepScroll = true; render(); toast('Vuelven al orden alfabético'); },
  addalumnos() { const g = grupo(UI.grupoId); const ls = $('#pastealumnos').value.split(/\r?\n/).map(s => s.replace(/\t/g, ' ').trim()).filter(Boolean); ls.forEach(n => g.alumnos.push(fijarNombre({ id: uid(), ...partirNombre(n), tags: [], obs: '' }))); ordenarAlumnos(g); touch('grupos'); toast(`${ls.length} alumnos añadidos`); render(); },
  delal(el) { const g = grupo(UI.grupoId); g.alumnos = g.alumnos.filter(a => a.id !== el.dataset.id); touch('grupos'); UI.keepScroll = true; render(); },
  alrecup(el) { const a = grupo(UI.grupoId).alumnos.find(x => x.id === el.dataset.id); a.pendRecuperada = el.dataset.v === '1'; touch('grupos'); UI.keepScroll = true; render(); },
  confirm(el) { UI.confirm = el.dataset.c; UI.keepScroll = true; render(); },
  cancel() { UI.confirm = null; UI.keepScroll = true; render(); },
  'delgrupo-ok'() { const id = UI.grupoId; S.grupos = S.grupos.filter(g => g.id !== id); S.config.horario = S.config.horario.filter(h => h.grupoId !== id);
    Object.keys(S.planes).filter(k => k.startsWith(id + '|')).forEach(k => { touchPlan(k); delete S.planes[k]; }); Object.keys(S.regs).filter(k => k.startsWith(id + '|')).forEach(k => { touchReg(k); delete S.regs[k]; });
    delete S.pendgrupo[id]; touch('grupos', 'config', 'pendgrupo'); UI.confirm = null; UI.view = 'grupos'; render(); },
  cfgadd(el) { const l = el.dataset.list; const o = l === 'franjas' ? { id: uid(), inicio: '', fin: '' } : l === 'festivos' ? { id: uid(), nombre: '', desde: '', hasta: '' } : { id: uid(), nombre: `${S.config.evaluaciones.length + 1}.ª evaluación`, fin: '' }; S.config[l].push(o); touch('config'); UI.keepScroll = true; render(); },
  cfgdel(el) { const l = el.dataset.list; S.config[l] = S.config[l].filter(x => x.id !== el.dataset.id); if (l === 'franjas') S.config.horario = S.config.horario.filter(h => h.franjaId !== el.dataset.id); touch('config'); UI.keepScroll = true; render(); },
  exportar() { const docs = {}; allDocIds().forEach(id => docs[id] = docData(id)); exportar({ tipo: 'cuaderno-docente', version: 1, exportado: new Date().toISOString(), docs }, 'biosofia'); },
  importar() { UI.importMode = 'todo'; $('#filein').click(); },
  'borrar-ok'() { borrarTodo(); },
  ejemplo() { cargarEjemplo(); },
  quitarejemplo() { const ids = S.grupos.filter(g => g.ejemplo).map(g => g.id); ids.forEach(id => { UI.grupoId = id; A['delgrupo-ok'](); }); S.agenda = S.agenda.filter(a => !a.ejemplo); S.ideas = S.ideas.filter(i => !i.ejemplo); S.pendientes = S.pendientes.filter(p => !p.ejemplo); touch('agenda', 'ideas', 'pendientes'); UI.view = 'ajustes'; toast('Datos de ejemplo eliminados'); render(); },
  'imp-ok'() { aplicarImport(); },
};
document.addEventListener('click', e => {
  const el = e.target.closest('[data-a]'); if (!el) return;
  if (el.tagName === 'A' || el.closest('summary')) e.preventDefault();
  const fn = A[el.dataset.a]; if (fn) fn(el, e);
});

/* ---------- campos (input/change) ---------- */
const Fd = {
  matmover2(el) { const f = matA().archivos.find(x => x.id === el.dataset.id); if (f) { f.carpeta = el.value || null; touch('materiales'); closeModal(); matRe(); toast('Movido'); } },
  plan(el) { const p = plan(UI.sesion); p[el.dataset.k] = el.value; touchPlan(UI.sesion); },
  cr(el) { const c = UI.cr; if (!c) return; const k = el.dataset.k; c[k] = el.type === 'checkbox' ? el.checked : el.type === 'number' ? Number(el.value) : el.value; if (el.type === 'checkbox' || el.tagName === 'SELECT') crRender(); },
  crres(el) { const c = UI.cr; if (c?.res) c.res[el.dataset.k] = el.value; },
  reglaform(el) { UI.reglaForm[el.dataset.k] = el.type === 'checkbox' ? el.checked : el.value; if (el.dataset.k === 'tipo') { UI.keepScroll = true; render(); } },
  reglaglobal(el) { reglasDe(grupo(UI.grupoId))[el.dataset.k] = el.checked; touch('grupos'); },
  planocfg(el) { const g = grupo(UI.grupoId); const v = Math.max(1, Math.min(12, parseInt(el.value) || 1)); g.plano[el.dataset.k] = v; limpiarPlano(g); touch('grupos'); UI.keepScroll = true; render(); },
  qtitle(el) { const p = plan(el.dataset.k); p.titulo = el.value; touchPlan(el.dataset.k); },
  qotros(el) { UI.qOtros = el.checked; render(); },
  pev(el) { const p = plan(UI.sesion); const ev = (p.eventos || []).find(e => e.id === el.dataset.id); if (ev) { if (ev.tipo === 'examen' && el.dataset.k === 'titulo' && p.titulo === ev.titulo) { p.titulo = el.value; const t = document.querySelector('input[data-f="plan"][data-k="titulo"]'); if (t) t.value = el.value; } ev[el.dataset.k] = el.value; syncEvento(UI.sesion, ev); touchPlan(UI.sesion); } },
  plist(el) { const p = plan(UI.sesion); const it = (p[el.dataset.list] || []).find(x => x.id === el.dataset.id); if (it) { it[el.dataset.k] = el.value; touchPlan(UI.sesion); } },
  pgdone(el) { const L = S.pendgrupo[el.dataset.g] || []; const it = L.find(x => x.id === el.dataset.id); if (it) { it.done = el.checked; it.doneEn = el.checked ? (el.dataset.k || todayStr()) : null; touch('pendgrupo'); } },
  agdone(el) { if (UI.view === 'sesion' && UI.sesTab === 'cierre') guardarBorradorCierre(); const a = S.agenda.find(x => x.id === el.dataset.id); if (a) { a.done = el.checked; a.doneEn = el.checked ? (el.dataset.k || todayStr()) : null; touch('agenda'); UI.keepScroll = true; setTimeout(() => { render(); refreshAgModal(); }, 150); } },
  comunicado(el) { const a = S.agenda.find(x => x.id === el.dataset.id); if (a) { a.comunicado = el.checked; touch('agenda'); } },
  alnum(el) { const a = grupo(UI.grupoId).alumnos.find(x => x.id === el.dataset.id); const n = parseInt(el.value, 10); if (n > 0) a.num = n; else delete a.num; touch('grupos'); },
  alnombre(el) { const a = grupo(UI.grupoId).alumnos.find(x => x.id === el.dataset.id); a[el.dataset.k] = el.value.trim(); a.nombre = [a.pila, a.apellidos].filter(Boolean).join(' '); touch('grupos'); },
  alpend(el) { const a = grupo(UI.grupoId).alumnos.find(x => x.id === el.dataset.id); const had = !!a.pendiente; a.pendiente = el.value.trim(); touch('grupos'); if (had !== !!a.pendiente) { UI.keepScroll = true; UI.refocus = el.dataset.id; } },
  alobs(el) { const a = grupo(UI.grupoId).alumnos.find(x => x.id === el.dataset.id); a.obs = el.value; touch('grupos'); },
  altag(el) { const a = grupo(UI.grupoId).alumnos.find(x => x.id === el.dataset.id); a.tags = a.tags || []; a.tags = el.checked ? [...new Set([...a.tags, el.dataset.t])] : a.tags.filter(t => t !== el.dataset.t); touch('grupos'); },
  gfield(el) { grupo(UI.grupoId)[el.dataset.k] = el.value; touch('grupos'); },
  gasig(el) { const g = grupo(UI.grupoId); g.asig = el.value; if (!g.nivel && ASIG[g.asig]?.nivel) g.nivel = ASIG[g.asig].nivel; if (S.cal[g.id]) calDe(g); if (g.asig !== 'tutoria' && UI.grupoTab === 'tutoria') UI.grupoTab = 'datos'; touch('grupos'); UI.keepScroll = true; render(); toast(g.asig === 'tutoria' ? 'Tutoría: este grupo no aparece en Calificaciones y tiene la pestaña Tutoría' : 'Asignatura guardada'); },
  tutal(el) { UI.tutAl = el.value; UI.keepScroll = true; render(); },
  tutf(el) { const g = grupo(UI.grupoId); const t = tutDe(g, UI.tutAl); const k = el.dataset.k; if (k === 'rep') { t.rep = el.value === '1'; touch('grupos'); UI.keepScroll = true; render(); return; } t[k] = el.value; touch('grupos'); },
  tutev(el) { const g = grupo(UI.grupoId); const t = tutDe(g, UI.tutAl); const ev = el.dataset.ev; t.ev[ev] = t.ev[ev] || {}; if (el.value === '') delete t.ev[ev][el.dataset.k]; else t.ev[ev][el.dataset.k] = Number(el.value); touch('grupos'); },
  tutr(el) { const g = grupo(UI.grupoId); const r = tutDe(g, UI.tutAl).reu.find(x => x.id === el.dataset.id); if (r) { r[el.dataset.k] = el.value; touch('grupos'); } },
  cecust(el) { const cal = calC(); const c = cal.custom?.ce[+el.dataset.i]; if (c) { c[1] = el.value; touchCal(UI.calG); } },
  crcust(el) { const cal = calC(); const cr = cal.custom?.ce[+el.dataset.i]?.[2][+el.dataset.j]; if (cr) { cr[1] = el.value; touchCal(UI.calG); } },
  gcolor(el) { grupo(UI.grupoId).color = el.value; touch('grupos'); UI.keepScroll = true; render(); },
  cfg(el) { S.config[el.dataset.k] = el.value; touch('config'); },
  cfglist(el) { const it = S.config[el.dataset.list].find(x => x.id === el.dataset.id); if (it) { it[el.dataset.k] = el.value; touch('config'); } },
  hor(el) { const d = +el.dataset.d, fr = el.dataset.fr; const H = S.config.horario; const h = H.find(x => x.dia === d && x.franjaId === fr);
    const v = el.value; const tipo = v.startsWith('o:') ? v.slice(2) : null; const gid = tipo ? null : v;
    if (!v) S.config.horario = H.filter(x => x !== h); else if (h) { h.grupoId = gid; h.tipo = tipo; } else H.push({ id: uid(), dia: d, franjaId: fr, grupoId: gid, tipo, aula: '' });
    touch('config'); UI.keepScroll = true; render(); },
  horaula(el) { const h = S.config.horario.find(x => x.dia === +el.dataset.d && x.franjaId === el.dataset.fr); if (h) { h.aula = el.value; touch('config'); } },
  peso(el) { const v = Number(el.value); if (Number.isNaN(v)) return; if (el.dataset.g) S.config.pesos[el.dataset.g][el.dataset.k] = v; else S.config.pesos[el.dataset.k] = v; touch('config'); },
  aviso(el) { S.config.avisos[el.dataset.k] = Number(el.value) || 7; touch('config'); },
  ideasq(el) { UI.ideasF.q = el.value; clearTimeout(UI.qT); UI.qT = setTimeout(() => { render(); const i = document.querySelector('[data-f="ideasq"]'); if (i) { i.focus(); i.setSelectionRange(i.value.length, i.value.length); } }, 250); },
  ideastipo(el) { UI.ideasF.tipo = el.value; render(); },
  ideasapt(el) { UI.ideasF.apt = el.value; render(); },
  biq(el) { if (!UI.bi) return; UI.bi.q = el.value; clearTimeout(UI.biT); UI.biT = setTimeout(() => { biModal(); const i = $('#bi-q'); if (i) { i.focus(); i.setSelectionRange(i.value.length, i.value.length); } }, 200); },
  bsel(el) { const S0 = UI.bsel[el.dataset.sk] || (UI.bsel[el.dataset.sk] = new Set()); if (el.checked) S0.add(el.dataset.v); else S0.delete(el.dataset.v); UI.keepScroll = true; render(); },
  bselcat(el) { const S0 = UI.bsel[el.dataset.sk] || (UI.bsel[el.dataset.sk] = new Set()); for (let i = 0; i < +el.dataset.n; i++) { const v = el.dataset.c + ':' + i; if (el.checked) S0.add(v); else S0.delete(v); } UI.keepScroll = true; render(); },
  bancotema(el) { const p = plan(UI.sesion); p.bancoTema = el.value; touchPlan(UI.sesion); UI.keepScroll = true; render(); },
  ideassin(el) { UI.ideasF.sin = el.checked; render(); },
  pendf(el) { UI.pendF = el.checked; render(); },
  pendobs(el) { const p = S.pendientes.find(x => x.id === el.dataset.id); if (p) { p.obs = el.value; touch('pendientes'); } },
};
const LIVE_RENDER = new Set(['cfglist']);
document.addEventListener('input', e => { const el = e.target.closest('[data-f]'); if (!el || el.dataset.f === 'planocfg') return; const t = el.type; if (['checkbox', 'radio'].includes(t) || el.tagName === 'SELECT') return; const fn = Fd[el.dataset.f]; if (fn) fn(el); });
document.addEventListener('change', e => { const el = e.target.closest('[data-f]'); if (!el) return; const fn = Fd[el.dataset.f]; if (!fn) return;
  if (['checkbox', 'radio'].includes(el.type) || el.tagName === 'SELECT' || el.dataset.f === 'planocfg') fn(el);
  else if (el.dataset.f === 'cfglist' && ['franjas', 'festivos'].includes(el.dataset.list)) { UI.franjasPend = true; }
  else if (el.dataset.f === 'plist' && el.dataset.k === 'min') { UI.keepScroll = true; render(); }
  else if (el.dataset.f === 'alpend') { UI.keepScroll = true; render(); }
  else if (['libu', 'liba', 'libt'].includes(el.dataset.f) && (el.dataset.f === 'libu' || el.dataset.k === 'titulo')) { UI.keepScroll = true; render(); }
  else if (el.dataset.f === 'alnum') { const gg = grupo(UI.grupoId); ordenarAlumnos(gg); touch('grupos'); UI.keepScroll = true; render(); }
  else if (el.dataset.f === 'alnombre') { ordenarAlumnos(grupo(UI.grupoId)); touch('grupos'); UI.keepScroll = true; render(); } });
document.addEventListener('dragstart', e => { const el = e.target.closest?.('[data-drag]'); if (el?.dataset.drag) { e.dataTransfer.setData('text/plain', el.dataset.drag); e.dataTransfer.effectAllowed = 'move'; } });
document.addEventListener('dragover', e => { const s = e.target.closest?.('.seat'); if (s) { e.preventDefault(); s.classList.add('drop'); } });
document.addEventListener('dragleave', e => { e.target.closest?.('.seat')?.classList.remove('drop'); });
document.addEventListener('drop', e => { const s = e.target.closest?.('.seat'); if (!s) return; e.preventDefault(); const id = e.dataTransfer.getData('text/plain'); const g = grupo(UI.grupoId); if (id && g?.plano) { moverAlumno(g, id, s.dataset.k); UI.planoSel = null; UI.keepScroll = true; render(); } });
document.addEventListener('toggle', e => { const d = e.target; if (d.dataset?.sec && UI.sesion) UI.secOpen[UI.sesion + ':' + d.dataset.sec] = d.open; if (d.dataset?.bcat) UI.bcatCerr[d.dataset.bcat] = !d.open; }, true);
$('#fileup').addEventListener('change', e => { const f = e.target.files[0]; e.target.value = ''; if (f && UI.uploadList) subirArchivo(f, UI.uploadList); });
/* las horas se reordenan al salir del campo, no mientras se escribe (si no, se pierde el segundo dígito) */
document.addEventListener('focusout', e => { const el = e.target;
  if (UI.franjasPend && ['franjas', 'festivos'].includes(el.dataset?.list)) { setTimeout(() => { const a = document.activeElement; if (a && a.dataset?.list === el.dataset.list) return; UI.franjasPend = false; UI.keepScroll = true; render(); }, 0); } });
document.addEventListener('keydown', e => { if (e.key === 'Escape') { if (document.querySelector('.projector')) A.cerrarproy(); else if (!UI.cr) closeModal(); } if (e.key === 'Enter' && e.target.id === 'newpend') A.addpend(); if (e.key === 'Enter' && e.target.id === 'c-tarea') A.addtareacierre(); if (e.key === 'Enter' && (e.target.id === 'ag-t' || e.target.id === 'ag-n')) A.addag();
  if (e.key === 'Enter') { const d = e.target.dataset?.f; if (d === 'matcren' || d === 'matfren') A.matrenok(); else if (e.target.id === 'mat-nc') A.matcarpetaok(); else if (e.target.id === 'mat-en' || e.target.id === 'mat-eu') A.matenlaceok(); else if (e.target.id === 'mat-an') A.matnuevaok(); } });

/* ---------- datos del alumnado: nube o solo este dispositivo ---------- */
document.addEventListener('change', async e => {
  const el = e.target; if (el.dataset?.nube !== 'alumnado') return;
  if (el.checked) {
    const borrar = confirm('Los datos del alumnado dejarán de sincronizarse en todos tus dispositivos: cada uno se quedará con la copia que tenga ahora.\n\n¿Borrar también las copias que ya estén en tu nube? (Aceptar = borrarlas, Cancelar = dejarlas)');
    await Nube.setAlumnadoLocal(true, borrar); toast('Datos del alumnado solo en este dispositivo');
  } else { await Nube.setAlumnadoLocal(false); toast('Subiendo los datos del alumnado a tu nube…'); }
  UI.keepScroll = true; render();
});


/* ---------- registro de inicios de sesión ---------- */
const fHoraR = t => { const d = new Date(t); return d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' }) + ' ' + d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }); };
const lineaRegistro = e => `${fHoraR(e.t)} · ${e.texto}${e.motivo ? ' (' + e.motivo + ')' : ''}${e.seg !== undefined ? ' · ventana de Google ' + String(e.seg).replace('.', ',') + ' s' : ''}${e.seg > 6 ? ' · ¿pidió correo o contraseña?' : ''}${e.permiso ? ' · permiso ' + e.permiso : ''}${e.error ? ' · ' + e.error : ''}`;
Object.assign(A, {
  async verregistro() {
    const L = await Nube.registro(); UI.regTexto = L.map(d => `== ${d.disp}${d.este ? ' (este)' : ''} ==\n` + [...(d.eventos || [])].reverse().map(lineaRegistro).join('\n')).join('\n\n');
    const imp = e => ['entrar', 'caducado', 'renovar-fallo'].includes(e.tipo) || e.seg > 6;
    modal(`<div class="row between"><h2 style="margin:0">Registro de inicios de sesión</h2><button class="iconbtn" data-a="close" aria-label="Cerrar">✕</button></div>
      <p class="small muted">Cada vez que la app pide entrar o renovar el permiso de Google, y por qué. Si te vuelve a pedir el correo o la contraseña, copia el registro y envíaselo a quien te ayuda con la app.</p>
      <div class="stack" style="max-height:55vh;overflow:auto">${L.map(d => `<div><div class="label" style="margin:6px 0">${esc(d.disp)}${d.este ? ' · este dispositivo' : ''}</div>
        ${(d.eventos || []).length ? `<div class="list small">${[...d.eventos].reverse().slice(0, 80).map(e => `<div class="li" style="${imp(e) ? 'background:var(--warn-soft);border-radius:6px;padding:6px 8px' : ''}"><span class="grow">${esc(lineaRegistro(e))}</span></div>`).join('')}</div>` : '<p class="empty">Sin anotaciones.</p>'}</div>`).join('')}</div>
      <div class="row" style="margin-top:12px"><button class="btn primary" data-a="copiaregistro">Copiar el registro</button><button class="btn" data-a="close">Cerrar</button></div>`);
  },
  copiaregistro() { navigator.clipboard?.writeText(UI.regTexto || '').then(() => toast('Registro copiado'), () => toast('No se ha podido copiar')); },
});

