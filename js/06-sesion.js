'use strict';
/* ===== SESIÓN ===== */
VIEWS.sesion = () => {
  const key = UI.sesion; const { grupoId, fecha, franjaId } = parseKey(key); const g = grupo(grupoId); const f = franja(franjaId);
  if (!g || !f) { UI.view = 'hoy'; return VIEWS.hoy(); }
  const h = S.config.horario.find(x => x.grupoId === grupoId && x.franjaId === franjaId && x.dia === dow(fecha));
  const ns = numSesion(key); const p = S.planes[key]; const t = UI.sesTab = tabNorm(UI.sesTab);
  const prev = sesionCronologica(key, -1), next = sesionCronologica(key, 1);
  const gPrev = sesionVecina(key, -1), gNext = sesionVecina(key, 1);
  const tituloDe = o => { const q = S.planes[o.key]; return q?.sinClase ? 'Sin clase' : (q?.titulo || 'Sin planificar'); };
  let body = '';
  if (p?.sinClase) body = `<div class="panel stack"><h3>Sin clase</h3><p>${esc(p.motivo || '')}</p><div class="row"><button class="btn" data-a="consinclase">Volver a marcarla como clase</button></div></div>`;
  else if (t === 'clase') body = tabClase(key, g, f);
  else if (t === 'preparar') body = tabPreparar(key, g, f);
  else if (t === 'directo') body = tabDirecto(key, g, f, fecha);
  else body = tabCierre(key, g);
  return `<div class="page-head"><div><div class="row small"><a href="#" data-a="go" data-v="plan">‹ Planificación</a>${prev ? `<span class="muted">·</span><a href="#" data-a="sesion" data-k="${esc(prev.key)}" data-tab="${UI.sesTab}">‹ Anterior<span class="mhide">: ${esc(prev.grupo.nombre)} (${prev.fecha === fecha ? '' : fShort(prev.fecha) + ' '}${esc(prev.franja.inicio)})</span></a>` : ''}${next ? `<span class="muted">·</span><a href="#" data-a="sesion" data-k="${esc(next.key)}" data-tab="${UI.sesTab}">Siguiente<span class="mhide">: ${esc(next.grupo.nombre)} (${next.fecha === fecha ? '' : fShort(next.fecha) + ' '}${esc(next.franja.inicio)})</span> ›</a>` : ''}</div>
    ${gPrev || gNext ? `<div class="row small gnav" style="margin-top:4px;gap:6px">${gchip(g)}<span class="muted" style="margin-left:-4px">:</span>${gPrev ? `<a href="#" data-a="sesion" data-k="${esc(gPrev.key)}" data-tab="${UI.sesTab}" title="${esc(tituloDe(gPrev))}">‹ Anterior<span class="mhide"> de este grupo (${fShort(gPrev.fecha)} · ${esc(tituloDe(gPrev))})</span></a>` : ''}${gPrev && gNext ? '<span class="muted">·</span>' : ''}${gNext ? `<a href="#" data-a="sesion" data-k="${esc(gNext.key)}" data-tab="${UI.sesTab}" title="${esc(tituloDe(gNext))}">Siguiente<span class="mhide"> de este grupo (${fShort(gNext.fecha)} · ${esc(tituloDe(gNext))})</span> ›</a>` : ''}</div>` : ''}
    <h1 style="margin-top:6px">${gchip(g)} <span class="muted" style="font-weight:500">· ${esc(p?.titulo || 'Sin planificar')}</span></h1>
    <div class="sub">${cap(fLong(fecha))} · ${esc(f.inicio)}–${esc(f.fin)}${h?.aula ? ' · Aula ' + esc(h.aula) : ''}${ns ? ` · Sesión ${ns.n} de ${ns.total}` : ''}${p?.unidad ? ' · ' + esc(p.unidad) : ''}</div></div>
    <div class="row">${!p?.sinClase && libroSesion(key)?.b ? `<button class="btn sm primary" data-a="seslibpres">📖 Libro</button>` : ''}${p?.sinClase ? '' : `<button class="btn sm" data-a="desplazar">Desplazar desde aquí</button>`}</div></div>
    ${p?.sinClase ? '' : `<div class="tabs" role="tablist">${[['preparar', '01 Preparar'], ['clase', '02 En clase'], ['directo', '03 Anotaciones'], ['cierre', '04 Cierre']].map(([v, tt]) => `<button role="tab" aria-selected="${t === v}" data-a="stab" data-v="${v}">${tt}${v === 'cierre' && p?.cierre?.hecho ? ' ✓' : ''}</button>`).join('')}</div>`}${body}`;
};

/* «En clase»: arriba, lo del inicio (deberes, sesión anterior, fechas, pendientes) en una franja plegable; debajo, todo lo preparado */
function tabClase(key, g, f) {
  const k = key + ':inicio'; const open = UI.secOpen[k] ?? true;
  return `<details class="panel sec inicio-fr" data-sec="inicio" ${open ? 'open' : ''}><summary><span class="sec-t">Al empezar</span><span class="small muted">${inicioResumen(key, g)}</span></summary><div class="sec-b">${tabInicio(key, g)}</div></details>${tabDesarrollo(key, g, f)}`;
}
function inicioResumen(key, g) {
  const { fecha } = parseKey(key); const n = [deberesPara(key).length && 'deberes que revisar', fechasGrupo(g.id, fecha).length && 'fechas próximas', tareasGrupo(g.id, fecha).length && tareasGrupo(g.id, fecha).length + ' pendientes'].filter(Boolean);
  return n.length ? n.join(' · ') : 'sesión anterior';
}
/* las antiguas pestañas «Inicio» y «Desarrollo» son ahora «En clase» */
const tabNorm = t => (t === 'inicio' || t === 'desarrollo') ? 'clase' : (['preparar', 'clase', 'directo', 'cierre'].includes(t) ? t : 'preparar');
/* pestaña al abrir una sesión según la hora: antes → Preparar, durante → En clase, después → Cierre (o En clase si ya está cerrada) */
function tabPorHora(key) {
  const { fecha, franjaId } = parseKey(key); const f = franja(franjaId); const hoy = todayStr(); const p = S.planes[key];
  if (fecha > hoy || !f) return 'preparar';
  const fin = fecha < hoy || nowMin() >= tmin(f.fin);
  if (fin) return p?.cierre?.hecho ? 'clase' : 'cierre';
  return nowMin() >= tmin(f.inicio) - 5 ? 'clase' : 'preparar';
}

function tabSitios(g) {
  if (!g.plano || !Object.keys(g.plano.asientos || {}).length) return `<div class="panel stack" style="max-width:560px"><h3>Todavía no hay plano de clase</h3><p class="muted" style="margin:0">Cuando lo hagas en el grupo, aquí verás cómo se sienta este grupo.</p><button class="btn primary" data-a="go" data-v="grupo" data-g="${g.id}" data-gt="plano" style="align-self:flex-start">Hacer el plano de ${esc(g.nombre)}</button></div>`;
  limpiarPlano(g); const sentados = new Set(Object.values(g.plano.asientos)); const sin = g.alumnos.filter(a => !sentados.has(a.id));
  return `<div class="panel stack"><div class="row between"><span class="small muted">${MESA_TIPOS.find(([n]) => n === g.plano.tam)?.[1] || ''} · ${g.plano.filas} filas · ${g.plano.mesasFila} mesas por fila</span>
      <div class="row"><button class="btn sm" data-a="proysitios">Proyectar</button><button class="btn sm ghost" data-a="go" data-v="grupo" data-g="${g.id}" data-gt="plano">Editar en el grupo</button></div></div>
    ${planoHTML(g, a => `<div class="seat ${a ? '' : 'empty'}" style="cursor:default">${a ? `${esc(a.pila || a.nombre)}<span class="tg">${esc(a.apellidos || '')}</span>` : ''}</div>`)}
    ${sin.length ? `<p class="small" style="margin:0;color:var(--warn)">Sin sitio en el plano: ${sin.map(a => esc(a.nombre)).join(', ')}</p>` : ''}</div>`;
}
function resumenAnterior(key) {
  const prev = sesionVecina(key, -1); if (!prev) return null;
  let o = prev, g = 0; while (o && S.planes[o.key]?.sinClase && g++ < 10) o = sesionVecina(o.key, -1);
  if (!o) return null; const p = S.planes[o.key]; if (!p) return { o, txt: '' };
  const lines = [];
  if (p.cierre?.visto) lines.push(p.cierre.visto); else if (p.titulo) lines.push(p.titulo + (p.objetivos ? ': ' + p.objetivos : ''));
  if (p.cierre?.estado === 'parcial' && p.cierre?.pendiente) lines.push(L10N[idiomaG(parseKey(key).grupoId)].pend + p.cierre.pendiente);
  return { o, txt: lines.join('\n') };
}
/* deberes: cada sesión puede indicar para qué sesión son (por defecto, la siguiente) */
function deberesParaKey(k) { const p = S.planes[k]; if (!(p?.deberes || '').trim()) return null; return p.deberesPara || sesionVecina(k, 1)?.key || null; }
function deberesPara(key) {
  const { grupoId, fecha } = parseKey(key);
  return Object.keys(S.planes).filter(k => k !== key && k.startsWith(grupoId + '|') && parseKey(k).fecha <= fecha && (S.planes[k].deberes || '').trim() && !S.planes[k].sinClase)
    .filter(k => deberesParaKey(k) === key).map(k => ({ txt: S.planes[k].deberes, fecha: parseKey(k).fecha })).sort((a, b) => a.fecha.localeCompare(b.fecha));
}
function opcionesDeberes(key, sel) {
  const { grupoId, fecha, franjaId } = parseKey(key); const t0 = tmin(franja(franjaId)?.inicio);
  const occ = ocurrencias(grupoId, fecha, cursoRango()[1]).filter(o => o.key !== key && (o.fecha > fecha || tmin(o.franja.inicio) > t0) && !S.planes[o.key]?.sinClase).slice(0, 30);
  const actual = sel || occ[0]?.key; const lab = o => `${cap(fLong(o.fecha))} · ${o.franja.inicio}${S.planes[o.key]?.titulo ? ' · ' + S.planes[o.key].titulo.slice(0, 40) : ''}`;
  const extra = actual && !occ.some(o => o.key === actual) ? (() => { const p = parseKey(actual); const f = franja(p.franjaId); return f ? `<option value="${esc(actual)}" selected>${esc(cap(fLong(p.fecha)) + ' · ' + f.inicio)}</option>` : ''; })() : '';
  return extra + occ.map((o, i) => `<option value="${esc(o.key)}" ${o.key === actual ? 'selected' : ''}>${esc(lab(o))}${i === 0 ? ' (siguiente)' : ''}</option>`).join('') || '<option value="">No hay más sesiones en el curso</option>';
}
function fechasGrupo(gid, desde) { return S.agenda.filter(a => a.grupoId === gid && !a.done && (a.tipo === 'examen' || a.tipo === 'entrega') && a.fecha >= desde && diffDays(desde, a.fecha) <= 30).sort((a, b) => a.fecha.localeCompare(b.fecha)); }

