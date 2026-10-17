'use strict';
/* ===== PROGRAMACIÓN EXPORTABLE (Planificación › «Programación») =====
   Sin IA: se monta con lo que ya hay en la app para un grupo de referencia.
   - Unidades y temporalización: de la planificación (campo «Unidad» de cada sesión, en orden de fechas).
   - Saberes: los temas de las sesiones de la unidad (editable).
   - Criterios y competencias por unidad: los que elijas para la unidad + los de los instrumentos de evaluación con fecha dentro de la unidad.
   - Evaluación y calificación: de Calificaciones (categorías, pesos, instrumentos, recuperaciones, redondeo).
   - Recursos: de las sesiones, de Materiales y de los libros de la asignatura.
   - Textos propios (justificación, metodología, atención a la diversidad…): se escriben una vez y se reutilizan cada curso.
   Se guarda por asignatura en S.config.prog[asig]. Sale en PDF (imprimir) y en Word. */
const PROG_TEXTOS = [['justificacion', 'Justificación y contextualización'], ['metodologia', 'Metodología'], ['diversidad', 'Atención a la diversidad'], ['otros', 'Otros apartados (actividades complementarias, plan lector, TIC…)']];
const SIN_UNIDAD = 'Sin unidad';
function progDe(g) { S.config.prog = S.config.prog || {}; const k = g.asig || g.id; return S.config.prog[k] || (S.config.prog[k] = { textos: {}, unidades: {}, medidas: false }); }
const progLeer = g => (S.config.prog || {})[g.asig || g.id] || { textos: {}, unidades: {}, medidas: false };
function critsDeInstr(ins) { const s = new Set(); (ins.crit || []).forEach(x => s.add(typeof x === 'string' ? x : x.c)); (ins.items || []).forEach(it => (it.crit || []).forEach(c => s.add(c))); s.delete(undefined); s.delete(null); return [...s]; }
function progDatos(g) {
  const P = progLeer(g); const cal = esTutoria(g) ? null : calDe(g); const C = cal ? currOf(cal) : null;
  const occ = ocurrencias(g.id, ...cursoRango());
  const U = []; const idx = {};
  occ.forEach(o => {
    const p = S.planes[o.key]; if (!p || p.sinClase) return;
    if (!(p.titulo || '').trim() && !(p.unidad || '').trim()) return;
    const nom = (p.unidad || '').trim() || SIN_UNIDAD;
    let u = idx[nom]; if (!u) { u = idx[nom] = { nombre: nom, ini: o.fecha, fin: o.fecha, n: 0, titulos: [], temas: new Set(), recursos: new Map(), examenes: [] }; U.push(u); }
    u.fin = o.fecha; u.n++; if ((p.titulo || '').trim()) u.titulos.push(p.titulo.trim());
    (p.etiquetas || '').split(/[,;]/).map(t => t.trim()).filter(Boolean).forEach(t => u.temas.add(t));
    (p.recursos || []).forEach(r => { const t = (r.t || r.nombre || r.url || '').trim(); if (t) u.recursos.set(words(t), t); });
    (p.eventos || []).filter(e => e.tipo === 'examen' && (e.titulo || '').trim()).forEach(e => u.examenes.push(e.titulo.trim()));
  });
  const instr = cal ? cal.instr.filter(i => !i.recupera) : [];
  U.forEach(u => {
    const man = new Set(P.unidades?.[u.nombre]?.crit || []);
    const auto = new Set(); instr.filter(i => i.fecha && i.fecha >= u.ini && i.fecha <= u.fin).forEach(i => critsDeInstr(i).forEach(c => auto.add(c)));
    u.critMan = man; u.critAuto = auto; u.crit = new Set([...man, ...auto]);
    u.saberes = (P.unidades?.[u.nombre]?.saberes ?? '').trim() || [...u.temas].join(', ');
  });
  const totalClases = occ.length; const semanales = S.config.horario.filter(h => h.grupoId === g.id).length;
  const crits = C ? C.ce.flatMap(([ce, txt, cr]) => cr.map(([c, t]) => ({ ce, ceTxt: txt, c, t }))) : [];
  return { P, cal, C, U, crits, totalClases, semanales, instr };
}
const progAsigNombre = g => ASIG[g.asig]?.nombre || g.materia || g.nombre;
function progGruposMismaAsig(g) { return S.grupos.filter(x => x.asig && x.asig === g.asig).map(x => x.nombre); }
function progEvaluacionTxt(D) {
  const cal = D.cal; if (!cal) return [];
  const out = []; const evs = evals();
  const cat = (cal.arbol || []).map(n => `${n.nombre || 'Sin nombre'}: ${nf(Number(n.peso) || 0)} %${(n.hijos || []).length ? ' (' + n.hijos.map(h => `${h.nombre || ''} ${nf(Number(h.peso) || 0)} %`).join(', ') + ')' : ''}${n.fuentes && Object.keys(n.fuentes).length ? ' · incluye registros de clase' : ''}`);
  if (cat.length) out.push(['Criterios de calificación', cat.join('\n')]);
  evs.forEach(e => {
    const L = cal.instr.filter(i => i.ev === e.id).sort((a, b) => (a.fecha || '').localeCompare(b.fecha || ''));
    if (!L.length) return;
    out.push([`Instrumentos · ${e.nombre}`, L.map(i => { const n = nodoPorId(cal, i.nodo); const cr = critsDeInstr(i);
      return `${i.recupera ? 'Recuperación: ' : ''}${i.nombre || 'Instrumento'}${i.fecha ? ' (' + fShort(i.fecha) + ')' : ''}${n ? ' · ' + (n.nombre || '') : ''}${i.modo === 'rubrica' ? ' · con rúbrica' : ''}${cr.length ? ' · criterios ' + cr.join(', ') : ''}`; }).join('\n')]);
  });
  const red = redDe(cal); const reglas = [];
  walk(cal.arbol, n => { if (n.minimo && n.minimo.nota !== '' && n.minimo.nota !== undefined) reglas.push(`En «${n.nombre}» hace falta un ${nf(Number(n.minimo.nota))} ${n.minimo.ambito === 'cada' ? 'en cada instrumento' : 'de media'} para hacer media${n.minimo.tope ? ` (si no, la nota máxima es ${nf(Number(n.minimo.tope))})` : ''}.`); if (n.descartarPeor) reglas.push(`En «${n.nombre}» se quita la peor nota (a partir de ${Number(n.descMin) || 3} instrumentos).`); });
  const recs = cal.instr.filter(i => i.recupera); if (recs.length) reglas.push(`Recuperaciones: ${[...new Set(recs.map(r => ({ sustituye: 'la nota de la recuperación sustituye a la anterior', maximo: 'se queda la nota más alta', media: 'se hace la media de las dos' })[r.recModo || 'sustituye']))].join('; ')}${recs.some(r => r.recTope) ? `; nota máxima al recuperar: ${[...new Set(recs.filter(r => r.recTope).map(r => nf(Number(r.recTope))))].join(' / ')}` : ''}.`);
  reglas.push(Number(red.decima) >= 10 ? 'La nota del boletín no se redondea hacia arriba.' : `La nota del boletín se redondea hacia arriba a partir de ,${red.decima}${red.noAprobar ? ', salvo que suponga aprobar' : ''}.`);
  out.push(['Reglas de cálculo', reglas.join('\n')]);
  return out;
}
function progRecursos(g, D) {
  const s = new Map(); D.U.forEach(u => u.recursos.forEach((v, k) => s.set(k, v)));
  const mat = (S.materiales.asigs || []).filter(a => a.asig && a.asig === g.asig);
  const carpetas = mat.flatMap(a => (a.carpetas || []).filter(c => !c.parent).map(c => c.nombre));
  const libros = Object.values(S.libros || {}).filter(b => mat.some(a => a.id === b.mat)).map(b => b.titulo);
  return { sesiones: [...s.values()], carpetas, libros };
}
function progMedidas(g) {
  const c = {}; S.grupos.filter(x => x.asig === g.asig).forEach(x => x.alumnos.forEach(a => (a.tags || []).forEach(t => { if (t !== 'Repetidor') c[t] = (c[t] || 0) + 1; })));
  return Object.entries(c).map(([t, n]) => `${t} (${n})`).join(', ');
}
/* el documento como lista de [título, texto] (para el Word) */
function progSecciones(g, D) {
  const P = D.P; const S_ = [];
  S_.push(['Datos generales', [`Materia: ${progAsigNombre(g)}`, `Curso escolar: ${S.config.curso || ''}`, `Grupos: ${progGruposMismaAsig(g).join(', ') || g.nombre}`, `Sesiones semanales: ${D.semanales}`, `Sesiones en el curso (grupo de referencia ${g.nombre}): ${D.totalClases}`].join('\n')]);
  if ((P.textos?.justificacion || '').trim()) S_.push(['Justificación y contextualización', P.textos.justificacion.trim()]);
  S_.push(['Unidades y temporalización', D.U.length ? D.U.map((u, i) => `## ${i + 1}. ${u.nombre}\nDel ${fShort(u.ini)} al ${fShort(u.fin)} · ${u.n} ${u.n === 1 ? 'sesión' : 'sesiones'}${u.saberes ? `\nSaberes: ${u.saberes}` : ''}${u.crit.size ? `\nCriterios de evaluación: ${[...u.crit].sort(cmpCrit).join(', ')}` : ''}${u.examenes.length ? `\nPruebas: ${u.examenes.join('; ')}` : ''}${u.titulos.length ? `\nSesiones: ${u.titulos.join(' · ')}` : ''}`).join('\n\n') : 'Todavía no hay sesiones planificadas con unidad.'] );
  if (D.crits.length) {
    const lineas = D.crits.map(k => { const us = D.U.map((u, i) => u.crit.has(k.c) ? i + 1 : null).filter(Boolean); return `${k.c} ${k.t}: ${us.length ? (us.length === 1 ? 'unidad ' : 'unidades ') + us.join(', ') : 'SIN TRABAJAR'}`; });
    S_.push(['Competencias específicas, criterios y su relación con las unidades', D.C.ce.map(([ce, txt]) => `## Competencia específica ${ce}\n${txt}\n` + lineas.filter(l => l.startsWith(ce + '.')).join('\n')).join('\n\n')]);
  }
  if ((P.textos?.metodologia || '').trim()) S_.push(['Metodología', P.textos.metodologia.trim()]);
  const ev = progEvaluacionTxt(D); if (ev.length) S_.push(['Evaluación y calificación', ev.map(([t, x]) => `## ${t}\n${x}`).join('\n\n')]);
  const dv = [(P.textos?.diversidad || '').trim(), P.medidas && progMedidas(g) ? `Medidas en los grupos de la materia: ${progMedidas(g)}.` : ''].filter(Boolean).join('\n\n');
  if (dv) S_.push(['Atención a la diversidad', dv]);
  const R = progRecursos(g, D); const rt = [R.libros.length ? 'Libros: ' + R.libros.join(', ') : '', R.carpetas.length ? 'Materiales propios: ' + R.carpetas.join(', ') : '', R.sesiones.length ? 'Recursos de las sesiones: ' + R.sesiones.slice(0, 40).join('; ') : ''].filter(Boolean).join('\n');
  if (rt) S_.push(['Recursos y materiales', rt]);
  if ((P.textos?.otros || '').trim()) S_.push(['Otros apartados', P.textos.otros.trim()]);
  return S_.map(([t, x], n) => [`${n + 1}. ${t}`, x]);
}
const cmpCrit = (a, b) => String(a).localeCompare(String(b), 'es', { numeric: true });
VIEWS.prog = () => {
  const GC = S.grupos.filter(x => !esTutoria(x));
  if (!GC.length) return `<div class="panel empty">Necesitas al menos un grupo con asignatura para montar la programación.</div>`;
  const g = GC.find(x => x.id === UI.progG) || GC[0]; UI.progG = g.id; const D = progDatos(g); const P = D.P;
  const secs = progSecciones(g, D);
  const unidadesEd = D.U.length ? `<div class="list">${D.U.map((u, i) => `<div class="li"><div class="grow"><b>${i + 1}. ${esc(u.nombre)}</b><div class="small muted">${fShort(u.ini)} – ${fShort(u.fin)} · ${u.n} ${u.n === 1 ? 'sesión' : 'sesiones'} · ${u.crit.size} ${u.crit.size === 1 ? 'criterio' : 'criterios'}${u.critAuto.size ? ` (${u.critAuto.size} de tus instrumentos)` : ''}</div></div><button class="btn sm" data-a="progunidad" data-u="${esc(u.nombre)}" ${D.C ? '' : 'disabled title="Elige antes la asignatura del grupo"'}>Criterios y saberes</button></div>`).join('')}</div>`
    : `<p class="empty">Escribe la «Unidad» en las sesiones (Preparar) para que aparezcan aquí, en orden de fechas.</p>`;
  const sinTrabajar = D.crits.filter(k => !D.U.some(u => u.crit.has(k.c)));
  const cobertura = D.crits.length && D.U.length ? `<div class="tablewrap"><table class="nt prog-cob"><thead><tr><th class="stick">Criterio</th>${D.U.map((u, i) => `<th title="${esc(u.nombre)}">${i + 1}</th>`).join('')}</tr></thead><tbody>${D.crits.map(k => `<tr class="${D.U.some(u => u.crit.has(k.c)) ? '' : 'prog-sin'}"><td class="stick" title="${esc(k.t)}"><b>${esc(k.c)}</b> <span class="small">${esc(k.t.length > 90 ? k.t.slice(0, 88) + '…' : k.t)}</span></td>${D.U.map(u => `<td class="num">${u.crit.has(k.c) ? (u.critMan.has(k.c) ? '●' : '○') : ''}</td>`).join('')}</tr>`).join('')}</tbody></table></div>
      <p class="tiny muted">● elegido para la unidad · ○ viene de un instrumento de evaluación con fecha en la unidad.${sinTrabajar.length ? ` <b class="tx-bad">${sinTrabajar.length} sin trabajar</b> (en rojo).` : ''}</p>` : '';
  const doc = secs.map(([t, x]) => `<section class="prog-sec"><h3>${esc(t)}</h3>${progTxtHTML(x)}</section>`).join('');
  return `<div class="page-head noprint"><div><a href="#" data-a="go" data-v="plan" class="small">‹ Planificación</a><div class="label" style="margin-top:4px">Programación</div><h1>${esc(progAsigNombre(g))}</h1>
      <div class="sub">Se monta con tu planificación, el currículo y Calificaciones del grupo de referencia. Los textos propios se guardan para esta asignatura y valen para otros cursos.</div></div>
    <div class="row" style="align-items:flex-end"><label class="f" style="min-width:200px">Grupo de referencia<select data-f="progg">${GC.map(x => `<option value="${x.id}" ${x.id === g.id ? 'selected' : ''}>${esc(x.nombre)}</option>`).join('')}</select></label><button class="btn" data-a="progword">Descargar Word</button><button class="btn primary" data-a="progimprimir">Imprimir o guardar PDF</button></div></div>
  <div class="cols prog-cols"><div class="stack noprint">
    <div class="panel"><h3>Unidades</h3>${unidadesEd}</div>
    ${cobertura ? `<div class="panel"><h3>Cobertura de criterios</h3>${cobertura}</div>` : ''}
    <div class="panel stack"><h3>Tus textos</h3>${PROG_TEXTOS.map(([k, t]) => `<label class="f">${t}<textarea rows="${k === 'otros' ? 3 : 4}" data-f="progtxt" data-k="${k}">${esc(P.textos?.[k] || '')}</textarea></label>`).join('')}
      <label class="check small"><input type="checkbox" data-f="progmed" ${P.medidas ? 'checked' : ''}>Añadir el número de alumnos con cada medida (sin nombres)</label></div>
  </div><div><div class="label noprint" style="margin-bottom:6px">Vista previa</div><div class="print-area prog-print"><div class="prog-doc"><div class="prog-tit">Programación didáctica</div><h2>${esc(progAsigNombre(g))}</h2><div class="small muted">${esc(S.config.curso || '')}</div>${doc}</div></div></div></div>`;
};
function progTxtHTML(x) {
  return String(x).split('\n').map(l => l.startsWith('## ') ? `<h4>${esc(l.slice(3))}</h4>` : l.trim() ? `<p>${esc(l)}</p>` : '').join('');
}
function progUnidadModal(nombre) {
  const g = grupo(UI.progG); const D = progDatos(g); const u = D.U.find(x => x.nombre === nombre); if (!u || !D.C) return;
  const P = progDe(g); const pu = P.unidades[nombre] || {};
  remodal(`<div class="row between"><h2 style="margin:0">${esc(nombre)}</h2><button class="btn sm ghost" data-a="close">Hecho</button></div>
    <p class="small muted">${fShort(u.ini)} – ${fShort(u.fin)} · ${u.n} sesiones</p>
    <label class="f">Saberes de la unidad<textarea rows="3" data-f="progsab" data-u="${esc(nombre)}" placeholder="${esc([...u.temas].join(', '))}">${esc(pu.saberes || '')}</textarea></label>
    <p class="tiny muted" style="margin-top:2px">Si lo dejas vacío se usan los temas de las sesiones${u.temas.size ? ': ' + esc([...u.temas].join(', ')) : ''}.</p>
    <div class="label" style="margin-top:10px">Criterios de evaluación</div>
    <div class="stack" style="gap:10px">${D.C.ce.map(([ce, txt, cr]) => `<div><div class="small"><b>CE${ce}</b> ${esc(txt)}</div>${cr.map(([c, t]) => `<label class="check small prog-crit"><input type="checkbox" data-f="progcrit" data-u="${esc(nombre)}" data-c="${esc(c)}" ${u.critMan.has(c) ? 'checked' : ''}><span><b>${esc(c)}</b> ${esc(t)}${u.critAuto.has(c) ? ' <span class="tag">en tus instrumentos</span>' : ''}</span></label>`).join('')}</div>`).join('')}</div>`, 'prog-modal');
}
Object.assign(A, {
  progabrir() { UI.view = 'prog'; UI.progG = UI.progG || UI.grupoId; render(); scrollA(0); },
  progunidad(el) { progUnidadModal(el.dataset.u); },
  progimprimir() { imprimirZona('prog'); },
  async progword() {
    const g = grupo(UI.progG); const D = progDatos(g); const secs = progSecciones(g, D).map(([t, x]) => [I18N.t(t), I18N.t(x)]);
    const bytes = docxDe(`${I18N.t('Programación didáctica')} · ${progAsigNombre(g)}${S.config.curso ? ' · ' + S.config.curso : ''}`, secs);
    const fn = `${I18N.t('Programación')} ${progAsigNombre(g)}`.replace(/[^\p{L}\p{N} ._·-]/gu, '').replace(/·/g, '-').trim().slice(0, 80) + '.docx';
    let dl = null; try { dl = Nube.descargas; } catch (e) {}
    if (!dl) { toast('Aquí no se pueden descargar archivos'); return; }
    try { await dl.save({ filename: fn, data: bytes }); toast('Word guardado'); } catch (e) { if (e?.code !== 'declined') toast('No se ha podido guardar el Word'); }
  }
});
Object.assign(Fd, {
  progg(el) { UI.progG = el.value; render(); },
  progtxt(el) { const P = progDe(grupo(UI.progG)); P.textos = P.textos || {}; P.textos[el.dataset.k] = el.value; touch('config'); clearTimeout(UI.progT); UI.progT = setTimeout(progRefrescarDoc, 400); },
  progmed(el) { progDe(grupo(UI.progG)).medidas = el.checked; touch('config'); UI.keepScroll = true; render(); },
  progsab(el) { const P = progDe(grupo(UI.progG)); const u = P.unidades[el.dataset.u] = P.unidades[el.dataset.u] || {}; u.saberes = el.value; touch('config'); },
  progcrit(el) { const P = progDe(grupo(UI.progG)); const u = P.unidades[el.dataset.u] = P.unidades[el.dataset.u] || {}; const s = new Set(u.crit || []); if (el.checked) s.add(el.dataset.c); else s.delete(el.dataset.c); u.crit = [...s].sort(cmpCrit); touch('config'); }
});
/* al escribir los textos solo se repinta la vista previa (el foco sigue en el campo) */
function progRefrescarDoc() {
  const d = document.querySelector('.prog-doc'); if (!d || UI.view !== 'prog') return;
  const g = grupo(UI.progG); const D = progDatos(g);
  d.innerHTML = `<div class="prog-tit">Programación didáctica</div><h2>${esc(progAsigNombre(g))}</h2><div class="small muted">${esc(S.config.curso || '')}</div>` + progSecciones(g, D).map(([t, x]) => `<section class="prog-sec"><h3>${esc(t)}</h3>${progTxtHTML(x)}</section>`).join('');
}
/* al cerrar la ventana de una unidad, se repinta la página con los criterios nuevos */
document.addEventListener('click', e => { if (UI.view === 'prog' && e.target.closest?.('[data-a="close"], [data-a="closebg"]') && document.querySelector('.prog-modal')) setTimeout(() => { UI.keepScroll = true; render(); }, 0); });
