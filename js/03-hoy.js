'use strict';
/* ===== HOY ===== */
VIEWS.hoy = () => {
  if (!S.grupos.length) return vacio();
  const s = UI.date, hoy = todayStr(), fest = festivoDe(s);
  const ses = sesionesDia(s, true); const now = nowMin();
  const items = [...ses, ...otrosDia(s)].sort((a, b) => tmin(a.franja.inicio) - tmin(b.franja.inicio));
  const ev = S.config.evaluaciones.filter(e => e.fin).sort((a, b) => a.fin.localeCompare(b.fin)).find(e => e.fin >= s);
  const tl = fest && dow(s) > 5 ? `<div class="panel empty">Fin de semana. ¡A descansar!</div>` :
    !items.length ? `<div class="panel empty">No tienes clases este día según tu horario.</div>` :
    `<div class="tl">${items.map(x => {
      if (x.otro) { const isNowO = s === hoy && now >= tmin(x.franja.inicio) && now < tmin(x.franja.fin);
        return `<div class="tl-item otro ${isNowO ? 'now' : ''}"><span class="tl-time">${esc(x.franja.inicio)}<small>${esc(x.franja.fin)}</small></span><span class="tl-bar" style="background:var(--muted)"></span>
        <span style="min-width:0"><span class="tl-title">${esc(OTROS[x.tipo])}</span>${x.aula || isNowO ? `<br><span class="tl-meta">${esc(x.aula)}${isNowO ? (x.aula ? ' · ' : '') + '<b>Ahora</b>' : ''}</span>` : ''}</span></div>`; }
      const st = fest ? { c: 'off', t: fest } : estadoPlan(x.key); const p = S.planes[x.key];
      const isNow = s === hoy && now >= tmin(x.franja.inicio) && now < tmin(x.franja.fin);
      return `<button class="tl-item ${isNow ? 'now' : ''} ${fest ? 'off' : ''}" ${fest ? 'disabled' : `data-a="sesion" data-k="${esc(x.key)}"`}>
        <span class="tl-time">${esc(x.franja.inicio)}<small>${esc(x.franja.fin)}</small></span>
        <span class="tl-bar" style="background:var(--${x.grupo.color || 'g1'})"></span>
        <span style="min-width:0"><span class="tl-title">${p?.sinClase ? 'Sin clase · ' + esc(p.motivo || '') : esc(p?.titulo || 'Sin planificar')}</span><br>
        <span class="tl-meta">${esc(x.grupo.nombre)}${x.aula ? ' · Aula ' + esc(x.aula) : ''}${p?.unidad ? ' · ' + esc(p.unidad) : ''}${isNow ? ' · <b>Ahora</b>' : ''}</span></span>
        ${pill(st.c, st.t)}</button>`;
    }).join('')}</div>`;
  const recs = recordatoriosDe(s);
  const grIds = [...new Set(ses.map(x => x.grupo.id))];
  const pends = grIds.flatMap(gid => pendGrupo(gid).filter(p => !p.done).map(p => ({ p, g: grupo(gid) })));
  const al = s === hoy || s > hoy ? alertas(s) : [];
  const man = siguienteLectivo(s); const sesM = sesionesDia(man);
  const ideasHoy = ses.filter(x => !fest).map(x => ({ x, n: ideasPara(x.key).length })).filter(o => o.n);
  return `
  <div class="page-head"><div>${s === hoy ? '<div class="hoy-mano">hoy toca…</div>' : `<div class="label">${rel(diffDays(hoy, s))}</div>`}<h1>${cap(fLong(s))}</h1>
    <div class="sub">${fest ? esc(fest) : `${ses.length} ${ses.length === 1 ? 'clase' : 'clases'}`}${ev ? ` · ${esc(ev.nombre)}: ${diffDays(s, ev.fin) >= 0 ? 'faltan ' + diffDays(s, ev.fin) + ' días para la evaluación' : ''}` : ''}</div></div>
    <div class="row"><button class="btn sm" data-a="dia" data-d="-1" aria-label="Día anterior">‹</button><button class="btn sm" data-a="dia" data-d="0">Hoy</button><button class="btn sm" data-a="dia" data-d="1" aria-label="Día siguiente">›</button></div></div>
  <div class="cols"><div class="stack">${tl}
    ${al.length ? `<div class="panel"><h3>Lo que falta</h3><div class="stack" style="gap:6px">${al.map(a => `<div class="alert ${a.c}"><span class="grow">${a.t}</span>${a.key ? `<button class="btn sm" data-a="sesion" data-k="${esc(a.key)}" ${a.tab ? `data-tab="${a.tab}"` : ''}>Abrir</button>` : a.go ? `<button class="btn sm" data-a="go" data-v="${a.go}" ${a.gid ? `data-g="${a.gid}"` : ''}>Ver</button>` : ''}</div>`).join('')}</div></div>` : `<div class="panel"><h3>Lo que falta</h3><p class="empty">Todo en orden: no hay sesiones sin planificar ni avisos pendientes.</p></div>`}
  </div>
  <div class="stack">
    <div class="panel"><div class="panel-title"><h3>Recordatorios</h3><button class="btn sm ghost" data-a="go" data-v="agenda">Agenda</button></div>
      ${recs.length ? `<div class="list">${recs.map(({ a, n }) => `<div class="li"><input type="checkbox" data-f="agdone" data-id="${a.id}" aria-label="Hecho"><div class="grow"><b>${esc(a.titulo)}</b><div class="small muted">${TIPOS_AG[a.tipo] || ''}${a.grupoId ? ' · ' + esc(grupo(a.grupoId)?.nombre || '') : ''} · ${rel(n)}${a.hora ? ' a las ' + esc(a.hora) : ''}</div></div></div>`).join('')}</div>` : `<p class="empty">Nada que recordar para este día.</p>`}</div>
    <div class="panel"><h3>Pendientes de clase</h3>
      ${pends.length ? `<div class="list">${pends.map(({ p, g }) => `<div class="li"><input type="checkbox" data-f="pgdone" data-g="${g.id}" data-id="${p.id}" aria-label="Hecho"><div class="grow">${esc(p.t)}<div class="small muted">${esc(g.nombre)}</div></div></div>`).join('')}</div>` : `<p class="empty">Sin pendientes para los grupos de hoy.</p>`}</div>
    ${ideasHoy.length ? `<div class="panel"><h3>💡 Ideas guardadas para hoy</h3><div class="list">${ideasHoy.map(o => `<div class="li"><div class="grow">${gchip(o.x.grupo)} · ${esc(S.planes[o.x.key]?.titulo)}</div><button class="btn sm" data-a="sesion" data-k="${esc(o.x.key)}" data-tab="preparar">${o.n} ${o.n === 1 ? 'idea' : 'ideas'}</button></div>`).join('')}</div></div>` : ''}
    <div class="panel"><h3>${diffDays(s, man) === 1 ? 'Mañana' : cap(fLong(man))}</h3>
      ${otrosDia(man).length ? `<p class="small muted" style="margin:0 0 6px">${otrosDia(man).map(o => esc(o.franja.inicio) + ' ' + esc(OTROS_C[o.tipo])).join(' · ')}</p>` : ''}
      ${sesM.length ? `<div class="list">${sesM.map(x => { const st = estadoPlan(x.key); return `<div class="li"><span class="small" style="width:44px">${esc(x.franja.inicio)}</span><div class="grow">${gchip(x.grupo)}<div class="small muted">${esc(S.planes[x.key]?.titulo || '')}</div></div>${st.c === 'ok' ? pill('ok', 'Lista') : `<button class="btn sm" data-a="sesion" data-k="${esc(x.key)}" data-tab="preparar">${st.c === 'bad' ? 'Planificar' : 'Completar'}</button>`}</div>`; }).join('')}</div>` : `<p class="empty">Sin clases.</p>`}</div>
  </div></div>`;
};