function tabInicio(key, g) {
  const { fecha } = parseKey(key); const r = resumenAnterior(key); const p = plan(key);
  const resumen = p.resumenInicio ?? (r?.txt || '');
  const fechas = fechasGrupo(g.id, fecha); const pend = tareasGrupo(g.id, fecha, key);
  const debs = deberesPara(key);
  const regHoy = S.regs[key]; const revisados = regHoy && Object.keys(regHoy.deberes || {}).length;
  return `<div class="cols"><div class="stack">
    ${debs.length ? `<div class="panel" style="border-color:var(--warn);background:var(--warn-soft)"><div class="row between"><div class="grow"><div class="label" style="color:var(--warn)">Deberes para esta sesión</div>${debs.map(d => `<div style="font-weight:700;margin-top:4px">${esc(d.txt)} <span class="tiny muted" style="font-weight:400">· mandados el ${fShort(d.fecha)}</span></div>`).join('')}</div>
      ${revisados ? pill('ok', `Revisados: ${revisados}`) : `<button class="btn sm" data-a="revisardeberes">Revisar deberes</button>`}</div></div>` : ''}
    <div class="panel stack"><div class="panel-title" style="margin:0"><h3>En la sesión anterior…</h3><button class="btn sm primary" data-a="proyectar">Proyectar</button></div>
      ${r ? `<div class="small muted">${fShort(r.o.fecha)} · ${esc(S.planes[r.o.key]?.titulo || 'sin título')}</div>` : `<div class="small muted">Es la primera sesión del grupo.</div>`}
      <textarea data-f="plan" data-k="resumenInicio" rows="4" placeholder="Resumen breve para poner en contexto a la clase (3–4 líneas)">${esc(resumen)}</textarea>
      <p class="tiny muted" style="margin:0">Se rellena con lo que anotaste al cerrar la sesión anterior. Puedes editarlo; la pantalla de proyección no muestra datos de alumnos.</p></div>
    <div class="panel"><h3>Fechas importantes</h3>
      ${fechas.length ? `<div class="list">${fechas.map(a => `<div class="li"><span class="pill ${a.tipo === 'examen' ? 'bad' : 'info'}">${TIPOS_AG[a.tipo]}</span><div class="grow"><b>${esc(a.titulo)}</b><div class="small muted">${cap(fLong(a.fecha))} · ${rel(diffDays(fecha, a.fecha))}</div></div>
        <label class="check small"><input type="checkbox" data-f="comunicado" data-id="${a.id}" ${a.comunicado ? 'checked' : ''}>Comunicado</label></div>`).join('')}</div>` : `<p class="empty">No hay exámenes ni entregas en los próximos 30 días. Se añaden en la Agenda con este grupo.</p>`}</div>
  </div><div class="stack">
    <div class="panel"><h3>Pendientes del grupo</h3>
      ${pend.length ? `<div class="list">${pend.map(x => `<div class="li"><input type="checkbox" data-f="agdone" data-id="${x.id}" data-k="${esc(key)}" ${x.done ? 'checked' : ''} aria-label="Hecho"><div class="grow">${esc(x.titulo)}<div class="tiny muted">${TIPOS_AG[x.tipo]}${x.fecha ? (x.fecha < fecha ? ' · desde ' + fShort(x.fecha) : ' · para hoy') : ' · sin fecha'}</div></div></div>`).join('')}</div>` : `<p class="empty">Nada pendiente.</p>`}
      <div class="row" style="margin-top:10px"><input type="text" id="newpend" placeholder="Añadir pendiente (p. ej. decir fecha de examen)" class="grow"><button class="btn sm" data-a="addpend">Añadir</button></div>
      <p class="tiny muted">Lo que no marques pasa a la siguiente sesión del grupo. Todo queda también en tu Agenda.</p></div>
  </div></div>`;
}

function listEditor(key, list, fields, addLabel) {
  const p = plan(key);
  return `<div class="stack" style="gap:6px">${(p[list] || []).map(it => `<div class="row">${fields.map(([k, ph, type, w]) => type === 'select' ? `<select data-f="plist" data-list="${list}" data-id="${it.id}" data-k="${k}" style="width:${w}">${ph.map(o => `<option ${it[k] === o ? 'selected' : ''}>${esc(o)}</option>`).join('')}</select>` : `<input type="${type || 'text'}" placeholder="${esc(ph)}" value="${esc(it[k] ?? '')}" data-f="plist" data-list="${list}" data-id="${it.id}" data-k="${k}" style="${w ? 'width:' + w : 'flex:1;min-width:140px'}">`).join('')}
    <button class="iconbtn" data-a="delitem" data-list="${list}" data-id="${it.id}" aria-label="Quitar">✕</button></div>`).join('')}
    <button class="btn sm ghost" data-a="additem" data-list="${list}" style="align-self:flex-start">+ ${addLabel}</button></div>`;
}
function actividadesEditor(key) {
  const p = plan(key); const TIPOS = ['Individual', 'Parejas', 'Grupo', 'Casa', 'Laboratorio', 'Campo'];
  return `<div class="stack" style="gap:8px">${(p.actividades || []).map(it => {
    return `<div class="act"><div class="row"><input type="text" placeholder="Actividad" value="${esc(it.texto ?? '')}" data-f="plist" data-list="actividades" data-id="${it.id}" data-k="texto" style="flex:1;min-width:140px">
      <select data-f="plist" data-list="actividades" data-id="${it.id}" data-k="tipo" style="width:130px">${TIPOS.map(o => `<option ${it.tipo === o ? 'selected' : ''}>${o}</option>`).join('')}</select>
      ${ARCH.assets ? `<button class="iconbtn" data-a="subiract" data-id="${it.id}" aria-label="Subir archivo de la actividad" title="Subir archivo">📎</button>` : ''}
      <button class="iconbtn" data-a="delitem" data-list="actividades" data-id="${it.id}" aria-label="Quitar">✕</button></div>
      ${it.creada ? `<div class="row small" style="margin-top:4px"><span class="pill acc">Ficha</span><button class="btn sm ghost" data-a="veract" data-id="${it.id}">📄 Ver / editar</button><button class="btn sm ghost" data-a="wordact" data-id="${it.id}" data-v="enunciado">Word</button>${(it.creada.adaptada || '').trim() ? `<button class="btn sm ghost" data-a="wordact" data-id="${it.id}" data-v="adaptada">Word adaptada</button>` : ''}<button class="btn sm ghost" data-a="proyact" data-id="${it.id}">Proyectar</button></div>` : ''}
      ${it.archivo ? `<div class="row small" style="margin-top:4px"><span class="tag">${it.archivo.tipo === 'application/pdf' ? 'PDF' : (it.archivo.tipo || '').startsWith('image') ? 'Imagen' : 'Texto'}</span><a href="_blob/${esc(it.archivo.assetId)}" target="_blank" rel="noopener">${esc(it.archivo.nombre)}</a><button class="iconbtn" data-a="delactfile" data-id="${it.id}" aria-label="Quitar archivo">✕</button></div>` : ''}
      ${it.solucion ? `<div class="sugbox" style="margin-top:6px"><div class="row between"><span class="label">Solucionario</span><button class="btn sm ghost" data-a="delsol" data-id="${it.id}">Borrar</button></div><pre class="sugpre" id="sol-${it.id}">${esc(it.solucion)}</pre></div>` : ''}
    </div>`; }).join('')}
    <button class="btn sm ghost" data-a="additem" data-list="actividades" style="align-self:flex-start">+ Añadir actividad</button></div>`;
}
/* ---------- Fichas de actividad guardadas (ver, editar, Word, proyectar) ---------- */
const TIPOS_ACT = ['Preguntas cortas', 'Completar huecos', 'Relacionar', 'Verdadero/falso', 'Test', 'Mapa conceptual mudo', 'Interpretar imagen o gráfico', 'Caso práctico o problema', 'Práctica de laboratorio', 'Cooperativa con roles', 'Debate', 'Pequeña investigación', 'Libre'];
const ADAPT = { tdah: 'TDAH (formato y acceso)', nivel: 'Nivel más bajo', ambas: 'TDAH y nivel más bajo' };
function abrirCreador(prefill = {}, actId = null) {
  const p = plan(UI.sesion); const it = actId ? p.actividades.find(x => x.id === actId) : null;
  UI.cr = Object.assign({ actId, peticion: '', tipo: 'Libre', agrup: 'Individual', min: 15, nivel: 'Estándar', npreg: 5, usarExpl: true, sol: true, rub: false, adapt: false, adaptTipo: 'tdah', file: null, res: null, busy: false, err: null, tab: 'enunciado', cambio: '' }, prefill);
  if (it?.creada) Object.assign(UI.cr, { res: JSON.parse(JSON.stringify(it.creada)), peticion: it.creada.peticion || '', tipo: it.creada.tipo || 'Libre' });
  crRender(true);
}
function crRender(anim) {
  const c = UI.cr; if (!c) return;
  const r = c.res; const TABS = [['enunciado', 'Enunciado'], ['solucion', 'Solucionario'], ['rubrica', 'Rúbrica'], ['adaptada', 'Versión adaptada']].filter(([k]) => k === 'enunciado' || (r && (r[k] || '').trim()));
  const prev = r ? `<div class="stack" style="gap:10px">
    <label class="f">Título<input type="text" data-f="crres" data-k="titulo" value="${esc(r.titulo || '')}"></label>
    <div class="tabs" role="tablist" style="margin-bottom:0">${TABS.map(([k, t]) => `<button role="tab" aria-selected="${c.tab === k}" data-a="crtab" data-v="${k}">${t}</button>`).join('')}</div>
    <textarea data-f="crres" data-k="${c.tab}" rows="14" style="font-size:.9rem">${esc(r[c.tab] || '')}</textarea>
    <p class="tiny muted" style="margin:0">Puedes editar el texto. «## » es un apartado, **texto** sale en negrita y [ESPACIO 3] deja 3 líneas para responder.</p>
    <div class="row between"><div class="row"><button class="btn sm" data-a="crword" data-v="enunciado">Word alumnado</button>${(r.adaptada || '').trim() ? '<button class="btn sm" data-a="crword" data-v="adaptada">Word adaptada</button>' : ''}${(r.solucion || r.rubrica || '').trim() ? '<button class="btn sm" data-a="crword" data-v="profe">Word solucionario</button>' : ''}<button class="btn sm" data-a="crproy">Proyectar</button></div>
      <div class="row"><button class="btn primary" data-a="crsave">${c.actId ? 'Guardar cambios' : 'Guardar en la sesión'}</button>${c.actId ? '<button class="btn" data-a="crclose">Cerrar</button>' : ''}</div></div></div>` : '';
  modal(`<div class="row between"><h2 style="margin:0">${c.actId ? 'Actividad' : 'Crear actividad'}</h2><button class="iconbtn" data-a="crclose" aria-label="Cerrar">✕</button></div>
    <div style="margin-top:12px"></div>${prev}`, !anim, 'wide');
}
function guardarCreada() {
  const c = UI.cr; const p = plan(UI.sesion); if (!c?.res) return;
  const data = Object.assign({}, c.res, { peticion: c.peticion, tipo: c.tipo });
  const tipoSel = { Individual: 'Individual', Parejas: 'Parejas', Grupo: 'Grupo' }[c.agrup] || 'Individual';
  let it = c.actId ? p.actividades.find(x => x.id === c.actId) : null;
  if (!it) { it = { id: uid(), texto: '', tipo: c.tipo === 'Práctica de laboratorio' ? 'Laboratorio' : tipoSel }; p.actividades.push(it); }
  it.texto = data.titulo; it.creada = data; if ((data.solucion || '').trim()) it.solucion = data.solucion;
  touchPlan(UI.sesion); UI.cr = null; closeModal(); toast('Actividad guardada en la sesión'); UI.secOpen[UI.sesion + ':actividades'] = true; UI.keepScroll = true; render();
}

