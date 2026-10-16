'use strict';
/* ===== AGENDA (calendario) ===== */
VIEWS.agenda = () => {
  const hoy = todayStr(); const m = parseD(UI.agMonth || hoy); const first = ymd(new Date(m.getFullYear(), m.getMonth(), 1));
  let d = mondayOf(first); const cells = [];
  for (let w = 0; w < 6; w++) { for (let i = 0; i < 7; i++) cells.push(addDays(d, i)); d = addDays(d, 7); if (parseD(d).getMonth() !== m.getMonth()) break; }
  const byDay = {}; S.agenda.forEach(a => { if (a.fecha) (byDay[a.fecha] = byDay[a.fecha] || []).push(a); });
  Object.values(byDay).forEach(l => l.sort((a, b) => (a.done - b.done) || (a.hora || '99').localeCompare(b.hora || '99')));
  const venc = S.agenda.filter(a => !a.done && a.fecha && a.fecha < hoy).sort((a, b) => a.fecha.localeCompare(b.fecha));
  const prox = S.agenda.filter(a => !a.done && a.fecha >= hoy && a.fecha <= addDays(hoy, 14)).sort((a, b) => a.fecha.localeCompare(b.fecha) || (a.hora || '').localeCompare(b.hora || ''));
  const item = a => `<div class="li"><input type="checkbox" data-f="agdone" data-id="${a.id}" ${a.done ? 'checked' : ''} aria-label="Hecho"><button class="grow" data-a="agday" data-d="${a.fecha}" style="border:0;background:none;text-align:left;cursor:pointer;padding:0"><b>${esc(a.titulo)}</b>
    <div class="small muted">${fShort(a.fecha)} · ${rel(diffDays(hoy, a.fecha))}${a.hora ? ' · ' + esc(a.hora) : ''}${a.grupoId ? ' · ' + esc(grupo(a.grupoId)?.nombre || '') : ''}${a.tipo !== 'tarea' ? ' · ' + TIPOS_AG[a.tipo] : ''}</div></button></div>`;
  return `<div class="page-head"><div><div class="label">Agenda</div><h1>${cap(MESES[m.getMonth()])} ${m.getFullYear()}</h1><div class="sub">Pulsa un día para apuntar algo. Los avisos salen en «Hoy» el día antes y el mismo día.</div></div>
    <div class="row"><button class="btn sm" data-a="agnav" data-d="-1" aria-label="Mes anterior">‹</button><button class="btn sm" data-a="agnav" data-d="0">Hoy</button><button class="btn sm" data-a="agnav" data-d="1" aria-label="Mes siguiente">›</button></div></div>
  <div class="cols"><div><div class="cal">${['L', 'M', 'X', 'J', 'V', 'S', 'D'].map(x => `<div class="ch">${x}</div>`).join('')}${cells.map(x => {
      const l = byDay[x] || []; const fest = dow(x) <= 5 && festivoDe(x) && !['Antes del inicio de curso', 'Fuera del curso'].includes(festivoDe(x)) ? festivoDe(x) : null;
      return `<button class="cday ${parseD(x).getMonth() !== m.getMonth() ? 'out' : ''} ${dow(x) > 5 ? 'we' : ''} ${fest ? 'fest' : ''} ${x === hoy ? 'today' : ''}" data-a="agday" data-d="${x}" aria-label="${fLong(x)}${l.length ? ', ' + l.length + ' anotaciones' : ''}">
        <span class="n"><span>${parseD(x).getDate()}</span><span class="add">+</span></span>${fest ? `<span class="chip" style="background:none;color:var(--muted)">${esc(fest)}</span>` : ''}
        ${l.slice(0, 3).map(a => `<span class="chip ${a.tipo} ${a.done ? 'done' : ''}">${a.hora ? esc(a.hora) + ' ' : ''}${esc(a.titulo)}</span>`).join('')}${l.length > 3 ? `<span class="tiny muted">+${l.length - 3} más</span>` : ''}
        ${l.filter(a => !a.done).length ? `<span class="cnt">● ${l.filter(a => !a.done).length}</span>` : ''}</button>`;
    }).join('')}</div></div>
  <div class="stack">
    ${venc.length ? `<div class="panel"><h3>Vencidas <span class="muted small">${venc.length}</span></h3><div class="list">${venc.map(item).join('')}</div></div>` : ''}
    <div class="panel"><h3>Próximos 14 días</h3>${prox.length ? `<div class="list">${prox.map(item).join('')}</div>` : '<p class="empty">Nada apuntado.</p>'}</div>
    <p class="tiny muted">La app no envía notificaciones al móvil (harían falta un servidor): los avisos se ven al abrirla.</p>
  </div></div>`;
};
function agModal(fecha, still) {
  UI.agModalDay = fecha;
  const l = S.agenda.filter(a => a.fecha === fecha).sort((a, b) => (a.done - b.done) || (a.hora || '99').localeCompare(b.hora || '99'));
  const fest = festivoDe(fecha); const ses = sesionesDia(fecha);
  modal(`<div class="row between"><h2 style="margin:0">${cap(fLong(fecha))}</h2><button class="iconbtn" data-a="close" aria-label="Cerrar">✕</button></div>
    <p class="small muted" style="margin:4px 0 12px">${fest && dow(fecha) <= 5 ? esc(fest) + ' · ' : ''}${ses.length ? ses.length + ' clases: ' + ses.map(x => esc(x.grupo.nombre)).join(', ') : 'Sin clases'}</p>
    ${l.length ? `<div class="list" style="margin-bottom:12px">${l.map(a => `<div class="li"><input type="checkbox" data-f="agdone" data-id="${a.id}" ${a.done ? 'checked' : ''} aria-label="Hecho"><div class="grow" style="${a.done ? 'text-decoration:line-through;opacity:.6' : ''}">${a.hora ? `<b>${esc(a.hora)}</b> · ` : ''}${esc(a.titulo)}${a.tipo !== 'tarea' ? ' ' + pill(a.tipo === 'examen' ? 'bad' : a.tipo === 'entrega' ? 'info' : 'off', TIPOS_AG[a.tipo]) : ''}<div class="tiny muted">${a.grupoId ? esc(grupo(a.grupoId)?.nombre || '') + ' · ' : ''}${a.planKey ? 'desde la planificación · ' : ''}${a.notas ? esc(a.notas) : ''}</div></div>${a.planKey ? `<button class="btn sm ghost" data-a="sesion" data-k="${esc(a.planKey)}" data-tab="preparar">Sesión</button>` : ''}<button class="iconbtn" data-a="delag" data-id="${a.id}" aria-label="Borrar">✕</button></div>`).join('')}</div>` : ''}
    <div class="stack" style="gap:10px;border-top:1px solid var(--line);padding-top:12px">
      <label class="f">Qué tienes pendiente<input type="text" id="ag-t" placeholder="Corregir exámenes, llamar a la familia de…" autocomplete="off"></label>
      <div class="fgrid"><label class="f">Hora (opcional)<input type="time" id="ag-h"></label>
        <label class="f">Tipo<select id="ag-tipo">${Object.entries(TIPOS_AG).map(([v, t]) => `<option value="${v}">${t}</option>`).join('')}</select></label>
        <label class="f">Grupo (opcional)<select id="ag-g"><option value="">—</option>${S.grupos.map(g => `<option value="${g.id}">${esc(g.nombre)}</option>`).join('')}</select></label></div>
      <details><summary class="small" style="cursor:pointer">Más opciones: notas y recordatorios</summary><div class="stack" style="gap:8px;margin-top:8px">
        <label class="f">Notas<input type="text" id="ag-n"></label>
        <div class="row"><label class="check small"><input type="checkbox" id="ag-r7">1 semana antes</label><label class="check small"><input type="checkbox" id="ag-r3">3 días antes</label><label class="check small"><input type="checkbox" id="ag-r1" checked>El día antes</label><label class="check small"><input type="checkbox" id="ag-r0" checked>El mismo día</label></div></div></details>
      <div class="row"><button class="btn primary" data-a="addag">Apuntar</button><button class="btn" data-a="close">Cerrar</button></div></div>`, still);
  setTimeout(() => $('#ag-t')?.focus(), 30);
}
function refreshAgModal() { if (UI.agModalDay && $('#modal').innerHTML) agModal(UI.agModalDay, true); }

