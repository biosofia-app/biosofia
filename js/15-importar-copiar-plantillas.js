'use strict';
/* ===== IMPORTAR INSTRUMENTOS DE EVALUACIÓN de otro grupo o de una plantilla (cursos anteriores) ===== */
const evIdx = ev => evals().findIndex(e => e.id === ev);
/* copia de la definición de un instrumento, sin notas, con su categoría y evaluación «portables» */
function instrPortable(cal, ins) {
  const H = hojas(cal); const c = JSON.parse(JSON.stringify(ins)); delete c.notas; delete c.rub; delete c.ejemplo;
  c._path = H.find(h => h.n.id === ins.nodo)?.path || ''; c._evIdx = evIdx(ins.ev);
  if (String(ins.recupera || '').startsWith('ev:')) c._recEvIdx = evIdx(ins.recupera.slice(3));
  return c;
}
function instrFuentes(gidDest) {
  const F = [];
  S.grupos.filter(g => g.id !== gidDest && !esTutoria(g) && (S.cal[g.id]?.instr || []).length).forEach(g => F.push({ k: 'g:' + g.id, nombre: g.nombre, sub: 'grupo de este curso' }));
  (S.plantillas || []).filter(t => t.instr?.lista?.length).forEach(t => F.push({ k: 'p:' + t.id, nombre: t.nombre, sub: 'plantilla · ' + (t.origen || '') }));
  return F;
}
function instrDeFuente(k) {
  if (k.startsWith('g:')) { const g = grupo(k.slice(2)); const cal = S.cal[g?.id]; if (!cal) return null; return { curr: cal.curr || '', lista: (cal.instr || []).filter(i => !i.ejemplo || true).map(i => instrPortable(cal, i)), mismoCurso: true }; }
  const t = (S.plantillas || []).find(x => x.id === k.slice(2)); return t?.instr ? { curr: t.instr.curr || '', lista: t.instr.lista, mismoCurso: false } : null;
}
const normPath = s => words(s || '');
function nodoDestino(H, path, fallback) {
  const p = normPath(path); const hoja = p.split(' › ').pop();
  return (H.find(h => normPath(h.path) === p) || H.find(h => normPath(h.n.nombre) === normPath((path || '').split(' › ').pop())) || {}).n?.id || fallback;
}
function importarInstrumentos(gDest, src, ids, opt) {
  const cal = calDe(gDest); const H = hojas(cal); const E = evals(); const mapa = {}; let sinCrit = 0, sinCat = 0;
  const lista = src.lista.filter(i => ids.includes(i.id));
  lista.forEach(i => { mapa[i.id] = uid(); });
  const critOk = c => !!critTexto(cal, c);
  lista.forEach(i => {
    const nodo = nodoDestino(H, i._path, null); if (!nodo) sinCat++;
    const ev = opt.ev === 'mismo' ? (E[i._evIdx]?.id || E[E.length - 1].id) : opt.ev;
    const crit = (i.crit || []).filter(x => critOk(x.c)); const items = JSON.parse(JSON.stringify(i.items || [])).map(it => ({ ...it, id: it.id, crit: (it.crit || []).filter(critOk) }));
    if (crit.length < (i.crit || []).length || items.some((it, k) => it.crit.length < ((i.items[k] || {}).crit || []).length)) sinCrit++;
    let recupera = '';
    if (String(i.recupera || '').startsWith('ev:')) recupera = 'ev:' + (opt.ev === 'mismo' ? (E[i._recEvIdx]?.id || ev) : ev);
    else if (i.recupera && mapa[i.recupera]) recupera = mapa[i.recupera];
    const n = { id: mapa[i.id], nombre: i.nombre, nodo: nodo || opt.nodoDef, ev, fecha: src.mismoCurso && opt.fechas ? (i.fecha || '') : '', modo: i.modo || 'directa', peso: i.peso ?? 1, crit, items, notas: {}, rub: {},
      recupera, recModo: i.recModo || 'sustituye', recTope: i.recTope ?? '' };
    if (String(recupera).startsWith('ev:')) n.ev = recupera.slice(3);
    cal.instr.push(n);
  });
  touchCal(gDest.id); return { n: lista.length, sinCrit, sinCat };
}
function impModal() {
  const g = calG(); const cal = calDe(g); const F = instrFuentes(g.id); const D = UI.imp = Object.assign({ src: F[0]?.k || '', ev: 'mismo', sel: null, fechas: true }, UI.imp || {});
  if (!F.some(f => f.k === D.src)) { D.src = F[0]?.k || ''; D.sel = null; }
  const src = D.src ? instrDeFuente(D.src) : null; const H = hojas(cal); const E = evals();
  const yaHay = new Set((cal.instr || []).map(i => words(i.nombre)));
  if (src && !D.sel) D.sel = src.lista.filter(i => !yaHay.has(words(i.nombre))).map(i => i.id);
  if (!D.nodoDef || !H.some(h => h.n.id === D.nodoDef)) D.nodoDef = H[0]?.n.id;
  const mismoCurr = src && (src.curr || '') === (cal.curr || '');
  const porEv = {}; (src?.lista || []).forEach(i => { const k = i._evIdx; (porEv[k] = porEv[k] || []).push(i); });
  const sinCoinc = (src?.lista || []).filter(i => D.sel.includes(i.id) && !nodoDestino(H, i._path, null)).length;
  modal(`<h2>Importar instrumentos de evaluación</h2>
    <p class="small muted" style="margin-top:0">Copia a ${gchip(g)} instrumentos de otro grupo (por ejemplo, de 1.º A a 1.º B) o de una plantilla de un curso anterior: nombre, categoría, peso, criterios, rúbrica (con sus niveles y notas libres) y recuperaciones. <b>No se copian notas.</b> Las plantillas de planificación guardan también los instrumentos del grupo.</p>
    ${!F.length ? '<p class="empty">No hay otros grupos con instrumentos ni plantillas con instrumentos.</p><div class="row"><button class="btn" data-a="close">Cerrar</button></div>' : `
    <div class="fgrid"><label class="f">Copiar de<select data-f="impsrc">${F.map(f => `<option value="${f.k}" ${f.k === D.src ? 'selected' : ''}>${esc(f.nombre)} (${esc(f.sub)})</option>`).join('')}</select></label>
      <label class="f">Evaluación<select data-f="impev"><option value="mismo" ${D.ev === 'mismo' ? 'selected' : ''}>La misma (1.ª → 1.ª, 2.ª → 2.ª…)</option>${E.map(e => `<option value="${e.id}" ${D.ev === e.id ? 'selected' : ''}>Todos a ${esc(e.nombre)}</option>`).join('')}</select></label></div>
    ${!mismoCurr ? `<div class="alert warn" style="margin-top:10px">El currículo es distinto: solo se mantienen los criterios que también existen en este grupo; los demás tendrás que vincularlos de nuevo.</div>` : ''}
    <div class="stack" style="gap:10px;margin:12px 0">${Object.keys(porEv).sort((a, b) => a - b).map(k => `<div><div class="label">${esc(E[k]?.nombre || 'Evaluación ' + (Number(k) + 1))}</div>
      ${porEv[k].map(i => `<label class="check small" style="display:flex;margin:4px 0"><input type="checkbox" data-f="impsel" value="${i.id}" ${D.sel.includes(i.id) ? 'checked' : ''}><span><b>${esc(i.nombre)}</b> <span class="tiny muted">${esc(i._path || '')} · ${i.modo === 'rubrica' ? 'rúbrica' : 'nota directa'}${i.recupera ? ' · recuperación' : ''}${yaHay.has(words(i.nombre)) ? ' · ya hay uno con este nombre' : ''}${nodoDestino(H, i._path, null) ? '' : ' · ⚠ categoría sin equivalente'}</span></span></label>`).join('')}</div>`).join('')}</div>
    ${sinCoinc ? `<label class="f" style="max-width:340px">Categoría para los ${sinCoinc} que no tienen equivalente<select data-f="impnodo">${H.map(h => `<option value="${h.n.id}" ${h.n.id === D.nodoDef ? 'selected' : ''}>${esc(h.path)}</option>`).join('')}</select></label>` : ''}
    ${src?.mismoCurso ? `<label class="check small" style="margin-top:8px"><input type="checkbox" data-f="impfechas" ${D.fechas ? 'checked' : ''}>Mantener las fechas</label>` : ''}
    <div class="row" style="margin-top:12px"><button class="btn primary" data-a="impok" ${D.sel.length ? '' : 'disabled'}>Importar ${D.sel.length} instrumento${D.sel.length === 1 ? '' : 's'}</button><button class="btn" data-a="close">Cancelar</button></div>`}`, true, 'wide');
}
Object.assign(A, {
  impabrir() { const cal = calC(); if (!hojas(cal).length) { toast('Crea primero una categoría en Configuración'); return; } UI.imp = null; impModal(); },
  impok() { const g = calG(); const D = UI.imp; const src = instrDeFuente(D.src); if (!src) return; const r = importarInstrumentos(g, src, D.sel, D);
    UI.imp = null; closeModal(); calRe(); toast(`${r.n} instrumento${r.n === 1 ? '' : 's'} importado${r.n === 1 ? '' : 's'}${r.sinCrit ? ` · revisa los criterios de ${r.sinCrit}` : ''}`); }
});
Object.assign(Fd, {
  impsrc(el) { UI.imp.src = el.value; UI.imp.sel = null; impModal(); },
  impev(el) { UI.imp.ev = el.value; impModal(); },
  impnodo(el) { UI.imp.nodoDef = el.value; },
  impfechas(el) { UI.imp.fechas = el.checked; },
  impsel(el) { const s = new Set(UI.imp.sel); el.checked ? s.add(el.value) : s.delete(el.value); UI.imp.sel = [...s]; impModal(); }
});