/* texto con formato sencillo → bloques */
function bloquesTexto(txt) {
  return (txt || '').split(/\r?\n/).map(l => {
    const m = l.match(/^\s*\[ESPACIO\s*(\d+)\]\s*$/i); if (m) return { t: 'esp', n: Math.min(15, +m[1] || 2) };
    if (/^\s*##\s+/.test(l)) return { t: 'h', s: l.replace(/^\s*##\s+/, '') };
    if (!l.trim()) return { t: 'blank' };
    return { t: 'p', s: l, q: /^\s*\d+[.)]\s/.test(l) };
  });
}
const runsMd = s => s.split(/(\*\*[^*]+\*\*)/).filter(Boolean).map(x => x.startsWith('**') && x.endsWith('**') ? { b: true, s: x.slice(2, -2) } : { s: x });
function htmlActividad(titulo, txt, big) {
  return `<h1 style="margin-bottom:16px">${esc(titulo)}</h1>` + bloquesTexto(txt).map(b => b.t === 'esp' ? '<div style="height:' + (b.n * 1.6) + 'em;border-bottom:1px dashed var(--line);margin-bottom:8px"></div>' : b.t === 'h' ? `<h2 style="margin:18px 0 8px">${esc(b.s)}</h2>` : b.t === 'blank' ? '<div style="height:.6em"></div>' : `<p style="margin:${b.q ? '14px' : '4px'} 0 4px">${runsMd(b.s).map(r => r.b ? `<b>${esc(r.s)}</b>` : esc(r.s)).join('')}</p>`).join('');
}

