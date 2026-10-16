'use strict';
/* ===== INFORME PARA LA FAMILIA (desde Grupos › Evaluación › «Informe») =====
   Sin IA: frases que se eligen según los datos del periodo (asistencia, deberes, trabajo, actitud, notas),
   en el idioma del grupo (castellano o valenciano). Cada bloque se puede quitar o retocar antes de imprimir.
   Las frases de los tramos son editables y se guardan como tuyas (S.config.frasesFam[idioma][clave]).
   Las etiquetas del alumno (TDAH, TEA…) y sus observaciones no salen nunca solas. */
const FAM_FRASES = {
  es: { intro: 'Informe de seguimiento de {alumno} en {materia} ({periodo}).',
    t4: 'Trabaja en clase de forma constante y con mucho interés.', t3: 'Su trabajo en clase es adecuado.', t2: 'Su trabajo en clase es irregular: unos días trabaja bien y otros no.', t1: 'Trabaja poco en clase; necesita esforzarse más.',
    a4: 'Su actitud en clase es muy positiva.', a3: 'Su actitud en clase es buena.', a2: 'Su actitud en clase es mejorable.', a1: 'Su actitud en clase nos preocupa y convendría hablarlo.',
    d4: 'Trae los deberes hechos casi siempre', d3: 'Suele traer los deberes hechos', d2: 'A menudo no trae los deberes hechos', d1: 'Casi nunca trae los deberes hechos',
    cierre: 'Quedo a su disposición para cualquier consulta.' },
  va: { intro: 'Informe de seguiment de {alumno} en {materia} ({periodo}).',
    t4: 'Treballa a classe de manera constant i amb molt d’interés.', t3: 'El seu treball a classe és adequat.', t2: 'El seu treball a classe és irregular: uns dies treballa bé i altres no.', t1: 'Treballa poc a classe; necessita esforçar-se més.',
    a4: 'La seua actitud a classe és molt positiva.', a3: 'La seua actitud a classe és bona.', a2: 'La seua actitud a classe és millorable.', a1: 'La seua actitud a classe ens preocupa i convindria parlar-ne.',
    d4: 'Porta els deures fets quasi sempre', d3: 'Sol portar els deures fets', d2: 'Sovint no porta els deures fets', d1: 'Quasi mai porta els deures fets',
    cierre: 'Reste a la vostra disposició per a qualsevol consulta.' }
};
const FAM_CLAVES = [['intro', 'Inicio ({alumno}, {materia} y {periodo} se rellenan solos)'], ['t4', 'Trabajo en clase · muy bueno (8 o más)'], ['t3', 'Trabajo · adecuado (6 a 8)'], ['t2', 'Trabajo · irregular (4 a 6)'], ['t1', 'Trabajo · escaso (menos de 4)'],
  ['a4', 'Actitud · muy positiva (4,3 o más)'], ['a3', 'Actitud · buena (3,5 a 4,3)'], ['a2', 'Actitud · mejorable (2,5 a 3,5)'], ['a1', 'Actitud · preocupante (menos de 2,5)'],
  ['d4', 'Deberes · 80 % o más'], ['d3', 'Deberes · 60 a 80 %'], ['d2', 'Deberes · 40 a 60 %'], ['d1', 'Deberes · menos del 40 %'], ['cierre', 'Despedida']];
