'use strict';
/* ---------- tutoría: ficha por alumno (solo grupos con asignatura «Tutoría») ---------- */
const TUT_TIPOS = ['Presencial', 'Telefónica', 'Videollamada', 'Correo', 'Plataforma del centro'];
const TUT_CON = ['Familia', 'Alumno/a', 'Familia y alumno/a', 'Orientación', 'Equipo docente', 'Otros'];
function tutDe(g, aid) { g.tutoria = g.tutoria || {}; const t = g.tutoria[aid] || (g.tutoria[aid] = { rep: false, repCurso: '', opt: '', rel: '', obs: '', ev: {}, reu: [] }); t.ev = t.ev || {}; t.reu = t.reu || []; return t; }
const alLista = a => a.apellidos ? a.apellidos + ', ' + (a.pila || '') : a.nombre;
function tabTutoria(g) {
  if (!g.alumnos.length) return `<div class="panel empty">Añade primero los alumnos del grupo en la pestaña Alumnado.</div>`;
  const aid = g.alumnos.some(a => a.id === UI.tutAl) ? UI.tutAl : g.alumnos[0].id; UI.tutAl = aid;
  const t = tutDe(g, aid); const evs = evals(); const idx = g.alumnos.findIndex(a => a.id === aid);
  const num = (k, e) => `<input type="number" min="0" ${k === 'med' ? 'max="10" step="0.01"' : 'step="1"'} value="${esc(t.ev[e.id]?.[k] ?? '')}" data-f="tutev" data-ev="${e.id}" data-k="${k}" style="width:84px" aria-label="${k === 'sus' ? 'Suspensos' : k === 'med' ? 'Nota media' : 'Sobresalientes'} · ${esc(e.nombre)}">`;
  const reu = [...t.reu].sort((x, y) => (y.fecha || '').localeCompare(x.fecha || ''));
  const opts = (L, v) => L.map(o => `<option ${v === o ? 'selected' : ''}>${esc(o)}</option>`).join('');
  const ficha = `<div class="panel stack">
      <div class="row" style="align-items:flex-end"><label class="f" style="flex:1;min-width:220px">Alumno<select data-f="tutal">${g.alumnos.map(a => `<option value="${a.id}" ${a.id === aid ? 'selected' : ''}>${esc(alLista(a))}</option>`).join('')}</select></label>
        <button class="btn sm" data-a="tutnav" data-d="-1" ${idx === 0 ? 'disabled' : ''} aria-label="Alumno anterior">‹</button><button class="btn sm" data-a="tutnav" data-d="1" ${idx === g.alumnos.length - 1 ? 'disabled' : ''} aria-label="Alumno siguiente">›</button></div>
      <div class="fgrid"><label class="f">Optativa<input type="text" value="${esc(t.opt)}" data-f="tutf" data-k="opt" placeholder="LABCA, Francés…"></label>
        <label class="f">Religión / Atención educativa<select data-f="tutf" data-k="rel"><option value="">—</option><option value="R" ${t.rel === 'R' ? 'selected' : ''}>Religión</option><option value="AE" ${t.rel === 'AE' ? 'selected' : ''}>Atención educativa</option></select></label>
        <label class="f">Repetidor<select data-f="tutf" data-k="rep"><option value="">No</option><option value="1" ${t.rep ? 'selected' : ''}>Sí</option></select></label>
        ${t.rep ? `<label class="f">Curso que repite<input type="text" value="${esc(t.repCurso)}" data-f="tutf" data-k="repCurso" placeholder="3.º ESO"></label>` : ''}</div>
      <label class="f">Observaciones (perfil, dificultades, medidas)<textarea rows="5" data-f="tutf" data-k="obs">${esc(t.obs)}</textarea></label>
      <div><div class="label" style="margin-bottom:6px">Resultados por evaluación</div><div class="tablewrap"><table class="data"><tr><th></th>${evs.map(e => `<th>${esc(e.nombre)}</th>`).join('')}</tr>
        ${[['sus', 'Suspensos'], ['med', 'Nota media'], ['sob', 'Sobresalientes']].map(([k, lab]) => `<tr><td>${lab}</td>${evs.map(e => `<td>${num(k, e)}</td>`).join('')}</tr>`).join('')}</table></div></div></div>`;
  const reuniones = `<div class="panel stack"><div class="row between"><h3 style="margin:0">Reuniones y comunicaciones</h3><button class="btn sm primary" data-a="tutreu">+ Añadir</button></div>
      ${reu.length ? reu.map(r => `<div class="tutreu stack" style="gap:6px"><div class="row"><input type="date" value="${esc(r.fecha || '')}" data-f="tutr" data-id="${r.id}" data-k="fecha" style="width:auto" aria-label="Fecha">
        <select data-f="tutr" data-id="${r.id}" data-k="tipo" style="width:auto" aria-label="Tipo">${opts(TUT_TIPOS, r.tipo)}</select><select data-f="tutr" data-id="${r.id}" data-k="con" style="width:auto" aria-label="Con quién">${opts(TUT_CON, r.con)}</select>
        <button class="iconbtn" data-a="tutreudel" data-id="${r.id}" aria-label="Borrar reunión">✕</button></div>
        <textarea rows="3" data-f="tutr" data-id="${r.id}" data-k="tema" placeholder="Tema y acuerdos">${esc(r.tema || '')}</textarea></div>`).join('') : '<p class="empty">Sin reuniones apuntadas con este alumno o su familia.</p>'}</div>`;
  const ult = x => (x.reu || []).map(r => r.fecha).filter(Boolean).sort().pop();
  const resumen = `<div class="panel" style="margin-top:16px"><h3>Resumen del grupo</h3><div class="tablewrap"><table class="data"><tr><th>Alumno</th><th>Rep.</th><th>Optativa</th><th>R / AE</th><th>Reuniones</th><th>Último contacto</th>${evs.map(e => `<th>Susp. ${esc(e.nombre)}</th>`).join('')}</tr>
      ${g.alumnos.map(a => { const x = (g.tutoria || {})[a.id] || {}; const u = ult(x); return `<tr style="${a.id === aid ? 'background:var(--accent-soft)' : ''}"><td><button class="alname" data-a="tutsel" data-id="${a.id}">${esc(alLista(a))}</button></td><td>${x.rep ? pill('warn', 'Sí' + (x.repCurso ? ' · ' + x.repCurso : '')) : ''}</td><td>${esc(x.opt || '')}</td><td>${esc(x.rel || '')}</td><td class="num">${(x.reu || []).length || ''}</td><td>${u ? fShort(u) : ''}</td>${evs.map(e => { const v = x.ev?.[e.id]?.sus; return `<td class="num">${v === undefined ? '' : v >= 3 ? `<span style="color:var(--bad);font-weight:700">${v}</span>` : v}</td>`; }).join('')}</tr>`; }).join('')}</table></div>
      <p class="tiny muted" style="margin:8px 0 0">Datos privados del tutor: no se usan en otras pantallas.</p></div>`;
  return `<div class="cols">${ficha}${reuniones}</div>${resumen}`;
}
/* ---------- plano de clase ---------- */
const MESA_TIPOS = [[1, 'Individual'], [2, 'Parejas'], [3, 'Tríos'], [4, 'Grupos de 4'], [5, 'Grupos de 5'], [6, 'Grupos de 6']];
function planoDefecto(g) { const n = Math.max(1, g.alumnos.length); return { filas: Math.max(1, Math.ceil(n / 6)), mesasFila: 3, tam: 2, asientos: {} }; }
function moverAlumno(g, id, k) { const pl = g.plano; const de = Object.keys(pl.asientos).find(x => pl.asientos[x] === id); const ocupa = pl.asientos[k]; if (de) { if (ocupa) pl.asientos[de] = ocupa; else delete pl.asientos[de]; } else if (ocupa) { /* el que estaba se queda sin sitio */ } pl.asientos[k] = id; touch('grupos'); }
function asientosOrden(pl) { const out = []; for (let f = 0; f < pl.filas; f++) for (let m = 0; m < pl.mesasFila; m++) for (let s = 0; s < pl.tam; s++) out.push(`${f}-${m}-${s}`); return out; }
function limpiarPlano(g) { const pl = g.plano; const valid = new Set(asientosOrden(pl)); const ids = new Set(g.alumnos.map(a => a.id)); const vistos = new Set();
  Object.keys(pl.asientos).forEach(k => { const id = pl.asientos[k]; if (!valid.has(k) || !ids.has(id) || vistos.has(id)) delete pl.asientos[k]; else vistos.add(id); }); }
