'use strict';
/* ===== GRUPOS ===== */
VIEWS.grupos = () => {
  const hoy = todayStr();
  return `<div class="page-head"><div><div class="label">Mis grupos</div><h1>Grupos</h1><div class="sub">Cada grupo es una materia con un curso concreto. Su horario se define en Ajustes.</div></div>
    <button class="btn primary" data-a="nuevogrupo">Nuevo grupo</button></div>
    ${S.grupos.length ? `<div class="cards">${S.grupos.map(g => {
      const next = ocurrencias(g.id, hoy, addDays(hoy, 30))[0]; const pg = pendGrupo(g.id).filter(p => !p.done).length;
      return `<button class="card click" data-a="go" data-v="grupo" data-g="${g.id}"><div class="stripe" style="background:var(--${g.color || 'g1'})"></div>
        <h3>${esc(g.nombre)} ${g.ejemplo ? pill('info', 'Ejemplo') : ''}${g.asig ? '' : ' ' + pill('warn', 'Elige asignatura')}</h3><div class="small muted">${esc(g.materia || '')}${g.nivel ? ' · ' + esc(g.nivel) : ''} · ${IDIOMAS[g.idioma || 'es']}</div>
        <div class="small">${g.alumnos.length} alumnos · ${S.config.horario.filter(h => h.grupoId === g.id).length} h/semana</div>
        <div class="small">${next ? 'Próxima: ' + fShort(next.fecha) + ' ' + esc(next.franja.inicio) : '<span class="muted">Sin horario asignado</span>'}${pg ? ' · ' + pg + ' pendientes' : ''}</div></button>`;
    }).join('')}</div>` : `<div class="panel empty">Todavía no tienes grupos. Crea el primero o prueba con datos de ejemplo.<div class="row" style="margin-top:10px"><button class="btn primary" data-a="nuevogrupo">Nuevo grupo</button><button class="btn" data-a="ejemplo">Datos de ejemplo</button></div></div>`}`;
};
VIEWS.grupo = () => {
  const g = grupo(UI.grupoId); if (!g) { UI.view = 'grupos'; return VIEWS.grupos(); }
  if (UI.grupoTab === 'sesiones') UI.grupoTab = 'alumnado';
  const t = UI.grupoTab; let body = '';
  if (t === 'sesiones') {
    const hoy = todayStr(); const occ = ocurrencias(g.id, ...cursoRango());
    const lista = UI.verTodas ? occ : occ.filter(o => o.fecha >= addDays(hoy, -14) && o.fecha <= addDays(hoy, 42));
    body = !occ.length ? `<div class="panel empty">Este grupo no tiene horas asignadas. Añádelas en <a href="#" data-a="go" data-v="ajustes">Ajustes → Horario</a>.</div>` :
      `<div class="panel"><div class="panel-title"><span class="small muted">${occ.length} sesiones en el curso</span><button class="btn sm ghost" data-a="vertodas">${UI.verTodas ? 'Ver solo próximas' : 'Ver todo el curso'}</button></div>
      <div class="tablewrap"><table class="data"><tr><th>Nº</th><th>Fecha</th><th>Hora</th><th>Sesión</th><th>Estado</th><th>Cierre</th></tr>
      ${lista.map(o => { const p = S.planes[o.key]; const st = estadoPlan(o.key); const n = occ.indexOf(o) + 1; return `<tr style="${o.fecha === hoy ? 'background:var(--accent-soft)' : ''}"><td class="num">${n}</td><td>${fShort(o.fecha)}</td><td>${esc(o.franja.inicio)}</td>
        <td><a href="#" data-a="sesion" data-k="${esc(o.key)}">${p?.sinClase ? 'Sin clase · ' + esc(p.motivo || '') : esc(p?.titulo || 'Sin planificar')}</a></td><td>${pill(st.c, st.t)}</td><td>${p?.cierre?.hecho ? pill(p.cierre.estado === 'completa' ? 'ok' : 'warn', p.cierre.estado === 'completa' ? 'Completa' : 'Parcial') : o.fecha < hoy && st.c !== 'off' && st.c !== 'bad' ? pill('off', 'Sin cerrar') : ''}</td></tr>`; }).join('')}</table></div></div>`;
  } else if (t === 'alumnado') {
    const nPend = g.alumnos.filter(a => a.pendiente).length;
    body = `<div class="cols"><div class="panel"><h3>${g.alumnos.length} alumnos${nPend ? ` <span class="small muted">· ${nPend} con materia pendiente (${g.alumnos.filter(a => a.pendiente && !a.pendRecuperada).length} sin recuperar)</span>` : ''}</h3>
      ${g.alumnos.length ? `<div class="row small" style="margin-bottom:8px;gap:6px"><span class="muted">Nº de lista:</span><button class="btn sm ghost" data-a="alnumerar">Numerar 1–${g.alumnos.length} en el orden actual</button>${g.alumnos.some(a => a.num) ? `<button class="btn sm ghost" data-a="alsinnum">Quitar los números</button>` : ''}</div>${(() => { const rep = numsRepetidos(g); return rep.length ? `<p class="small" style="color:var(--warn);margin:0 0 8px">⚠ Número${rep.length > 1 ? 's' : ''} de lista repetido${rep.length > 1 ? 's' : ''}: ${rep.join(', ')}</p>` : ''; })()}<div class="list">${g.alumnos.map(a => `<div class="li" style="flex-wrap:wrap"><input type="number" inputmode="numeric" min="1" step="1" value="${a.num || ''}" placeholder="Nº" data-f="alnum" data-id="${a.id}" style="width:64px;flex:0 0 64px" aria-label="Número de lista" title="Número de lista (opcional). Si lo pones, manda sobre el orden alfabético."><input type="text" value="${esc(a.apellidos || '')}" placeholder="Apellidos" data-f="alnombre" data-k="apellidos" data-id="${a.id}" style="flex:2;min-width:160px" aria-label="Apellidos"><input type="text" value="${esc(a.pila || '')}" placeholder="Nombre" data-f="alnombre" data-k="pila" data-id="${a.id}" style="flex:1;min-width:110px" aria-label="Nombre">
        <div class="row" style="width:100%">${TAGS.map(tg => `<label class="check tiny"><input type="checkbox" data-f="altag" data-id="${a.id}" data-t="${esc(tg)}" ${a.tags?.includes(tg) ? 'checked' : ''}>${esc(tg)}</label>`).join('')}</div>
        <input type="text" placeholder="Observaciones (medidas, permisos…)" value="${esc(a.obs || '')}" data-f="alobs" data-id="${a.id}" style="flex:1"><button class="iconbtn" data-a="delal" data-id="${a.id}" aria-label="Eliminar alumno">✕</button>
        <div class="row" style="width:100%"><input type="text" placeholder="Materia pendiente de otro curso (p. ej. ByG 1.º ESO)" value="${esc(a.pendiente || '')}" data-f="alpend" data-id="${a.id}" style="flex:1;min-width:200px">${a.pendiente ? `<span class="small muted">Recuperada</span><div class="seg"><button data-a="alrecup" data-id="${a.id}" data-v="1" aria-pressed="${!!a.pendRecuperada}">Sí</button><button data-a="alrecup" data-id="${a.id}" data-v="0" aria-pressed="${!a.pendRecuperada}">No</button></div>` : ''}</div></div>`).join('')}</div>` : `<p class="empty">Sin alumnos todavía.</p>`}</div>
      <div class="panel stack"><h3>Añadir alumnos</h3><label class="f">Pega la lista (un alumno por línea)<textarea id="pastealumnos" rows="8" placeholder="Nombre Apellido1 Apellido2&#10;Lucía García Pérez"></textarea></label><button class="btn primary" data-a="addalumnos">Añadir</button>
      <p class="small muted">La primera palabra se toma como nombre y el resto como apellidos. Si la lista viene como «Apellidos, Nombre» (con coma), también se entiende. Los nombres compuestos se corrigen luego en sus casillas. Se ordenan por apellido. Si pones <b>números de lista</b>, mandan sobre el orden alfabético (quien no tenga número va detrás, por apellido). Las etiquetas (TDAH, TEA, dislexia, altas capacidades, ACIS, PT…) aparecen luego en Anotaciones.</p></div></div>`;
  } else if (t === 'plano') {
    if (!g.alumnos.length) body = `<div class="panel empty">Añade primero los alumnos del grupo.</div>`;
    else {
      if (!g.plano) { g.plano = planoDefecto(g); touch('grupos'); }
      limpiarPlano(g); const pl = g.plano; const nAs = pl.filas * pl.mesasFila * pl.tam;
      const sentados = new Set(Object.values(pl.asientos)); const sin = g.alumnos.filter(a => !sentados.has(a.id));
      body = `<div class="stack"><div class="plano-cfg">
        <div class="panel stack"><h3>Distribución</h3>
          <div class="fgrid"><label class="f">Filas<input type="number" min="1" max="12" value="${pl.filas}" data-f="planocfg" data-k="filas"></label>
          <label class="f">Mesas por fila<input type="number" min="1" max="10" value="${pl.mesasFila}" data-f="planocfg" data-k="mesasFila"></label></div>
          <label class="f">Cómo se sientan<select data-f="planocfg" data-k="tam">${MESA_TIPOS.map(([n, t]) => `<option value="${n}" ${pl.tam === n ? 'selected' : ''}>${t}</option>`).join('')}</select></label>
          <p class="small ${nAs < g.alumnos.length ? '' : 'muted'}" style="margin:0;${nAs < g.alumnos.length ? 'color:var(--bad)' : ''}">${nAs} sitios para ${g.alumnos.length} alumnos${nAs < g.alumnos.length ? ': faltan sitios' : ''}.</p></div>
        <div class="panel stack"><h3>Colocar</h3><div class="row"><button class="btn sm" data-a="planoauto" data-v="lista">Por orden de lista</button><button class="btn sm" data-a="planoauto" data-v="azar">Al azar</button><button class="btn sm ghost danger" data-a="planoauto" data-v="vaciar">Vaciar</button></div>
          <p class="tiny muted" style="margin:0">Al colocar automáticamente, el alumnado con TDAH, nouvingut o con nivel adaptado se sitúa en las primeras filas.</p></div>
        <div class="panel"><h3>Sin sitio <span class="muted small">${sin.length}</span></h3>${sin.length ? `<div class="sinsitio">${sin.map(a => `<button class="chipal ${UI.planoSel === a.id ? 'sel' : ''}" data-a="planosel" data-id="${a.id}" draggable="true" data-drag="${a.id}">${esc(a.nombre)}</button>`).join('')}</div>` : '<p class="empty">Todos tienen sitio.</p>'}</div>
      </div><div class="panel stack">
        ${planoHTML(g, (a, k) => `<button class="seat ${a ? '' : 'empty'} ${UI.planoSel && (UI.planoSel === k || (a && UI.planoSel === a.id)) ? 'sel' : ''}" data-a="seat" data-k="${k}" draggable="${a ? 'true' : 'false'}" data-drag="${a ? a.id : ''}">${a ? `${esc(a.pila || a.nombre)}<span class="tg">${esc(a.apellidos || '')}</span>` : '+'}</button>`)}
        <p class="small muted" style="margin:0">Arrastra a los alumnos, o toca uno y luego el sitio donde va. Si el sitio está ocupado, se intercambian.</p></div>
        ${panelReglas(g)}
      </div></div>`;
    }
  } else if (t === 'tutoria' && esTutoria(g)) {
    body = tabTutoria(g);
  } else if (t === 'seguimiento' && UI.segVista === 'sesiones' && g.alumnos.length) {
    body = segToggle() + tablaRegistros(g);
  } else if (t === 'seguimiento') {
    const seg = seguimiento(g.id);
    body = g.alumnos.length ? segToggle() + `<div class="panel"><p class="small muted" style="margin-top:0">Resumen de lo registrado en Anotaciones. Escala: sí ${S.config.pesos.val3.si} · a medias ${S.config.pesos.val3.medias} · no ${S.config.pesos.val3.no}. <b>Trabajo en clase</b> es la media de todos sus ítems: cada registro de trabajo diario y cada pregunta del sorteo cuentan como uno más. Cuánto pesa en la nota se decidirá en la evaluación (última fase).</p>
      <div class="tablewrap"><table class="data"><tr><th>Alumno</th><th>Faltas</th><th>Just.</th><th>Retrasos</th><th>Deberes</th><th>Trabajo diario</th><th>Preguntas</th><th>Trabajo en clase (media)</th><th>Actitud (1–5)</th><th>Baño</th></tr>
      ${g.alumnos.map(a => { const o = seg[a.id]; return `<tr><td>${numPre(a)}${esc(a.nombre)}${(a.tags || []).map(x => ` <span class="tag">${esc(x)}</span>`).join('')}${a.pendiente ? ` <span class="pill ${a.pendRecuperada ? 'ok' : 'warn'}">Pte. ${esc(a.pendiente)}${a.pendRecuperada ? ' ✓' : ''}</span>` : ''}</td><td class="num">${o.F || ''}</td><td class="num">${o.J || ''}</td><td class="num">${o.R || ''}</td><td class="num">${n1(o.debM)} <span class="tiny muted">(${o.deb.length})</span></td><td class="num">${n1(o.traM)}</td><td class="num">${n1(o.pregM)} <span class="tiny muted">(${o.preg.length})</span></td><td class="num"><b>${n1(o.trabajoClase)}</b></td><td class="num">${n1(o.actM)}${Object.keys(o.actTags).length ? `<div class="tiny" style="text-align:right">${Object.entries(o.actTags).map(([t, c]) => `<span style="color:var(--${ACT_POS.includes(t) ? 'ok' : 'bad'})">${esc(t)}${c > 1 ? ' ×' + c : ''}</span>`).join(' · ')}</div>` : ''}</td><td class="num">${o.bano || ''}</td></tr>`; }).join('')}</table></div></div>` : `<div class="panel empty">Añade alumnos para ver su seguimiento.</div>`;
  } else {
    body = `<div class="panel stack" style="max-width:560px"><div class="fgrid"><label class="f">Nombre del grupo<input type="text" value="${esc(g.nombre)}" data-f="gfield" data-k="nombre"></label>
      <label class="f">Nombre de la materia<input type="text" value="${esc(g.materia || '')}" data-f="gfield" data-k="materia"></label>
      <label class="f">Asignatura (competencias e ideas)${asigSelect(g.asig || '', 'data-f="gasig"')}</label>
      <label class="f">Nivel<input type="text" value="${esc(g.nivel || '')}" placeholder="3.º ESO" data-f="gfield" data-k="nivel"></label></div>
      <div><div class="label" style="margin-bottom:6px">Idioma de la asignatura</div><div class="seg">${Object.entries(IDIOMAS).map(([k, t]) => `<button data-a="gidioma" data-v="${k}" aria-pressed="${(g.idioma || 'es') === k}">${t}</button>`).join('')}</div>
      <p class="tiny muted" style="margin:6px 0 0">El menú de la app sigue en castellano. Lo que la app prepare para el alumnado (pantalla de proyección, resumen de la sesión anterior) saldrá en este idioma.</p></div>
      <div><div class="label" style="margin-bottom:6px">Color</div><div class="row">${GCOLORS.map(([c, n]) => `<label class="check small"><input type="radio" name="gcolor" data-f="gcolor" value="${c}" ${g.color === c ? 'checked' : ''}><span class="dot" style="background:var(--${c})"></span>${n}${S.grupos.some(x => x.id !== g.id && x.color === c) ? ' <span class="tiny muted">(en uso)</span>' : ''}</label>`).join('')}</div></div>
      <hr>${UI.confirm === 'delgrupo' ? `<div class="alert bad"><span class="grow">Se borrarán el grupo, su horario, sus sesiones planificadas, sus registros y sus calificaciones. Podrás deshacerlo justo después. Si quieres reutilizar la planificación el curso que viene, guárdala antes como plantilla (Planificación › Rápida › 📋 Plantillas).</span><button class="btn sm danger" data-a="delgrupo-ok">Borrar</button><button class="btn sm" data-a="cancel">Cancelar</button></div>` : `<button class="btn danger" data-a="confirm" data-c="delgrupo" style="align-self:flex-start">Borrar grupo</button>`}</div>`;
  }
  return `<div class="page-head"><div><a href="#" data-a="go" data-v="grupos" class="small">‹ Grupos</a><h1 style="margin-top:4px">${gchip(g)}</h1><div class="sub">${esc(g.materia || '')}${g.nivel ? ' · ' + esc(g.nivel) : ''} · ${IDIOMAS[g.idioma || 'es']} · ${g.alumnos.length} alumnos</div></div>${esTutoria(g) ? '' : `<button class="btn" data-a="calgo" data-g="${g.id}">Calificaciones ›</button>`}</div>
    <div class="tabs" role="tablist">${[['alumnado', 'Alumnado'], ['plano', 'Plano de clase'], ['seguimiento', 'Seguimiento'], ...(esTutoria(g) ? [['tutoria', 'Tutoría']] : []), ['datos', 'Datos del grupo']].map(([v, tt]) => `<button role="tab" aria-selected="${t === v}" data-a="gtab" data-v="${v}">${tt}</button>`).join('')}</div>${body}`;
};