const FAM_L = {
  es: { asis0: 'Ha asistido a todas las clases.', falta: n => `Ha faltado ${n} ${n === 1 ? 'día' : 'días'}`, just: (j, n) => j === n ? (n === 1 ? ', justificado' : ', todos justificados') : `, ${j} de ellos ${j === 1 ? 'justificado' : 'justificados'}`,
    tarde: r => `ha llegado tarde ${r} ${r === 1 ? 'vez' : 'veces'}`, tardeIni: r => `Ha llegado tarde ${r} ${r === 1 ? 'vez' : 'veces'}`, y: ' y ', rev: (x, y, m) => ` (${x} de ${y} ${y === 1 ? 'revisión' : 'revisiones'}${m ? `; ${m} a medias` : ''}).`,
    notas: 'Calificaciones: ', bol: 'Nota de la evaluación', bolF: 'Nota final', curso: 'todo el curso', titulo: 'Informe para la familia', alumno: 'Alumno/a', grupo: 'Grupo', materia: 'Materia', fecha: 'Fecha', firma: 'El profesor / la profesora' },
  va: { asis0: 'Ha assistit a totes les classes.', falta: n => `Ha faltat ${n} ${n === 1 ? 'dia' : 'dies'}`, just: (j, n) => j === n ? (n === 1 ? ', justificat' : ', tots justificats') : `, ${j} d’ells ${j === 1 ? 'justificat' : 'justificats'}`,
    tarde: r => `ha arribat tard ${r} ${r === 1 ? 'vegada' : 'vegades'}`, tardeIni: r => `Ha arribat tard ${r} ${r === 1 ? 'vegada' : 'vegades'}`, y: ' i ', rev: (x, y, m) => ` (${x} de ${y} ${y === 1 ? 'revisió' : 'revisions'}${m ? `; ${m} a mitges` : ''}).`,
    notas: 'Qualificacions: ', bol: 'Nota de l’avaluació', bolF: 'Nota final', curso: 'tot el curs', titulo: 'Informe per a la família', alumno: 'Alumne/a', grupo: 'Grup', materia: 'Matèria', fecha: 'Data', firma: 'El professor / la professora' }
};
const FAM_BLOQUES = [['asis', 'Asistencia'], ['deberes', 'Deberes'], ['trabajo', 'Trabajo en clase'], ['actitud', 'Actitud'], ['notas', 'Calificaciones'], ['obs', 'Observaciones']];
const famLang = g => idiomaG(g.id) === 'va' ? 'va' : 'es';
const famFrase = (lg, k) => (S.config.frasesFam?.[lg]?.[k] ?? '').trim() || FAM_FRASES[lg][k];
const nfFam = v => nf(v).replace('.', ',');
/* datos del alumno en el periodo, contados desde los registros de clase */
function famDatos(g, aid, ev) {
  const [desde, hasta] = ev === 'curso' ? cursoRango() : evRango(ev); const P = S.config.pesos;
  const o = { F: 0, J: 0, R: 0, deb: { si: 0, medias: 0, no: 0 }, tra: [], act: [] };
  Object.keys(S.regs).forEach(k => {
    if (!k.startsWith(g.id + '|')) return; const f = parseKey(k).fecha; if (f < desde || f > hasta) return; const r = S.regs[k];
    const as = r.asis?.[aid]; if (as === 'F') o.F++; if (as === 'J') o.J++; if (as === 'R') o.R++;
    const d = r.deberes?.[aid]; if (d && o.deb[d] !== undefined) o.deb[d]++;
    if (r.trabajo?.[aid]) o.tra.push(P.val3[r.trabajo[aid]]);
    (r.sorteos || []).filter(x => x.alumnoId === aid && x.val && x.val !== 'skip').forEach(x => o.tra.push(P.sorteo[x.val]));
    const av = actVal(r.actitud?.[aid]); if (av?.n) o.act.push(av.n);
  });
  const avg = a => a.length ? a.reduce((s, x) => s + x, 0) / a.length : null;
  o.traM = avg(o.tra); o.actM = avg(o.act);
  const nDeb = o.deb.si + o.deb.medias + o.deb.no; o.debN = nDeb; o.debSi = o.deb.si + o.deb.medias / 2;
  o.debPct = nDeb ? (o.deb.si * P.val3.si + o.deb.medias * P.val3.medias + o.deb.no * P.val3.no) / nDeb * 10 : null;
  const cal = esTutoria(g) ? null : calDe(g);
  o.notas = []; o.bol = null;
  if (cal) {
    cal.instr.filter(i => !i.recupera && (ev === 'curso' || i.ev === ev)).sort((a, b) => (a.fecha || '').localeCompare(b.fecha || '')).forEach(i => { const r = notaInstrR(cal, i, aid); if (r && r.g !== null && r.g !== undefined) o.notas.push([i.nombre || 'Instrumento', r.g]); });
    const R = ev === 'curso' ? resFinal(g, cal) : resEval(g, cal, ev); o.bol = R[aid]?.bol ?? null; o.cualit = redDe(cal).cualit;
  }
  return o;
}
function famTextos(g, a, ev) {
  const lg = famLang(g); const L = FAM_L[lg]; const o = famDatos(g, a.id, ev); const T = {};
  const tot = o.F + o.J;
  if (!tot && !o.R) T.asis = L.asis0;
  else { const p = []; if (tot) p.push(L.falta(tot) + (o.J ? L.just(o.J, tot) : '')); if (o.R) p.push(tot ? L.tarde(o.R) : L.tardeIni(o.R)); T.asis = p.join(L.y) + '.'; }
  if (o.debN) { const pc = o.debPct; const k = pc >= 80 ? 'd4' : pc >= 60 ? 'd3' : pc >= 40 ? 'd2' : 'd1'; T.deberes = famFrase(lg, k) + L.rev(o.deb.si, o.debN, o.deb.medias); }
  if (o.traM !== null) T.trabajo = famFrase(lg, o.traM >= 8 ? 't4' : o.traM >= 6 ? 't3' : o.traM >= 4 ? 't2' : 't1');
  if (o.actM !== null) T.actitud = famFrase(lg, o.actM >= 4.3 ? 'a4' : o.actM >= 3.5 ? 'a3' : o.actM >= 2.5 ? 'a2' : 'a1');
  const nt = []; if (o.notas.length) nt.push(L.notas + o.notas.map(([n, v]) => `${n} (${nfFam(v)})`).join('; ') + '.');
  if (o.bol !== null) nt.push(`${ev === 'curso' ? L.bolF : L.bol}: ${o.bol}${o.cualit ? ' (' + cualit(o.bol) + ')' : ''}.`);
  if (nt.length) T.notas = nt.join(' ');
  T.obs = '';
  return T;
}
function famPeriodo(ev, lg) { return ev === 'curso' ? FAM_L[lg].curso : (evals().find(e => e.id === ev)?.nombre || ''); }
function famIniciar(aid, ev) {
  const g = grupo(UI.grupoId); const a = g.alumnos.find(x => x.id === aid); if (!a) return;
  const evs = evals(); ev = ev || (UI.evRep && UI.evRep !== 'final' ? UI.evRep : evs.length ? evActual() : 'curso');
  const T = famTextos(g, a, ev); const prev = UI.fam && UI.fam.aid === aid ? UI.fam : null;
  UI.fam = { aid, ev, textos: T, incl: Object.fromEntries(FAM_BLOQUES.map(([k]) => [k, prev ? prev.incl[k] : (k === 'obs' ? true : !!T[k])])), frases: prev?.frases || false };
}
function famModal() {
  const F = UI.fam; const g = grupo(UI.grupoId); const a = g?.alumnos.find(x => x.id === F?.aid); if (!a) { closeModal(); return; }
  const lg = famLang(g); const L = FAM_L[lg]; const evs = evals();
  const intro = famFrase(lg, 'intro').replace('{alumno}', a.pila || a.nombre).replace('{materia}', g.materia || ASIG[g.asig]?.nombre || g.nombre).replace('{periodo}', famPeriodo(F.ev, lg));
  const bloques = FAM_BLOQUES.map(([k, t]) => `<div class="fam-b ${F.incl[k] ? '' : 'off'}"><label class="check small"><input type="checkbox" data-f="faminc" data-k="${k}" ${F.incl[k] ? 'checked' : ''}><b>${t}</b></label>
      <textarea rows="${k === 'obs' ? 3 : 2}" data-f="famtxt" data-k="${k}" ${F.incl[k] ? '' : 'disabled'} placeholder="${k === 'obs' ? 'Lo que quieras añadir (no se rellena solo)' : 'Sin datos en este periodo'}">${esc(F.textos[k] || '')}</textarea></div>`).join('');
  const editor = F.frases ? `<div class="panel stack fam-frases"><div class="row between"><h3 style="margin:0">Tus frases (${lg === 'va' ? 'valenciano' : 'castellano'})</h3><button class="btn sm ghost" data-a="famfrases">Cerrar</button></div>
      <p class="tiny muted" style="margin:0">Se usan en todos los informes de los grupos en ${lg === 'va' ? 'valenciano' : 'castellano'}. Deja una vacía para volver a la de la app.</p>
      ${FAM_CLAVES.map(([k, t]) => `<label class="f small">${t}<input type="text" data-f="famfrase" data-k="${k}" value="${esc(S.config.frasesFam?.[lg]?.[k] || '')}" placeholder="${esc(FAM_FRASES[lg][k])}"></label>`).join('')}</div>` : '';
  remodal(`<div class="row between"><h2 style="margin:0">Informe para la familia</h2><button class="btn sm ghost" data-a="close">Cerrar</button></div>
    <div class="row" style="margin:10px 0">${evs.map(e => `<button class="btn sm ${F.ev === e.id ? 'primary' : ''}" data-a="famev" data-v="${e.id}">${esc(e.nombre)}</button>`).join('')}<button class="btn sm ${F.ev === 'curso' ? 'primary' : ''}" data-a="famev" data-v="curso">Todo el curso</button>
      <span class="small muted">Idioma: ${lg === 'va' ? 'valenciano' : 'castellano'} (el del grupo)</span></div>
    <div class="fam-cols"><div class="stack" style="gap:8px">${bloques}<div class="row"><button class="btn sm ghost" data-a="famfrases">Editar mis frases</button><button class="btn sm ghost" data-a="famrehacer">Volver a generar</button></div>${editor}</div>
    <div><div class="label" style="margin-bottom:6px">Vista previa</div><div class="print-area fam-print"><div class="fam-doc" id="fam-prev">
${famPrevia()}</div></div>
      <div class="row" style="margin-top:10px"><button class="btn primary" data-a="famimprimir">Imprimir o guardar PDF</button><button class="btn" data-a="famcopiar">Copiar el texto</button></div></div></div>`, 'fam-modal');
}
function famPrevia() {
  const g = grupo(UI.grupoId); const a = g.alumnos.find(x => x.id === UI.fam.aid); const L = FAM_L[famLang(g)];
  return `<div class="fam-h"><div class="fam-tit">${L.titulo}</div><table class="fam-dat"><tr><td>${L.alumno}</td><td><b>${esc(a.nombre)}</b></td></tr><tr><td>${L.grupo}</td><td>${esc(g.nombre)}</td></tr><tr><td>${L.materia}</td><td>${esc(g.materia || ASIG[g.asig]?.nombre || '')}</td></tr><tr><td>${L.fecha}</td><td>${fShort(todayStr())}</td></tr></table></div>
      ${famTextoPlano().split('\n\n').map(t => `<p>${esc(t)}</p>`).join('')}<div class="fam-firma">${L.firma}</div>`;
}
function famTextoPlano() {
  const g = grupo(UI.grupoId); const a = g.alumnos.find(x => x.id === UI.fam.aid); const lg = famLang(g); const F = UI.fam;
  const intro = famFrase(lg, 'intro').replace('{alumno}', a.pila || a.nombre).replace('{materia}', g.materia || ASIG[g.asig]?.nombre || g.nombre).replace('{periodo}', famPeriodo(F.ev, lg));
  return [intro, ...FAM_BLOQUES.filter(([k]) => F.incl[k] && (F.textos[k] || '').trim()).map(([k]) => F.textos[k].trim()), famFrase(lg, 'cierre')].join('\n\n');
}
Object.assign(A, {
  famabrir(el) { UI.fam = null; famIniciar(el.dataset.al); famModal(); },
  famev(el) { famIniciar(UI.fam.aid, el.dataset.v); famModal(); },
  famrehacer() { const inc = UI.fam.incl; famIniciar(UI.fam.aid, UI.fam.ev); UI.fam.incl = inc; famModal(); },
  famfrases() { UI.fam.frases = !UI.fam.frases; famModal(); },
  famimprimir() { imprimirZona('fam'); },
  async famcopiar() { try { await navigator.clipboard.writeText(famTextoPlano()); toast('Texto copiado'); } catch (e) { toast('No se ha podido copiar'); } }
});
Object.assign(Fd, {
  faminc(el) { UI.fam.incl[el.dataset.k] = el.checked; famModal(); },
  famtxt(el) { UI.fam.textos[el.dataset.k] = el.value; const p = $('#fam-prev'); if (p) p.innerHTML = famPrevia(); },
  famfrase(el) { const g = grupo(UI.grupoId); const lg = famLang(g); S.config.frasesFam = S.config.frasesFam || {}; const L = S.config.frasesFam[lg] = S.config.frasesFam[lg] || {}; if (el.value.trim()) L[el.dataset.k] = el.value; else delete L[el.dataset.k]; touch('config'); const p = $('#fam-prev'); if (p) p.innerHTML = famPrevia(); }
});