function planoHTML(g, seat) {
  const pl = g.plano; const alumno = id => g.alumnos.find(a => a.id === id);
  return `<div class="plano"><div class="pizarra">Pizarra · mesa del profesor</div>
    ${Array.from({ length: pl.filas }, (_, f) => `<div class="pfila">${Array.from({ length: pl.mesasFila }, (_, m) => `<div class="pmesa" style="grid-template-columns:repeat(${pl.tam > 3 ? Math.ceil(pl.tam / 2) : pl.tam},max-content)">${Array.from({ length: pl.tam }, (_, s2) => { const k = `${f}-${m}-${s2}`; const a = alumno(pl.asientos[k]); return seat(a, k); }).join('')}</div>`).join('')}</div>`).join('')}</div>`;
}
/* ---------- Sugerencia de sitios: condicionantes y preferencias ---------- */
const REGLA_TIPOS = { delante: 'Sentar delante', detras: 'Sentar en la última fila', separar: 'Separar de', juntos: 'Sentar junto a', fijo: 'Mantener su sitio actual' };
const PESOS = { 3: 'Alta', 2: 'Media', 1: 'Baja' };
function reglasDe(g) { return g.planoReglas || (g.planoReglas = { cond: [], pref: [], etiquetasDelante: true, noRepetir: true, mezclar: false }); }
function textoRegla(g, r) {
  const n = id => esc(g.alumnos.find(a => a.id === id)?.nombre || '¿?');
  if (r.tipo === 'separar') return `Separar a <b>${n(r.a)}</b> y <b>${n(r.b)}</b>${r.lejos ? ' (ni siquiera cerca)' : ' (distinta mesa)'}`;
  if (r.tipo === 'juntos') return `<b>${n(r.a)}</b> junto a <b>${n(r.b)}</b> (misma mesa)`;
  if (r.tipo === 'delante') return `<b>${n(r.a)}</b> ${r.filas > 1 ? 'en las ' + r.filas + ' primeras filas' : 'en la primera fila'}`;
  if (r.tipo === 'detras') return `<b>${n(r.a)}</b> en la última fila`;
  if (r.tipo === 'fijo') return `<b>${n(r.a)}</b> mantiene su sitio actual`;
  return '';
}
function panelReglas(g) {
  const R = reglasDe(g); const f = UI.reglaForm || (UI.reglaForm = { clase: 'cond', tipo: 'separar', a: '', b: '', filas: 1, lejos: false, peso: 2 });
  const opts = sel => `<option value="">— alumno —</option>${g.alumnos.map(a => `<option value="${a.id}" ${sel === a.id ? 'selected' : ''}>${esc(a.nombre)}</option>`).join('')}`;
  const lista = (clase) => (R[clase] || []).length ? `<div class="list">${R[clase].map(r => `<div class="li small"><span class="grow">${textoRegla(g, r)}${clase === 'pref' ? ` <span class="tag">${PESOS[r.peso || 2]}</span>` : ''}</span><button class="iconbtn" data-a="delregla" data-c="${clase}" data-id="${r.id}" aria-label="Quitar">✕</button></div>`).join('')}</div>` : `<p class="empty">${clase === 'cond' ? 'Ninguno.' : 'Ninguna.'}</p>`;
  return `<div class="panel stack"><div class="row between"><h3 style="margin:0">Sugerir sitios</h3><button class="btn primary" data-a="sugerirsitios">Sugerir sitios</button></div>
    <div class="cols" style="grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:16px">
      <div><div class="label" style="color:var(--bad)">Condicionantes · se cumplen sí o sí</div>${lista('cond')}</div>
      <div><div class="label" style="color:var(--ok)">Preferencias · mejor si se cumplen</div>${lista('pref')}
        <div class="stack" style="gap:4px;margin-top:6px">
          <label class="check small"><input type="checkbox" data-f="reglaglobal" data-k="etiquetasDelante" ${R.etiquetasDelante ? 'checked' : ''}>Alumnado con TDAH, TEA, dislexia, ACIS, PT, nouvingut o nivel adaptado, delante</label>
          <label class="check small"><input type="checkbox" data-f="reglaglobal" data-k="noRepetir" ${R.noRepetir ? 'checked' : ''}>Que no repitan compañero de mesa del plano actual</label>
          <label class="check small"><input type="checkbox" data-f="reglaglobal" data-k="mezclar" ${R.mezclar ? 'checked' : ''}>Mezclar niveles en cada mesa (según la nota de trabajo en clase)</label></div></div>
    </div>
    <div class="sugbox" style="background:var(--surface-2);border-color:var(--line)"><div class="label">Añadir regla</div>
      <div class="row"><div class="seg">${[['cond', 'Condicionante'], ['pref', 'Preferencia']].map(([v, t]) => `<button data-a="reglaset" data-k="clase" data-v="${v}" aria-pressed="${f.clase === v}">${t}</button>`).join('')}</div>
        <select data-f="reglaform" data-k="tipo" style="width:auto">${Object.entries(REGLA_TIPOS).map(([k, t]) => `<option value="${k}" ${f.tipo === k ? 'selected' : ''}>${t}</option>`).join('')}</select></div>
      <div class="row"><select data-f="reglaform" data-k="a" style="flex:1;min-width:170px">${opts(f.a)}</select>
        ${['separar', 'juntos'].includes(f.tipo) ? `<span class="small muted">${f.tipo === 'separar' ? 'y' : 'con'}</span><select data-f="reglaform" data-k="b" style="flex:1;min-width:170px">${opts(f.b)}</select>` : ''}
        ${f.tipo === 'delante' ? `<select data-f="reglaform" data-k="filas" style="width:auto"><option value="1" ${f.filas == 1 ? 'selected' : ''}>1.ª fila</option><option value="2" ${f.filas == 2 ? 'selected' : ''}>2 primeras filas</option></select>` : ''}
        ${f.tipo === 'separar' ? `<label class="check small"><input type="checkbox" data-f="reglaform" data-k="lejos" ${f.lejos ? 'checked' : ''}>Tampoco cerca</label>` : ''}
        ${f.clase === 'pref' ? `<select data-f="reglaform" data-k="peso" style="width:auto">${[3, 2, 1].map(p => `<option value="${p}" ${f.peso == p ? 'selected' : ''}>Importancia ${PESOS[p].toLowerCase()}</option>`).join('')}</select>` : ''}
        <button class="btn sm" data-a="addregla">Añadir</button></div></div>
    <p class="tiny muted" style="margin:0">La sugerencia la calcula la propia app probando miles de combinaciones: no se envía ningún nombre fuera.</p></div>`;
}
/* optimizador: recocido simulado con intercambios de sitio */
function sugerirSitios(g, semilla) {
  const pl = g.plano; const R = reglasDe(g); const sitios = asientosOrden(pl); const N = g.alumnos.length;
  if (sitios.length < N) return { error: 'Hay menos sitios que alumnos: añade filas o mesas.' };
  const pos = k => { const [f, m, s] = k.split('-').map(Number); return { f, m, s }; };
  const P = sitios.map(pos); const ids = g.alumnos.map(a => a.id); const idx = Object.fromEntries(ids.map((id, i) => [id, i]));
  const mismaMesa = (x, y) => P[x].f === P[y].f && P[x].m === P[y].m;
  const cerca = (x, y) => mismaMesa(x, y) || (P[x].f === P[y].f && Math.abs(P[x].m - P[y].m) === 1) || (P[x].m === P[y].m && Math.abs(P[x].f - P[y].f) === 1);
  const segu = R.mezclar ? seguimiento(g.id) : {}; const notas = ids.map(id => segu[id]?.trabajoClase ?? null);
  const media = (() => { const v = notas.filter(x => x !== null); return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null; })();
  const prevPares = new Set(); if (R.noRepetir) { const porMesa = {}; Object.entries(pl.asientos).forEach(([k, id]) => { const p = pos(k); (porMesa[p.f + '-' + p.m] = porMesa[p.f + '-' + p.m] || []).push(id); }); Object.values(porMesa).forEach(l => l.forEach(a => l.forEach(b => { if (a < b) prevPares.add(a + '|' + b); }))); }
  const etiq = ids.map(id => (g.alumnos.find(a => a.id === id).tags || []).some(t => TAGS_DELANTE.includes(t)));
  const fijoSeat = {}; [...R.cond, ...R.pref].filter(r => r.tipo === 'fijo').forEach(r => { const k = Object.keys(pl.asientos).find(k => pl.asientos[k] === r.a); if (k) fijoSeat[r.a] = sitios.indexOf(k); });
  const evalRegla = (r, seatOf) => { const a = idx[r.a], b = idx[r.b]; if (a === undefined) return true; const sa = seatOf[a];
    if (r.tipo === 'delante') return P[sa].f < (r.filas || 1);
    if (r.tipo === 'detras') return P[sa].f === pl.filas - 1;
    if (r.tipo === 'fijo') return fijoSeat[r.a] === undefined || sa === fijoSeat[r.a];
    if (b === undefined) return true; const sb = seatOf[b];
    if (r.tipo === 'separar') return !(r.lejos ? cerca(sa, sb) : mismaMesa(sa, sb));
    if (r.tipo === 'juntos') return mismaMesa(sa, sb); return true; };
  const coste = seatOf => {
    let c = 0; R.cond.forEach(r => { if (!evalRegla(r, seatOf)) c += 1000; });
    R.pref.forEach(r => { if (!evalRegla(r, seatOf)) c += 10 * (r.peso || 2); });
    if (R.etiquetasDelante) ids.forEach((_, i) => { if (etiq[i]) c += 4 * Math.max(0, P[seatOf[i]].f - 0); });
    if (R.noRepetir && prevPares.size) for (let i = 0; i < N; i++) for (let j = i + 1; j < N; j++) if (mismaMesa(seatOf[i], seatOf[j])) { const k = ids[i] < ids[j] ? ids[i] + '|' + ids[j] : ids[j] + '|' + ids[i]; if (prevPares.has(k)) c += 6; }
    if (R.mezclar && media !== null) { const mesas = {}; ids.forEach((_, i) => { if (notas[i] !== null) { const p = P[seatOf[i]]; (mesas[p.f + '-' + p.m] = mesas[p.f + '-' + p.m] || []).push(notas[i]); } }); Object.values(mesas).forEach(l => { if (l.length > 1) c += 3 * Math.abs(l.reduce((a, b) => a + b, 0) / l.length - media); }); }
    ids.forEach((_, i) => { c += 0.3 * P[seatOf[i]].f; }); // llenar primero las filas de delante
    return c; };
  let rnd = semilla || 1; const rand = () => (rnd = (rnd * 1103515245 + 12345) % 2147483648) / 2147483648;
  let mejor = null, mejorC = Infinity;
  for (let rep = 0; rep < 4; rep++) {
    const libres = sitios.map((_, i) => i).sort(() => rand() - .5); let seatOf = ids.map((_, i) => libres[i]); let ocup = new Set(seatOf);
    let c = coste(seatOf); let T = 50;
    for (let it = 0; it < 6000; it++) {
      const i = Math.floor(rand() * N); const nuevo = seatOf.slice();
      if (rand() < 0.7) { const j = Math.floor(rand() * N); if (i === j) continue; [nuevo[i], nuevo[j]] = [nuevo[j], nuevo[i]]; }
      else { const vacios = sitios.map((_, k) => k).filter(k => !ocup.has(k)); if (!vacios.length) continue; nuevo[i] = vacios[Math.floor(rand() * vacios.length)]; }
      const nc = coste(nuevo);
      if (nc <= c || rand() < Math.exp((c - nc) / T)) { seatOf = nuevo; c = nc; ocup = new Set(seatOf); }
      T = Math.max(0.05, T * 0.9985);
    }
    if (c < mejorC) { mejorC = c; mejor = seatOf; }
  }
  const asientos = {}; mejor.forEach((s, i) => { asientos[sitios[s]] = ids[i]; });
  const fallanCond = R.cond.filter(r => !evalRegla(r, mejor)); const fallanPref = R.pref.filter(r => !evalRegla(r, mejor));
  return { asientos, fallanCond, fallanPref, totalPref: R.pref.length };
}
function modalSitios(g, res) {
  const tmp = { ...g, plano: { ...g.plano, asientos: res.asientos } };
  modal(`<h2>Propuesta de sitios</h2>
    ${res.fallanCond.length ? `<div class="alert bad" style="margin-bottom:8px"><span class="grow"><b>No se pueden cumplir todos los condicionantes</b> con estas mesas:<br>${res.fallanCond.map(r => textoRegla(g, r)).join('<br>')}</span></div>` : `<div class="alert info" style="margin-bottom:8px">✓ Se cumplen todos los condicionantes.</div>`}
    ${res.totalPref ? `<p class="small" style="margin:0 0 8px">Preferencias cumplidas: <b>${res.totalPref - res.fallanPref.length} de ${res.totalPref}</b>${res.fallanPref.length ? `<br><span class="muted">Sin cumplir: ${res.fallanPref.map(r => textoRegla(g, r)).join(' · ')}</span>` : ''}</p>` : ''}
    <div style="overflow-x:auto">${planoHTML(tmp, a => `<div class="seat ${a ? '' : 'empty'}" style="cursor:default">${a ? `${esc(a.pila || a.nombre)}<span class="tg">${esc(a.apellidos || '')}</span>` : ''}</div>`)}</div>
    <div class="row between" style="margin-top:12px"><button class="btn" data-a="sugerirsitios">Otra propuesta</button><div class="row"><button class="btn" data-a="close">Cancelar</button><button class="btn primary" data-a="aplicarsitios">Aplicar</button></div></div>`, false, 'wide');
}

