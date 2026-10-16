'use strict';
/* ===== INFORME PARA LA SESIÓN DE EVALUACIÓN (Grupos › Evaluación) =====
   Una fila por alumno con lo que se mira en la junta: nota del boletín y por categorías, faltas y retrasos
   del periodo, deberes, actitud, medidas, materia pendiente y observaciones. La columna «Acuerdos» se escribe
   en la junta y se guarda en el grupo (g.acuerdos[evaluación][alumno]). Se imprime o se guarda en PDF. */
const EV_FALTAS_DEF = 6;
function datosEvaluacion(g, ev) {
  const cal = calDe(g); const final = ev === 'final';
  const [desde, hasta] = final ? cursoRango() : evRango(ev);
  const R = final ? resFinal(g, cal) : resEval(g, cal, ev);
  const seg = seguimiento(g.id, desde === '0000' ? null : desde, hasta === '9999' ? null : hasta);
  const cats = final ? [] : (cal.arbol || []).map(n => ({ id: n.id, nombre: n.nombre || 'Sin nombre' }));
  const umbral = Number(S.config.avisos?.faltasEval) || EV_FALTAS_DEF;
  const acu = (g.acuerdos || {})[ev] || {};
  const filas = g.alumnos.map(a => {
    const r = R[a.id] || {}; const s = seg[a.id] || {};
    const bol = r.bol ?? null;
    const riesgo = { nota: bol !== null && bol < 5, faltas: (s.F || 0) >= umbral };
    return { a, bol, nota: r.g ?? null, cats: final ? {} : (r.out || {}), F: s.F || 0, J: s.J || 0, R: s.R || 0,
      deb: s.debM === null || s.debM === undefined ? null : s.debM * 10, act: s.actM ?? null, riesgo, acuerdo: acu[a.id] || '' };
  });
  const conNota = filas.filter(f => f.bol !== null);
  const resumen = { n: filas.length, conNota: conNota.length, aprob: conNota.filter(f => f.bol >= 5).length,
    media: conNota.length ? conNota.reduce((s, f) => s + f.nota, 0) / conNota.length : null };
  resumen.susp = conNota.length - resumen.aprob;
  resumen.dist = [['IN', 0, 5], ['SU', 5, 6], ['BI', 6, 7], ['NT', 7, 9], ['SB', 9, 11]].map(([t, a, b]) => [t, conNota.filter(f => f.bol >= a && f.bol < b).length]);
  return { cal, final, desde, hasta, cats, filas, resumen, umbral, redCualit: redDe(cal).cualit };
}
const pctTxt = v => v === null || v === undefined ? '' : Math.round(v) + ' %';
function vistaEvaluacion(g) {
  const evs = evals();
  if (!evs.length) return `<div class="panel empty">Añade las evaluaciones del curso en <a href="#" data-a="go" data-v="ajustes">Ajustes › Curso</a> para preparar la sesión de evaluación.</div>`;
  if (UI.evRep !== 'final' && !evs.some(e => e.id === UI.evRep)) UI.evRep = evActual();
  const ev = UI.evRep; const D = datosEvaluacion(g, ev);
  const evNombre = ev === 'final' ? 'Evaluación final' : (evs.find(e => e.id === ev)?.nombre || '');
  const etq = a => (a.tags || []).filter(t => t !== 'Repetidor').map(t => `<span class="tag">${esc(t)}</span>`).join(' ') + ((a.tags || []).includes('Repetidor') ? ' <span class="tag">Repetidor</span>' : '');
  const nCell = (v, bol) => v === null || v === undefined ? '<span class="muted">—</span>' : `<b class="${bol !== null && bol < 5 ? 'tx-bad' : ''}">${bol ?? nf(v)}</b>${D.redCualit && bol !== null ? ` <span class="tiny muted">${cualit(bol)}</span>` : ''}`;
  const R0 = D.resumen;
  const cab = `<div class="row between noprint" style="margin-bottom:12px;align-items:flex-end">
      <div class="seg">${evs.map(e => `<button data-a="evrep" data-v="${e.id}" aria-pressed="${ev === e.id}">${esc(e.nombre)}</button>`).join('')}<button data-a="evrep" data-v="final" aria-pressed="${ev === 'final'}">Final</button></div>
      <div class="row"><label class="f small" style="flex-direction:row;align-items:center;gap:6px">Marcar desde<input type="number" min="1" max="99" value="${D.umbral}" data-f="evumbral" style="width:64px">faltas</label><button class="btn primary" data-a="evimprimir">Imprimir o guardar PDF</button></div></div>`;
  const resumen = `<div class="ev-res">
      <div><span class="ev-n">${R0.n}</span><span class="label">alumnos</span></div>
      <div><span class="ev-n">${R0.conNota ? Math.round(R0.aprob / R0.conNota * 100) + ' %' : '—'}</span><span class="label">aprueban${R0.conNota ? ` (${R0.aprob} de ${R0.conNota})` : ''}</span></div>
      <div><span class="ev-n">${R0.media === null ? '—' : nf(R0.media)}</span><span class="label">nota media</span></div>
      <div><span class="ev-n">${D.filas.filter(f => f.riesgo.faltas).length}</span><span class="label">con ${D.umbral} faltas o más</span></div>
      <div class="ev-dist">${R0.dist.map(([t, n]) => `<span><b>${n}</b> ${t}</span>`).join('')}</div></div>`;
  const filas = D.filas.map((f, i) => `<tr class="${f.riesgo.nota || f.riesgo.faltas ? 'ev-riesgo' : ''}">
      <td class="stick"><div class="ev-al">${f.a.num ? `<span class="muted">${f.a.num}.</span> ` : ''}${esc(f.a.apellidos ? f.a.apellidos + ', ' + f.a.pila : f.a.nombre)}</div>${etq(f.a) ? `<div class="ev-tags">${etq(f.a)}</div>` : ''}</td>
      <td class="num">${nCell(f.nota, f.bol)}</td>
      ${D.cats.map(c => `<td class="num">${f.cats[c.id] === null || f.cats[c.id] === undefined ? '<span class="muted">—</span>' : nf(f.cats[c.id])}</td>`).join('')}
      <td class="num ${f.riesgo.faltas ? 'tx-bad' : ''}">${f.F}${f.J ? ` <span class="tiny muted">+${f.J} J</span>` : ''}</td><td class="num">${f.R || ''}</td>
      <td class="num">${pctTxt(f.deb)}</td><td class="num">${f.act === null ? '' : nf(f.act)}</td>
      <td class="ev-obs">${f.a.pendiente ? `<div class="small"><b>Pendiente:</b> ${esc(f.a.pendiente)}${f.a.recuperada ? ' (recuperada)' : ''}</div>` : ''}${(f.a.obs || '').trim() ? `<div class="small">${esc(f.a.obs)}</div>` : ''}</td>
      <td class="ev-acu"><textarea rows="2" data-f="evacuerdo" data-al="${f.a.id}" aria-label="Acuerdos para ${esc(f.a.nombre)}" placeholder="Acuerdos de la junta">${esc(f.acuerdo)}</textarea><div class="ev-acu-p">${esc(f.acuerdo)}</div></td>
      <td class="noprint"><button class="btn sm ghost" data-a="famabrir" data-al="${f.a.id}" title="Informe para la familia">Informe</button></td></tr>`).join('');
  const tabla = g.alumnos.length ? `<div class="tablewrap"><table class="nt ev-t"><thead><tr><th class="stick">Alumno/a</th><th>${ev === 'final' ? 'Final' : 'Boletín'}</th>${D.cats.map(c => `<th>${esc(c.nombre)}</th>`).join('')}<th>Faltas</th><th>Retr.</th><th>Deberes</th><th>Actitud</th><th>Observaciones</th><th>Acuerdos</th><th class="noprint"></th></tr></thead><tbody>${filas}</tbody></table></div>`
    : `<div class="panel empty">Este grupo no tiene alumnos todavía.</div>`;
  const periodo = D.final ? 'Todo el curso' : `${D.desde !== '0000' ? fShort(D.desde) : 'Inicio'} – ${D.hasta !== '9999' ? fShort(D.hasta) : 'fin'}`;
  return `${cab}<div class="print-area ev-print"><div class="ev-head"><div><div class="label">Sesión de evaluación</div><h2 style="margin:2px 0">${esc(g.nombre)} · ${esc(evNombre)}</h2><div class="small muted">${esc(g.materia || ASIG[g.asig]?.nombre || '')} · ${periodo} · ${fShort(todayStr())}</div></div></div>
    ${resumen}${tabla}
    <p class="tiny muted noprint" style="margin-top:8px">Las faltas y la actitud cuentan solo las sesiones de este periodo. Deberes: porcentaje según los valores de Ajustes. En rojo, quien suspende o llega al número de faltas que marques. Los acuerdos se guardan en el grupo.</p></div>`;
}
Object.assign(A, {
  evrep(el) { UI.evRep = el.dataset.v; UI.keepScroll = true; render(); },
  evimprimir() { imprimirZona('ev'); }
});
Object.assign(Fd, {
  evacuerdo(el) { const g = grupo(UI.grupoId); const ev = UI.evRep; g.acuerdos = g.acuerdos || {}; g.acuerdos[ev] = g.acuerdos[ev] || {}; if (el.value.trim()) g.acuerdos[ev][el.dataset.al] = el.value; else delete g.acuerdos[ev][el.dataset.al]; const p = el.nextElementSibling; if (p) p.textContent = el.value; touch('grupos'); },
  evumbral(el) { const v = Math.max(1, Math.min(99, parseInt(el.value, 10) || EV_FALTAS_DEF)); S.config.avisos = S.config.avisos || {}; S.config.avisos.faltasEval = v; touch('config'); clearTimeout(UI.evT); UI.evT = setTimeout(() => { UI.keepScroll = true; render(); }, 500); }
});
/* imprimir solo una zona de la pantalla (la marcada con .print-area): la clase en <html> decide el formato de página */
function imprimirZona(tipo) {
  const h = document.documentElement; [...h.classList].filter(c => c.startsWith('imp-')).forEach(c => h.classList.remove(c));
  h.classList.add('imprimiendo', 'imp-' + tipo);
  /* solo afecta a la impresión (@media print), así que no pasa nada si «afterprint» no llega */
  const fin = () => { h.classList.remove('imprimiendo', 'imp-' + tipo); window.removeEventListener('afterprint', fin); };
  window.addEventListener('afterprint', fin); setTimeout(() => window.print(), 50);
}