/* Word (.docx) generado en la propia app: zip sin compresión con el XML mínimo */
const CRC = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
const crc32 = u8 => { let c = 0xFFFFFFFF; for (let i = 0; i < u8.length; i++) c = CRC[(c ^ u8[i]) & 255] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; };
function zipStore(files) {
  const enc = new TextEncoder(); const parts = []; const central = []; let off = 0;
  for (const [name, str] of files) {
    const nm = enc.encode(name), data = enc.encode(str), crc = crc32(data);
    const h = new DataView(new ArrayBuffer(30)); h.setUint32(0, 0x04034b50, true); h.setUint16(4, 20, true); h.setUint16(6, 0x0800, true); h.setUint16(8, 0, true);
    h.setUint32(14, crc, true); h.setUint32(18, data.length, true); h.setUint32(22, data.length, true); h.setUint16(26, nm.length, true);
    parts.push(new Uint8Array(h.buffer), nm, data);
    const c = new DataView(new ArrayBuffer(46)); c.setUint32(0, 0x02014b50, true); c.setUint16(4, 20, true); c.setUint16(6, 20, true); c.setUint16(8, 0x0800, true);
    c.setUint32(16, crc, true); c.setUint32(20, data.length, true); c.setUint32(24, data.length, true); c.setUint16(28, nm.length, true); c.setUint32(42, off, true);
    central.push(new Uint8Array(c.buffer), nm); off += 30 + nm.length + data.length;
  }
  const cdSize = central.reduce((s, x) => s + x.length, 0);
  const e = new DataView(new ArrayBuffer(22)); e.setUint32(0, 0x06054b50, true); e.setUint16(8, files.length, true); e.setUint16(10, files.length, true); e.setUint32(12, cdSize, true); e.setUint32(16, off, true);
  const all = [...parts, ...central, new Uint8Array(e.buffer)]; const out = new Uint8Array(all.reduce((s, x) => s + x.length, 0)); let p = 0; all.forEach(x => { out.set(x, p); p += x.length; }); return out;
}
function docxDe(titulo, secciones, opt = {}) {
  const X = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const sz = opt.grande ? 28 : 22; const line = opt.grande ? 360 : 276;
  const run = (s, b, size) => `<w:r><w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial" w:cs="Arial"/>${b ? '<w:b/>' : ''}<w:sz w:val="${size || sz}"/></w:rPr><w:t xml:space="preserve">${X(s)}</w:t></w:r>`;
  const par = (inner, after = 120, before = 0) => `<w:p><w:pPr><w:spacing w:before="${before}" w:after="${after}" w:line="${line}" w:lineRule="auto"/></w:pPr>${inner}</w:p>`;
  let body = '';
  if (opt.cabecera) body += par(run('Nombre: ______________________________   Grupo: ________   Fecha: ____________', false, 20), 240);
  body += par(run(titulo, true, 32), 200);
  secciones.forEach(([sub, txt]) => {
    if (sub) body += par(run(sub, true, 26), 120, 240);
    bloquesTexto(txt).forEach(b => {
      if (b.t === 'esp') for (let i = 0; i < b.n; i++) body += par(run('_'.repeat(opt.grande ? 62 : 78), false, sz), 60);
      else if (b.t === 'h') body += par(run(b.s, true, sz + 4), 100, 200);
      else if (b.t === 'blank') body += par('', 60);
      else body += par(runsMd(b.s).map(r => run(r.s, r.b)).join(''), opt.grande && b.q ? 200 : 100, b.q ? (opt.grande ? 240 : 120) : 0);
    });
  });
  const doc = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>${body}<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1134" w:right="1134" w:bottom="1134" w:left="1134" w:header="708" w:footer="708" w:gutter="0"/></w:sectPr></w:body></w:document>`;
  return zipStore([
    ['[Content_Types].xml', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>'],
    ['_rels/.rels', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>'],
    ['word/document.xml', doc]]);
}
async function descargarWord(res, cual) {
  const nombre = (res.titulo || 'actividad').replace(/[^\p{L}\p{N} _-]/gu, '').trim().slice(0, 60) || 'actividad';
  let bytes, fn;
  if (cual === 'adaptada') { bytes = docxDe(res.titulo, [[null, res.adaptada]], { cabecera: true, grande: res.adaptTipo !== 'nivel' }); fn = nombre + ' (adaptada).docx'; }
  else if (cual === 'profe') { bytes = docxDe(res.titulo + ' · Solucionario', [['Solucionario', res.solucion || ''], ...((res.rubrica || '').trim() ? [['Rúbrica de corrección', res.rubrica]] : [])]); fn = nombre + ' (solucionario).docx'; }
  else { bytes = docxDe(res.titulo, [[null, res.enunciado]], { cabecera: true }); fn = nombre + '.docx'; }
  let dl = null; try { dl = Nube.descargas; } catch (e) {}
  if (!dl) { toast('Aquí no se pueden descargar archivos'); return; }
  try { await dl.save({ filename: fn, data: bytes }); toast('Word guardado'); } catch (e) { if (e?.code !== 'declined') toast('No se ha podido guardar el Word'); }
}
function proyectarActividad(res, txtKey = 'enunciado') {
  const el = document.createElement('div'); el.className = 'projector';
  el.innerHTML = `<div class="row between"><span class="label">${esc(grupo(parseKey(UI.sesion).grupoId)?.nombre || '')}</span><button class="btn" data-a="cerrarproy">Cerrar</button></div><div class="p-body" style="max-width:none;margin-top:16px">${htmlActividad(res.titulo, res[txtKey])}</div>`;
  document.body.appendChild(el);
}

/* ---------- archivos ---------- */
const ARCH = { assets: null };
const ASSET_TYPES = ['application/pdf', 'image/png', 'image/jpeg', 'image/gif', 'image/webp', 'video/mp4', 'video/webm', 'text/plain',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/msword', 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/vnd.ms-powerpoint', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/vnd.ms-excel',
  'application/vnd.oasis.opendocument.text', 'application/vnd.oasis.opendocument.presentation', 'application/vnd.oasis.opendocument.spreadsheet'];
async function subirArchivo(file, lista) {
  const key = UI.sesion; const p = plan(key);
  if (lista.startsWith('act:')) {
    const it = (p.actividades || []).find(x => x.id === lista.slice(4)); if (!it || !ARCH.assets) return;
    if (!['application/pdf', 'image/png', 'image/jpeg', 'image/webp', 'image/gif', 'text/plain'].includes(file.type)) { toast('Sube la actividad en PDF, imagen o texto.'); return; }
    toast('Subiendo ' + file.name + '…');
    try { const r = await ARCH.assets.upload(file); if (it.archivo?.assetId) ARCH.assets.delete(it.archivo.assetId).catch(() => {});
      it.archivo = { assetId: r.id, nombre: file.name, tipo: file.type }; Object.defineProperty(it.archivo, 'blob', { value: file, enumerable: false });
      delete it.solucion; touchPlan(key); toast('Archivo añadido'); if (UI.sesion === key) { UI.keepScroll = true; render(); } }
    catch (e) { toast(e?.code === 'too_large' ? `El archivo es demasiado grande (máximo ${Nube.MAX_MB} MB).` : 'No se ha podido subir el archivo.'); }
    return;
  }
  if (!ARCH.assets) { toast('Para subir archivos entra con tu cuenta de Google o Microsoft'); return; }
  if (!ASSET_TYPES.includes(file.type)) { toast('Solo PDF, imágenes, vídeo, texto o documentos de Office.'); return; }
  toast('Subiendo ' + file.name + '…');
  try {
    const r = await ARCH.assets.upload(file);
    (p[lista] = p[lista] || []).push({ id: uid(), t: file.name, url: '', assetId: r.id, tipo: file.type });
    touchPlan(key); toast('Archivo añadido'); if (UI.sesion === key) { UI.keepScroll = true; render(); }
  } catch (e) { toast(e?.code === 'too_large' ? `El archivo es demasiado grande (máximo ${Nube.MAX_MB} MB).` : e?.code === 'quota_or_state' ? 'Se ha llenado el espacio de archivos.' : 'No se ha podido subir el archivo.'); }
}
const linkItem = it => it.assetId ? `_blob/${it.assetId}` : it.url;

/* sección plegable */
/* Preparar más ligero: las secciones que ocultas (Ajustes del docente, S.config.prepOcultas) no salen mientras estén vacías */
const SECS_PREP = [['guion', 'Guion'], ['explicacion', 'Explicación'], ['contar', 'Cómo contarlo'], ['actividades', 'Actividades'], ['recursos', 'Recursos'], ['eventos', 'Exámenes y entregas']];
const prepOcultas = () => S.config.prepOcultas || [];
const secVisible = id => !prepOcultas().includes(id) || secLleno(id) || UI.secMostrar?.[UI.sesion + ':' + id];
function secLleno(id) {
  const p = S.planes[UI.sesion] || {}; const sg = p.sug || {};
  return !!({ guion: (p.bloques || []).length, explicacion: (p.explicacion || '').trim() || (p.enlaces || []).length || sg.esquema,
    consejos: sg.consejos || (p.consejosNotas || '').trim(), motivar: sg.motivar || (p.motivarNotas || '').trim(), contar: sg.consejos || sg.motivar || (p.consejosNotas || '').trim() || (p.motivarNotas || '').trim(), actividades: (p.actividades || []).length || (sg.actividades || []).length,
    recursos: (p.recursos || []).length || (sg.recursos || []).length, eventos: (p.eventos || []).length }[id] || (p.ideasFijadas || []).some(f => f.apt === id || (id === 'contar' && (f.apt === 'consejos' || f.apt === 'motivar'))));
}
function sec(id, title, body, extra = '') {
  if (!secVisible(id)) return '';
  const k = UI.sesion + ':' + id; const lleno = secLleno(id);
  const open = UI.secOpen[k] ?? lleno;
  const ocultar = prepOcultas().includes(id) ? `<button class="btn sm ghost" data-a="secfija" data-id="${id}" title="Mostrar esta sección en todas las sesiones">Mostrar siempre</button>`
    : !lleno ? `<button class="btn sm ghost secx" data-a="secoculta" data-id="${id}" title="No mostrar esta sección cuando esté vacía (en todas las sesiones)">Ocultar</button>` : '';
  return `<details class="panel sec" data-sec="${id}" ${open ? 'open' : ''}><summary><span class="sec-t">${title}</span><span class="row" style="gap:6px">${extra}${ocultar}</span></summary><div class="stack sec-b">${body}</div></details>`;
}
function secAnadir() {
  const ocu = SECS_PREP.filter(([id]) => !secVisible(id)); if (!ocu.length) return '';
  return `<div class="row small secadd"><span class="muted">＋ Añadir sección:</span>${ocu.map(([id, t]) => `<button class="btn sm ghost" data-a="secver" data-id="${id}">${t}</button>`).join('')}</div>`;
}
function botonFuentes(sec, label) {
  const open = UI.fuentes[UI.sesion + ':' + sec];
  return `<button class="btn sm sug" data-a="fuentes" data-t="${sec}" aria-expanded="${!!open}">💡 ${label}</button>`;
}
function archivosEditor(key, list, addLabel) {
  const p = plan(key);
  return `<div class="stack" style="gap:6px">${(p[list] || []).map(it => it.assetId
    ? `<div class="row"><span class="tag">${it.tipo === 'application/pdf' ? 'PDF' : (it.tipo || '').startsWith('image') ? 'Imagen' : (it.tipo || '').startsWith('video') ? 'Vídeo' : 'Archivo'}</span><a href="${esc(linkItem(it))}" target="_blank" rel="noopener" class="grow" style="overflow-wrap:anywhere">${esc(it.t)}</a>${it.tipo === 'application/pdf' ? botonAnotar(it.assetId, it.t) : ''}<button class="iconbtn" data-a="delitem" data-list="${list}" data-id="${it.id}" aria-label="Quitar">✕</button></div>`
    : `<div class="row"><input type="text" placeholder="Nombre" value="${esc(it.t ?? '')}" data-f="plist" data-list="${list}" data-id="${it.id}" data-k="t" style="flex:1;min-width:140px"><input type="url" placeholder="https://…" value="${esc(it.url ?? '')}" data-f="plist" data-list="${list}" data-id="${it.id}" data-k="url" style="flex:1;min-width:140px">${it.url ? `<a class="iconbtn" href="${esc(it.url)}" target="_blank" rel="noopener" aria-label="Abrir">↗</a>` : ''}<button class="iconbtn" data-a="delitem" data-list="${list}" data-id="${it.id}" aria-label="Quitar">✕</button></div>`).join('')}
    <div class="row">${ARCH.assets ? `<button class="btn sm ghost" data-a="subir" data-list="${list}">+ Subir archivo</button>` : ''}<button class="btn sm ghost" data-a="additem" data-list="${list}">+ ${addLabel}</button></div></div>`;
}

function sugTips(sg) {
  const c = sg.consejos; const li = (arr, fn) => (arr || []).map(fn).join('');
  const qx = (sc, ca, i) => `<button class="iconbtn qx" data-a="quitarsug" data-s="${sc}" data-c="${ca}" data-i="${i}" aria-label="Quitar de la sesión" title="Quitar de la sesión">✕</button>`;
  const consejosHTML = c ? `<div class="tips">
      ${c.analogias?.length ? `<div><div class="label">Analogías</div>${li(c.analogias, (a, i) => `<div class="tip">${qx('consejos', 'analogias', i)}${esc(a.texto)}${a.limite ? `<div class="tiny muted">Dónde falla: ${esc(a.limite)}</div>` : ''}${guardarIdea('Analogía', a.texto + (a.limite ? '\n(Dónde falla: ' + a.limite + ')' : ''))}</div>`)}</div>` : ''}
      ${c.ejemplos?.length ? `<div><div class="label">Ejemplos</div>${li(c.ejemplos, (x, i) => `<div class="tip">${qx('consejos', 'ejemplos', i)}${esc(x)}${guardarIdea('Dato curioso', x)}</div>`)}</div>` : ''}
      ${c.errores?.length ? `<div><div class="label">Errores conceptuales frecuentes</div>${li(c.errores, (x, i) => `<div class="tip">${qx('consejos', 'errores', i)}<b>${esc(x.error)}</b>${x.detectar ? `<div class="small">Detectarlo: ${esc(x.detectar)}</div>` : ''}${x.corregir ? `<div class="small">Corregirlo: ${esc(x.corregir)}</div>` : ''}${guardarIdea('Error conceptual', x.error + '\nDetectarlo: ' + (x.detectar || '') + '\nCorregirlo: ' + (x.corregir || ''))}</div>`)}</div>` : ''}
      ${c.dificultades?.length ? `<div><div class="label">Lo que más cuesta</div>${li(c.dificultades, (x, i) => `<div class="tip">${qx('consejos', 'dificultades', i)}<b>${esc(x.que)}</b><div class="small">${esc(x.estrategia || '')}</div></div>`)}</div>` : ''}
      ${c.preguntas?.length ? `<div><div class="label">Preguntas de comprobación</div>${li(c.preguntas, (x, i) => `<div class="tip">${qx('consejos', 'preguntas', i)}${esc(x)}${guardarIdea('Pregunta', x)}</div>`)}</div>` : ''}
      ${c.vocabulario?.length ? `<div><div class="label">Vocabulario clave</div>${li(c.vocabulario, (x, i) => `<div class="tip">${qx('consejos', 'vocabulario', i)}<b>${esc(x.termino)}</b>${x.nota ? ` · <span class="small">${esc(x.nota)}</span>` : ''}</div>`)}</div>` : ''}
    </div>` : '';
  const m = sg.motivar;
  const motivarHTML = m ? `<div class="tips">
      ${m.enganche?.length ? `<div><div class="label">Para enganchar</div>${li(m.enganche, (x, i) => `<div class="tip">${qx('motivar', 'enganche', i)}<span class="tag">${esc(x.tipo || '')}</span> ${esc(x.texto)}${guardarIdea(x.tipo === 'Pregunta' ? 'Pregunta' : 'Anécdota', x.texto)}</div>`)}</div>` : ''}
      ${m.profesiones?.length ? `<div><div class="label">¿Para qué sirve? · Profesiones</div>${li(m.profesiones, (x, i) => `<div class="tip">${qx('motivar', 'profesiones', i)}${esc(x)}</div>`)}</div>` : ''}
      ${m.vida_cotidiana?.length ? `<div><div class="label">¿Para qué sirve? · Vida cotidiana</div>${li(m.vida_cotidiana, (x, i) => `<div class="tip">${qx('motivar', 'vida_cotidiana', i)}${esc(x)}${guardarIdea('Dato curioso', x)}</div>`)}</div>` : ''}
      ${m.actualidad?.length ? `<div><div class="label">¿Para qué sirve? · Actualidad</div>${li(m.actualidad, (x, i) => `<div class="tip">${qx('motivar', 'actualidad', i)}<b>${esc(x.tema)}</b><div class="small">${esc(x.conexion || '')}</div><a class="small" href="https://www.google.com/search?tbm=nws&q=${encodeURIComponent(x.tema)}" target="_blank" rel="noopener">Buscar noticias recientes</a>${guardarIdea('Noticia', x.tema + ': ' + (x.conexion || ''))}</div>`)}
        <p class="tiny muted" style="margin:4px 0 0">Comprueba que la noticia sigue siendo actual antes de usarla.</p></div>` : ''}
    </div>` : '';

  return { consejosHTML, motivarHTML };
}
/* Desarrollo: todo lo preparado, de un vistazo y sin desplegables (solo los apartados con contenido) */
function tabDesarrollo(key, g, f) {
  const p = S.planes[key] || {}; const sg = p.sug || {}; const { consejosHTML, motivarHTML } = sugTips(sg);
  const fij = sec => fijadasHTML(key, sec); const txt = t => (t || '').trim() ? `<div class="p-body" style="white-space:pre-wrap">${esc(t)}</div>` : '';
  const enl = L => (L || []).filter(it => it.assetId || (it.url || '').trim() || (it.t || '').trim()).map(it => `<div class="row" style="gap:6px">${it.assetId ? `<span class="tag">${it.tipo === 'application/pdf' ? 'PDF' : (it.tipo || '').startsWith('image') ? 'Imagen' : (it.tipo || '').startsWith('video') ? 'Vídeo' : 'Archivo'}</span>` : '<span aria-hidden="true">🔗</span>'}${it.assetId || it.url ? `<a href="${esc(it.assetId ? linkItem(it) : it.url)}" target="_blank" rel="noopener" style="overflow-wrap:anywhere">${esc(it.t || it.url)}</a>` : esc(it.t)}${it.assetId && it.tipo === 'application/pdf' ? botonAnotar(it.assetId, it.t) : ''}</div>`).join('');
  const dur = tmin(f.fin) - tmin(f.inicio); const bl = (p.bloques || []).filter(b => (b.fase || '').trim() || Number(b.min));
  let acum = 0;
  const S_ = [];
  const COLF = ['var(--mano)', 'var(--accent)', 'var(--ok)', 'var(--muted)', 'var(--info)', 'var(--warn)'];
  if (bl.length) { const tot = bl.reduce((s0, b) => s0 + (Number(b.min) || 0), 0) || 1;
    S_.push(['Guion', `<div class="devbar" aria-hidden="true">${bl.map((b, i) => `<span style="width:${(Number(b.min) || 0) / Math.max(tot, dur || 0) * 100}%;background:${COLF[i % COLF.length]}"></span>`).join('')}</div><div class="stack" style="gap:0">${bl.map((b, i) => { const ini = acum; acum += Number(b.min) || 0; return `<div class="row" style="flex-wrap:nowrap;align-items:baseline;gap:12px;padding:7px 0;border-bottom:1px solid var(--surface-2)"><span class="hand" style="font-size:1.45rem;width:52px;color:${COLF[i % COLF.length]}">${tHM(tmin(f.inicio) + ini)}</span><span class="grow">${esc(b.fase || '')}</span><span class="mono tiny muted">${Number(b.min) ? b.min + '′' : ''}</span></div>`; }).join('')}</div>`, `${acum} / ${dur} min`]); }
  const ex = fij('explicacion') + txt(p.explicacion) + enl(p.enlaces); if (ex) S_.push(['Explicación', ex]);
  const co = fij('consejos') + txt(p.consejosNotas) + consejosHTML; const mo = fij('motivar') + txt(p.motivarNotas) + motivarHTML;
  if (co || mo) S_.push(['Cómo contarlo', (mo ? `<div class="engancha"><div class="label">Para enganchar</div><div class="stack" style="gap:8px">${mo}</div></div>` : '') + co]);
  const acts = (p.actividades || []).filter(a => (a.texto || '').trim() || a.archivo || a.creada);
  const ac = fij('actividades') + (acts.length ? `<ol class="devacts">${acts.map(a => `<li><div><b>${esc(a.texto || (a.creada ? 'Actividad' : ''))}</b>${a.tipo ? ` <span class="tag">${esc(a.tipo)}</span>` : ''}</div>
      ${a.archivo ? `<div class="small row" style="gap:6px"><a href="_blob/${esc(a.archivo.assetId)}" target="_blank" rel="noopener">📎 ${esc(a.archivo.nombre)}</a>${a.archivo.tipo === 'application/pdf' ? botonAnotar(a.archivo.assetId, a.archivo.nombre) : ''}</div>` : ''}
      ${a.creada ? `<div class="row small" style="margin-top:4px"><button class="btn sm ghost" data-a="veract" data-id="${a.id}">📄 Ver ficha</button><button class="btn sm ghost" data-a="proyact" data-id="${a.id}">Proyectar</button></div>` : ''}
      ${a.solucion ? `<div class="sugbox" style="margin-top:6px"><div class="label">Solucionario</div><div class="small" style="white-space:pre-wrap">${esc(a.solucion)}</div></div>` : ''}</li>`).join('')}</ol>` : '');
  if (ac) S_.push(['Actividades', ac]);
  const re = fij('recursos') + enl(p.recursos); if (re) S_.push(['Recursos', re]);
  if ((p.eventos || []).length) S_.push(['Exámenes y entregas', p.eventos.map(ev => `<div class="row"><span class="pill ${ev.tipo === 'examen' ? 'bad' : 'info'}">${ev.tipo === 'examen' ? 'Examen hoy' : 'Entrega'}</span> <b>${esc(ev.titulo || '')}</b>${ev.tipo === 'entrega' && ev.fecha ? ` <span class="small muted">para el ${fShort(ev.fecha)}</span>` : ''}</div>`).join('')]);
  const cab = `<div class="panel" style="margin-bottom:14px"><div class="row between"><div><div class="label">${esc(p.unidad || '')}</div><h2 style="margin:2px 0 0">${esc(p.titulo || 'Sin título')}</h2></div><div class="row"><button class="btn sm ghost" data-a="stab" data-v="preparar">Editar en Preparar</button></div></div></div>`;
  if (!S_.length) return cab + `<div class="panel empty">Todavía no has preparado nada para esta sesión. <a href="#" data-a="stab" data-v="preparar">Ir a Preparar</a></div>`;
  return cab + `<div class="devgrid">${S_.map(([t, b, extra], i) => `<section class="panel dev fig${t === 'Motivar' ? ' oscura' : ''}"><div class="fighead"><span>Fig. ${i + 1} — ${t}</span>${extra ? `<span class="tiny">${extra}</span>` : ''}</div><div class="stack figbody" style="gap:8px">${b}</div></section>`).join('')}</div>`;
}
function tabPreparar(key, g, f) {
  const p = plan(key);
  const notaAnt = p.notaAnterior ? `<div class="alert info" style="margin-bottom:10px"><span class="grow"><b>Nota del curso anterior</b> <span class="tiny muted">(plantilla «${esc(p.plantillaDe || '')}»)</span><br><span class="hand" style="font-size:1.35rem;color:var(--mano)">${esc(p.notaAnterior)}</span></span><button class="iconbtn" data-a="notaantx" aria-label="Quitar la nota">✕</button></div>` : ''; const dur = tmin(f.fin) - tmin(f.inicio); const sum = (p.bloques || []).reduce((s, b) => s + (Number(b.min) || 0), 0);
  const ideas = ideasPara(key); const sg = p.sug || {};

  const sEsquema = sg.esquema ? `<div class="sugbox"><div class="label">Esquema sugerido</div><pre id="sug-esquema" class="sugpre">${esc(sg.esquema)}</pre>
      <div class="row"><button class="btn sm primary" data-a="usaresquema">Añadir a la explicación</button><button class="btn sm ghost" data-a="descartar" data-t="esquema">Descartar</button></div></div>` : '';
  const sActs = (sg.actividades || []).length ? `<div class="sugbox"><div class="label">Actividades sugeridas</div>${sg.actividades.map(a => `<div class="sugitem"><div class="grow"><b>${esc(a.titulo)}</b> <span class="tag">${esc(a.tipo || '')}</span>${a.minutos ? ` <span class="tiny muted">${esc(a.minutos)} min</span>` : ''}<div class="small">${esc(a.descripcion || '')}</div></div><button class="btn sm" data-a="usarsug" data-t="actividades" data-id="${a.id}">Añadir</button></div>`).join('')}<button class="btn sm ghost" data-a="descartar" data-t="actividades">Descartar todas</button></div>` : '';
  const sRecs = (sg.recursos || []).length ? `<div class="sugbox"><div class="label">Recursos sugeridos</div>${sg.recursos.map(r => `<div class="sugitem"><div class="grow"><b>${esc(r.titulo)}</b> <span class="tag">${esc(r.tipo || '')}</span><div class="small">${esc(r.descripcion || '')}</div>${r.busqueda ? `<a class="small" href="https://www.google.com/search?q=${encodeURIComponent(r.busqueda)}" target="_blank" rel="noopener">Buscar: ${esc(r.busqueda)}</a>` : ''}</div><button class="btn sm" data-a="usarsug" data-t="recursos" data-id="${r.id}">Añadir</button></div>`).join('')}<button class="btn sm ghost" data-a="descartar" data-t="recursos">Descartar todas</button></div>` : '';
  const { consejosHTML, motivarHTML } = sugTips(sg);

  return `${notaAnt}<div class="cols"><div class="stack">
    <div class="panel stack"><div class="fgrid"><label class="f">Título<input type="text" data-f="plan" data-k="titulo" value="${esc(p.titulo)}"></label>
      <label class="f">Unidad<input type="text" data-f="plan" data-k="unidad" value="${esc(p.unidad)}"></label></div>
      <label class="f">Temas<input type="text" data-f="plan" data-k="etiquetas" value="${esc(p.etiquetas)}"></label>
      <div class="row">${botonBancoIdeas(key)}${S.grupos.filter(x => x.id !== g.id && !esTutoria(x)).length ? `<button class="btn sm" data-a="cpdeabrir">⇩ Copiar de otro grupo</button>${tienePlan(p) ? `<button class="btn sm" data-a="cpaabrir">⇧ Copiar a otro grupo</button>` : ''}` : ''}${(p.ideasFijadas || []).length ? `<span class="small muted">${p.ideasFijadas.length} ${p.ideasFijadas.length === 1 ? 'idea fijada' : 'ideas fijadas'}</span>` : ''}</div>${libroSesionHTML(key)}</div>

    ${sec('guion', 'Guion', `<div class="row between"><span class="small" style="${sum > dur ? 'color:var(--bad)' : ''}">${sum} de ${dur} min</span></div>
      <div class="sumbar ${sum > dur ? 'over' : ''}"><span style="width:${Math.min(100, dur ? sum / dur * 100 : 0)}%"></span></div>
      ${listEditor(key, 'bloques', [['fase', 'Fase'], ['min', 'min', 'number', '80px']], 'Añadir fase')}`)}

    ${sec('explicacion', 'Explicación', `${fijadasHTML(key, 'explicacion')}<textarea data-f="plan" data-k="explicacion" rows="6">${esc(p.explicacion)}</textarea>
      ${sEsquema}
      <div class="label">Archivos y enlaces</div>${archivosEditor(key, 'enlaces', 'Añadir enlace')}`)}

    ${sec('contar', 'Cómo contarlo', `<div class="label">Para enganchar</div>${fijadasHTML(key, 'motivar')}${fuentesBox(key, 'motivar')}<textarea data-f="plan" data-k="motivarNotas" rows="2" placeholder="Una pregunta, un dato curioso o una noticia para empezar…" aria-label="Para enganchar">${esc(p.motivarNotas || '')}</textarea>${motivarHTML}
      <div class="label" style="margin-top:6px">Para explicarlo</div>${fijadasHTML(key, 'consejos')}${fuentesBox(key, 'consejos')}<textarea data-f="plan" data-k="consejosNotas" rows="2" placeholder="Analogías, errores que vigilar, preguntas de comprobación…" aria-label="Para explicarlo">${esc(p.consejosNotas || '')}</textarea>${consejosHTML || '<p class="empty">Pulsa «Ideas» para ver ganchos, analogías, ejemplos, errores frecuentes, lo que más cuesta, preguntas de comprobación y vocabulario del banco y de tus ideas.</p>'}`, botonFuentes('motivar', 'Enganchar') + botonFuentes('consejos', 'Explicar'))}

    ${sec('actividades', 'Actividades', `${fijadasHTML(key, 'actividades')}${fuentesBox(key, 'actividades')}${actividadesEditor(key)}
      ${sActs}`, botonFuentes('actividades', 'Ideas'))}

    ${sec('recursos', 'Recursos', `${fijadasHTML(key, 'recursos')}${fuentesBox(key, 'recursos')}${archivosEditor(key, 'recursos', 'Añadir enlace')}
      ${sRecs}`, botonFuentes('recursos', 'Ideas'))}

    ${sec('eventos', 'Exámenes y entregas', `${(p.eventos || []).map(ev => `<div class="row"><span class="pill ${ev.tipo === 'examen' ? 'bad' : 'info'}">${ev.tipo === 'examen' ? 'Examen hoy' : 'Entrega'}</span>
        <input type="text" value="${esc(ev.titulo || '')}" data-f="pev" data-id="${ev.id}" data-k="titulo" style="flex:1;min-width:160px" aria-label="Título">
        ${ev.tipo === 'entrega' ? `<label class="f" style="flex-direction:row;align-items:center;gap:6px">para el<input type="date" value="${esc(ev.fecha || '')}" data-f="pev" data-id="${ev.id}" data-k="fecha" style="width:auto"></label>` : ''}
        <button class="iconbtn" data-a="delev" data-id="${ev.id}" aria-label="Quitar">✕</button></div>`).join('')}
      <div class="row"><button class="btn sm ghost" data-a="addev" data-t="examen">+ Examen en esta sesión</button><button class="btn sm ghost" data-a="addev" data-t="entrega">+ Mandar una entrega</button></div>`)}

    ${secAnadir()}
  </div><div class="stack">
    <div class="panel"><h3>💡 Tus ideas para este tema</h3>
      ${ideas.length ? `<div class="stack" style="gap:8px">${ideas.slice(0, 5).map(i => `<div class="card idea" style="padding:10px"><div class="row between"><span class="tag">${esc(i.tipo || 'Idea')}</span>${p.ideasUsadas?.includes(i.id) ? pill('ok', 'Fijada') : ''}</div><b>${esc(i.titulo || '')}</b>${i.texto ? `<div class="txt small">${esc(i.texto.slice(0, 220))}${i.texto.length > 220 ? '…' : ''}</div>` : ''}${i.url ? `<a href="${esc(i.url)}" target="_blank" rel="noopener" class="small">Abrir enlace</a>` : ''}
        <div class="row">${p.ideasUsadas?.includes(i.id) ? '' : `<button class="btn sm" data-a="usaridea" data-id="${i.id}">Fijar en la sesión</button>`}<button class="btn sm ghost" data-a="ocultaridea" data-id="${i.id}">No sugerir aquí</button></div></div>`).join('')}</div>` :
        `<p class="empty">${(p.titulo || p.etiquetas) ? 'No tienes ideas guardadas que coincidan con estos temas.' : 'Aquí aparecerán las ideas que hayas guardado sobre el tema de la sesión.'}</p>`}
      <div class="row" style="margin-top:6px">${botonBancoIdeas(key, 'Ver todas')}<button class="btn sm ghost" data-a="go" data-v="ideas">Ir a Ideas</button></div></div>
    <div class="panel small"><h3>Alumnado con medidas</h3>${g.alumnos.filter(a => a.tags?.length || (a.pendiente && !a.pendRecuperada)).length ? g.alumnos.filter(a => a.tags?.length || (a.pendiente && !a.pendRecuperada)).map(a => `<div style="margin-bottom:4px"><b>${esc(a.nombre)}</b> ${(a.tags || []).map(t => `<span class="tag">${esc(t)}</span>`).join('')}${a.pendiente && !a.pendRecuperada ? `<span class="tag">Pte. ${esc(a.pendiente)}</span>` : ''}${a.obs ? `<div class="tiny muted">${esc(a.obs)}</div>` : ''}</div>`).join('') : '<p class="empty">Nadie con etiquetas en este grupo.</p>'}</div>
  </div></div>`;
}

/* ---------- Ideas: tus ideas · banco de la app ---------- */
const CURSOS_BANCO = { '1eso': '1.º ESO', '3eso': '3.º ESO', '4eso': '4.º ESO', '1bach': '1.º Bach · Biología, Geología y CC. Ambientales', bhs1: '1.º Bach · Biología Humana y Salud', '2bach': '2.º Bach · Geología y CC. Ambientales', bio2: '2.º Bach · Biología' };
function cursoBanco(g) {
  if (g?.asig && ASIG[g.asig]) return ASIG[g.asig].banco;
  const m = words(g?.materia || ''), n = words(g?.nivel || '') + ' ' + words(g?.nombre || '');
  if (/anatom|humana/.test(m)) return 'bhs1';
  if (/bach/.test(n)) return /(^|\D)2/.test(n) ? (/geolog/.test(m) ? '2bach' : 'bio2') : '1bach';
  if (/eso/.test(n)) return /(^|\D)4/.test(n) ? '4eso' : /(^|\D)3/.test(n) ? '3eso' : '1eso';
  if (/geolog/.test(m) && !/biolog/.test(m)) return '2bach';
  return null;
}
function temasBanco(key) {
  const p = S.planes[key] || {}; const g = grupo(parseKey(key).grupoId); const c = cursoBanco(g);
  const txt = ' ' + words([p.titulo, p.unidad, p.etiquetas, p.objetivos].join(' ')).replace(/[^a-z0-9ñ]+/g, ' ') + ' ';
  const score = t => t.kw.reduce((s, k) => s + (k.every(w => txt.includes(' ' + w)) ? 1 + k.join('').length / 10 : 0), 0);
  const auto = txt.trim() ? BANCO.map(t => ({ t, s: score(t) + (c && t.cursos.includes(c) ? 0.5 : 0) })).filter(o => o.s >= 1).sort((a, b) => (c ? b.t.cursos.includes(c) - a.t.cursos.includes(c) : 0) || b.s - a.s).map(o => o.t) : [];
  return { curso: c, auto };
}
const mergeArr = (a = [], b = []) => { const seen = new Set(a.map(x => JSON.stringify(x))); return a.concat(b.filter(x => !seen.has(JSON.stringify(x)))); };
function bancoAnadir(sec, temaId, i) {
  const key = UI.sesion; const p = plan(key); const t = BANCO.find(x => x.id === temaId); if (!t) return;
  p.bancoUsado = p.bancoUsado || [];
  if (sec === 'actividades') { const a = t.actividades[i]; p.actividades.push({ id: uid(), texto: a.titulo + ': ' + a.descripcion + (a.minutos ? ` (${a.minutos} min)` : ''), tipo: a.tipo }); p.bancoUsado.push(`${temaId}:act:${i}`); }
  else if (sec === 'recursos') { const r = t.recursos[i]; p.recursos.push({ id: uid(), t: r.titulo + (r.descripcion ? ' — ' + r.descripcion : ''), url: r.url }); p.bancoUsado.push(`${temaId}:rec:${i}`); }
  else { const sk = key + ':' + sec + ':' + temaId; const sel = [...(UI.bsel[sk] || [])]; if (!sel.length) { toast('Marca primero las que quieras añadir'); return; }
    p.sug = p.sug || {}; const out = { ...(p.sug[sec] || {}) };
    sel.forEach(v => { const [k, n] = v.split(':'); const x = t[sec][k]?.[+n]; if (x === undefined) return; out[k] = mergeArr(out[k], [x]); p.bancoUsado.push(`${temaId}:${sec}:${k}:${n}`); });
    p.sug[sec] = out; UI.bsel[sk] = new Set(); touchPlan(key); toast(sel.length === 1 ? 'Añadida a la sesión' : sel.length + ' añadidas a la sesión'); UI.keepScroll = true; render(); return; }
  touchPlan(key); toast('Añadido a la sesión'); UI.keepScroll = true; render();
}
const BANCO_CATS = {
  consejos: [['analogias', 'Analogías', x => x.texto + (x.limite ? ' · Dónde falla: ' + x.limite : '')], ['ejemplos', 'Ejemplos', x => x], ['errores', 'Errores frecuentes', x => x.error + (x.corregir ? ' · Cómo corregirlo: ' + x.corregir : '')], ['dificultades', 'Lo que más cuesta', x => x.que + (x.estrategia ? ' · ' + x.estrategia : '')], ['preguntas', 'Preguntas de comprobación', x => x], ['vocabulario', 'Vocabulario clave', x => x.termino + (x.nota ? ': ' + x.nota : '')]],
  motivar: [['enganche', 'Ganchos', x => (x.tipo ? x.tipo + ': ' : '') + x.texto], ['profesiones', 'Profesiones', x => x], ['vida_cotidiana', 'Vida cotidiana', x => x], ['actualidad', 'Actualidad', x => x.tema + (x.conexion ? ': ' + x.conexion : '')]]
};
/* lista completa del tema del banco, para leerla y marcar solo lo que se quiera añadir */
function bancoSelHTML(key, sec, t) {
  const p = plan(key); const usados = p.bancoUsado || []; const todo = usados.includes(`${t.id}:${sec}`);
  const sk = key + ':' + sec + ':' + t.id; const sel = UI.bsel[sk] || (UI.bsel[sk] = new Set());
  const hecho = (k, i) => todo || usados.includes(`${t.id}:${sec}:${k}:${i}`);
  const html = BANCO_CATS[sec].filter(([k]) => (t[sec][k] || []).length).map(([k, lab, f]) => {
    const arr = t[sec][k]; const libres = arr.map((_, i) => i).filter(i => !hecho(k, i));
    const all = libres.length > 0 && libres.every(i => sel.has(k + ':' + i)); const nSel = libres.filter(i => sel.has(k + ':' + i)).length;
    return `<details class="bcat" data-bcat="${esc(sk + ':' + k)}" ${UI.bcatCerr[sk + ':' + k] ? '' : 'open'}><summary>${arr.length} ${lab.toLowerCase()}${nSel ? ` <span class="pill acc">${nSel} ${nSel === 1 ? 'marcada' : 'marcadas'}</span>` : ''}</summary>
      ${libres.length > 1 ? `<label class="bitem ball"><input type="checkbox" data-f="bselcat" data-sk="${esc(sk)}" data-c="${k}" data-n="${arr.length}" ${all ? 'checked' : ''}><span>Marcar todas</span></label>` : ''}
      ${arr.map((x, i) => hecho(k, i) ? `<div class="bitem done"><span class="pill ok">Añadida</span><span>${esc(f(x))}</span></div>` : `<label class="bitem"><input type="checkbox" data-f="bsel" data-sk="${esc(sk)}" data-v="${k}:${i}" ${sel.has(k + ':' + i) ? 'checked' : ''}><span>${esc(f(x))}</span></label>`).join('')}</details>`;
  }).join('');
  const n = sel.size;
  return `<div class="stack" style="gap:4px">${html}</div><div class="row"><button class="btn sm primary" data-a="bancoadd" data-t="${sec}" data-tema="${t.id}" data-i="0" ${n ? '' : 'disabled'}>${n ? `Añadir ${n} ${n === 1 ? 'marcada' : 'marcadas'}` : 'Marca las que quieras añadir'}</button><span class="tiny muted">Aparecerán abajo, en la sesión.</span></div>`;
}
function fuentesBox(key, sec) {
  if (!UI.fuentes[key + ':' + sec]) return '';
  const p = plan(key); const usados = p.bancoUsado || [];
  const mias = ideasPara(key).filter(i => apartadoIdea(i) === sec);
  const misHTML = mias.length ? mias.slice(0, 8).map(i => `<div class="fz-item"><div class="grow">${i.titulo ? `<b>${esc(i.titulo)}</b> ` : ''}<span class="tag">${esc(i.tipo || 'Idea')}</span>${i.texto ? `<div class="small">${esc(i.texto.slice(0, 200))}${i.texto.length > 200 ? '…' : ''}</div>` : ''}${i.url ? `<a class="small" href="${esc(i.url)}" target="_blank" rel="noopener">Abrir enlace</a>` : ''}</div>${p.ideasUsadas?.includes(i.id) ? pill('ok', 'Fijada') : `<button class="btn sm" data-a="usaridea" data-id="${i.id}" data-apt="${sec}">Fijar</button>`}</div>`).join('')
    : `<p class="empty" style="padding:0">${(p.titulo || p.etiquetas) ? `No tienes ideas de «${esc(APT[sec])}» con etiquetas que coincidan con esta sesión.` : 'Escribe el título o los temas de la sesión para buscar tus ideas.'} <button class="linkbtn" style="display:inline" data-a="go" data-v="ideas">Apuntar una idea</button></p>`;
  const { curso, auto } = temasBanco(key);
  const elegido = p.bancoTema ? BANCO.find(t => t.id === p.bancoTema) : auto[0];
  const orden = [curso, ...Object.keys(CURSOS_BANCO).filter(c => c !== curso)].filter(Boolean);
  const sel = `<select data-f="bancotema" aria-label="Tema del banco"><option value="">${auto.length ? 'Tema detectado: ' + esc(auto[0].titulo) : 'Elige un tema del banco…'}</option>${orden.map(c => `<optgroup label="${esc(CURSOS_BANCO[c])}">${BANCO.filter(t => t.cursos.includes(c)).map(t => `<option value="${t.id}" ${p.bancoTema === t.id ? 'selected' : ''}>${esc(t.titulo)}</option>`).join('')}</optgroup>`).join('')}</select>`;
  let bancoHTML = '';
  if (!elegido) bancoHTML = `<p class="empty" style="padding:0">No he encontrado un tema del banco que encaje con el título o los temas de esta sesión. Elige uno en la lista.</p>`;
  else if (sec === 'actividades') bancoHTML = elegido.actividades.map((a, i) => `<div class="fz-item"><div class="grow"><b>${esc(a.titulo)}</b> <span class="tag">${esc(a.tipo)}</span>${a.minutos ? ` <span class="tiny muted">${a.minutos} min</span>` : ''}<div class="small">${esc(a.descripcion)}</div></div><div class="stack" style="gap:4px">${usados.includes(`${elegido.id}:act:${i}`) ? pill('ok', 'Añadida') : `<button class="btn sm" data-a="bancoadd" data-t="actividades" data-tema="${elegido.id}" data-i="${i}">Añadir</button>`}</div></div>`).join('');
  else if (sec === 'recursos') bancoHTML = elegido.recursos.map((r, i) => `<div class="fz-item"><div class="grow"><a href="${esc(r.url)}" target="_blank" rel="noopener"><b>${esc(r.titulo)}</b></a> <span class="tag">${esc(r.tipo)}</span><div class="small">${esc(r.descripcion)}</div></div>${usados.includes(`${elegido.id}:rec:${i}`) ? pill('ok', 'Añadido') : `<button class="btn sm" data-a="bancoadd" data-t="recursos" data-tema="${elegido.id}" data-i="${i}">Añadir</button>`}</div>`).join('');
  else bancoHTML = bancoSelHTML(key, sec, elegido);
  return `<div class="fuentes"><div class="fz-h"><span>Ideas para «${esc(APT[sec])}»</span><button class="iconbtn" data-a="fuentes" data-t="${sec}" aria-label="Cerrar sugerencias">✕</button></div>
    <div class="fz"><div class="label">Tus ideas <span class="pill off">${mias.length}</span></div>${misHTML}</div>
    ${curso === 'none' ? '' : `<div class="fz"><div class="label">Banco de la app</div>${sel}${bancoHTML}</div>`}</div>`;
}

/* ---------- ideas fijadas en la sesión ---------- */
const APT_FIJAR = [['explicacion', 'Explicación'], ['motivar', 'Cómo contarlo · enganchar'], ['consejos', 'Cómo contarlo · explicar'], ['actividades', 'Actividades'], ['recursos', 'Recursos']];
const APT_FIJAR_N = Object.fromEntries(APT_FIJAR);
function fijarIdea(key, i, apt, enModal) {
  const p = plan(key); p.ideasFijadas = (p.ideasFijadas || []).filter(f => f.id !== i.id); p.ideasFijadas.push({ id: i.id, apt });
  if (!(p.ideasUsadas || []).includes(i.id)) { p.ideasUsadas = [...(p.ideasUsadas || []), i.id]; i.usos = [...(i.usos || []), key]; touch('ideas'); }
  UI.secOpen[key + ':' + secDe(apt)] = true; touchPlan(key); toast('Idea fijada en ' + APT_FIJAR_N[apt]);
  if (!enModal) { UI.keepScroll = true; render(); } else if (UI.view === 'sesion' && UI.sesion === key) { UI.keepScroll = true; render(); }
}
function desfijarIdea(key, id, enModal) {
  const p = plan(key); p.ideasFijadas = (p.ideasFijadas || []).filter(f => f.id !== id); p.ideasUsadas = (p.ideasUsadas || []).filter(x => x !== id);
  const i = S.ideas.find(x => x.id === id); if (i?.usos) { const j = i.usos.lastIndexOf(key); if (j >= 0) { i.usos.splice(j, 1); touch('ideas'); } }
  touchPlan(key); if (!enModal || (UI.view === 'sesion' && UI.sesion === key)) { UI.keepScroll = true; render(); }
}
function fijadasHTML(key, sec) {
  const L = (S.planes[key]?.ideasFijadas || []).filter(f => f.apt === sec).map(f => S.ideas.find(i => i.id === f.id)).filter(Boolean);
  if (!L.length) return '';
  return `<div class="pins">${L.map(i => `<div class="pin"><span aria-hidden="true">📌</span><div class="grow">${i.titulo ? `<b>${esc(i.titulo)}</b> ` : ''}<span class="tag">${esc(i.tipo || 'Idea')}</span>${i.texto ? `<div class="small" style="white-space:pre-wrap">${esc(i.texto)}</div>` : ''}${i.url ? `<a class="small" href="${esc(i.url)}" target="_blank" rel="noopener" style="overflow-wrap:anywhere">${esc(i.url)}</a>` : ''}</div><button class="iconbtn" data-a="desfijar" data-k="${esc(key)}" data-id="${i.id}" aria-label="Quitar de la sesión" title="Quitar de la sesión">✕</button></div>`).join('')}</div>`;
}
const botonBancoIdeas = (key, label) => `<button class="btn sm" data-a="bancoideas" data-k="${esc(key)}">💡 ${label || 'Elegir del banco de ideas'}</button>`;
function biModal(anim) {
  const B0 = UI.bi; if (!B0) return; const key = B0.key; const p = S.planes[key] || {}; const { grupoId, fecha, franjaId } = parseKey(key); const g = grupo(grupoId); const f = franja(franjaId);
  const fij = Object.fromEntries((p.ideasFijadas || []).map(x => [x.id, x.apt]));
  const encaja = new Set(ideasPara(key).map(i => i.id)); const q = words(B0.q || '');
  const L = S.ideas.filter(i => (!B0.apt || apartadoIdea(i) === B0.apt) && (!q || words([i.titulo, i.texto, (i.etiquetas || []).join(' ')].join(' ')).includes(q)))
    .sort((a, b) => (!!fij[b.id] - !!fij[a.id]) || (encaja.has(b.id) - encaja.has(a.id)) || (b.creada || '').localeCompare(a.creada || ''));
  const lista = L.length ? L.map(i => `<div class="biitem"><div class="grow">${i.titulo ? `<b>${esc(i.titulo)}</b> ` : ''}<span class="tag aptag">${esc(APT[apartadoIdea(i)])}</span><span class="tag">${esc(i.tipo || 'Idea')}</span>${encaja.has(i.id) ? ' ' + pill('acc', 'Encaja con la sesión') : ''}
      ${i.texto ? `<div class="small">${esc(i.texto.slice(0, 240))}${i.texto.length > 240 ? '…' : ''}</div>` : ''}${(i.etiquetas || []).length ? `<div class="tiny muted">${i.etiquetas.map(t => '#' + esc(t)).join(' ')}</div>` : ''}</div>
      <div class="stack" style="gap:4px;align-items:flex-end;min-width:150px">${fij[i.id] ? `${pill('ok', 'Fijada en ' + APT_FIJAR_N[fij[i.id]])}<button class="btn sm ghost" data-a="bidesfijar" data-id="${i.id}">Quitar</button>` : `<select id="bi-apt-${i.id}" aria-label="Apartado donde fijarla" style="width:auto">${APT_FIJAR.map(([k, t]) => `<option value="${k}" ${apartadoIdea(i) === k ? 'selected' : ''}>${t}</option>`).join('')}</select><button class="btn sm primary" data-a="bifijar" data-id="${i.id}">Fijar</button>`}</div></div>`).join('')
    : `<p class="empty">${S.ideas.length ? 'Ninguna idea coincide con la búsqueda.' : 'Aún no tienes ideas guardadas. Apúntalas en Ideas.'}</p>`;
  const html = `<div class="row between"><h2 style="margin:0">Banco de ideas</h2><button class="iconbtn" data-a="close" aria-label="Cerrar">✕</button></div>
    <p class="small muted" style="margin:4px 0 10px">${g ? gchip(g) + ' · ' : ''}${cap(fLong(fecha))}${f ? ' · ' + esc(f.inicio) : ''}${p.titulo ? ' · ' + esc(p.titulo) : ''}. Elige el apartado y pulsa <b>Fijar</b>: la idea quedará fijada en ese apartado de la sesión.</p>
    <div class="row" style="margin-bottom:8px"><input type="search" id="bi-q" placeholder="Buscar en tus ideas" value="${esc(B0.q || '')}" data-f="biq" style="flex:1;min-width:180px">
      <div class="seg">${[['', 'Todas'], ...APARTADOS].map(([k, t]) => `<button data-a="biapt" data-v="${k}" aria-pressed="${(B0.apt || '') === k}">${k ? t.replace('Cómo contarlo · ', '') : t}</button>`).join('')}</div></div>
    <div>${lista}</div>
    <div class="row between" style="margin-top:12px"><button class="btn sm ghost" data-a="biir">Apuntar una idea nueva</button><button class="btn primary" data-a="close">Listo</button></div>`;
  if (anim) modal(html, false, 'wide'); else remodal(html, 'wide');
}
const guardarIdea = (tipo, texto) => `<button class="linkbtn tiny" data-a="guardaridea" data-tipo="${esc(tipo)}" data-txt="${esc(texto)}">Guardar en ideas</button>`;

const CAPAS = [['asis', 'Asistencia'], ['deberes', 'Deberes'], ['trabajo', 'Trabajo'], ['actitud', 'Actitud']];
function tabDirecto(key, g, f, fecha) {
  const r = reg(key); const cp = UI.capa; const mode = UI.liveMode;
  const presentes = g.alumnos.filter(a => !['F', 'J'].includes(r.asis[a.id]));
  const fuera = r.bano.filter(b => b.permitido && !b.vuelve);
  const enEspera = r.espera || [];
  const restante = fecha === todayStr() ? tmin(f.fin) - nowMin() : null;
  return `<div class="live-bar"><div class="row">
      <div class="seg" role="group" aria-label="Qué registras">${CAPAS.map(([v, t]) => `<button data-a="capa" data-v="${v}" aria-pressed="${mode === 'capa' && cp === v}">${t}</button>`).join('')}</div>
      <button class="btn modebtn" data-a="sortear">🎲 Sortear</button>
      <button class="btn modebtn" data-a="lmode" data-v="bano" aria-pressed="${mode === 'bano'}">🚻 Baño</button>
      <button class="btn modebtn" data-a="lmode" data-v="nota" aria-pressed="${mode === 'nota'}">📝 Nota</button></div>
    <div class="small muted">${presentes.length}/${g.alumnos.length} presentes${restante !== null && restante > 0 && restante <= tmin(f.fin) - tmin(f.inicio) ? ` · quedan ${restante} min` : ''}</div></div>
    ${fuera.length || enEspera.length ? `<div class="alert info" style="margin-bottom:10px"><span class="grow">${fuera.length ? `🚻 Fuera: ${fuera.map(b => `<b>${esc(alNombre(g, b.alumnoId))}</b> (${Math.max(0, Math.round((Date.now() - b.sale) / 60000))} min)`).join(', ')}` : ''}${fuera.length && enEspera.length ? ' · ' : ''}${enEspera.length ? `En espera: ${enEspera.map(e => esc(alNombre(g, e.alumnoId))).join(', ')}` : ''}</span></div>` : ''}
    <p class="small muted" style="margin:0 0 8px">${mode === 'bano' ? 'Toca a quien pide ir al baño (o a quien vuelve).' : mode === 'nota' ? 'Toca a un alumno para anotar algo.' : cp === 'asis' ? 'Todos están presentes por defecto: toca solo las excepciones (retraso → falta → justificada).' : cp === 'actitud' ? 'Toca a un alumno para ponerle una nota del 1 al 5 y etiquetas.' : 'Toca para cambiar: sí → a medias → no → sin marcar.'}</p>
    ${g.plano ? `<div class="row" style="margin-bottom:8px"><div class="seg">${[['lista', 'Lista'], ['plano', 'Plano de clase']].map(([v, t]) => `<button data-a="liveview" data-v="${v}" aria-pressed="${(UI.liveView || 'lista') === v}">${t}</button>`).join('')}</div></div>` : ''}
    ${g.alumnos.length ? (UI.liveView === 'plano' && g.plano ? planoHTML(g, (a) => a ? cardAl(a) : '<div class="seat empty" style="cursor:default"></div>') : `<div class="sgrid">${g.alumnos.map(a => cardAl(a)).join('')}</div>`) : `<div class="panel empty">Este grupo no tiene alumnos. Añádelos en Grupos → ${esc(g.nombre)} → Alumnado.</div>`}
    ${r.notas.length ? `<div class="panel" style="margin-top:14px"><h3>Notas de hoy</h3><div class="list">${r.notas.map(n => `<div class="li small"><b>${esc(alNombre(g, n.alumnoId))}</b><span class="grow">${esc(n.texto)}</span></div>`).join('')}</div></div>` : ''}`;
  function cardAl(a) {
      const as = r.asis[a.id]; const out = fuera.find(b => b.alumnoId === a.id); const v = cp === 'asis' ? as : r[cp][a.id];
      const av = cp === 'actitud' ? actVal(v) : null;
      const badge = mode !== 'capa' ? '' : cp === 'asis' ? (as ? `<span class="pill v-${as}">${ASIS[as]}</span>` : `<span class="tiny muted">Presente</span>`)
        : cp === 'actitud' ? (av ? `${av.n ? `<span class="pill ${av.n >= 4 ? 'ok' : av.n === 3 ? 'warn' : 'bad'}">${av.n}/5</span>` : ''}${(av.tags || []).map(t => `<span class="pill ${ACT_POS.includes(t) ? 'ok' : 'bad'}">${ACT_POS.includes(t) ? '+' : '−'} ${esc(t)}</span>`).join('')}` : `<span class="tiny muted">—</span>`)
        : (v ? `<span class="pill v-${v}">${VAL3[v]}</span>` : `<span class="tiny muted">—</span>`);
      const nPreg = r.sorteos.filter(x => x.alumnoId === a.id && x.val && x.val !== 'skip'); const last = nPreg[nPreg.length - 1];
      return `<button class="scard ${['F', 'J'].includes(as) ? 'absent' : ''} ${out ? 'out' : ''}" data-a="tapal" data-id="${a.id}">
        <span class="nm">${numPre(a)}${esc(a.nombre)}</span><span class="row" style="gap:4px"><span class="icons">${a.tags?.includes('TDAH') ? 'TDAH ' : ''}${a.pendiente && !a.pendRecuperada ? 'Pte. ' : ''}${r.notas.some(n => n.alumnoId === a.id) ? '📝' : ''}</span>${badge}${out ? `<span class="pill info">Fuera ${Math.max(0, Math.round((Date.now() - out.sale) / 60000))}′</span>` : ''}${last ? `<span class="pill ${last.val === 'bien' ? 'ok' : last.val === 'regular' ? 'warn' : 'bad'}">🎲 ${SORTEO[last.val]}</span>` : ''}</span></button>`;
  }
}