const alNombre = (g, id) => g.alumnos.find(a => a.id === id)?.nombre || '¿?';

function guardarBorradorCierre() { const p = plan(UI.sesion); if (!$('#c-visto')) return; if ($('#c-deberes')) { p.deberes = $('#c-deberes').value; if ($('#c-debpara')) p.deberesPara = $('#c-debpara').value; } p.cierre = Object.assign(p.cierre || {}, { visto: $('#c-visto').value, pendiente: $('#c-pend')?.value ?? p.cierre?.pendiente, dificultades: $('#c-dif').value, nota: $('#c-nota').value }); touchPlan(UI.sesion); }
function tabCierre(key, g) {
  const p = plan(key); const c = p.cierre || {};
  return `<div class="panel stack" style="max-width:760px">
    <p class="small muted" style="margin:0">El cierre es opcional. Si no rellenas nada, la sesión se da por dada completa, sin deberes ni observaciones.</p>
    <div><div class="label" style="margin-bottom:6px">¿Hasta dónde llegaste?</div><div class="seg">${[['completa', 'Completa'], ['parcial', 'Parcial'], ['nada', 'No se pudo dar']].map(([v, t]) => `<button data-a="cierre-estado" data-v="${v}" aria-pressed="${(c.estado || 'completa') === v}">${t}</button>`).join('')}</div></div>
    <label class="f">Qué se ha visto (será el resumen al empezar la próxima sesión)<textarea id="c-visto" rows="3">${esc(c.visto ?? [p.titulo, p.objetivos].filter(Boolean).join(': '))}</textarea></label>
    ${(c.estado || 'completa') !== 'completa' ? `<label class="f">Qué queda pendiente (pasa como pendiente a la siguiente sesión)<textarea id="c-pend" rows="2">${esc(c.pendiente || '')}</textarea></label>` : ''}
    <div class="stack" style="gap:6px"><label class="f">Deberes que se mandan<textarea id="c-deberes" rows="2">${esc(p.deberes || '')}</textarea></label>
      <label class="f" style="max-width:460px">Son para la sesión del<select id="c-debpara">${opcionesDeberes(key, p.deberesPara)}</select></label>
      <p class="tiny muted" style="margin:0">Se recordarán al inicio de esa sesión, no necesariamente la siguiente.</p></div>
    <div class="stack" style="gap:6px"><div class="label">Tareas pendientes de esta clase (van a tu agenda)</div>
      ${S.agenda.filter(a => a.origen === key).map(a => `<div class="row"><input type="checkbox" data-f="agdone" data-id="${a.id}" ${a.done ? 'checked' : ''} aria-label="Hecha"><span class="grow" style="${a.done ? 'text-decoration:line-through;opacity:.6' : ''}">${esc(a.titulo)}</span><span class="small muted">${a.fecha ? fShort(a.fecha) : ''}</span><button class="iconbtn" data-a="delag" data-id="${a.id}" aria-label="Borrar">✕</button></div>`).join('')}
      <div class="row"><input type="text" id="c-tarea" placeholder="Llamar a la familia de…, devolver exámenes, traer material…" style="flex:1;min-width:200px"><input type="date" id="c-tarea-f" value="${esc(sesionVecina(key, 1)?.fecha || addDays(parseKey(key).fecha, 1))}" style="width:auto" aria-label="Fecha"><button class="btn sm" data-a="addtareacierre">Añadir</button></div></div>
    <label class="f">¿Algo les ha costado o ha salido algún error conceptual?<textarea id="c-dif" rows="2">${esc(c.dificultades || '')}</textarea></label>
    <label class="f">Nota para el curso que viene<textarea id="c-nota" rows="2" placeholder="Esta actividad funcionó muy bien; sobró tiempo…">${esc(c.nota || '')}</textarea></label>
    <div class="row"><button class="btn primary" data-a="cerrar">Guardar</button></div></div>`;
}