/* ===== IDEAS ===== */
VIEWS.ideas = () => {
  const F = UI.ideasF; const q = words(F.q);
  const list = S.ideas.filter(i => (!F.tipo || i.tipo === F.tipo) && (!F.apt || apartadoIdea(i) === F.apt) && (!F.sin || !(i.etiquetas || []).length) && (!q || words([i.titulo, i.texto, (i.etiquetas || []).join(' ')].join(' ')).includes(q))).sort((a, b) => (b.creada || '').localeCompare(a.creada || ''));
  return `<div class="page-head"><div><div class="label">Banco de ideas</div><h1>Ideas</h1><div class="sub">Apunta aquí actividades, anécdotas, noticias o datos curiosos. Cada idea va a un apartado de la sesión (consejos, motivación, actividades o recursos) y te aparecerá al pulsar «Sugerir» en ese apartado si los temas coinciden con sus etiquetas.</div></div>
    <div class="row"><button class="btn sm" data-a="expideas">Exportar ideas</button><button class="btn sm" data-a="impideas">Importar ideas</button></div></div>
  <div class="cols"><div class="stack">
    <div class="row"><input type="search" placeholder="Buscar" value="${esc(F.q)}" data-f="ideasq" style="max-width:260px"><select data-f="ideasapt" style="max-width:230px" aria-label="Apartado"><option value="">Todos los apartados</option>${APARTADOS.map(([k, t]) => `<option value="${k}" ${F.apt === k ? 'selected' : ''}>${t}</option>`).join('')}</select><select data-f="ideastipo" style="max-width:200px"><option value="">Todos los tipos</option>${TIPOS_IDEA.map(t => `<option ${F.tipo === t ? 'selected' : ''}>${t}</option>`).join('')}</select>
      <label class="check small"><input type="checkbox" data-f="ideassin" ${F.sin ? 'checked' : ''}>Sin clasificar</label><span class="small muted">${list.length} de ${S.ideas.length}</span></div>
    ${list.length ? `<div class="cards">${list.map(i => `<div class="card idea"><div class="row between" style="flex-wrap:nowrap;align-items:flex-start"><span style="flex:1;min-width:0"><span class="tag aptag">${esc(APT[apartadoIdea(i)])}</span><span class="tag">${esc(i.tipo || 'Sin tipo')}</span></span><span class="row" style="gap:2px;flex:none"><button class="iconbtn" data-a="editidea" data-id="${i.id}" aria-label="Editar">✎</button><button class="iconbtn" data-a="delidea" data-id="${i.id}" aria-label="Borrar">✕</button></span></div>
      ${i.titulo ? `<b>${esc(i.titulo)}</b>` : ''}${i.texto ? `<div class="txt">${esc(i.texto)}</div>` : ''}${i.url ? `<a href="${esc(i.url)}" target="_blank" rel="noopener" class="small" style="overflow-wrap:anywhere">${esc(i.url)}</a>` : ''}
      <div>${(i.etiquetas || []).map(t => `<span class="tag">#${esc(t)}</span>`).join('') || '<span class="pill warn">Sin etiquetas</span>'}</div>
      <div class="tiny muted">${i.ambito === 'grupo' ? 'Solo ' + esc(grupo(i.grupoId)?.nombre || 'un grupo') : i.ambito === 'nivel' ? 'Solo ' + esc(i.nivel) : 'Todos los cursos'}${i.usos?.length ? ' · usada ' + i.usos.length + ' ' + (i.usos.length === 1 ? 'vez' : 'veces') : ' · sin usar'}${i.origen ? ' · importada' : ''}</div></div>`).join('')}</div>` : `<div class="panel empty">${S.ideas.length ? 'Ninguna idea coincide con el filtro.' : 'Aún no tienes ideas. Apunta la primera en el formulario.'}</div>`}
  </div>
  <div class="panel stack" id="ideaform">${ideaForm(UI.editIdea ? S.ideas.find(i => i.id === UI.editIdea) : null)}</div></div>`;
};
function ideaForm(i) {
  i = i || {};
  return `<h3>${i.id ? 'Editar idea' : 'Apuntar idea'}</h3>
    <label class="f">Título<input type="text" id="id-t" value="${esc(i.titulo || '')}" placeholder="Marie Tharp y el mapa del fondo oceánico"></label>
    <label class="f">Idea<textarea id="id-x" rows="4" placeholder="Escribe la idea tal cual se te ocurra">${esc(i.texto || '')}</textarea></label>
    <label class="f">¿Para qué apartado de la sesión es?<select id="id-apt"><option value="">Elige un apartado…</option>${APARTADOS.map(([k, t]) => `<option value="${k}" ${(i.apartado || (i.id ? apartadoIdea(i) : '')) === k ? 'selected' : ''}>${t}</option>`).join('')}</select></label>
    <label class="f">Enlace (opcional)<input type="url" id="id-u" value="${esc(i.url || '')}" placeholder="https://…"></label>
    <div class="fgrid"><label class="f">Tipo<select id="id-tipo">${TIPOS_IDEA.map(t => `<option ${i.tipo === t ? 'selected' : ''}>${t}</option>`).join('')}</select></label>
    <label class="f">Para<select id="id-amb"><option value="todos">Todos los cursos</option>${[...new Set(S.grupos.map(g => g.nivel).filter(Boolean))].map(n => `<option value="nivel:${esc(n)}" ${i.ambito === 'nivel' && i.nivel === n ? 'selected' : ''}>Solo ${esc(n)}</option>`).join('')}${S.grupos.map(g => `<option value="grupo:${g.id}" ${i.ambito === 'grupo' && i.grupoId === g.id ? 'selected' : ''}>Solo ${esc(g.nombre)}</option>`).join('')}</select></label></div>
    <label class="f">Temas / etiquetas (separadas por comas)<input type="text" id="id-e" value="${esc((i.etiquetas || []).join(', '))}" placeholder="tectónica, placas, mujeres científicas"></label>
    <div class="row"><button class="btn primary" data-a="saveidea" data-id="${i.id || ''}">${i.id ? 'Guardar cambios' : 'Guardar idea'}</button>${i.id ? '<button class="btn" data-a="canceledit">Cancelar</button>' : ''}</div>
    <p class="tiny muted" style="margin:0">Las etiquetas son la clave: si escribes «volcanes», la idea saldrá en cualquier sesión cuyo título o etiquetas mencionen volcanes, dentro del apartado que elijas.</p>`;
}

function avisoFestivo(e) {
  if (!e.desde) return `<div class="small" style="color:var(--bad);margin:-4px 0 4px">⚠ Falta la fecha de inicio (comprueba que tenga día, mes y año).</div>`;
  if (e.hasta && e.hasta < e.desde) return `<div class="small" style="color:var(--bad);margin:-4px 0 4px">⚠ La fecha final es anterior a la inicial.</div>`;
  const dias = []; for (let d = e.desde; d <= (e.hasta || e.desde) && dias.length < 60; d = addDays(d, 1)) if (dow(d) <= 5) dias.push(d);
  return `<div class="small muted" style="margin:-4px 0 4px">✓ Sin clase ${dias.length === 1 ? 'el ' + fShort(dias[0]) : dias.length ? `${dias.length} días lectivos: ${fShort(dias[0])} a ${fShort(dias[dias.length - 1])}` : '(cae en fin de semana)'}</div>`;
}
/* ===== AJUSTES ===== */
VIEWS.ajustes = () => {
  const c = S.config; const frs = franjasOrd(); const P = c.pesos;
  return `<div class="page-head"><div><div class="label">Ajustes</div><h1>Mi curso</h1><div class="sub">Fechas, horario y ponderaciones. Al cambiar de instituto, empieza un curso nuevo aquí.</div></div></div>
  <div class="stack">
  <div class="panel stack"><h2>Curso</h2><div class="fgrid"><label class="f">Nombre<input type="text" value="${esc(c.curso)}" data-f="cfg" data-k="curso" placeholder="2026-27 · IES …"></label>
    <label class="f">Inicio de las clases<input type="date" value="${esc(c.inicio)}" data-f="cfg" data-k="inicio"></label><label class="f">Fin de las clases<input type="date" value="${esc(c.fin)}" data-f="cfg" data-k="fin"></label></div>
    <div class="label">Evaluaciones</div>${c.evaluaciones.map(e => `<div class="row"><input type="text" value="${esc(e.nombre)}" data-f="cfglist" data-list="evaluaciones" data-id="${e.id}" data-k="nombre" style="flex:1;min-width:140px"><label class="f" style="flex-direction:row;align-items:center">Termina<input type="date" value="${esc(e.fin)}" data-f="cfglist" data-list="evaluaciones" data-id="${e.id}" data-k="fin"></label><button class="iconbtn" data-a="cfgdel" data-list="evaluaciones" data-id="${e.id}" aria-label="Quitar">✕</button></div>`).join('')}
    <button class="btn sm ghost" data-a="cfgadd" data-list="evaluaciones" style="align-self:flex-start">+ Añadir evaluación</button>
    <div class="label">Festivos y días sin clase</div>${c.festivos.map(e => `<div class="row"><input type="text" value="${esc(e.nombre)}" placeholder="Nombre" data-f="cfglist" data-list="festivos" data-id="${e.id}" data-k="nombre" style="flex:1;min-width:140px"><input type="date" value="${esc(e.desde)}" data-f="cfglist" data-list="festivos" data-id="${e.id}" data-k="desde" style="width:auto" aria-label="Desde"><span class="small muted">a</span><input type="date" value="${esc(e.hasta || '')}" data-f="cfglist" data-list="festivos" data-id="${e.id}" data-k="hasta" style="width:auto" aria-label="Hasta"><button class="iconbtn" data-a="cfgdel" data-list="festivos" data-id="${e.id}" aria-label="Quitar">✕</button></div>${avisoFestivo(e)}`).join('')}
    <button class="btn sm ghost" data-a="cfgadd" data-list="festivos" style="align-self:flex-start">+ Añadir festivo o vacaciones</button></div>

  <div class="panel stack"><h2>Franjas horarias</h2><p class="small muted" style="margin:0">Las horas de clase del instituto (sin el recreo).</p>
    ${frs.map(f => `<div class="row"><input type="time" value="${esc(f.inicio)}" data-f="cfglist" data-list="franjas" data-id="${f.id}" data-k="inicio" style="width:auto" aria-label="Inicio"><span class="muted">–</span><input type="time" value="${esc(f.fin)}" data-f="cfglist" data-list="franjas" data-id="${f.id}" data-k="fin" style="width:auto" aria-label="Fin"><button class="iconbtn" data-a="cfgdel" data-list="franjas" data-id="${f.id}" aria-label="Quitar">✕</button></div>`).join('')}
    <button class="btn sm ghost" data-a="cfgadd" data-list="franjas" style="align-self:flex-start">+ Añadir franja</button></div>

  <div class="panel stack"><h2>Horario semanal</h2><p class="small muted" style="margin:0">Elige el grupo de cada hora y el número de aula. También puedes marcar guardias, complementarias (AC), atención a familias (AT) y reuniones; aparecerán en «Hoy» y en la semana. ${S.grupos.length ? '' : 'Primero crea tus grupos en <a href="#" data-a="go" data-v="grupos">Grupos</a>.'}</p>
    ${frs.length ? `<div class="wk-wrap"><table class="wk"><tr><th></th>${[1, 2, 3, 4, 5].map(d => `<th>${DIAS[d]}</th>`).join('')}</tr>${frs.map(f => `<tr><td>${esc(f.inicio)}</td>${[1, 2, 3, 4, 5].map(d => { const h = c.horario.find(x => x.dia === d && x.franjaId === f.id); return `<td><select data-f="hor" data-d="${d}" data-fr="${f.id}" aria-label="${DIAS[d]} ${esc(f.inicio)}"><option value="">—</option>${S.grupos.length ? `<optgroup label="Clases">${S.grupos.map(g => `<option value="${g.id}" ${!h?.tipo && h?.grupoId === g.id ? 'selected' : ''}>${esc(g.nombre)}</option>`).join('')}</optgroup>` : ''}<optgroup label="Otras horas">${Object.entries(OTROS).map(([k, t]) => `<option value="o:${k}" ${h?.tipo === k ? 'selected' : ''}>${esc(t)}</option>`).join('')}</optgroup></select>${h ? `<input type="text" placeholder="${!h.tipo || h.tipo === 'ae' ? 'Aula' : 'Lugar o detalle'}" value="${esc(h.aula || '')}" data-f="horaula" data-d="${d}" data-fr="${f.id}" style="margin-top:4px" aria-label="${!h.tipo || h.tipo === 'ae' ? 'Aula' : 'Lugar o detalle'}">` : ''}</td>`; }).join('')}</tr>`).join('')}</table></div>` : '<p class="empty">Añade primero las franjas horarias.</p>'}</div>

  <div class="panel stack"><h2>Valores de los registros</h2><p class="small muted" style="margin:0">Qué número vale cada marca en el seguimiento. Las preguntas del sorteo cuentan como un ítem más de trabajo en clase; las ponderaciones de la nota se configurarán en la evaluación (última fase).</p>
    <div class="label">Valor de deberes y trabajo</div><div class="fgrid">${[['si', 'Sí'], ['medias', 'A medias'], ['no', 'No']].map(([k, t]) => `<label class="f">${t}<input type="number" step="0.5" value="${P.val3[k]}" data-f="peso" data-g="val3" data-k="${k}"></label>`).join('')}</div>
    <div class="label">Valor de las respuestas del sorteo</div><div class="fgrid">${[['bien', 'Bien'], ['regular', 'Regular'], ['no', 'No sabe']].map(([k, t]) => `<label class="f">${t}<input type="number" step="0.5" value="${P.sorteo[k]}" data-f="peso" data-g="sorteo" data-k="${k}"></label>`).join('')}</div>
    <label class="f" style="max-width:300px">Avisar de exámenes sin comunicar con (días de antelación)<input type="number" value="${c.avisos.examenDias}" data-f="aviso" data-k="examenDias"></label></div>

  <div class="panel stack"><h2>Tus datos</h2>
    <p class="small" style="margin:0">${Store.mode === 'db' ? `Se guardan en este dispositivo y en tu ${esc(Nube.nubeNombre)}, en la carpeta <b>${Nube.proveedor === 'google' ? 'BIOSOFÍA' : 'Aplicaciones › BIOSOFÍA'}</b>. Solo tú los ves; si otra persona usa la app, entra con su cuenta y tiene su propio cuaderno vacío.` : 'Se están guardando <b>solo en este navegador</b>. Exporta copias con frecuencia o entra con tu cuenta desde el botón ⌂ de arriba.'}</p>
    ${Store.mode === 'db' ? `<label class="check"><input type="checkbox" data-nube="alumnado" ${Nube.alumnadoLocal ? 'checked' : ''}> Guardar los datos del alumnado solo en el dispositivo (sin sincronizar)</label>
    <p class="tiny muted" style="margin:0">Grupos y alumnado, registros de clase, calificaciones y materias pendientes. ${Nube.alumnadoLocal ? 'Ahora no se sincronizan: cada dispositivo guarda su propia copia; exporta copias de vez en cuando.' : `Ahora se sincronizan en todos tus dispositivos a través de tu ${esc(Nube.nubeNombre)}.`} Esta opción es de tu cuenta: al cambiarla aquí, cambia en todos los dispositivos donde entres.</p>` : ''}
    ${Store.mode === 'db' ? '<button class="btn sm ghost" data-a="verregistro" style="align-self:flex-start">Ver el registro de inicios de sesión</button>' : ''}
    <div class="row"><button class="btn" data-a="exportar">Exportar copia completa</button><button class="btn" data-a="importar">Importar copia</button>${S.grupos.length ? '' : '<button class="btn" data-a="ejemplo">Cargar datos de ejemplo</button>'}</div>
    ${UI.confirm === 'borrar' ? `<div class="alert bad"><span class="grow">Se borrarán todos tus grupos, sesiones, agenda, ideas y pendientes. Exporta antes una copia si la quieres conservar.</span><button class="btn sm danger" data-a="borrar-ok">Borrar todo</button><button class="btn sm" data-a="cancel">Cancelar</button></div>` : `<button class="btn danger" data-a="confirm" data-c="borrar" style="align-self:flex-start">Borrar todos los datos</button>`}
    ${S.grupos.some(g => g.ejemplo) ? `<button class="btn sm" data-a="quitarejemplo" style="align-self:flex-start">Quitar los datos de ejemplo</button>` : ''}</div>
  </div>`;
};