/* ===== COPIAR UNA SESIÓN ENTRE GRUPOS (misma asignatura en 1.º A, 1.º B…) ===== */
/* se copia TODO lo preparado (también lo añadido desde el banco: consejos, motivar…, que vive en «sug»); solo se quita lo propio de esa clase concreta */
const CP_FUERA = ['cierre', 'deberesPara', 'resumenInicio', 'sinClase', 'motivo', 'notaAnterior', 'plantillaDe', 'copiadaDe'];
function copiarSesion(srcKey, dstKey) {
  const src = S.planes[srcKey]; if (!src) return;
  const prev = S.planes[dstKey];
  if (prev?.eventos?.length) { const ids = new Set(prev.eventos.map(e => e.id)); S.agenda = S.agenda.filter(a => !(a.planKey === dstKey && ids.has(a.eventoId))); touch('agenda'); }
  const np = JSON.parse(JSON.stringify(src)); CP_FUERA.forEach(k => delete np[k]);
  np.eventos = (np.eventos || []).map(e => ({ ...e, id: uid() })); if (!np.eventos.length) delete np.eventos;
  np.copiadaDe = srcKey; S.planes[dstKey] = np; (np.eventos || []).forEach(ev => syncEvento(dstKey, ev)); touchPlan(dstKey);
}
const cpTit = p => words(p?.titulo || '');
function cpFila(o, p, btn) {
  const g = grupo(parseKey(o.key).grupoId); const ns = numSesion(o.key);
  const extra = [p?.unidad, (p?.actividades || []).length ? `${p.actividades.length} act.` : '', (p?.eventos || []).some(e => e.tipo === 'examen') ? '📝 examen' : ''].filter(Boolean).join(' · ');
  return `<div class="li" style="flex-wrap:wrap;gap:8px"><div class="grow" style="min-width:200px">${gchip(g)} <span class="small">${fShort(o.fecha)}${ns ? ` · sesión ${ns.n}` : ''}</span><div><b>${esc(p?.titulo || 'Sin planificar')}</b>${extra ? ` <span class="tiny muted">${esc(extra)}</span>` : ''}</div></div>${btn}</div>`;
}
/* traer: lista de sesiones planificadas de otros grupos */
function copiarDeModal() {
  const key = UI.cpKey; const { grupoId, fecha } = parseKey(key); const g = grupo(grupoId);
  const misTit = new Set(Object.keys(S.planes).filter(k => k.startsWith(grupoId + '|')).map(k => cpTit(S.planes[k])).filter(Boolean));
  const otros = S.grupos.filter(x => x.id !== grupoId && !esTutoria(x));
  const filtro = UI.cpG && otros.some(x => x.id === UI.cpG) ? UI.cpG : '';
  let L = []; otros.filter(x => !filtro || x.id === filtro).forEach(x => ocurrencias(x.id, addDays(fecha, -45), addDays(fecha, 45)).forEach(o => { const p = S.planes[o.key]; if (tienePlan(p)) L.push({ o, p, misma: !!g.asig && x.asig === g.asig, hecha: misTit.has(cpTit(p)) }); }));
  const d = o => Math.abs(diffDays(fecha, o.fecha));
  L.sort((a, b) => (b.misma - a.misma) || (a.hecha - b.hecha) || (a.hecha ? d(a.o) - d(b.o) : a.o.fecha.localeCompare(b.o.fecha)));
  L = L.slice(0, 40);
  const tiene = tienePlan(S.planes[key]);
  modal(`<h2>Copiar una sesión de otro grupo</h2>
    <p class="small muted" style="margin-top:0">Para ${gchip(g)} el ${fShort(fecha)}. Se copia todo lo preparado (guion, explicación, actividades, recursos, deberes y exámenes); no se copian el cierre ni los registros. Arriba salen las sesiones de grupos de la misma asignatura que <b>todavía no has usado</b> en este grupo.</p>
    ${tiene ? `<div class="alert warn" style="margin-bottom:10px">Esta sesión ya tiene contenido: al copiar se sustituirá.</div>` : ''}
    <label class="f" style="max-width:260px;margin-bottom:10px">Grupo<select data-f="cpg"><option value="">Todos</option>${otros.map(x => `<option value="${x.id}" ${filtro === x.id ? 'selected' : ''}>${esc(x.nombre)}</option>`).join('')}</select></label>
    ${L.length ? `<div class="list">${L.map(({ o, p, hecha }) => cpFila(o, p, `${hecha ? '<span class="tiny muted">ya usada aquí</span>' : ''}<button class="btn sm ${hecha ? 'ghost' : 'primary'}" data-a="cpde" data-k="${esc(o.key)}">Copiar aquí</button>`)).join('')}</div>`
      : '<p class="empty">No hay sesiones planificadas en otros grupos en las semanas cercanas.</p>'}
    <div class="row" style="margin-top:12px"><button class="btn" data-a="close">Cerrar</button></div>`, true, 'wide');
}
/* llevar: elegir la clase del otro grupo donde copiarla */
function copiarAModal() {
  const key = UI.cpKey; const { grupoId, fecha } = parseKey(key); const g = grupo(grupoId); const p = S.planes[key];
  const otros = S.grupos.filter(x => x.id !== grupoId && !esTutoria(x)).sort((a, b) => (b.asig === g.asig) - (a.asig === g.asig));
  const gid = otros.some(x => x.id === UI.cpG) ? UI.cpG : otros[0]?.id; UI.cpG = gid;
  const occ = gid ? ocurrencias(gid, addDays(fecha, -7), addDays(fecha, 45)).filter(o => !S.planes[o.key]?.sinClase) : [];
  const primera = occ.find(o => o.fecha >= fecha && !tienePlan(S.planes[o.key])) || occ.find(o => !tienePlan(S.planes[o.key]));
  modal(`<h2>Copiar «${esc(p?.titulo || 'esta sesión')}» a otro grupo</h2>
    <p class="small muted" style="margin-top:0">Elige el grupo y la clase. Se copia todo lo preparado (guion, explicación, actividades, recursos, deberes y exámenes), no el cierre ni los registros.</p>
    <label class="f" style="max-width:260px;margin-bottom:10px">Grupo<select data-f="cpg2">${otros.map(x => `<option value="${x.id}" ${x.id === gid ? 'selected' : ''}>${esc(x.nombre)}${g.asig && x.asig !== g.asig ? ' (otra asignatura)' : ''}</option>`).join('')}</select></label>
    ${occ.length ? `<div class="list">${occ.map(o => { const q = S.planes[o.key]; const lleno = tienePlan(q);
      return cpFila(o, q, UI.confirm === 'cpa' + o.key ? `<span class="small">¿Sustituir lo que tiene?</span><button class="btn sm danger" data-a="cpa" data-k="${esc(o.key)}">Sustituir</button><button class="btn sm" data-a="cpacancel">No</button>`
        : `<button class="btn sm ${o === primera ? 'primary' : lleno ? 'ghost' : ''}" data-a="${lleno ? 'cpaconf' : 'cpa'}" data-k="${esc(o.key)}">${lleno ? 'Sustituir…' : 'Copiar aquí'}</button>`); }).join('')}</div>`
      : `<p class="empty">${otros.length ? 'Ese grupo no tiene clases en estas semanas.' : 'No tienes otros grupos.'}</p>`}
    <div class="row" style="margin-top:12px"><button class="btn" data-a="close">Cerrar</button></div>`, true, 'wide');
}
Object.assign(A, {
  cpdeabrir() { UI.cpKey = UI.sesion; UI.cpG = ''; copiarDeModal(); },
  cpaabrir() { UI.cpKey = UI.sesion; UI.cpG = null; UI.confirm = null; copiarAModal(); },
  cpde(el) { copiarSesion(el.dataset.k, UI.cpKey); closeModal(); UI.keepScroll = true; render(); toast(`Copiada de ${grupo(parseKey(el.dataset.k).grupoId)?.nombre || 'otro grupo'}`); },
  cpaconf(el) { UI.confirm = 'cpa' + el.dataset.k; copiarAModal(); },
  cpacancel() { UI.confirm = null; copiarAModal(); },
  cpa(el) { const k = el.dataset.k; copiarSesion(UI.cpKey, k); UI.confirm = null; closeModal(); UI.keepScroll = true; render(); toast(`Copiada a ${grupo(parseKey(k).grupoId)?.nombre || 'otro grupo'} (${fShort(parseKey(k).fecha)})`); }
});
Object.assign(Fd, {
  cpg(el) { UI.cpG = el.value; copiarDeModal(); },
  cpg2(el) { UI.cpG = el.value; UI.confirm = null; copiarAModal(); }
});

