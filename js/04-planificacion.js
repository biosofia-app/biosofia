'use strict';
/* ===== PLANIFICACIÓN ===== */
VIEWS.plan = () => {
  if (!S.grupos.length) return vacio();
  const m = UI.planMode, d = UI.planDate, hoy = todayStr();
  let body = '', title = '';
  if (m === 'rapida') {
    const p0 = parseD(d); const mes = p0.getMonth(); const first = ymd(new Date(p0.getFullYear(), mes, 1)); const last = ymd(new Date(p0.getFullYear(), mes + 1, 0));
    title = cap(MESES[mes]) + ' ' + p0.getFullYear();
    const gs = S.grupos; const otrosTipos = UI.qOtros ? [...new Set(S.config.horario.filter(h => h.tipo && OTROS[h.tipo]).map(h => h.tipo))] : [];
    const semanas = []; for (let w = mondayOf(first); w <= last; w = addDays(w, 7)) semanas.push(w);
    body = `<div class="row" style="margin-bottom:10px"><button class="btn sm" data-a="plantillas">📋 Plantillas de planificación</button><label class="check small"><input type="checkbox" data-f="qotros" ${UI.qOtros ? 'checked' : ''}>Mostrar también guardias, AE y otras horas</label><span class="small muted">Escribe directamente el título de cada sesión; se guarda solo.</span></div>
    <div class="stack" style="gap:18px">${semanas.map(w => `<div class="wk-wrap"><table class="qp"><tr><th></th>${gs.map(g => `<th><span class="gchip"><span class="sw" style="background:var(--${g.color || 'g1'})"></span>${esc(g.nombre)}</span></th>`).join('')}${otrosTipos.map(t => `<th>${esc(OTROS_C[t])}</th>`).join('')}</tr>
      ${[0, 1, 2, 3, 4].map(i => { const x = addDays(w, i); const fest = festivoDe(x); const fuera = parseD(x).getMonth() !== mes;
        const dl = `<td class="qd ${x === hoy ? 'today' : ''}">${'LMXJV'[i]} ${parseD(x).getDate()}</td>`;
        if (fest) return `<tr class="${fuera ? 'qout' : ''}">${dl}<td class="qfest" colspan="${gs.length + otrosTipos.length}">${esc(fest)}</td></tr>`;
        const ses = sesionesDia(x);
        return `<tr class="${fuera ? 'qout' : ''}">${dl}${gs.map(g => { const mis = ses.filter(o => o.grupo.id === g.id);
          if (!mis.length) return '<td></td>';
          return `<td class="qc" style="background:color-mix(in srgb, var(--${g.color || 'g1'}) 26%, var(--surface))">${mis.map(o => { const pl = S.planes[o.key];
            return pl?.sinClase ? `<div class="qno">No clase${pl.motivo ? ' · ' + esc(pl.motivo) : ''}</div>` : `<textarea class="qt" data-f="qtitle" data-k="${esc(o.key)}" rows="2" aria-label="${esc(g.nombre)} ${fShort(x)} ${esc(o.franja.inicio)}" title="${esc(o.franja.inicio)}${o.aula ? ' · Aula ' + esc(o.aula) : ''}">${esc(pl?.titulo || '')}</textarea>${(pl?.eventos || []).some(e => e.tipo === 'examen') ? '<span class="qbadge">📝</span>' : ''}`; }).join('<div class="qsep"></div>')}
            <button class="qopen" data-a="sesion" data-k="${esc(mis[0].key)}" data-tab="preparar" title="Abrir la sesión" aria-label="Abrir la sesión">↗</button><button class="qopen" style="top:20px" data-a="bancoideas" data-k="${esc(mis[0].key)}" title="Fijar ideas del banco" aria-label="Fijar ideas del banco">💡</button></td>`; }).join('')}
          ${otrosTipos.map(t => { const h = S.config.horario.some(hh => hh.tipo === t && hh.dia === dow(x)); return `<td ${h ? 'style="background:var(--surface-2)"' : ''}>${h ? `<span class="tiny muted">${esc(S.config.horario.filter(hh => hh.tipo === t && hh.dia === dow(x)).map(hh => franja(hh.franjaId)?.inicio).join(', '))}</span>` : ''}</td>`; }).join('')}</tr>`; }).join('')}</table></div>`).join('')}</div>`;
  } else if (m === 'semana') {
    const lun = mondayOf(d); const dias = [0, 1, 2, 3, 4].map(i => addDays(lun, i)); const frs = franjasOrd();
    title = `Semana del ${parseD(lun).getDate()} de ${MESES[parseD(lun).getMonth()]}`;
    body = `<div class="wk-wrap"><table class="wk"><tr><th></th>${dias.map(x => `<th class="${x === hoy ? 'today' : ''}">${DIAS_C[dow(x)]} ${parseD(x).getDate()}${festivoDe(x) ? `<div class="tiny muted">${esc(festivoDe(x))}</div>` : ''}</th>`).join('')}</tr>
      ${frs.map(f => `<tr><td>${esc(f.inicio)}<br>${esc(f.fin)}</td>${dias.map(x => {
        const fest = festivoDe(x);
        const h = S.config.horario.find(h => h.dia === dow(x) && h.franjaId === f.id && (grupo(h.grupoId) || OTROS[h.tipo]));
        if (!h) return `<td class="${fest ? 'fest' : ''}"></td>`;
        if (h.tipo) return `<td class="${fest ? 'fest' : ''}">${fest ? '' : `<div class="cell otro"><span class="t">${esc(OTROS_C[h.tipo])}</span>${h.aula ? `<br><span class="m">${h.tipo === 'ae' && /^\w{1,6}$/.test(h.aula) ? 'Aula ' : ''}${esc(h.aula)}</span>` : ''}</div>`}</td>`;
        const g = grupo(h.grupoId); const k = keyOf(g.id, x, f.id); const p = S.planes[k]; const st = estadoPlan(k);
        if (fest) return `<td class="fest"><span class="tiny muted">${esc(g.nombre)}</span></td>`;
        return `<td><button class="cell ${st.c === 'bad' ? 'unplanned' : ''}" style="border-left-color:var(--${g.color || 'g1'})" data-a="sesion" data-k="${esc(k)}"><span class="t">${p?.sinClase ? 'Sin clase' : esc(p?.titulo || 'Sin planificar')}</span><br><span class="m">${esc(g.nombre)}${h.aula ? ' · ' + esc(h.aula) : ''}</span>${p?.deberes ? ' <span class="m">· 🔁</span>' : ''}${(p?.eventos || []).some(e => e.tipo === 'examen') ? ' <span class="m">· 📝 examen</span>' : ''}${(p?.eventos || []).some(e => e.tipo === 'entrega') ? ' <span class="m">· 📦</span>' : ''}</button></td>`;
      }).join('')}</tr>`).join('')}</table></div>`;
  } else if (m === 'dia') {
    const ses = sesionesDia(d, true); const fest = festivoDe(d);
    title = cap(fLong(d));
    body = fest ? `<div class="panel empty">${esc(fest)}</div>` : !ses.length ? `<div class="panel empty">Sin clases este día.</div>` :
      `<div class="stack">${ses.map(x => { const p = S.planes[x.key]; const st = estadoPlan(x.key); return `<div class="panel"><div class="row between"><div>${gchip(x.grupo)} <span class="muted small">· ${esc(x.franja.inicio)}–${esc(x.franja.fin)}${x.aula ? ' · Aula ' + esc(x.aula) : ''}</span></div>${pill(st.c, st.t)}</div>
        <div style="margin-top:8px"><b>${esc(p?.titulo || 'Sin planificar')}</b>${p?.objetivos ? `<div class="small muted">${esc(p.objetivos)}</div>` : ''}</div>
        <div class="row" style="margin-top:8px"><button class="btn sm primary" data-a="sesion" data-k="${esc(x.key)}" data-tab="preparar">Preparar</button>${botonBancoIdeas(x.key, 'Ideas')}<button class="btn sm" data-a="sesion" data-k="${esc(x.key)}" data-tab="directo">Anotaciones</button></div></div>`; }).join('')}</div>`;
  } else {
    const p0 = parseD(d); const first = ymd(new Date(p0.getFullYear(), p0.getMonth(), 1));
    title = cap(MESES[p0.getMonth()]) + ' ' + p0.getFullYear();
    let s = mondayOf(first); const cells = [];
    for (let w = 0; w < 6; w++) { for (let i = 0; i < 5; i++) cells.push(addDays(s, i)); s = addDays(s, 7); if (parseD(s).getMonth() !== p0.getMonth() && s > first) break; }
    body = `<div class="month">${['Lun', 'Mar', 'Mié', 'Jue', 'Vie'].map(x => `<div class="mhead">${x}</div>`).join('')}${cells.map(x => {
      const fest = festivoDe(x); const ses = sesionesDia(x); const sin = ses.filter(o => estadoPlan(o.key).c === 'bad').length;
      const ev = S.agenda.filter(a => a.fecha === x && (a.tipo === 'examen' || a.tipo === 'entrega'));
      return `<button class="mday ${parseD(x).getMonth() !== p0.getMonth() ? 'out' : ''} ${fest ? 'fest' : ''} ${x === hoy ? 'today' : ''}" data-a="verdia" data-d="${x}">
        <span class="n">${parseD(x).getDate()}</span>${fest ? `<span class="mini muted">${esc(fest)}</span>` : ses.length ? `<span class="mini ${sin ? 'v-no' : 'v-si'}">${ses.length} clases${sin ? ' · ' + sin + ' sin plan' : ''}</span>` : ''}
        ${ev.map(a => `<span class="mini" style="background:var(--info-soft);color:var(--info)">${a.tipo === 'examen' ? '📝' : '📦'} ${esc(grupo(a.grupoId)?.nombre || '')} ${esc(a.titulo)}</span>`).join('')}</button>`;
    }).join('')}</div>`;
  }
  return `<div class="page-head"><div><div class="label">Planificación</div><h1>${title}</h1></div>
    <div class="row plannav"><div class="seg" role="group" aria-label="Vista">${[['rapida', 'Rápida'], ['dia', 'Día'], ['semana', 'Semana'], ['mes', 'Mes']].map(([v, t]) => `<button data-a="pmode" data-v="${v}" aria-pressed="${m === v}">${t}</button>`).join('')}</div>
    <div class="pnavb"><button class="btn sm" data-a="pnav" data-d="-1" aria-label="Anterior">‹</button><button class="btn sm" data-a="pnav" data-d="0">Hoy</button><button class="btn sm" data-a="pnav" data-d="1" aria-label="Siguiente">›</button></div></div></div>
    ${body}
    <p class="small muted" style="margin-top:10px">Pulsa una sesión para prepararla. Desde la sesión puedes <b>desplazar la planificación</b> si se pierde una clase.</p>`;
};