const segToggle = () => `<div class="row between" style="margin-bottom:12px"><div class="seg">${[['resumen', 'Resumen'], ['sesiones', 'Por sesiones (editable)']].map(([v, t]) => `<button data-a="segvista" data-v="${v}" aria-pressed="${(UI.segVista || 'resumen') === v}">${t}</button>`).join('')}</div></div>`;
const CAPAS_SEG = [['asis', 'Asistencia'], ['deberes', 'Deberes'], ['trabajo', 'Trabajo'], ['actitud', 'Actitud'], ['preguntas', 'Preguntas']];
function tablaRegistros(g) {
  const hoy = todayStr(); const capa = UI.segCapa || 'deberes';
  const m0 = parseD(UI.segMes || hoy); const first = ymd(new Date(m0.getFullYear(), m0.getMonth(), 1)); const last = ymd(new Date(m0.getFullYear(), m0.getMonth() + 1, 0));
  const occ = ocurrencias(g.id, first, last < hoy ? last : hoy).filter(o => !S.planes[o.key]?.sinClase);
  const celda = (o, a) => {
    const r = S.regs[o.key] || {}; let html = '';
    if (capa === 'asis') { const v = r.asis?.[a.id]; html = v ? `<span class="pill v-${v}">${v === 'R' ? 'R' : v === 'F' ? 'F' : 'J'}</span>` : '<span class="tiny muted">·</span>'; }
    else if (capa === 'actitud') { const v = actVal(r.actitud?.[a.id]); html = v ? `${v.n ? `<span class="pill ${v.n >= 4 ? 'ok' : v.n === 3 ? 'warn' : 'bad'}">${v.n}</span>` : ''}${(v.tags || []).length ? `<span class="tiny" title="${esc(v.tags.join(', '))}">${v.tags.map(t => ACT_POS.includes(t) ? '+' : '−').join('')}</span>` : ''}` : '<span class="tiny muted">·</span>'; }
    else if (capa === 'preguntas') { const l = (r.sorteos || []).filter(x => x.alumnoId === a.id && x.val && x.val !== 'skip'); html = l.length ? l.map(x => `<span class="pill ${x.val === 'bien' ? 'ok' : x.val === 'regular' ? 'warn' : 'bad'}">${x.val === 'bien' ? 'B' : x.val === 'regular' ? 'R' : 'N'}</span>`).join('') : '<span class="tiny muted">·</span>'; }
    else { const v = r[capa]?.[a.id]; html = v ? `<span class="pill v-${v}">${v === 'si' ? 'Sí' : v === 'medias' ? '½' : 'No'}</span>` : '<span class="tiny muted">·</span>'; }
    return `<td class="rc"><button class="rcell" data-a="segcell" data-k="${esc(o.key)}" data-id="${a.id}" aria-label="${esc(a.nombre)} ${fShort(o.fecha)}">${html}</button></td>`;
  };
  const leyenda = { asis: 'Toca para cambiar: presente (·) → R retraso → F falta → J justificada.', deberes: 'Toca para cambiar: sin marcar → Sí → ½ a medias → No.', trabajo: 'Toca para cambiar: sin marcar → Sí → ½ a medias → No.', actitud: 'Toca para poner nota del 1 al 5 y etiquetas.', preguntas: 'Toca para cambiar: B bien → R regular → N no sabe → quitar.' }[capa];
  return `<div class="panel"><div class="row between" style="margin-bottom:10px"><div class="seg">${CAPAS_SEG.map(([v, t]) => `<button data-a="segcapa" data-v="${v}" aria-pressed="${capa === v}">${t}</button>`).join('')}</div>
    <div class="row"><button class="btn sm" data-a="segmes" data-d="-1" aria-label="Mes anterior">‹</button><b>${cap(MESES[m0.getMonth()])} ${m0.getFullYear()}</b><button class="btn sm" data-a="segmes" data-d="1" aria-label="Mes siguiente">›</button></div></div>
    <p class="small muted" style="margin:0 0 8px">${leyenda} Los cambios se suman al resumen.</p>
    ${occ.length ? `<div class="tablewrap"><table class="data reg"><tr><th class="stick">Alumno</th>${occ.map(o => `<th title="${esc(S.planes[o.key]?.titulo || '')}"><a href="#" data-a="sesion" data-k="${esc(o.key)}" data-tab="directo">${fShort(o.fecha)}</a><div class="tiny muted">${esc(o.franja.inicio)}</div></th>`).join('')}</tr>
      ${g.alumnos.map(a => `<tr><td class="stick">${esc(a.nombre)}</td>${occ.map(o => celda(o, a)).join('')}</tr>`).join('')}</table></div>` : '<p class="empty">No hubo clases este mes (o aún no han llegado).</p>'}</div>`;
}