/* ===== PLANTILLAS DE PLANIFICACIÓN =====
   Guardan la secuencia de sesiones de un grupo SIN fechas (sesión 1, 2, 3…) y se aplican
   a otro grupo desde una fecha, sesión a sesión por sus clases, aunque el horario sea otro. */
const PL_FUERA = ['cierre', 'deberesPara', 'resumenInicio', 'sinClase', 'motivo', 'notaAnterior', 'plantillaDe', 'copiadaDe'];
const tienePlan = p => !!p && !p.sinClase && !!((p.titulo || '').trim() || (p.explicacion || '').trim() || (p.actividades || []).length || (p.bloques || []).length || (p.recursos || []).length || (p.eventos || []).length || (p.ideasFijadas || []).length || (p.motivarNotas || '').trim() || (p.consejosNotas || '').trim() || Object.keys(p.sug || {}).length);
function sesionParaPlantilla(p) {
  const c = JSON.parse(JSON.stringify(p)); PL_FUERA.forEach(k => delete c[k]);
  c.eventos = (c.eventos || []).filter(e => e.tipo === 'examen').map(e => ({ ...e, fecha: '' }));
  if (!c.eventos.length) { delete c.eventos; delete c.tituloPrevio; }
  const nota = [p.cierre?.nota, p.cierre?.dificultades ? 'Dificultades: ' + p.cierre.dificultades : ''].filter(x => (x || '').trim()).join(' · ');
  if (nota) c.notaAnterior = nota;
  return c;
}
function sesionesGuardables(gid, desde, hasta) { return ocurrencias(gid, desde, hasta).filter(o => !S.planes[o.key]?.sinClase); }
function plDestino(gid, desde) { return ocurrencias(gid, desde, cursoRango()[1]).filter(o => !S.planes[o.key]?.sinClase); }
function plantillasModal() {
  const L = S.plantillas || []; const gs = S.grupos.filter(g => !esTutoria(g)); const [ini, fin] = cursoRango();
  const g0 = gs.find(g => g.id === UI.plG) || gs[0]; UI.plG = g0?.id;
  const occ = g0 ? sesionesGuardables(g0.id, ini, fin) : []; const conPlan = occ.filter(o => tienePlan(S.planes[o.key])).length;
  const nomDef = g0 ? `${ASIG[g0.asig]?.nombre || g0.materia || g0.nombre} · ${S.config.curso || (ini || '').slice(0, 4)}` : '';
  modal(`<h2>Plantillas de planificación</h2>
    <p class="small muted" style="margin-top:0">Una plantilla guarda la planificación de un grupo <b>sin fechas</b>: sesión 1, sesión 2, sesión 3… Al aplicarla a otro grupo, la sesión 1 va a su primera clase, la 2 a la segunda, y así, <b>aunque el horario sea distinto</b>. Se saltan los festivos y las clases marcadas «no hay clase». Las plantillas se guardan aparte y no se borran al borrar el grupo.</p>
    <div class="panel stack" style="margin:0 0 14px"><h3 style="margin:0">Guardar la planificación de un grupo</h3>
      ${gs.length ? `<div class="fgrid"><label class="f">Grupo<select id="pl-g" data-f="plg">${gs.map(g => `<option value="${g.id}" ${g.id === g0.id ? 'selected' : ''}>${esc(g.nombre)}</option>`).join('')}</select></label>
      <label class="f">Nombre de la plantilla<input type="text" id="pl-n" value="${esc(nomDef)}"></label></div>
      <p class="small" style="margin:0">${occ.length} clases en el curso · <b>${conPlan}</b> con algo planificado${(S.cal[g0?.id]?.instr || []).length ? ` · ${S.cal[g0.id].instr.length} instrumentos de evaluación (se guardan también, sin notas)` : ''}. Se guardan en orden desde la primera sesión planificada hasta la última (también las vacías intermedias, para no descolocar la secuencia), sin las marcadas «no hay clase».</p>
      <div class="row"><button class="btn primary" data-a="plguardar" ${conPlan ? '' : 'disabled'}>Guardar como plantilla</button></div>` : '<p class="empty">No tienes grupos.</p>'}</div>
    <h3>Tus plantillas</h3>
    ${L.length ? `<div class="list">${L.map(t => `<div class="li" style="flex-wrap:wrap;gap:8px"><div class="grow" style="min-width:180px"><b>${esc(t.nombre)}</b><div class="tiny muted">${t.sesiones.length} sesiones (${t.sesiones.filter(tienePlan).length} con contenido)${t.instr?.lista?.length ? ` · ${t.instr.lista.length} instrumentos de evaluación` : ''} · de ${esc(t.origen || '')} · ${fShort(t.creada.slice(0, 10))}</div></div>
      ${UI.confirm === 'pldel' + t.id ? `<span class="small">¿Borrar la plantilla?</span><button class="btn sm danger" data-a="plborrarok" data-id="${t.id}">Borrar</button><button class="btn sm" data-a="plcancel">No</button>`
        : `<button class="btn sm primary" data-a="plaplicar" data-id="${t.id}">Aplicar a un grupo…</button><button class="btn sm ghost" data-a="plborrar" data-id="${t.id}" aria-label="Borrar plantilla">🗑</button>`}</div>`).join('')}</div>` : '<p class="empty small">Todavía no has guardado ninguna.</p>'}
    <div class="row" style="margin-top:14px"><button class="btn" data-a="close">Cerrar</button></div>`, true, 'wide');
}
function plAplicarModal() {
  const t = (S.plantillas || []).find(x => x.id === UI.plT); if (!t) return plantillasModal();
  const gs = S.grupos.filter(g => !esTutoria(g)).sort((a, b) => (b.asig === t.asig) - (a.asig === t.asig));
  const D = UI.plA = Object.assign({ g: gs[0]?.id, desde: S.config.inicio || todayStr(), que: 'todo', modo: 'vacias' }, UI.plA || {});
  if (!gs.some(g => g.id === D.g)) D.g = gs[0]?.id;
  const dest = D.g ? plDestino(D.g, D.desde) : []; const n = Math.min(dest.length, t.sesiones.length);
  const ocup = dest.slice(0, n).filter((o, i) => tienePlan(S.planes[o.key]) && tienePlan(t.sesiones[i])).length;
  const ultima = n ? dest[n - 1].fecha : '';
  const aviso = !dest.length ? `<div class="alert warn">Este grupo no tiene clases desde esa fecha. Revisa su horario en Ajustes.</div>`
    : `<div class="alert ${t.sesiones.length > dest.length ? 'warn' : 'info'}"><span class="grow">La plantilla tiene <b>${t.sesiones.length}</b> sesiones y el grupo tiene <b>${dest.length}</b> clases desde el ${fShort(D.desde)} hasta fin de curso. Se ocupan ${n} clases (hasta el ${fShort(ultima)}).
      ${t.sesiones.length > dest.length ? `<br><b>Faltan ${t.sesiones.length - dest.length} clases</b>: las últimas ${t.sesiones.length - dest.length} sesiones de la plantilla no caben.` : dest.length > t.sesiones.length ? `<br>Quedan ${dest.length - t.sesiones.length} clases libres al final.` : ''}
      ${ocup ? `<br>${ocup === 1 ? '1 de esas clases ya tiene' : ocup + ' de esas clases ya tienen'} algo planificado: ${D.modo === 'vacias' ? (ocup === 1 ? 'se deja como está.' : 'se dejan como están.') : `<b>${ocup === 1 ? 'se sustituirá' : 'se sustituirán'}</b>.`}` : ''}</span></div>`;
  modal(`<h2>Aplicar «${esc(t.nombre)}»</h2>
    <div class="fgrid"><label class="f">Grupo<select data-f="plset" data-k="g">${gs.map(g => `<option value="${g.id}" ${g.id === D.g ? 'selected' : ''}>${esc(g.nombre)}${!t.asig || g.asig === t.asig ? '' : ' (otra asignatura)'}</option>`).join('')}</select></label>
    <label class="f">Empezar el<input type="date" value="${D.desde}" data-f="plset" data-k="desde"></label></div>
    <div class="stack" style="gap:6px;margin:12px 0"><div class="label">Qué copiar</div><div class="seg"><button data-a="plopt" data-k="que" data-v="todo" aria-pressed="${D.que === 'todo'}">Sesión completa</button><button data-a="plopt" data-k="que" data-v="titulos" aria-pressed="${D.que === 'titulos'}">Solo títulos y unidad</button></div>
      <div class="label" style="margin-top:6px">Clases que ya tienen algo</div><div class="seg"><button data-a="plopt" data-k="modo" data-v="vacias" aria-pressed="${D.modo === 'vacias'}">Dejarlas como están</button><button data-a="plopt" data-k="modo" data-v="todo" aria-pressed="${D.modo === 'todo'}">Sustituirlas</button></div></div>
    ${aviso}
    <p class="tiny muted">Los exámenes se apuntan solos en la agenda con su nueva fecha. Las entregas, los deberes «para» una sesión concreta y los cierres no se copian. Si una sesión tenía una nota «para el curso que viene», aparecerá al prepararla.</p>
    <div class="row"><button class="btn primary" data-a="plaplicarok" ${n ? '' : 'disabled'}>Aplicar</button><button class="btn" data-a="plantillas">Volver</button></div>`, true, 'wide');
}
function aplicarPlantilla(t, D) {
  const dest = plDestino(D.g, D.desde); let hechas = 0, saltadas = 0;
  t.sesiones.forEach((src, i) => { const o = dest[i]; if (!o || !tienePlan(src)) return;
    const prev = S.planes[o.key];
    if (tienePlan(prev) && D.modo === 'vacias') { saltadas++; return; }
    if (prev?.eventos?.length) { const ids = new Set(prev.eventos.map(e => e.id)); S.agenda = S.agenda.filter(a => !(a.planKey === o.key && ids.has(a.eventoId))); touch('agenda'); }
    if (D.que === 'titulos') { delete S.planes[o.key]; const np = plan(o.key); np.titulo = src.tituloPrevio || src.titulo || ''; np.unidad = src.unidad || ''; }
    else { const np = JSON.parse(JSON.stringify(src)); np.eventos = (np.eventos || []).map(e => ({ ...e, id: uid() })); if (!np.eventos.length) delete np.eventos;
      if (np.notaAnterior) np.plantillaDe = t.nombre; S.planes[o.key] = np; (np.eventos || []).forEach(ev => syncEvento(o.key, ev)); }
    touchPlan(o.key); hechas++; });
  return { hechas, saltadas };
}
Object.assign(A, {
  plantillas() { UI.confirm = null; plantillasModal(); },
  plguardar() { const g = grupo(UI.plG); if (!g) return; const [ini, fin] = cursoRango();
    const ses = sesionesGuardables(g.id, ini, fin).map(o => S.planes[o.key] ? sesionParaPlantilla(S.planes[o.key]) : { titulo: '' });
    while (ses.length && !tienePlan(ses[ses.length - 1])) ses.pop();
    while (ses.length && !tienePlan(ses[0])) ses.shift(); // empieza en la primera sesión planificada
    const nombre = ($('#pl-n')?.value || '').trim() || g.nombre;
    const cal = S.cal[g.id]; const instr = cal && (cal.instr || []).length ? { curr: cal.curr || '', lista: cal.instr.map(i => instrPortable(cal, i)) } : null;
    (S.plantillas = S.plantillas || []).unshift({ id: uid(), nombre, asig: g.asig || '', nivel: g.nivel || '', origen: `${g.nombre}${S.config.curso ? ' · ' + S.config.curso : ''}`, creada: new Date().toISOString(), sesiones: ses, ...(instr ? { instr } : {}) });
    touch('plantillas'); toast(`Plantilla guardada: ${ses.length} sesiones${instr ? ` y ${instr.lista.length} instrumentos de evaluación` : ''}`); plantillasModal(); },
  plborrar(el) { UI.confirm = 'pldel' + el.dataset.id; plantillasModal(); },
  plcancel() { UI.confirm = null; plantillasModal(); },
  plborrarok(el) { S.plantillas = (S.plantillas || []).filter(t => t.id !== el.dataset.id); UI.confirm = null; touch('plantillas'); toast('Plantilla borrada'); plantillasModal(); },
  plaplicar(el) { UI.plT = el.dataset.id; UI.plA = null; plAplicarModal(); },
  plopt(el) { UI.plA[el.dataset.k] = el.dataset.v; plAplicarModal(); },
  plaplicarok() { const t = (S.plantillas || []).find(x => x.id === UI.plT); if (!t) return; const r = aplicarPlantilla(t, UI.plA);
    closeModal(); UI.keepScroll = true; render(); toast(`Plantilla aplicada: ${r.hechas} sesiones${r.saltadas ? ` · ${r.saltadas === 1 ? '1 clase ya planificada se ha dejado' : r.saltadas + ' clases ya planificadas se han dejado'}` : ''}`); },
  notaantx() { const p = plan(UI.sesion); delete p.notaAnterior; delete p.plantillaDe; touchPlan(UI.sesion); UI.keepScroll = true; render(); }
});
Object.assign(Fd, {
  plg(el) { UI.plG = el.value; plantillasModal(); },
  plset(el) { if (!el.value) return; UI.plA[el.dataset.k] = el.value; plAplicarModal(); }
});

/* sincronización con otras copias abiertas (otra pestaña, el móvil…) */
function aplicarDoc(id, data) {
  if (Save.dirty.has(id)) return false; // tengo cambios propios sin guardar: mandan los míos
  const nuevo = data ? JSON.stringify(data) : null; if (nuevo === JSON.stringify(docData(id))) return false;
  if (id === 'config') { S.config = Object.assign(DEFAULT_CONFIG(), data || {}); S.config.pesos = Object.assign(DEFAULT_CONFIG().pesos, S.config.pesos || {}); }
  else if (['grupos', 'agenda', 'ideas', 'pendientes'].includes(id)) { S[id] = data?.list || []; if (id === 'grupos') S.grupos.forEach(g => { g.alumnos.forEach(normAlumno); ordenarAlumnos(g); }); }
  else if (id === 'pendgrupo') S.pendgrupo = data?.map || {};
  else if (id === 'materiales') S.materiales = normMat(data);
  else if (id === 'plantillas') S.plantillas = data?.list || [];
  else if (id.startsWith('libro_')) { if (data && data.id) S.libros[id.slice(6)] = data; else delete S.libros[id.slice(6)]; }
  else if (id.startsWith('cal_')) { if (data && data.arbol) S.cal[id.slice(4)] = data; else delete S.cal[id.slice(4)]; }
  else if (id.startsWith('plan_') || id.startsWith('reg_')) { const src = id.startsWith('plan_') ? S.planes : S.regs; const wk = id.slice(id.indexOf('_') + 1);
    Object.keys(src).forEach(k => { if (mondayOf(k.split('|')[1]) === wk) delete src[k]; }); Object.assign(src, data?.map || {}); }
  else return false;
  return true;
}
function refrescarRemoto() {
  const escribiendo = document.activeElement?.matches?.('input,textarea,select') || $('#modal').innerHTML;
  if (escribiendo) { UI.remotoPend = true; return; } UI.keepScroll = true; render(); toast('Actualizado con cambios de otro dispositivo');
}
document.addEventListener('focusout', () => { if (UI.remotoPend) setTimeout(() => { if (!document.activeElement?.matches?.('input,textarea,select') && !$('#modal').innerHTML) { UI.remotoPend = false; UI.keepScroll = true; render(); } }, 300); });
function escucharCambios() {
  Nube.alCambiar = (id, data) => { if (aplicarDoc(id, data)) refrescarRemoto(); };
}
