'use strict';
/* ===================== CALIFICACIONES =====================
   Un documento por grupo: cal_<grupoId>
   { curr, niveles[4], pesosPorEval, arbol:[nodo], instr:[instrumento], evalPesos:{ev:peso}, finalManual:{alumno:{nota,motivo}} }
   nodo: { id, nombre, peso, pesoEv:{ev:peso}, hijos:[nodo], (hoja:) modo 'pond'|'media', fuentes:{trabajo|deberes|actitud|preguntas: peso}, pesoInstr, reparto 'igual'|'mano', crit:[código] }
   instrumento: { id, nombre, nodo, ev, fecha, modo 'directa'|'rubrica', peso, crit:[{c,p}], items:[{id,texto,peso,crit:[c],vals?:[nota de cada nivel 0…n-1],desc:[n]}], notas:{al: n|'NP'|'EX'}, rub:{al:{item:nivel}},
                  recupera: ''|idInstrumento|'ev:<evaluación>', recModo 'sustituye'|'maximo'|'media', recTope: nota máxima al recuperar }
   reglas: nodo.minimo {nota, ambito 'media'|'cada', tope} · hoja.descartarPeor + descMin · cal.redondeo {decima 1–9 (10 = nunca), noAprobar, final 'exacta'|'boletin', cualit}
   Cálculo: cada nota se descompone en partes {w, g, c} (peso, nota, criterio). Las partes sin criterio se reparten
   entre los criterios en proporción a su peso; así la media ponderada de criterios y competencias = nota global. */
const FUENTES = [['trabajo', 'Trabajo diario'], ['deberes', 'Deberes'], ['actitud', 'Actitud'], ['preguntas', 'Preguntas orales']];
const NIVELES_DEF = [0, 2.5, 5, 7.5, 10];
/* niveles de rúbrica: nivel 0…n-1; cada ítem puede tener los suyos (it.vals) o usar los del grupo (cal.niveles) */
const fixNiv = a => { const v = Array.isArray(a) && a.length ? a.map(Number) : [...NIVELES_DEF]; return v.length === 4 ? [0, ...v] : v; };
const nivelesItem = (cal, it) => (it.vals && it.vals.length >= 2 ? it.vals : cal.niveles).map(Number);
/* nota (0–10) de un ítem para una valoración: nivel elegido o, si el ítem es de nota libre, la nota escrita */
function valItem(cal, it, x) {
  if (typeof x !== 'number' || !Number.isFinite(x)) return null;
  if (it.libre) return x >= 0 && x <= 10 ? x : null;
  const vs = nivelesItem(cal, it); return x >= 0 && x < vs.length && Number.isInteger(x) ? vs[x] : null;
}
const repartirPesos = items => { const n = items.length; if (!n) return; const b = Math.floor(1000 / n) / 10; items.forEach((it, k) => { it.peso = k === n - 1 ? Math.round((100 - b * (n - 1)) * 10) / 10 : b; }); };
const repartirNiv = n => Array.from({ length: n }, (_, k) => Math.round(k * 1000 / (n - 1)) / 100);
/* rúbricas de antes (niveles 1–4): se añade el nivel 0 sin cambiar ninguna nota */
function migRub(cal) {
  let cambio = false;
  if (!Array.isArray(cal.niveles) || cal.niveles.length === 4) { cal.niveles = fixNiv(cal.niveles); cambio = true; }
  (cal.instr || []).forEach(i => (i.items || []).forEach(it => { if (!it.v2) { const d = it.desc || []; it.desc = ['', d[0] || '', d[1] || '', d[2] || '', d[3] || '']; it.v2 = true; cambio = true; } }));
  return cambio;
}
/* currOf(cal, g): js/11-curriculo.js */
const currAuto = g => { if (ASIG[g.asig]) return ASIG[g.asig].curr || ''; const n = words((g.nivel || '') + ' ' + (g.nombre || '') + ' ' + (g.materia || '')); if (/bach|geologia y ciencias|ciencias ambientales/.test(n)) return 'gcca-2bach'; if (/eso/.test(n) && /(^|[^0-9])1/.test(n)) return 'byg-1eso'; if (/eso/.test(n) && /(^|[^0-9])3/.test(n)) return 'byg-3eso'; return ''; };
const ceDe = code => String(code).split('.')[0];
function critTexto(cal, code) { const C = currOf(cal); if (!C) return ''; for (const [, , cr] of C.ce) { const x = cr.find(c => c[0] === code); if (x) return x[1]; } return ''; }
const nodoN = (nombre, peso, extra) => Object.assign({ id: uid(), nombre, peso, pesoEv: {}, hijos: [], modo: 'pond', fuentes: {}, pesoInstr: 100, reparto: 'igual', crit: [] }, extra || {});
const arbolDefecto = () => [nodoN('Exámenes', 60), nodoN('Trabajos', 25), nodoN('Trabajo de clase', 15, { pesoInstr: 0, fuentes: { trabajo: 50, deberes: 30, preguntas: 20 } })];
function calDe(g) {
  let c = S.cal[g.id];
  if (!c) { c = S.cal[g.id] = { curr: currAuto(g), niveles: [...NIVELES_DEF], pesosPorEval: false, arbol: arbolDefecto(), instr: [], evalPesos: {}, finalManual: {} }; touch('cal_' + g.id); }
  const A0 = ASIG[g.asig]; if (A0 && (c.curr || '') !== A0.curr) { c.curr = A0.curr; touch('cal_' + g.id); }
  if (c.curr === 'custom') c.custom = c.custom || { ce: [] };
  c.instr = c.instr || []; c.evalPesos = c.evalPesos || {}; c.finalManual = c.finalManual || {}; c.niveles = c.niveles || [...NIVELES_DEF]; c.arbol = c.arbol || [];
  if (migRub(c)) touch('cal_' + g.id);
  return c;
}
const touchCal = gid => touch('cal_' + gid);
function evals() { const L = S.config.evaluaciones.filter(e => e.id).slice().sort((a, b) => (a.fin || '9999').localeCompare(b.fin || '9999')); return L.length ? L : [{ id: '_curso', nombre: 'Curso', fin: S.config.fin || '' }]; }
function evRango(ev) { const L = evals(); const i = L.findIndex(e => e.id === ev); if (i < 0) return ['0000', '9999']; const ini = i === 0 ? (S.config.inicio || '0000') : (L[i - 1].fin ? addDays(L[i - 1].fin, 1) : '0000'); return [ini, L[i].fin || '9999']; }
function evActual() { const h = todayStr(); const L = evals(); return (L.find(e => (e.fin || '9999') >= h) || L[L.length - 1]).id; }
const evNombre = ev => evals().find(e => e.id === ev)?.nombre || '';
function walk(nodes, fn, path = []) { (nodes || []).forEach(n => { fn(n, path); walk(n.hijos, fn, [...path, n]); }); }
function hojas(cal) { const out = []; walk(cal.arbol, (n, p) => { if (!(n.hijos || []).length) out.push({ n, path: [...p, n].map(x => x.nombre || 'Sin nombre').join(' › ') }); }); return out; }
function nodoPorId(cal, id) { let r = null; walk(cal.arbol, n => { if (n.id === id) r = n; }); return r; }
function padreDe(cal, id) { let r = null; walk(cal.arbol, (n, p) => { if (n.id === id) r = p[p.length - 1] || null; }); return r; }
const pesoN = (cal, n, ev) => cal.pesosPorEval && n.pesoEv && n.pesoEv[ev] !== undefined && n.pesoEv[ev] !== '' ? Number(n.pesoEv[ev]) || 0 : Number(n.peso) || 0;
const nf = (v, d = 1) => v === null || v === undefined || Number.isNaN(v) ? '' : (Math.round(v * 10 ** d) / 10 ** d).toLocaleString('es-ES', { maximumFractionDigits: d });
const lowC = v => v !== null && v !== undefined && v < 5 ? ' low' : '';
function parseNota(s) { const t = String(s ?? '').trim().toUpperCase().replace(',', '.'); if (!t) return { v: undefined }; if (t === 'NP' || t === 'EX') return { v: t }; const n = Number(t); if (!Number.isFinite(n) || n < 0 || n > 10) return { err: true }; return { v: Math.round(n * 100) / 100 }; }
const notaTxt = v => v === undefined || v === null ? '' : typeof v === 'number' ? String(v).replace('.', ',') : v;

/* registros del modo directo de una evaluación, pasados a 0–10 */
function autoSrc(gid, ev) {
  const g = grupo(gid); const P = S.config.pesos; const [d0, d1] = evRango(ev); const out = {};
  g.alumnos.forEach(a => out[a.id] = { trabajo: [], deberes: [], actitud: [], preguntas: [] });
  const ok = v => typeof v === 'number' && Number.isFinite(v);
  Object.keys(S.regs).forEach(k => {
    if (!k.startsWith(gid + '|')) return; const f = k.split('|')[1]; if (f < d0 || f > d1) return; const r = S.regs[k];
    g.alumnos.forEach(a => { const o = out[a.id];
      if (r.trabajo?.[a.id] && ok(P.val3[r.trabajo[a.id]])) o.trabajo.push(P.val3[r.trabajo[a.id]]);
      if (r.deberes?.[a.id] && ok(P.val3[r.deberes[a.id]])) o.deberes.push(P.val3[r.deberes[a.id]]);
      const av = actVal(r.actitud?.[a.id]); if (av?.n) o.actitud.push(av.n * 2);
      (r.sorteos || []).filter(x => x.alumnoId === a.id && x.val && x.val !== 'skip' && ok(P.sorteo[x.val])).forEach(x => o.preguntas.push(P.sorteo[x.val])); });
  });
  return out;
}

/* ---- motor de cálculo ---- */
const splitCrit = (w, g, codes) => codes && codes.length ? codes.map(c => ({ w: w / codes.length, g, c })) : [{ w, g, c: null }];
function notaInstr(cal, ins, aid) {
  const v = ins.notas?.[aid];
  if (v === 'EX') return null;
  if (ins.modo === 'rubrica') {
    const its = (ins.items || []).filter(i => (Number(i.peso) || 0) > 0);
    const tw = its.reduce((s, i) => s + Number(i.peso), 0);
    if (v === 'NP') return { g: 0, parts: tw ? its.flatMap(i => splitCrit(Number(i.peso) / tw, 0, i.crit)) : [{ w: 1, g: 0, c: null }] };
    const sel = ins.rub?.[aid] || {}; const done = its.filter(i => valItem(cal, i, sel[i.id]) !== null); if (!done.length) return null;
    const dw = done.reduce((s, i) => s + Number(i.peso), 0);
    const parts = done.flatMap(i => splitCrit(Number(i.peso) / dw, valItem(cal, i, sel[i.id]), i.crit));
    return { g: parts.reduce((s, p) => s + p.w * p.g, 0), parts, parcial: done.length < its.length };
  }
  const g = v === 'NP' ? 0 : typeof v === 'number' ? v : null; if (g === null) return null;
  const cr = (ins.crit || []).filter(x => (Number(x.p) || 0) > 0); const tw = cr.reduce((s, x) => s + Number(x.p), 0);
  return { g, parts: cr.length ? cr.map(x => ({ w: Number(x.p) / tw, g, c: x.c })) : [{ w: 1, g, c: null }] };
}
function combinar(list) {
  const ok = list.filter(x => x.r && x.w > 0); const tw = ok.reduce((s, x) => s + x.w, 0); if (!tw) return null;
  return { g: ok.reduce((s, x) => s + x.w * x.r.g, 0) / tw, parts: ok.flatMap(x => x.r.parts.map(p => ({ w: p.w * x.w / tw, g: p.g, c: p.c }))) };
}
const mediaArr = arr => arr.length ? arr.reduce((s, x) => s + x, 0) / arr.length : null;
/* ---- reglas: recuperaciones, peor nota, nota mínima y redondeo del boletín ---- */
const REC_MODOS = [['sustituye', 'Sustituye a la nota'], ['maximo', 'Se queda la más alta'], ['media', 'Media de las dos']];
/* cambiar la nota manteniendo el reparto por criterios (así competencias y nota siguen cuadrando) */
function escalar(r, g) { if (!r || r.g === g) return r; const f = r.g > 0 ? g / r.g : 0; return { ...r, g, parts: r.parts.map(p => ({ ...p, g: r.g > 0 ? p.g * f : g })) }; }
function aplicarRec(base, rec, rc) {
  if (!rec) return base;
  const modo = rc.recModo || 'sustituye'; let out;
  if (!base) out = rec; else if (modo === 'maximo') out = rec.g > base.g ? rec : base; else if (modo === 'media') out = combinar([{ w: 1, r: base }, { w: 1, r: rec }]); else out = rec;
  const tope = rc.recTope === '' || rc.recTope === undefined || rc.recTope === null ? null : Number(String(rc.recTope).replace(',', '.'));
  if (out !== base && tope !== null && Number.isFinite(tope)) { const lim = Math.max(tope, base ? base.g : 0); if (out.g > lim) out = escalar(out, lim); }
  if (out === base || (base && Math.abs(out.g - base.g) < 1e-9)) return base;
  /* una recuperación sin criterios propios hereda el reparto por criterios de lo que recupera */
  if (base && out.parts.every(q => !q.c) && base.parts.some(q => q.c)) out = escalar(base, out.g);
  return { ...out, recuperada: true };
}
const esRecEv = i => String(i.recupera || '').startsWith('ev:');
const recsDe = (cal, id) => cal.instr.filter(r => r.recupera === id).sort((a, b) => (a.fecha || '').localeCompare(b.fecha || ''));
function notaInstrR(cal, ins, aid) { let r = notaInstr(cal, ins, aid); recsDe(cal, ins.id).forEach(rc => { r = aplicarRec(r, notaInstr(cal, rc, aid), rc); }); return r; }
const RED_DEF = { decima: 5, noAprobar: false, final: 'exacta', cualit: false };
const redDe = cal => Object.assign({}, RED_DEF, cal?.redondeo || {});
function boletin(cal, g) {
  if (g === null || g === undefined || Number.isNaN(g)) return null; const R = redDe(cal);
  const x = Math.round(g * 100) / 100; let e = Math.floor(x + 1e-9); const fr = Math.round((x - e) * 100) / 100;
  if (Number(R.decima) < 10 && fr >= Number(R.decima) / 10 - 1e-9) e += 1;
  if (R.noAprobar && x < 5 && e >= 5) e = 4;
  return Math.max(0, Math.min(10, e));
}
const cualit = n => n === null || n === undefined ? '' : n < 5 ? 'IN' : n < 6 ? 'SU' : n < 7 ? 'BI' : n < 9 ? 'NT' : 'SB';
const bolTxt = (cal, n) => n === null || n === undefined ? '' : String(n) + (redDe(cal).cualit ? ' · ' + cualit(n) : '');
const decTxt = d => Number(d) >= 10 ? 'nunca (se quitan los decimales)' : '0,' + d;
const valorR = g => ({ g, parts: [{ w: 1, g, c: null }] });
function calcNodo(cal, n, ev, aid, src, out) {
  let r;
  if ((n.hijos || []).length) r = combinar(n.hijos.map(h => ({ w: pesoN(cal, h, ev), r: calcNodo(cal, h, ev, aid, src, out) })));
  else {
    const ins = cal.instr.filter(i => i.nodo === n.id && i.ev === ev && !i.recupera);
    let ri = ins.map(i => ({ id: i.id, w: n.reparto === 'mano' ? (Number(i.peso ?? 1) || 0) : 1, r: notaInstrR(cal, i, aid) }));
    if (n.descartarPeor) { const con = ri.filter(x => x.r); if (con.length >= (Number(n.descMin) || 3)) { const peor = con.reduce((m, x) => x.r.g < m.r.g ? x : m); ri = ri.map(x => x === peor ? { ...x, r: null } : x); if (out) (out.__q = out.__q || []).push(peor.id); } }
    const fk = FUENTES.map(f => f[0]).filter(k => n.fuentes && n.fuentes[k] !== undefined);
    const sv = src[aid] || {};
    if (n.modo === 'media' && fk.length) r = combinar([...ri.filter(x => x.r).map(x => ({ w: 1, r: x.r })), ...fk.flatMap(k => (sv[k] || []).map(v => ({ w: 1, r: valorR(v) })))]);
    else {
      const comp = [];
      if (ins.length) comp.push({ w: fk.length ? (Number(n.pesoInstr) || 0) : 1, r: combinar(ri) });
      fk.forEach(k => { const m = mediaArr(sv[k] || []); comp.push({ w: Number(n.fuentes[k]) || 0, r: m === null ? null : valorR(m) }); });
      r = combinar(comp);
    }
    if (r && (n.crit || []).length) r = { g: r.g, parts: r.parts.flatMap(p => p.c ? [p] : splitCrit(p.w, p.g, n.crit)) };
  }
  if (out) out[n.id] = r ? r.g : null;
  return r;
}
const calcEval = (cal, ev, aid, src, out) => combinar(cal.arbol.map(n => ({ w: pesoN(cal, n, ev), r: calcNodo(cal, n, ev, aid, src, out) })));
/* nota de la evaluación con las reglas: nota mínima (tope) y recuperación de toda la evaluación */
function calcEvalR(cal, ev, aid, src, out) {
  let r = calcEval(cal, ev, aid, src, out); const avisos = [];
  if (r) walk(cal.arbol, n => {
    const m = n.minimo; if (!m || m.nota === '' || m.nota === undefined || m.nota === null) return;
    const lim = Number(String(m.nota).replace(',', '.')); const tope = Number(String(m.tope ?? 4).replace(',', '.')); if (!Number.isFinite(lim)) return;
    let falla = false;
    if (m.ambito === 'cada') { const ids = new Set(); walk([n], x => ids.add(x.id)); const quit = new Set(out?.__q || []);
      cal.instr.filter(i => ids.has(i.nodo) && i.ev === ev && !i.recupera && !quit.has(i.id)).forEach(i => { const x = notaInstrR(cal, i, aid); if (x && x.g < lim - 1e-9) falla = true; }); }
    else { const v = out?.[n.id]; if (v !== null && v !== undefined && v < lim - 1e-9) falla = true; }
    if (falla) { avisos.push(`No llega al ${nf(lim, 2)} ${m.ambito === 'cada' ? 'en algún instrumento de' : 'en'} ${n.nombre || 'una categoría'}: nota máxima ${nf(tope, 2)}`); if (Number.isFinite(tope) && r.g > tope) r = escalar(r, tope); }
  });
  const antes = r ? r.g : null; let rec = false;
  cal.instr.filter(i => i.recupera === 'ev:' + ev).sort((a, b) => (a.fecha || '').localeCompare(b.fecha || '')).forEach(rc => { const nr = aplicarRec(r, notaInstr(cal, rc, aid), rc); if (nr !== r) rec = true; r = nr; });
  return { r, avisos, antes: rec ? antes : null };
}
/* lo que no tiene criterio se reparte entre los criterios en proporción a su peso */
function porCriterio(parts) {
  const m = {}; let wn = 0, sn = 0;
  (parts || []).forEach(p => { if (p.w <= 0) return; if (p.c) { const x = m[p.c] || (m[p.c] = { w: 0, s: 0 }); x.w += p.w; x.s += p.w * p.g; } else { wn += p.w; sn += p.w * p.g; } });
  const T = 1 - wn; const crit = {};
  if (T > 1e-9) Object.entries(m).forEach(([c, x]) => { crit[c] = { w: x.w / T, g: T * (x.s / x.w) + sn }; });
  return { crit, sinCrit: Object.keys(crit).length ? wn : 1 };
}
function porCE(crit) { const ce = {}; Object.entries(crit).forEach(([c, x]) => { const k = ceDe(c); const o = ce[k] || (ce[k] = { w: 0, s: 0 }); o.w += x.w; o.s += x.w * x.g; }); Object.values(ce).forEach(o => o.g = o.s / o.w); return ce; }
/* resultados de todo el grupo en una evaluación */
function resEval(g, cal, ev) {
  const src = autoSrc(g.id, ev); const R = {};
  g.alumnos.forEach(a => { const out = {}; const { r, avisos, antes } = calcEvalR(cal, ev, a.id, src, out); const pc = porCriterio(r?.parts);
    R[a.id] = { g: r ? r.g : null, r, out, crit: r ? pc.crit : {}, sinCrit: r ? pc.sinCrit : 0, ce: r ? porCE(pc.crit) : {}, src: src[a.id], avisos, antes, bol: boletin(cal, r ? r.g : null), quit: new Set(out.__q || []) }; });
  return R;
}
function pesoEvFinal(cal, ev) { const v = cal.evalPesos[ev]; return v === undefined || v === '' ? 1 : Number(v) || 0; }
function resFinal(g, cal) {
  const evs = evals(); const RE = {}; evs.forEach(e => RE[e.id] = resEval(g, cal, e.id)); const R = {};
  g.alumnos.forEach(a => {
    const lista = evs.map(e => { const x = RE[e.id][a.id]; if (x.g === null) return { w: 0, r: null };
      const parts = Object.keys(x.crit).length ? Object.entries(x.crit).map(([c, y]) => ({ w: y.w, g: y.g, c })) : [{ w: 1, g: x.g, c: null }];
      const base = { g: x.g, parts }; return { w: pesoEvFinal(cal, e.id), r: redDe(cal).final === 'boletin' ? escalar(base, x.bol) : base }; });
    const r = combinar(lista); const pc = porCriterio(r?.parts); const man = cal.finalManual[a.id];
    const manual = man && typeof man.nota === 'number' ? man.nota : null;
    const gF = manual ?? (r ? r.g : null);
    R[a.id] = { calc: r ? r.g : null, g: gF, manual, motivo: man?.motivo || '', evs: Object.fromEntries(evs.map(e => [e.id, RE[e.id][a.id].g])), evsBol: Object.fromEntries(evs.map(e => [e.id, RE[e.id][a.id].bol])), crit: r ? pc.crit : {}, sinCrit: r ? pc.sinCrit : 0, ce: r ? porCE(pc.crit) : {}, bol: boletin(cal, gF) };
  });
  return R;
}

/* ---- vista ---- */
VIEWS.cal = () => {
  if (!S.grupos.length) return vacio();
  const GC = S.grupos.filter(x => !esTutoria(x));
  if (!GC.length) return `<div class="panel empty">Solo tienes grupos de tutoría, que no llevan calificaciones. La ficha de cada alumno está en Grupos → Tutoría.</div>`;
  const g = GC.find(x => x.id === UI.calG) || GC.find(x => x.id === UI.grupoId) || GC[0]; UI.calG = g.id; const cal = calDe(g);
  const evs = evals(); if (UI.calEv !== 'final' && !evs.some(e => e.id === UI.calEv)) UI.calEv = evActual();
  const tab = UI.calTab || 'cuaderno'; const ev = UI.calEv;
  const head = `<div class="page-head"><div><div class="label">Calificaciones</div><h1>${gchip(g)}</h1><div class="sub">${esc(g.materia || '')}${g.nivel ? ' · ' + esc(g.nivel) : ''} · ${g.alumnos.length} alumnos · ${cal.curr ? (currOf(cal, g)?.propio ? 'criterios propios' : L2('criterios de ', 'criteris de ') + esc(paqTitulo(currId(cal.curr), appLg()))) : 'sin criterios vinculados'}</div></div>
    <div class="row" style="align-items:flex-end"><label class="f" style="min-width:200px">Grupo<select data-f="calg">${GC.map(x => `<option value="${x.id}" ${x.id === g.id ? 'selected' : ''}>${esc(x.nombre)}</option>`).join('')}</select></label><button class="btn" data-a="calxls">Exportar a Excel</button></div></div>`;
  const tabs = `<div class="tabs" role="tablist">${[['cuaderno', 'Cuaderno'], ['comp', 'Competencias'], ['config', 'Configuración']].map(([v, t]) => `<button role="tab" aria-selected="${tab === v}" data-a="caltab" data-v="${v}">${t}</button>`).join('')}</div>`;
  const evbar = `<div class="row" style="margin-bottom:14px"><div class="seg">${evs.map(e => `<button data-a="calev" data-v="${e.id}" aria-pressed="${ev === e.id}">${esc(e.nombre)}</button>`).join('')}${tab !== 'config' ? `<button data-a="calev" data-v="final" aria-pressed="${ev === 'final'}">Final</button>` : ''}</div>${tab === 'config' ? '<span class="small muted">Editando los pesos de esta evaluación</span>' : ''}</div>`;
  let body;
  if (tab === 'config') body = (cal.pesosPorEval ? evbar : '') + vistaCalConfig(g, cal);
  else if (!g.alumnos.length) body = evbar + `<div class="panel empty">Este grupo no tiene alumnos todavía. Añádelos en <a href="#" data-a="go" data-v="grupo" data-g="${g.id}">Grupos → Alumnado</a>.</div>`;
  else if (tab === 'comp') body = evbar + vistaComp(g, cal, ev);
  else body = evbar + (ev === 'final' ? tablaFinal(g, cal) : tablaCal(g, cal, ev));
  return head + tabs + body;
};

function avisoPesos(cal, ev) {
  const out = []; const sum = L => L.reduce((s, n) => s + pesoN(cal, n, ev), 0);
  const top = sum(cal.arbol); if (cal.arbol.length && Math.abs(top - 100) > .01) out.push(`Las categorías suman <b>${nf(top)} %</b> (deberían sumar 100). La app reparte en proporción, pero conviene revisarlo.`);
  walk(cal.arbol, n => { if ((n.hijos || []).length) { const s = sum(n.hijos); if (Math.abs(s - 100) > .01) out.push(`Las subcategorías de <b>${esc(n.nombre)}</b> suman ${nf(s)} %.`); } });
  return out.length ? `<div class="alert warn small" style="margin-bottom:12px"><span class="grow">${out.join(' ')}</span><button class="btn sm" data-a="caltab" data-v="config">Revisar</button></div>` : '';
}

function columnasCal(cal, ev) {
  const cols = [], cats = [];
  cal.arbol.forEach(top => {
    const start = cols.length;
    const hoja = (n, sub) => {
      const ins = cal.instr.filter(i => i.nodo === n.id && i.ev === ev && !esRecEv(i)).sort((a, b) => (a.fecha || '9999').localeCompare(b.fecha || '9999'));
      const fu = FUENTES.filter(([k]) => n.fuentes?.[k] !== undefined);
      ins.forEach(i => cols.push({ t: 'ins', i, n, sub }));
      fu.forEach(([k, lab]) => cols.push({ t: 'auto', k, lab, n, sub }));
      if (!ins.length && !fu.length) cols.push({ t: 'vacio', n, sub });
      else cols.push({ t: 'add', n, sub });
      if (sub) cols.push({ t: 'nodo', n, sub });
    };
    if ((top.hijos || []).length) top.hijos.forEach(h => hoja(h, h)); else hoja(top, null);
    cols.push({ t: 'cat', n: top });
    cats.push({ n: top, span: cols.length - start });
  });
  return { cols, cats };
}

function thIns(cal, i, pre, cls, rowspan) {
  const tgt = i.recupera ? (esRecEv(i) ? 'toda la ' + evNombre(i.recupera.slice(3)) : (cal.instr.find(x => x.id === i.recupera)?.nombre || '?')) : '';
  const modo = (REC_MODOS.find(m => m[0] === (i.recModo || 'sustituye')) || [])[1] || '';
  return `<th class="${cls}${i.recupera ? ' recth' : ''}"${rowspan ? ` rowspan="${rowspan}"` : ''}>${pre}<button class="insh" data-a="calins" data-id="${i.id}" title="${i.recupera ? esc(`Recupera ${tgt} · ${modo}${i.recTope !== '' && i.recTope != null ? ' · máximo ' + i.recTope : ''}`) : 'Editar'}">${i.recupera ? '↺ ' : ''}${esc(i.nombre || 'Sin nombre')}${i.modo === 'rubrica' ? ' <span class="tiny">▦</span>' : ''}</button>${i.recupera ? `<span class="tiny muted" style="display:block">recupera ${esc(tgt)}</span>` : i.fecha ? `<span class="tiny muted" style="display:block">${fShort(i.fecha)}</span>` : ''}</th>`;
}
function tdIns(cal, i, a, r, col, quitada) {
  const v = i.notas?.[a.id]; const ri = notaInstr(cal, i, a.id); const q = quitada ? ' quit' : '';
  const tq = quitada ? ' title="La peor nota: no cuenta"' : '';
  if (i.modo === 'rubrica') return `<td${tq}><button class="rubbtn${lowC(ri?.g)}${q}" data-a="calrub" data-ins="${i.id}" data-al="${a.id}" data-fid="n-${i.id}-${a.id}">${v === 'NP' || v === 'EX' ? v : ri ? nf(ri.g, 2) + (ri.parcial ? '…' : '') : '—'}</button></td>`;
  return `<td${tq}><input class="calcell${lowC(typeof v === 'number' ? v : v === 'NP' ? 0 : null)}${q}" type="text" inputmode="decimal" value="${esc(notaTxt(v))}" data-f="calnota" data-calre="1" data-ins="${i.id}" data-al="${a.id}" data-r="${r}" data-c="${col}" data-fid="n-${i.id}-${a.id}" aria-label="${esc(i.nombre)} · ${esc(a.nombre)}"></td>`;
}
function tablaCal(g, cal, ev) {
  const R = resEval(g, cal, ev); const { cols, cats } = columnasCal(cal, ev); const evRecs = cal.instr.filter(i => i.recupera === 'ev:' + ev);
  if (!cal.arbol.length) return `<div class="panel empty">Todavía no hay categorías. Créalas en <a href="#" data-a="caltab" data-v="config">Configuración</a>.</div>`;
  const sub = c => c.sub ? `<span class="tiny muted" style="display:block">${esc(c.sub.nombre)}</span>` : '';
  const h2 = cols.map(c => {
    if (c.t === 'ins') return thIns(cal, c.i, sub(c), c.sub ? 'subh' : '');
    if (c.t === 'auto') return `<th>${sub(c)}${esc(c.lab)}<span class="tiny muted" style="display:block">de Anotaciones</span></th>`;
    if (c.t === 'vacio') return `<th>${sub(c)}<button class="btn sm ghost" data-a="calnew" data-nodo="${c.n.id}">+ Añadir</button></th>`;
    if (c.t === 'add') return `<th class="addcol">${c.sub ? '<span class="tiny" style="display:block">&nbsp;</span>' : ''}<button class="iconbtn" data-a="calnew" data-nodo="${c.n.id}" aria-label="Añadir instrumento a ${esc(c.n.nombre)}" title="Añadir instrumento">＋</button></th>`;
    if (c.t === 'nodo') return `<th class="sum">${esc(c.n.nombre)}<span class="tiny muted" style="display:block">${nf(pesoN(cal, c.n, ev))} %</span></th>`;
    return `<th class="sum cat-n">Nota</th>`;
  }).join('');
  const rows = g.alumnos.map((a, r) => {
    const x = R[a.id]; let ci = 0;
    const tds = cols.map(c => {
      if (c.t === 'ins') return tdIns(cal, c.i, a, r, ci++, x.quit.has(c.i.id));
      if (c.t === 'auto') { const arr = x.src?.[c.k] || []; const m = mediaArr(arr); return `<td class="auto${lowC(m)}">${nf(m)}${arr.length ? `<span class="tiny muted"> (${arr.length})</span>` : ''}</td>`; }
      if (c.t === 'vacio' || c.t === 'add') return `<td class="${c.t === 'add' ? 'addcol' : ''}"></td>`;
      if (c.t === 'nodo') return `<td class="sum${lowC(x.out[c.n.id])}">${nf(x.out[c.n.id], 2)}</td>`;
      return `<td class="sum cat-n${lowC(x.out[c.n.id])}">${nf(x.out[c.n.id], 2)}</td>`;
    }).join('');
    const recs = evRecs.map(i => tdIns(cal, i, a, r, ci++, false)).join('');
    const marcas = (x.antes !== null && x.antes !== undefined ? `<span class="calmark" title="Recuperada. Antes: ${esc(nf(x.antes, 2) || 'sin nota')}">↺</span>` : '') + (x.avisos.length ? `<span class="calmark warnc" title="${esc(x.avisos.join('. '))}">⚠</span>` : '');
    return `<tr><td class="stick"><button class="alname" data-a="calal" data-al="${a.id}">${esc(a.apellidos ? a.apellidos + ', ' + (a.pila || '') : a.nombre)}</button></td>${tds}${recs}<td class="tot${lowC(x.g)}">${nf(x.g, 2)}${marcas}</td><td class="tot bol${lowC(x.bol)}">${esc(bolTxt(cal, x.bol))}</td></tr>`;
  }).join('');
  const avg = vals => { const v = vals.filter(y => y !== null && y !== undefined); return v.length ? v.reduce((s, y) => s + y, 0) / v.length : null; };
  const foot = cols.map(c => {
    if (c.t === 'ins') return `<td>${nf(avg(g.alumnos.map(a => notaInstr(cal, c.i, a.id)?.g)), 1)}</td>`;
    if (c.t === 'auto') return `<td>${nf(avg(g.alumnos.map(a => mediaArr(R[a.id].src?.[c.k] || []))))}</td>`;
    if (c.t === 'nodo' || c.t === 'cat') return `<td class="sum">${nf(avg(g.alumnos.map(a => R[a.id].out[c.n.id])), 1)}</td>`;
    return `<td class="${c.t === 'add' ? 'addcol' : ''}"></td>`;
  }).join('');
  const sus = g.alumnos.filter(a => R[a.id].g !== null && R[a.id].g < 5).length;
  return avisoPesos(cal, ev) + `<div class="row between" style="margin-bottom:10px"><div class="row"><button class="btn primary" data-a="calnew">+ Nuevo instrumento</button><button class="btn" data-a="impabrir">⇩ Importar instrumentos</button><span class="small muted">Escribe la nota (0–10), <b>NP</b> (no presentado, cuenta 0) o <b>EX</b> (exento, no cuenta). Intro baja a la fila siguiente.</span></div>
    <span class="small muted">${sus ? `${sus} con nota menor que 5` : ''}</span></div>
    <div class="panel" style="padding:0"><div class="tablewrap"><table class="nt"><thead><tr><th class="stick" rowspan="2">Alumno</th>${cats.map(c => `<th class="cat" colspan="${c.span}">${esc(c.n.nombre || 'Sin nombre')} <span class="muted">${nf(pesoN(cal, c.n, ev))} %</span></th>`).join('')}${evRecs.map(i => thIns(cal, i, '', '', 2)).join('')}<th class="tot" rowspan="2">Nota<span class="tiny" style="display:block;font-weight:400">${esc(evNombre(ev))}</span></th><th class="tot bol" rowspan="2">Boletín</th></tr><tr>${h2}</tr></thead>
    <tbody>${rows}</tbody><tfoot><tr><td class="stick small muted">Media del grupo</td>${foot}${evRecs.map(i => `<td>${nf(avg(g.alumnos.map(a => notaInstr(cal, i, a.id)?.g)), 1)}</td>`).join('')}<td class="tot">${nf(avg(g.alumnos.map(a => R[a.id].g)), 2)}</td><td class="tot bol">${nf(avg(g.alumnos.map(a => R[a.id].bol)), 1)}</td></tr></tfoot></table></div></div>
    <p class="tiny muted" style="margin-top:6px">Boletín: sube a la nota siguiente a partir de ${esc(decTxt(redDe(cal).decima))}${redDe(cal).noAprobar ? ', sin aprobar por redondeo' : ''}. ↺ = recuperada · ⚠ = no llega a la nota mínima · tachada = la peor nota, que no cuenta. <a href="#" data-a="caltab" data-v="config">Cambiar las reglas</a></p>`;
}

function tablaFinal(g, cal) {
  const evs = evals(); const R = resFinal(g, cal);
  const tp = evs.reduce((s, e) => s + pesoEvFinal(cal, e.id), 0);
  return `<div class="panel stack"><p class="small muted" style="margin:0">La nota final es la media de las evaluaciones${redDe(cal).final === 'boletin' ? ' <b>con la nota del boletín</b> (redondeada)' : ''} con los porcentajes de la cabecera (cámbialos ahí o en Configuración). Si escribes una nota en <b>Nota final</b>, sustituye a la calculada y queda marcada como modificada.</p>
    <div class="tablewrap"><table class="nt"><thead><tr><th class="stick">Alumno</th>${evs.map(e => `<th>${esc(e.nombre)}<label class="tiny" style="display:flex;align-items:center;gap:3px;justify-content:center;margin-top:3px"><input type="number" min="0" class="pct" value="${esc(String(cal.evalPesos[e.id] ?? nf(100 / evs.length, 1).replace(',', '.')))}" data-f="calevpeso" data-ev="${e.id}" data-calre="1" aria-label="Peso de ${esc(e.nombre)}">%</label></th>`).join('')}<th class="sum">Calculada</th><th class="tot">Nota final</th><th class="tot bol">Boletín</th><th style="text-align:left">Motivo del cambio</th></tr></thead>
    <tbody>${g.alumnos.map((a, r) => { const x = R[a.id]; return `<tr><td class="stick"><button class="alname" data-a="calal" data-al="${a.id}">${esc(a.apellidos ? a.apellidos + ', ' + (a.pila || '') : a.nombre)}</button></td>${evs.map(e => `<td class="${lowC(x.evs[e.id]).trim()}">${nf(x.evs[e.id], 2)}</td>`).join('')}<td class="sum${lowC(x.calc)}">${nf(x.calc, 2)}</td>
      <td class="tot"><div class="row" style="flex-wrap:nowrap;justify-content:center;gap:4px"><input class="calcell${lowC(x.g)}" type="text" inputmode="decimal" placeholder="${esc(nf(x.calc, 2))}" value="${x.manual !== null ? esc(notaTxt(x.manual)) : ''}" data-f="calfinal" data-calre="1" data-al="${a.id}" data-r="${r}" data-c="0" data-fid="f-${a.id}" aria-label="Nota final de ${esc(a.nombre)}">${x.manual !== null ? `<button class="iconbtn" data-a="calfinreset" data-al="${a.id}" title="Volver a la calculada" aria-label="Volver a la nota calculada">↺</button>` : ''}</div>${x.manual !== null ? '<span class="pill warn" style="margin-top:2px">Modificada</span>' : ''}</td>
      <td class="tot bol${lowC(x.bol)}">${esc(bolTxt(cal, x.bol))}</td>
      <td>${x.manual !== null ? `<input type="text" value="${esc(x.motivo)}" placeholder="Opcional" data-f="calmotivo" data-al="${a.id}" style="min-width:160px">` : ''}</td></tr>`; }).join('')}</tbody></table></div>
    ${Math.abs(tp - 100) > .01 && Object.keys(cal.evalPesos).length ? `<div class="alert warn small">Los porcentajes de las evaluaciones suman ${nf(tp)} %. Se reparten en proporción.</div>` : ''}</div>`;
}

function vistaComp(g, cal, ev) {
  if (!cal.curr) return `<div class="panel empty">Para ver las notas por competencias, elige el currículo del grupo en <a href="#" data-a="caltab" data-v="config">Configuración</a> y vincula los instrumentos o los ítems de las rúbricas a criterios de evaluación.</div>`;
  const C = currOf(cal); const R = ev === 'final' ? resFinal(g, cal) : resEval(g, cal, ev);
  const conNota = g.alumnos.filter(a => R[a.id].g !== null);
  const pesoMed = k => conNota.length ? conNota.reduce((s, a) => s + (R[a.id].ce[k]?.w || 0), 0) / conNota.length : 0;
  const pesoMedC = c => conNota.length ? conNota.reduce((s, a) => s + (R[a.id].crit[c]?.w || 0), 0) / conNota.length : 0;
  const ces = C.ce.filter(([n]) => pesoMed(String(n)) > 0);
  const sinEv = C.ce.filter(([n]) => pesoMed(String(n)) === 0);
  const critSin = C.ce.flatMap(([, , cr]) => cr.map(c => c[0])).filter(c => pesoMedC(c) === 0);
  const showC = !!UI.calCrit;
  const sinCrit = conNota.length ? conNota.reduce((s, a) => s + R[a.id].sinCrit, 0) / conNota.length : 0;
  if (!conNota.length) return `<div class="panel empty">Todavía no hay notas en ${ev === 'final' ? 'el curso' : esc(evNombre(ev))}.</div>`;
  if (!ces.length) return `<div class="panel empty">Hay notas, pero ningún instrumento está vinculado a criterios de evaluación. Al crear o editar un instrumento, elige sus criterios (o los de cada ítem de la rúbrica), o pon criterios por defecto a una categoría en Configuración.</div>`;
  const colsCE = ces.map(([n, t, cr]) => { const k = String(n); const crs = cr.filter(c => pesoMedC(c[0]) > 0); return { k, t, crs }; });
  const h1 = colsCE.map(c => `<th class="cat" colspan="${showC ? c.crs.length + 1 : 1}" title="${esc(c.t)}">CE${c.k} <span class="muted">${nf(pesoMed(c.k) * 100)} %</span><span class="tiny muted" style="display:block;font-weight:400;white-space:normal;max-width:${showC ? 260 : 150}px"${currLangAttr(C)}>${esc(cortaTxt(c.t, showC ? 140 : 80))}</span></th>`).join('');
  const h2 = showC ? colsCE.map(c => c.crs.map(([code, txt]) => `<th title="${esc(txt)}">${esc(code)}<span class="tiny muted" style="display:block">${nf(pesoMedC(code) * 100)} %</span></th>`).join('') + `<th class="sum">CE${c.k}</th>`).join('') : '';
  const rows = g.alumnos.map(a => { const x = R[a.id]; const m = Object.values(x.ce).reduce((s, o) => s + o.w * o.g, 0);
    return `<tr><td class="stick"><button class="alname" data-a="calal" data-al="${a.id}">${esc(a.apellidos ? a.apellidos + ', ' + (a.pila || '') : a.nombre)}</button></td>${colsCE.map(c => (showC ? c.crs.map(([code]) => `<td class="${lowC(x.crit[code]?.g).trim()}">${nf(x.crit[code]?.g, 2)}</td>`).join('') : '') + `<td class="sum${lowC(x.ce[c.k]?.g)}">${nf(x.ce[c.k]?.g, 2)}</td>`).join('')}
      <td class="sum">${x.g !== null && Object.keys(x.ce).length ? nf(Math.abs(m - (ev === 'final' ? x.calc : x.g)) < 1e-6 ? (ev === 'final' ? x.calc : x.g) : m, 2) : ''}</td><td class="tot${lowC(x.g)}">${nf(x.g, 2)}${ev === 'final' && x.manual !== null ? ' <span class="pill warn" title="Nota final modificada a mano: no coincide con las competencias">a mano</span>' : ''}</td></tr>`; }).join('');
  return `<div class="stack"><div class="panel stack" style="gap:8px"><div class="row between"><p class="small" style="margin:0">Cada criterio y cada competencia pesan lo que les llega de los instrumentos (el % que se ve en la cabecera, de media en el grupo). Por eso la <b>media ponderada de las competencias</b> coincide con la nota.</p>
      <label class="check small"><input type="checkbox" data-f="calcrit" ${showC ? 'checked' : ''}>Ver criterios</label></div>
      ${sinCrit > 1e-6 ? `<div class="alert info small">Un ${nf(sinCrit * 100)} % de la nota (de media) no está vinculado a ningún criterio, por ejemplo trabajo de clase. Se reparte entre todos los criterios en proporción a su peso: cada criterio queda como «${nf((1 - sinCrit) * 100)} % de sus evidencias + ${nf(sinCrit * 100)} % de lo que no tiene criterio».</div>` : ''}</div>
    <div class="panel" style="padding:0"><div class="tablewrap"><table class="nt"><thead><tr><th class="stick" rowspan="${showC ? 2 : 1}">Alumno</th>${h1}<th class="sum" rowspan="${showC ? 2 : 1}">Media ponderada<br>de competencias</th><th class="tot" rowspan="${showC ? 2 : 1}">Nota<span class="tiny" style="display:block;font-weight:400">${ev === 'final' ? 'final' : esc(evNombre(ev))}</span></th></tr>${showC ? `<tr>${h2}</tr>` : ''}</thead><tbody>${rows}</tbody></table></div></div>
    ${sinEv.length || critSin.length ? `<div class="panel small"><b>Sin evidencias ${ev === 'final' ? 'en el curso' : 'en esta evaluación'}:</b> ${sinEv.length ? sinEv.map(([n]) => 'CE' + n).join(', ') + '. ' : ''}${critSin.length ? `Criterios: ${critSin.map(esc).join(', ')}.` : ''}</div>` : ''}</div>`;
}

/* ---- configuración ---- */
function chipsCrit(codes, extra = '') { return (codes || []).length ? codes.map(c => `<span class="tag" title="${esc(critTexto(UI._calRef, c))}">${esc(c)}</span>`).join('') : `<span class="tiny muted">${extra || 'Ninguno'}</span>`; }
function nodoCfg(cal, n, parent, evC) {
  const leaf = !(n.hijos || []).length;
  let nIns = 0; walk([n], x => { nIns += cal.instr.filter(i => i.nodo === x.id).length; });
  const peso = cal.pesosPorEval ? pesoN(cal, n, evC) : n.peso;
  const headR = `<div class="row"><input type="text" value="${esc(n.nombre)}" data-f="calnodo" data-id="${n.id}" style="flex:1;min-width:150px;font-weight:700" aria-label="Nombre">
    <label class="row" style="gap:4px;flex-wrap:nowrap"><input type="number" min="0" class="pct" value="${esc(String(peso ?? ''))}" data-f="calpeso" data-id="${n.id}" data-calre="1" aria-label="Peso">% <span class="small muted">${parent ? 'de ' + esc(parent.nombre) : 'de la nota'}</span></label>
    ${!parent ? `<button class="btn sm ghost" data-a="calsub" data-id="${n.id}">+ Subcategoría</button>` : ''}<button class="iconbtn" data-a="caldelnodo" data-id="${n.id}" aria-label="Eliminar ${esc(n.nombre)}">✕</button></div>`;
  let bodyN = '';
  if (leaf) {
    const fk = FUENTES.filter(([k]) => n.fuentes?.[k] !== undefined);
    const instrN = cal.instr.filter(i => i.nodo === n.id).length;
    const sumP = (fk.length ? Number(n.pesoInstr) || 0 : 0) + fk.reduce((s, [k]) => s + (Number(n.fuentes[k]) || 0), 0);
    bodyN = `<div class="stack" style="gap:8px;margin-top:8px">
      <div><div class="label" style="margin-bottom:4px">Qué cuenta en esta nota</div><div class="row"><span class="tag">Instrumentos: ${instrN}</span>${FUENTES.map(([k, lab]) => `<label class="check small"><input type="checkbox" data-f="calfuente" data-id="${n.id}" data-k="${k}" ${n.fuentes?.[k] !== undefined ? 'checked' : ''}>${lab}</label>`).join('')}</div>
</div>
      ${fk.length ? `<div><div class="seg">${[['pond', 'Ponderación que elijo'], ['media', 'Media de todas las veces que se ha medido']].map(([v, t]) => `<button data-a="calmodo" data-id="${n.id}" data-v="${v}" aria-pressed="${(n.modo || 'pond') === v}">${t}</button>`).join('')}</div>
        ${(n.modo || 'pond') === 'pond' ? `<div class="row" style="margin-top:8px">${[['_instr', 'Instrumentos', n.pesoInstr], ...fk.map(([k, lab]) => [k, lab, n.fuentes[k]])].map(([k, lab, v]) => `<label class="row small" style="gap:4px;flex-wrap:nowrap">${lab}<input type="number" min="0" class="pct" value="${esc(String(v ?? 0))}" data-f="calfw" data-id="${n.id}" data-k="${k}" data-calre="1">%</label>`).join('')}<span class="small ${Math.abs(sumP - 100) > .01 ? 'warnc' : 'muted'}">Suma ${nf(sumP)} %</span></div>`
          : `<p class="tiny muted" style="margin:6px 0 0">Cada registro (cada sesión de trabajo, cada revisión de deberes, cada pregunta, cada actitud) y cada instrumento cuentan lo mismo.</p>`}</div>` : ''}
      ${instrN > 1 || n.reparto === 'mano' ? `<div class="row"><span class="small muted">Entre instrumentos:</span><div class="seg">${[['igual', 'Todos pesan igual'], ['mano', 'Peso de cada uno a mano']].map(([v, t]) => `<button data-a="calreparto" data-id="${n.id}" data-v="${v}" aria-pressed="${(n.reparto || 'igual') === v}">${t}</button>`).join('')}</div></div>` : ''}
      <div class="row"><span class="small muted">Criterios por defecto:</span>${chipsCrit(n.crit, 'ninguno: se reparte en proporción')}${cal.curr ? `<button class="btn sm ghost" data-a="calpick" data-tipo="nodo" data-id="${n.id}">Elegir</button>` : ''}</div>
</div>`;
  } else {
    const s = n.hijos.reduce((t, h) => t + pesoN(cal, h, evC), 0);
    bodyN = `<div class="tree-sub stack">${n.hijos.map(h => nodoCfg(cal, h, n, evC)).join('')}${Math.abs(s - 100) > .01 ? `<div class="small warnc">Las subcategorías suman ${nf(s)} %.</div>` : ''}</div>`;
  }
  const m = n.minimo;
  const minR = `<div class="row small" style="margin-top:6px"><label class="check small"><input type="checkbox" data-f="calmin" data-id="${n.id}" ${m ? 'checked' : ''}>Nota mínima para hacer media</label>
    ${m ? `<input type="text" inputmode="decimal" class="pct" value="${esc(String(m.nota ?? 4).replace('.', ','))}" data-f="calminv" data-calre="1" data-id="${n.id}" data-k="nota" aria-label="Nota mínima">
      <select data-f="calminv" data-calre="1" data-id="${n.id}" data-k="ambito" style="width:auto"><option value="media" ${m.ambito !== 'cada' ? 'selected' : ''}>en la nota de ${esc(n.nombre || 'la categoría')}</option><option value="cada" ${m.ambito === 'cada' ? 'selected' : ''}>en cada instrumento</option></select>
      <span class="muted">Si no llega, la evaluación queda como máximo en</span><input type="text" inputmode="decimal" class="pct" value="${esc(String(m.tope ?? 4).replace('.', ','))}" data-f="calminv" data-calre="1" data-id="${n.id}" data-k="tope" aria-label="Nota máxima si no llega">` : ''}</div>`;
  const peorR = leaf ? `<div class="row small"><label class="check small"><input type="checkbox" data-f="calpeor" data-id="${n.id}" ${n.descartarPeor ? 'checked' : ''}>Quitar la peor nota de los instrumentos</label>${n.descartarPeor ? `<span class="muted">si hay al menos</span><input type="number" min="2" class="pct" value="${esc(String(n.descMin || 3))}" data-f="caldescmin" data-calre="1" data-id="${n.id}" aria-label="Número mínimo de notas"><span class="muted">notas</span>` : ''}</div>` : '';
  return `<div class="tree-node${parent ? ' sub' : ''}">${headR}${minR}${peorR}${bodyN}</div>`;
}
function vistaCalConfig(g, cal) {
  UI._calRef = cal;
  const evs = evals(); const evC = cal.pesosPorEval ? (UI.calEv === 'final' ? evs[0].id : UI.calEv) : null;
  const top = cal.arbol.reduce((s, n) => s + pesoN(cal, n, evC), 0);
  const otros = S.grupos.filter(x => x.id !== g.id && S.cal[x.id]);
  const pls = S.config.plantillasCal || [];
  return `<div class="cols"><div class="stack">
    <div class="panel stack"><div class="panel-title"><h3>Categorías y pesos</h3><span class="small ${Math.abs(top - 100) > .01 ? 'warnc' : 'muted'}">Suman ${nf(top)} %</span></div>
      <p class="small muted" style="margin:0"><b>Instrumentos</b> son los exámenes, trabajos y actividades que añades en el cuaderno; trabajo diario, deberes, actitud y preguntas salen solos de lo registrado en clase. Los <b>criterios por defecto</b> de una categoría se aplican a lo que no tenga criterio propio; si no pones ninguno, esa parte se reparte entre todos los criterios en proporción.</p>
      ${cal.arbol.map(n => nodoCfg(cal, n, null, evC)).join('')}
      <div class="row"><button class="btn sm" data-a="calcatadd">+ Añadir categoría</button></div>
      <label class="check small"><input type="checkbox" data-f="calppe" ${cal.pesosPorEval ? 'checked' : ''}>Pesos distintos en cada evaluación (las categorías son las mismas)</label></div>
  </div><div class="stack">
    ${panelCurr(g, cal)}
    ${panelRedondeo(cal)}
    <div class="panel stack"><h3>Rúbricas</h3><div class="small muted">Nota (sobre 10) que vale cada nivel por defecto. Cada ítem de una rúbrica puede tener sus propios niveles.</div><div class="row">${cal.niveles.map((v, i) => `<label class="row small" style="gap:4px;flex-wrap:nowrap">${i} =<input type="number" min="0" max="10" step="0.1" class="pct" value="${esc(String(v))}" data-f="calniv" data-i="${i}"></label>`).join('')}</div></div>
    <div class="panel stack"><h3>Nota final del curso</h3><p class="tiny muted" style="margin:0">Media de las evaluaciones con estos porcentajes. Luego puedes cambiar a mano la nota final de cada alumno.</p>
      ${evs.map(e => `<label class="row small between" style="flex-wrap:nowrap">${esc(e.nombre)}<span class="row" style="gap:4px;flex-wrap:nowrap"><input type="number" min="0" class="pct" value="${esc(String(cal.evalPesos[e.id] ?? nf(100 / evs.length, 1).replace(',', '.')))}" data-f="calevpeso" data-ev="${e.id}">%</span></label>`).join('')}</div>
    <div class="panel stack"><h3>Plantillas</h3><p class="tiny muted" style="margin:0">Guarda las categorías y pesos (sin notas) para otros grupos o para otro instituto.</p>
      <div class="row"><input type="text" id="cal-pl-n" placeholder="Nombre, p. ej. IES X · ESO" style="flex:1;min-width:140px"><button class="btn sm" data-a="calplsave">Guardar</button></div>
      ${pls.length ? `<div class="row"><select id="cal-pl-s" style="flex:1;min-width:140px">${pls.map(p => `<option value="${p.id}">${esc(p.nombre)}</option>`).join('')}</select><button class="btn sm" data-a="calplapply">Aplicar</button><button class="iconbtn" data-a="calpldel" aria-label="Borrar plantilla">✕</button></div>` : ''}
      ${otros.length ? `<div class="row"><select id="cal-cp-s" style="flex:1;min-width:140px">${otros.map(x => `<option value="${x.id}">Copiar de ${esc(x.nombre)}</option>`).join('')}</select><button class="btn sm" data-a="calcopy">Copiar</button></div>` : ''}</div>
  </div></div>`;
}


function panelRedondeo(cal) {
  const R = redDe(cal); const ej = [4.4, 4.5, 4.7, 6.5, 8.49].map(v => `${nf(v, 2)} → ${boletin(cal, v)}`).join(' · ');
  return `<div class="panel stack"><h3>Redondeo del boletín</h3><p class="tiny muted" style="margin:0">La nota con decimales se mantiene; el boletín lleva la nota entera.</p>
    <label class="f">Subir a la nota siguiente a partir de la décima<select data-f="calred" data-k="decima">${[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(d => `<option value="${d}" ${Number(R.decima) === d ? 'selected' : ''}>${d === 10 ? 'Nunca (quitar los decimales)' : '0,' + d + (d === 5 ? ' (redondeo normal)' : '')}</option>`).join('')}</select></label>
    <label class="check small"><input type="checkbox" data-f="calred" data-k="noAprobar" ${R.noAprobar ? 'checked' : ''}>No aprobar por redondeo (un 4,x se queda en 4)</label>
    <label class="f">La nota final del curso se calcula con<select data-f="calred" data-k="final"><option value="exacta" ${R.final !== 'boletin' ? 'selected' : ''}>Las notas exactas de cada evaluación</option><option value="boletin" ${R.final === 'boletin' ? 'selected' : ''}>Las notas del boletín (ya redondeadas)</option></select></label>
    <label class="check small"><input type="checkbox" data-f="calred" data-k="cualit" ${R.cualit ? 'checked' : ''}>Mostrar también IN / SU / BI / NT / SB</label>
    <p class="tiny muted" style="margin:0">Ejemplo: ${esc(ej)}</p></div>`;
}
function panelCurr(g, cal) {
  const A0 = ASIG[g.asig];
  if (cal.curr === 'custom') {
    const ce = cal.custom.ce;
    return `<div class="panel stack"><h3>Competencias y criterios propios</h3><p class="tiny muted" style="margin:0">${esc(A0?.nombre || 'Este grupo')}: escribe tus competencias específicas y sus criterios. El código de cada criterio se pone solo y no cambia, para no perder lo que ya hayas vinculado.</p>
      ${ce.length ? ce.map((c, i) => `<div class="tree-node sub stack" style="gap:6px"><div class="row" style="flex-wrap:nowrap"><b style="white-space:nowrap">CE${esc(c[0])}</b><input type="text" value="${esc(c[1])}" placeholder="Competencia específica" data-f="cecust" data-i="${i}" style="flex:1;min-width:0" aria-label="Competencia ${esc(c[0])}"><button class="iconbtn" data-a="cecdel" data-i="${i}" aria-label="Quitar competencia">✕</button></div>
        ${c[2].map((cr, j) => `<div class="row" style="flex-wrap:nowrap;padding-left:12px"><span class="tag">${esc(cr[0])}</span><input type="text" value="${esc(cr[1])}" placeholder="Criterio de evaluación" data-f="crcust" data-i="${i}" data-j="${j}" style="flex:1;min-width:0" aria-label="Criterio ${esc(cr[0])}"><button class="iconbtn" data-a="crcdel" data-i="${i}" data-j="${j}" aria-label="Quitar criterio">✕</button></div>`).join('')}
        <button class="btn sm ghost" data-a="crcadd" data-i="${i}" style="align-self:flex-start;margin-left:12px">+ Criterio</button></div>`).join('') : '<p class="empty">Aún no hay ninguna competencia.</p>'}
      <button class="btn sm" data-a="cecadd" style="align-self:flex-start">+ Competencia específica</button></div>`;
  }
  if (A0) { const C = A0.curr ? currOf(cal, g) : null;
    return `<div class="panel stack"><h3>Currículo</h3><p class="small" style="margin:0">${C ? L2('Criterios de', 'Criteris de') + ' <b>' + esc(paqTitulo(C.id, appLg())) + '</b> ' + L2(C.lg === 'va' ? '(en valenciano)' : '(en castellano)', C.lg === 'va' ? '(en valencià)' : '(en castellà)') : 'Sin criterios'}</p>${currAviso(C)}<p class="tiny muted" style="margin:0">Salen de la asignatura del grupo y van en su idioma (Grupos → Datos del grupo). Decreto de la Comunitat Valenciana. Los criterios se eligen al crear cada instrumento o cada ítem de una rúbrica.</p></div>`; }
  return `<div class="panel stack"><h3>Currículo</h3><label class="f">Criterios de evaluación de<select data-f="calcurr" translate="no"><option value="">${esc(I18N.t('Sin currículo (solo nota)'))}</option>${currOpciones(cal.curr)}</select></label>
      <p class="tiny muted" style="margin:0">Mejor: elige la asignatura del grupo en Grupos → Datos del grupo y los criterios se pondrán solos.</p></div>`;
}
Object.assign(A, {
  cecadd() { const cal = calC(); const ce = cal.custom.ce; const n = ce.reduce((m, c) => Math.max(m, Number(c[0]) || 0), 0) + 1; ce.push([n, '', []]); touchCal(UI.calG); calRe(); },
  cecdel(el) { const cal = calC(); cal.custom.ce.splice(+el.dataset.i, 1); touchCal(UI.calG); calRe(); },
  crcadd(el) { const cal = calC(); const c = cal.custom.ce[+el.dataset.i]; if (!c) return; const m = c[2].reduce((x, cr) => Math.max(x, Number(String(cr[0]).split('.')[1]) || 0), 0); c[2].push([`${c[0]}.${m + 1}`, '']); touchCal(UI.calG); calRe(); },
  crcdel(el) { const cal = calC(); const c = cal.custom.ce[+el.dataset.i]; if (c) c[2].splice(+el.dataset.j, 1); touchCal(UI.calG); calRe(); },
});
/* ---- selector de criterios ---- */
function pickHTML(cal, sel) {
  const C = currOf(cal); if (!C) return '<p class="empty">Elige primero la asignatura del grupo en Grupos → Datos del grupo.</p>';
  if (C.cargando) return `<p class="empty">${C.error ? 'No se ha podido descargar el currículo. Conéctate a internet y vuelve a abrir esta ventana.' : 'Descargando el currículo… Vuelve a abrir esta ventana en un momento.'}</p>`;
  if (!C.ce.length) return '<p class="empty">Todavía no has escrito competencias ni criterios. Añádelos en Calificaciones → Configuración.</p>';
  const lgA = currLangAttr(C);
  return `<div class="stack" style="gap:10px">${C.ce.map(([n, t, cr]) => `<div><div class="label" style="margin-bottom:4px">CE${n} · <span style="text-transform:none;letter-spacing:0"${lgA}>${esc(t)}</span></div>
    ${cr.map(([c, tx]) => `<label class="check small pickrow"><input type="checkbox" data-f="pickchk" data-c="${c}" ${sel.includes(c) ? 'checked' : ''}><b>${c}</b> <span${lgA}>${esc(tx)}</span></label>`).join('')}</div>`).join('')}</div>`;
}
function remodal(html, cls) { const m = document.querySelector('#modal .modal'); const st = m ? m.scrollTop : 0; modal(html, true, cls); const n = document.querySelector('#modal .modal'); if (n) n.scrollTop = st; }
function pickNodoModal() { const p = UI.pick; const g = grupo(UI.calG); const cal = calDe(g); const n = nodoPorId(cal, p.id); if (!n) return;
  UI.calModal = pickNodoModal;
  remodal(`<h2>Criterios por defecto · ${esc(n.nombre)}</h2>${pickHTML(cal, n.crit || [])}<div class="row" style="margin-top:12px"><button class="btn primary" data-a="close">Listo</button></div>`, 'wide'); }

/* ---- editor de instrumento ---- */
function nuevoItem() { return { id: uid(), texto: '', peso: 25, crit: [], desc: ['', '', '', '', ''], v2: true }; }
function insModal() {
  const d = UI.insD; const g = grupo(UI.calG); const cal = calDe(g); UI.calModal = insModal; UI._calRef = cal;
  if (UI.pick) {
    const sel = UI.pick.tipo === 'ins' ? d.crit.map(x => x.c) : (d.items.find(i => i.id === UI.pick.id)?.crit || []);
    remodal(`<h2>${UI.pick.tipo === 'ins' ? 'Criterios del instrumento' : 'Criterios del ítem'}</h2>${pickHTML(cal, sel)}<div class="row" style="margin-top:12px"><button class="btn primary" data-a="pickok">Listo</button></div>`, 'wide'); return;
  }
  const H = hojas(cal); const n = nodoPorId(cal, d.nodo);
  const sumIt = d.items.reduce((s, i) => s + (Number(i.peso) || 0), 0); const sumCr = d.crit.reduce((s, x) => s + (Number(x.p) || 0), 0);
  const rubOtros = []; Object.entries(S.cal).forEach(([gid, c]) => (c.instr || []).forEach(i => { if (i.modo === 'rubrica' && (i.items || []).length && i.id !== d.id) rubOtros.push({ id: i.id, gid, t: `${i.nombre} · ${grupo(gid)?.nombre || ''}` }); }));
  const critBlock = `<div class="stack" style="gap:6px"><div class="row between"><div class="label">Criterios de evaluación</div>${cal.curr ? `<button class="btn sm" data-a="calpick" data-tipo="ins">Elegir criterios</button>` : ''}</div>
    ${!cal.curr ? '<p class="tiny muted" style="margin:0">Elige el currículo del grupo en Configuración para poder vincular criterios.</p>' : d.crit.length ? `<div class="stack" style="gap:4px">${d.crit.map(x => `<div class="row" style="flex-wrap:nowrap"><span class="tag">${esc(x.c)}</span><span class="small grow" style="min-width:0"${currLangAttr(currOf(cal))}>${esc(critTexto(cal, x.c))}</span><input type="number" min="0" class="pct" value="${esc(String(x.p))}" data-f="inscp" data-c="${x.c}" data-calre="modal" aria-label="Peso de ${x.c}">%<button class="iconbtn" data-a="inscdel" data-c="${x.c}" aria-label="Quitar">✕</button></div>`).join('')}</div>${Math.abs(sumCr - 100) > .01 ? `<span class="tiny warnc">Suman ${nf(sumCr)} %: se reparte en proporción.</span>` : ''}` : `<p class="tiny muted" style="margin:0">Sin criterio: esta nota se repartirá entre los criterios en proporción${n?.crit?.length ? ` (o irá a los criterios por defecto de la categoría: ${n.crit.join(', ')})` : ''}.</p>`}</div>`;
  const rubBlock = `<div class="stack" style="gap:10px"><div class="row between"><div class="label">Rúbrica · niveles por defecto 0–${cal.niveles.length - 1} = ${cal.niveles.map(v => nf(v, 2)).join(' / ')}</div>${rubOtros.length ? `<select data-f="inscopy" style="width:auto;max-width:260px"><option value="">Copiar rúbrica de…</option>${rubOtros.map(o => `<option value="${o.gid}|${o.id}">${esc(o.t)}</option>`).join('')}</select>` : ''}</div>
    ${d.items.map((it, k) => `<div class="rubedit"><div class="row" style="flex-wrap:nowrap"><span class="small muted">${k + 1}</span><input type="text" value="${esc(it.texto)}" placeholder="Qué se valora (p. ej. Conclusiones)" data-f="insit" data-id="${it.id}" data-k="texto" style="flex:1;min-width:0;font-weight:700"><input type="number" min="0" class="pct" value="${esc(String(it.peso))}" data-f="insit" data-id="${it.id}" data-k="peso" data-calre="modal" aria-label="Peso del ítem">%<button class="iconbtn" data-a="insitdel" data-id="${it.id}" aria-label="Quitar ítem">✕</button></div>
      <div class="row" style="margin:6px 0"><span class="tiny muted">Criterios:</span>${chipsCrit(it.crit)}${cal.curr ? `<button class="btn sm ghost" data-a="calpick" data-tipo="item" data-id="${it.id}">Elegir</button>` : ''}</div>
      <label class="check small" style="margin:0 0 6px"><input type="checkbox" data-f="insitlibre" data-id="${it.id}" ${it.libre ? 'checked' : ''}>Nota libre: sin niveles, al corregir se escribe una nota de 0 a 10</label>
      ${it.libre ? '' : (() => { const vs = nivelesItem(cal, it); return `<div class="row small" style="margin:2px 0 6px;gap:6px"><span class="muted">Niveles:</span><b>${vs.length}</b>
        <button class="btn sm" data-a="insniv" data-id="${it.id}" data-d="-1" ${vs.length <= 2 ? 'disabled' : ''} aria-label="Quitar un nivel">−</button><button class="btn sm" data-a="insniv" data-id="${it.id}" data-d="1" ${vs.length >= 6 ? 'disabled' : ''} aria-label="Añadir un nivel">+</button>
        <button class="btn sm ghost" data-a="insnivrep" data-id="${it.id}">Repartir de 0 a 10</button>
        ${it.vals ? `<button class="btn sm ghost" data-a="insnivdef" data-id="${it.id}">Usar los del grupo</button>` : '<span class="tiny muted">(los del grupo)</span>'}</div>
      <div class="rubdesc">${vs.map((v, l) => `<label class="f"><span class="row" style="gap:4px;flex-wrap:nowrap">Nivel ${l} =<input type="text" inputmode="decimal" class="pct" value="${esc(String(v).replace('.', ','))}" data-f="insitv" data-id="${it.id}" data-l="${l}" aria-label="Nota del nivel ${l}"></span><textarea rows="2" data-f="insit" data-id="${it.id}" data-k="d${l}" placeholder="Descriptor (opcional)">${esc(it.desc?.[l] || '')}</textarea></label>`).join('')}</div>`; })()}</div>`).join('')}
    <div class="row between"><button class="btn sm" data-a="insitadd">+ Añadir ítem</button><span class="row small" style="gap:8px"><span class="${Math.abs(sumIt - 100) > .01 && d.items.length ? 'warnc' : 'muted'}">${d.items.length ? `Pesos: suman ${nf(sumIt)} %` : ''}</span>${d.items.length > 1 ? '<button class="btn sm ghost" data-a="insitrep">Repartir por igual</button>' : ''}</span></div></div>`;
  const recEv = String(d.recupera || '').startsWith('ev:');
  const cands = cal.instr.filter(i => i.id !== d.id && !i.recupera);
  const recBlock = `<div class="stack" style="gap:6px"><label class="f">Tipo<select data-f="insd" data-k="recupera"><option value="">Instrumento normal</option>
      ${cands.length ? `<optgroup label="Recuperación de un instrumento">${cands.map(i => `<option value="${i.id}" ${d.recupera === i.id ? 'selected' : ''}>Recupera: ${esc(i.nombre || 'Sin nombre')} · ${esc(evNombre(i.ev))}</option>`).join('')}</optgroup>` : ''}
      <optgroup label="Recuperación de toda la evaluación">${evals().map(e => `<option value="ev:${e.id}" ${d.recupera === 'ev:' + e.id ? 'selected' : ''}>Recupera toda la ${esc(e.nombre)}</option>`).join('')}</optgroup></select></label>
    ${d.recupera ? `<div class="row"><div class="seg">${REC_MODOS.map(([v, t]) => `<button data-a="insrecmodo" data-v="${v}" aria-pressed="${(d.recModo || 'sustituye') === v}">${t}</button>`).join('')}</div>
      <label class="row small" style="gap:6px;flex-wrap:nowrap">Nota máxima al recuperar<input type="text" inputmode="decimal" class="pct" value="${esc(String(d.recTope ?? ''))}" placeholder="—" data-f="insd" data-k="recTope" aria-label="Nota máxima al recuperar"></label></div>
      <p class="tiny muted" style="margin:0">${recEv ? 'Se aplica a la nota de la evaluación ya calculada; aparece en su propia columna, antes de la nota.' : 'Se aplica a la nota del instrumento que recupera. Esta columna no cuenta por separado en su categoría.'} Si pones nota máxima (p. ej. 5), la nota recuperada no pasa de ahí, salvo que ya tuviera más.</p>` : ''}</div>`;
  remodal(`<h2>${d.nuevo ? 'Nuevo instrumento' : 'Editar instrumento'}</h2><div class="stack">
    <div class="fgrid"><label class="f">Nombre<input type="text" value="${esc(d.nombre)}" data-f="insd" data-k="nombre" placeholder="Examen UD 3, Recuperación UD 1…" id="ins-nombre"></label>
      ${recEv ? '' : `<label class="f">Categoría<select data-f="insd" data-k="nodo">${H.map(h => `<option value="${h.n.id}" ${h.n.id === d.nodo ? 'selected' : ''}>${esc(h.path)}</option>`).join('')}</select></label>
      <label class="f">Evaluación<select data-f="insd" data-k="ev">${evals().map(e => `<option value="${e.id}" ${e.id === d.ev ? 'selected' : ''}>${esc(e.nombre)}</option>`).join('')}</select></label>`}
      <label class="f">Fecha<input type="date" value="${esc(d.fecha || '')}" data-f="insd" data-k="fecha"></label>
      ${n?.reparto === 'mano' ? `<label class="f">Peso dentro de su categoría<input type="number" min="0" value="${esc(String(d.peso ?? 1))}" data-f="insd" data-k="peso"></label>` : ''}</div>
    ${recBlock}
    <div><div class="label" style="margin-bottom:6px">Cómo se pone la nota</div><div class="seg">${[['directa', 'Nota directa'], ['rubrica', 'Con rúbrica (por niveles)']].map(([v, t]) => `<button data-a="insmodo" data-v="${v}" aria-pressed="${d.modo === v}">${t}</button>`).join('')}</div></div>
    ${d.modo === 'rubrica' ? rubBlock : critBlock}
    ${d.confirmDel ? `<div class="alert bad"><span class="grow">Se borrará el instrumento con todas sus notas.</span><button class="btn sm danger" data-a="insdelok">Borrar</button><button class="btn sm" data-a="insdelno">Cancelar</button></div>` : ''}
    <div class="row between"><div class="row"><button class="btn primary" data-a="inssave">Guardar</button><button class="btn" data-a="close">Cancelar</button></div>${!d.nuevo ? `<button class="btn ghost danger" data-a="insdel">Eliminar</button>` : ''}</div></div>`, 'wide');
}
function abrirIns(cal, ins, nodo) {
  const H = hojas(cal); if (!H.length) { toast('Crea primero una categoría en Configuración'); return; }
  UI.pick = null;
  UI.insD = ins ? JSON.parse(JSON.stringify(Object.assign({ crit: [], items: [], peso: 1 }, ins))) : { id: uid(), nuevo: true, nombre: '', nodo: nodo || H[0].n.id, ev: UI.calEv === 'final' ? evActual() : UI.calEv, fecha: '', modo: 'directa', peso: 1, crit: [], items: [], notas: {}, rub: {} };
  UI.insD.crit = UI.insD.crit || []; UI.insD.items = UI.insD.items || [];
  insModal(); if (!ins) setTimeout(() => $('#ins-nombre')?.focus(), 30);
}

/* ---- corrección con rúbrica ---- */
function rubModal() {
  const g = grupo(UI.calG); const cal = calDe(g); const ins = cal.instr.find(i => i.id === UI.rub.ins); if (!ins) return closeModal(); UI.calModal = rubModal;
  const idx = g.alumnos.findIndex(a => a.id === UI.rub.al); const a = g.alumnos[idx]; if (!a) return closeModal();
  const sel = ins.rub?.[a.id] || {}; const v = ins.notas?.[a.id]; const r = notaInstr(cal, ins, a.id);
  remodal(`<div class="row between"><div><div class="label">${esc(ins.nombre)}</div><h2 style="margin:2px 0 0">${esc(a.nombre)}</h2></div><div class="rubnota${lowC(r?.g)}">${v === 'NP' || v === 'EX' ? v : r ? nf(r.g, 2) : '—'}</div></div>
    <div class="row between" style="margin:10px 0"><button class="btn sm" data-a="rubnav" data-d="-1" ${idx === 0 ? 'disabled' : ''}>‹ Anterior</button><span class="small muted">${idx + 1} de ${g.alumnos.length}</span><button class="btn sm" data-a="rubnav" data-d="1" ${idx === g.alumnos.length - 1 ? 'disabled' : ''}>Siguiente ›</button></div>
    ${!(ins.items || []).length ? `<p class="empty">Esta rúbrica no tiene ítems. <a href="#" data-a="calins" data-id="${ins.id}">Edítala</a> para añadirlos.</p>` : `<div class="stack" style="gap:10px">${ins.items.map(it => `<div class="rubrow"><div class="rubit"><b>${esc(it.texto || 'Ítem')}</b><span class="tiny muted">${nf(Number(it.peso) || 0)} %${(it.crit || []).length ? ' · ' + it.crit.map(esc).join(', ') : ''}</span></div>
      ${it.libre ? `<div class="row" style="gap:8px"><label class="row small" style="gap:6px;flex-wrap:nowrap">Nota del ítem (0–10)<input type="text" inputmode="decimal" class="pct rublibre" value="${typeof sel[it.id] === 'number' ? esc(String(sel[it.id]).replace('.', ',')) : ''}" data-f="rublibre" data-it="${it.id}" aria-label="Nota de ${esc(it.texto || 'ítem')}"></label><span class="tiny muted" data-libmsg="${it.id}"></span></div>`
        : `<div class="rublv">${nivelesItem(cal, it).map((nv, l) => `<button class="lvl ${sel[it.id] === l ? 'on' : ''}" data-a="rublvl" data-it="${it.id}" data-l="${l}"><b>${l} <span style="font-weight:400">· ${nf(nv, 2)}</span></b>${esc(it.desc?.[l] || '')}</button>`).join('')}</div>`}</div>`).join('')}</div>`}
    <div class="row between" style="margin-top:14px"><div class="row"><button class="btn sm ${v === 'NP' ? 'primary' : ''}" data-a="rubest" data-v="NP">NP</button><button class="btn sm ${v === 'EX' ? 'primary' : ''}" data-a="rubest" data-v="EX">Exento</button><button class="btn sm ghost" data-a="rubest" data-v="">Borrar</button></div>
      <div class="row"><button class="btn sm ghost" data-a="calins" data-id="${ins.id}">Editar rúbrica</button><button class="btn primary" data-a="close">Listo</button></div></div>`, 'wide');
}

/* ---- ficha del alumno ---- */
function fichaCal(aid) {
  const g = grupo(UI.calG); const cal = calDe(g); const a = g.alumnos.find(x => x.id === aid); if (!a) return; UI.calModal = null;
  const ev = UI.calEv;
  let html = `<h2>${esc(a.nombre)}</h2>`;
  if (ev === 'final') {
    const x = resFinal(g, cal)[aid];
    html += `<div class="stack"><div class="row">${evals().map(e => `<span class="tag">${esc(e.nombre)}: <b>${nf(x.evs[e.id], 2) || '—'}</b></span>`).join('')}</div><div class="row"><span class="pill acc">Final: ${nf(x.g, 2) || '—'}</span>${x.bol !== null ? `<span class="pill off">Boletín: ${esc(bolTxt(cal, x.bol))}</span>` : ''}${x.manual !== null ? `<span class="pill warn">Modificada (calculada ${nf(x.calc, 2)})</span>` : ''}</div>`;
    html += barrasCE(cal, x) + '</div>';
  } else {
    const x = resEval(g, cal, ev)[aid];
    html += `<div class="stack"><div class="row"><span class="pill acc">${esc(evNombre(ev))}: ${nf(x.g, 2) || '—'}</span>${x.bol !== null ? `<span class="pill off">Boletín: ${esc(bolTxt(cal, x.bol))}</span>` : ''}${x.antes !== null && x.antes !== undefined ? `<span class="pill info">Recuperada (antes ${nf(x.antes, 2) || 'sin nota'})</span>` : ''}</div>
      ${x.avisos.map(t => `<div class="alert warn small">${esc(t)}</div>`).join('')}<table class="data"><tr><th>Categoría</th><th>Peso</th><th>Nota</th></tr>
      ${(() => { const rows = []; walk(cal.arbol, (n, p) => { rows.push(`<tr><td style="padding-left:${8 + p.length * 18}px">${esc(n.nombre)}</td><td>${nf(pesoN(cal, n, ev))} %</td><td class="num${lowC(x.out[n.id])}"><b>${nf(x.out[n.id], 2)}</b></td></tr>`);
        if (!(n.hijos || []).length) cal.instr.filter(i => i.nodo === n.id && i.ev === ev && !esRecEv(i)).forEach(i => { const ri = notaInstr(cal, i, aid); const v = i.notas?.[aid]; const q = x.quit.has(i.id); const rr = i.recupera ? null : notaInstrR(cal, i, aid);
          rows.push(`<tr><td class="small muted" style="padding-left:${26 + p.length * 18}px">${i.recupera ? '↺ ' : ''}${esc(i.nombre)}${q ? ' <span class="tiny">(la peor: no cuenta)</span>' : ''}</td><td></td><td class="num small"${q ? ' style="text-decoration:line-through"' : ''}>${v === 'NP' || v === 'EX' ? v : nf(ri?.g, 2)}${rr?.recuperada ? ` → ${nf(rr.g, 2)}` : ''}</td></tr>`); }); });
        cal.instr.filter(i => i.recupera === 'ev:' + ev).forEach(i => { const ri = notaInstr(cal, i, aid); rows.push(`<tr><td class="small">↺ ${esc(i.nombre)}</td><td></td><td class="num small">${nf(ri?.g, 2)}</td></tr>`); }); return rows.join(''); })()}</table>
      ${barrasCE(cal, x)}</div>`;
  }
  modal(html + `<div class="row" style="margin-top:12px"><button class="btn primary" data-a="close">Cerrar</button></div>`, false, 'wide');
}
function barrasCE(cal, x) {
  if (!cal.curr || !Object.keys(x.ce).length) return '';
  const C = currOf(cal);
  return `<div><div class="label" style="margin:6px 0">Competencias específicas</div><div class="stack" style="gap:6px">${C.ce.filter(([n]) => x.ce[String(n)]).map(([n, t]) => { const o = x.ce[String(n)]; return `<div class="cebar"><span class="small"><b>CE${n}</b> <span class="muted"${currLangAttr(C)} title="${esc(t)}">${esc(cortaTxt(t, 120))}</span></span><span class="bar"><span style="width:${Math.max(0, Math.min(100, o.g * 10))}%;${o.g < 5 ? 'background:var(--bad)' : ''}"></span></span><span class="small num"><b>${nf(o.g, 2)}</b> <span class="tiny muted">${nf(o.w * 100)} %</span></span></div>`; }).join('')}</div></div>`;
}

/* ---- plantillas y copias ---- */
function clonarArbol(arbol) { return JSON.parse(JSON.stringify(arbol || [])).map(function re(n) { n.id = uid(); n.hijos = (n.hijos || []).map(re); return n; }); }
function aplicarArbol(cal, src) {
  const viejas = Object.fromEntries(hojas(cal).map(h => [h.n.id, h.path]));
  cal.arbol = clonarArbol(src); const nuevas = hojas(cal);
  cal.instr.forEach(i => { const p = viejas[i.nodo]; const m = nuevas.find(h => h.path === p) || nuevas.find(h => h.n.nombre === (p || '').split(' › ').pop()) || nuevas[0]; i.nodo = m ? m.n.id : null; });
}
function calConfirm(txt, fn) { UI.calOk = fn; UI.calModal = null; modal(`<h2>¿Seguro?</h2><p>${txt}</p><div class="row"><button class="btn primary" data-a="calok">Sí, continuar</button><button class="btn" data-a="close">Cancelar</button></div>`); }

/* ---- exportar a Excel (.xlsx generado en la propia app) ---- */
const xmlE = t => String(t ?? '').replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const colL = i => { let s = ''; i++; while (i > 0) { const m = (i - 1) % 26; s = String.fromCharCode(65 + m) + s; i = Math.floor((i - 1) / 26); } return s; };
/* celdas: null | número | texto | {v, s} · estilos: 0 normal, 1 negrita, 2 «0,00», 3 «0,00» rojo, 4 entero negrita, 5 entero negrita rojo, 6 cabecera */
function xlsxDe(hojas) {
  const sheetXml = h => {
    const rows = h.filas.map((fila, r) => `<row r="${r + 1}">${fila.map((c, k) => {
      if (c === null || c === undefined || c === '') return ''; const o = typeof c === 'object' ? c : { v: c }; const ref = colL(k) + (r + 1);
      const st = o.s ?? (typeof o.v === 'number' ? 2 : 0);
      return typeof o.v === 'number' && Number.isFinite(o.v) ? `<c r="${ref}" s="${st}"><v>${Math.round(o.v * 10000) / 10000}</v></c>` : `<c r="${ref}" t="inlineStr" s="${st}"><is><t xml:space="preserve">${xmlE(I18N.t(String(o.v)))}</t></is></c>`;
    }).join('')}</row>`).join('');
    const fx = h.fijar || { c: 1, r: 1 };
    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetViews><sheetView workbookViewId="0"><pane xSplit="${fx.c}" ySplit="${fx.r}" topLeftCell="${colL(fx.c)}${fx.r + 1}" activePane="bottomRight" state="frozen"/></sheetView></sheetViews>`
      + `<cols>${(h.anchos || []).map((w, k) => `<col min="${k + 1}" max="${k + 1}" width="${w}" customWidth="1"/>`).join('')}</cols><sheetData>${rows}</sheetData></worksheet>`;
  };
  const styles = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><numFmts count="1"><numFmt numFmtId="164" formatCode="0.00"/></numFmts>
<fonts count="4"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font><font><sz val="11"/><color rgb="FFC0392B"/><name val="Calibri"/></font><font><b/><sz val="11"/><color rgb="FFC0392B"/><name val="Calibri"/></font></fonts>
<fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FFE3ECE9"/><bgColor indexed="64"/></patternFill></fill></fills>
<borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
<cellXfs count="7"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"/><xf numFmtId="164" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/><xf numFmtId="164" fontId="2" fillId="0" borderId="0" xfId="0" applyNumberFormat="1" applyFont="1"/><xf numFmtId="1" fontId="1" fillId="0" borderId="0" xfId="0" applyNumberFormat="1" applyFont="1"/><xf numFmtId="1" fontId="3" fillId="0" borderId="0" xfId="0" applyNumberFormat="1" applyFont="1"/><xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1" applyAlignment="1"><alignment wrapText="1" vertical="bottom"/></xf></cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>`;
  const wb = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>${hojas.map((h, i) => `<sheet name="${xmlE(h.nombre)}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`).join('')}</sheets></workbook>`;
  const rels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${hojas.map((h, i) => `<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`).join('')}<Relationship Id="rId${hojas.length + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`;
  const ct = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>${hojas.map((h, i) => `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join('')}</Types>`;
  return zipStore([['[Content_Types].xml', ct], ['_rels/.rels', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>'],
    ['xl/workbook.xml', wb], ['xl/_rels/workbook.xml.rels', rels], ['xl/styles.xml', styles], ...hojas.map((h, i) => [`xl/worksheets/sheet${i + 1}.xml`, sheetXml(h)])]);
}
const nCell = v => v === null || v === undefined || Number.isNaN(v) ? null : { v, s: v < 5 ? 3 : 2 };
const bCell = v => v === null || v === undefined ? null : { v, s: v < 5 ? 5 : 4 };
const nombreHoja = (t, usados) => { let b = String(I18N.t(String(t))).replace(/[\[\]:*?\/\\]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 31) || 'Hoja'; let n = b, k = 2; while (usados.has(n.toLowerCase())) { const suf = ' (' + k++ + ')'; n = b.slice(0, 31 - suf.length) + suf; } usados.add(n.toLowerCase()); return n; };
const evCorto = t => { const m = /^\s*(\d+\s*\.?\s*[ªº]?)/.exec(t || ''); return m ? m[1].replace(/\s+/g, '') + ' ev.' : (t || 'Ev.'); };
const alCols = a => [a.apellidos || '', a.pila || (a.apellidos ? '' : a.nombre)];
function hojasGrupo(g, cal, comp, usados) {
  const out = []; const red = redDe(cal); const evs = evals();
  evs.forEach(e => {
    const R = resEval(g, cal, e.id); const { cols } = columnasCal(cal, e.id); const evRecs = cal.instr.filter(i => i.recupera === 'ev:' + e.id);
    const cs = cols.filter(c => ['ins', 'auto', 'nodo', 'cat'].includes(c.t));
    const tit = c => c.t === 'ins' ? `${c.i.recupera ? '↺ ' : ''}${c.i.nombre || 'Sin nombre'} (${c.sub ? c.sub.nombre : c.n.nombre})` : c.t === 'auto' ? `${c.lab} (${c.sub ? c.sub.nombre : c.n.nombre})` : c.t === 'nodo' ? `${c.n.nombre} ${nf(pesoN(cal, c.n, e.id))} %` : `NOTA ${c.n.nombre} ${nf(pesoN(cal, c.n, e.id))} %`;
    const head = ['Apellidos', 'Nombre', ...cs.map(tit), ...evRecs.map(i => '↺ ' + (i.nombre || 'Recuperación')), 'Nota ' + e.nombre, 'Boletín', ...(red.cualit ? ['Calificación'] : []), 'Observaciones'].map(v => ({ v, s: 6 }));
    const filas = [head];
    const valIns = (i, a, quit) => { const v = i.notas?.[a.id]; if (v === 'NP' || v === 'EX') return { v, s: 0 }; const r = notaInstr(cal, i, a.id); return r ? { v: Math.round(r.g * 100) / 100, s: quit ? 0 : r.g < 5 ? 3 : 2 } : null; };
    g.alumnos.forEach(a => { const x = R[a.id];
      const obs = [...(x.antes !== null && x.antes !== undefined ? [`Recuperada (antes ${nf(x.antes, 2) || 'sin nota'})`] : []), ...x.avisos, ...[...x.quit].map(id => `No cuenta (peor nota): ${cal.instr.find(i => i.id === id)?.nombre || ''}`)].join('. ');
      filas.push([...alCols(a), ...cs.map(c => c.t === 'ins' ? valIns(c.i, a, x.quit.has(c.i.id)) : c.t === 'auto' ? nCell(mediaArr(x.src?.[c.k] || [])) : nCell(x.out[c.n.id])),
        ...evRecs.map(i => valIns(i, a, false)), nCell(x.g), bCell(x.bol), ...(red.cualit ? [cualit(x.bol)] : []), obs]); });
    const media = vals => { const v = vals.filter(y => typeof y === 'number'); return v.length ? v.reduce((t, y) => t + y, 0) / v.length : null; };
    filas.push([]); filas.push([{ v: 'Media del grupo', s: 1 }, '', ...cs.map(c => nCell(media(g.alumnos.map(a => c.t === 'ins' ? notaInstr(cal, c.i, a.id)?.g : c.t === 'auto' ? mediaArr(R[a.id].src?.[c.k] || []) : R[a.id].out[c.n.id])))),
      ...evRecs.map(i => nCell(media(g.alumnos.map(a => notaInstr(cal, i, a.id)?.g)))), nCell(media(g.alumnos.map(a => R[a.id].g))), nCell(media(g.alumnos.map(a => R[a.id].bol)))]);
    filas.push([`Boletín: sube a la nota siguiente a partir de ${decTxt(red.decima)}${red.noAprobar ? '; sin aprobar por redondeo' : ''}.`]);
    out.push({ nombre: nombreHoja(`${evCorto(e.nombre)} · ${g.nombre}`, usados), filas, anchos: [22, 14, ...cs.map(() => 13), ...evRecs.map(() => 13), 11, 9, ...(red.cualit ? [12] : []), 40], fijar: { c: 2, r: 1 } });
  });
  const RF = resFinal(g, cal);
  const fh = ['Apellidos', 'Nombre', ...evs.map(e => e.nombre + ` (${nf(pesoEvFinal(cal, e.id) / evs.reduce((t, x) => t + pesoEvFinal(cal, x.id), 0) * 100 || 0)} %)`), ...evs.map(e => 'Boletín ' + e.nombre), 'Nota calculada', 'Nota final', 'Boletín final', ...(red.cualit ? ['Calificación'] : []), 'Modificada a mano', 'Motivo'].map(v => ({ v, s: 6 }));
  const ff = [fh, ...g.alumnos.map(a => { const x = RF[a.id]; return [...alCols(a), ...evs.map(e => nCell(x.evs[e.id])), ...evs.map(e => bCell(x.evsBol[e.id])), nCell(x.calc), nCell(x.g), bCell(x.bol), ...(red.cualit ? [cualit(x.bol)] : []), x.manual !== null ? 'Sí' : '', x.motivo || '']; })];
  ff.push([]); ff.push([`Nota final calculada con ${red.final === 'boletin' ? 'las notas del boletín de cada evaluación' : 'las notas exactas de cada evaluación'}.`]);
  out.push({ nombre: nombreHoja(`Final · ${g.nombre}`, usados), filas: ff, anchos: [22, 14, ...evs.map(() => 12), ...evs.map(() => 11), 12, 11, 11, ...(red.cualit ? [12] : []), 10, 30], fijar: { c: 2, r: 1 } });
  if (comp && cal.curr) {
    const C = currOf(cal); const ces = C.ce.filter(([n]) => g.alumnos.some(a => RF[a.id].ce[String(n)]));
    if (ces.length) out.push({ nombre: nombreHoja(`Comp. · ${g.nombre}`, usados), anchos: [22, 14, ...ces.map(() => 10), 12],
      filas: [['Apellidos', 'Nombre', ...ces.map(([n]) => 'CE' + n), 'Nota calculada'].map(v => ({ v, s: 6 })), ...g.alumnos.map(a => { const x = RF[a.id]; return [...alCols(a), ...ces.map(([n]) => nCell(x.ce[String(n)]?.g)), nCell(x.calc)]; }),
        [], ...ces.map(([n, t]) => [{ v: 'CE' + n, s: 1 }, t])] });
  }
  return out;
}
function xlsModal() {
  const x = UI.xls; const g = calG(); const R = redDe(calDe(g));
  UI.calModal = null;
  modal(`<h2>Exportar notas a Excel</h2><div class="stack">
    <div class="seg"><button data-a="xlsalc" data-v="uno" aria-pressed="${!x.todos}">Solo ${esc(g.nombre)}</button><button data-a="xlsalc" data-v="todos" aria-pressed="${x.todos}">Todos los grupos</button></div>
    <label class="f">Redondeo del boletín: subir a la nota siguiente a partir de la décima<select id="xls-dec">${[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(d => `<option value="${d}" ${Number(x.decima ?? R.decima) === d ? 'selected' : ''}>${d === 10 ? 'Nunca (quitar los decimales)' : '0,' + d}</option>`).join('')}</select></label>
    <label class="check small"><input type="checkbox" id="xls-noap" ${(x.noAprobar ?? R.noAprobar) ? 'checked' : ''}>No aprobar por redondeo (un 4,x se queda en 4)</label>
    <label class="check small"><input type="checkbox" id="xls-cual" ${(x.cualit ?? R.cualit) ? 'checked' : ''}>Añadir IN / SU / BI / NT / SB</label>
    <label class="check small"><input type="checkbox" id="xls-comp" ${x.comp ? 'checked' : ''}>Incluir una hoja de competencias</label>
    <label class="check small"><input type="checkbox" id="xls-save" checked>Guardar este redondeo en ${x.todos ? 'todos los grupos' : 'el grupo'}</label>
    <p class="tiny muted" style="margin:0">Una hoja por evaluación con todos los instrumentos, la nota de cada categoría, la nota con decimales y la del boletín, y otra con la nota final.</p>
    <div class="row"><button class="btn primary" data-a="xlsok">Descargar Excel</button><button class="btn" data-a="close">Cancelar</button></div></div>`);
}
async function exportarXls() {
  const x = UI.xls; const dec = Number($('#xls-dec').value), noAp = $('#xls-noap').checked, cual = $('#xls-cual').checked, comp = $('#xls-comp').checked, guardar = $('#xls-save').checked;
  const GS = (x.todos ? S.grupos.filter(y => !esTutoria(y)) : [calG()]).filter(y => y.alumnos.length);
  if (!GS.length) { toast('No hay alumnos con notas'); return; }
  const usados = new Set(); const hojas = [];
  GS.forEach(g => { const cal = calDe(g); const antes = cal.redondeo ? { ...cal.redondeo } : undefined;
    cal.redondeo = Object.assign(redDe(cal), { decima: dec, noAprobar: noAp, cualit: cual });
    hojas.push(...hojasGrupo(g, cal, comp, usados));
    if (guardar) touchCal(g.id); else if (antes) cal.redondeo = antes; else delete cal.redondeo; });
  const bytes = xlsxDe(hojas); closeModal(); calRe();
  const fn = `${I18N.t('Notas')} ${x.todos ? I18N.t('todos los grupos') : GS[0].nombre} ${todayStr()}.xlsx`.replace(/[\\/:*?"<>|]/g, '-');
  try { await Nube.descargas.save({ filename: fn, data: new Blob([bytes], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }) }); toast('Excel descargado'); } catch (e) { toast('No se ha podido crear el Excel'); }
}
Object.assign(A, {
  calxls() { UI.xls = { todos: false, comp: false }; xlsModal(); },
  xlsalc(el) { UI.xls.todos = el.dataset.v === 'todos'; UI.xls.decima = Number($('#xls-dec').value); UI.xls.noAprobar = $('#xls-noap').checked; UI.xls.cualit = $('#xls-cual').checked; UI.xls.comp = $('#xls-comp').checked; xlsModal(); },
  xlsok() { exportarXls(); },
});

/* ---- acciones ---- */
const calG = () => grupo(UI.calG); const calC = () => calDe(calG());
const calRe = () => { UI.keepScroll = true; render(); };
Object.assign(A, {
  calev(el) { UI.calEv = el.dataset.v; calRe(); },
  caltab(el) { UI.calTab = el.dataset.v; closeModal(); render(); scrollA(0); },
  calgo(el) { UI.calG = el.dataset.g; UI.view = 'cal'; UI.calTab = 'cuaderno'; render(); scrollA(0); },
  calnew(el) { abrirIns(calC(), null, el.dataset.nodo); },
  calins(el) { const ins = calC().instr.find(i => i.id === el.dataset.id); if (ins) abrirIns(calC(), ins); },
  insrecmodo(el) { UI.insD.recModo = el.dataset.v; insModal(); },
  insmodo(el) { const d = UI.insD; d.modo = el.dataset.v; if (d.modo === 'rubrica' && !d.items.length) d.items = [nuevoItem(), nuevoItem(), nuevoItem(), nuevoItem()]; insModal(); },
  inscdel(el) { const d = UI.insD; d.crit = d.crit.filter(x => x.c !== el.dataset.c); insModal(); },
  insniv(el) { const cal = calC(); const it = UI.insD.items.find(i => i.id === el.dataset.id); if (!it) return; const n = nivelesItem(cal, it).length + Number(el.dataset.d); if (n < 2 || n > 6) return;
    it.vals = repartirNiv(n); const d = it.desc || []; it.desc = Array.from({ length: n }, (_, k) => d[k] || ''); insModal(); },
  insnivrep(el) { const cal = calC(); const it = UI.insD.items.find(i => i.id === el.dataset.id); if (!it) return; it.vals = repartirNiv(nivelesItem(cal, it).length); insModal(); },
  insnivdef(el) { const cal = calC(); const it = UI.insD.items.find(i => i.id === el.dataset.id); if (!it) return; delete it.vals; const d = it.desc || []; it.desc = cal.niveles.map((_, k) => d[k] || ''); insModal(); },
  insitadd() { UI.insD.items.push(nuevoItem()); repartirPesos(UI.insD.items); insModal(); },
  insitrep() { repartirPesos(UI.insD.items); insModal(); },
  insitdel(el) { UI.insD.items = UI.insD.items.filter(i => i.id !== el.dataset.id); insModal(); },
  inssave() { const d = UI.insD; const g = calG(); const cal = calDe(g);
    if (!d.nombre.trim()) { toast('Ponle un nombre'); $('#ins-nombre')?.focus(); return; }
    if (!nodoPorId(cal, d.nodo)) { toast('Elige la categoría'); return; }
    if (String(d.recupera || '').startsWith('ev:')) d.ev = d.recupera.slice(3);
    const tope = String(d.recTope ?? '').trim().replace(',', '.'); if (tope && (!Number.isFinite(Number(tope)) || Number(tope) < 0 || Number(tope) > 10)) { toast('La nota máxima al recuperar tiene que ser de 0 a 10'); return; }
    const data = { id: d.id, nombre: d.nombre.trim(), nodo: d.nodo, ev: d.ev, fecha: d.fecha || '', modo: d.modo, peso: Number(d.peso ?? 1), crit: d.crit, items: d.items, notas: d.notas || {}, rub: d.rub || {}, ejemplo: d.ejemplo,
      recupera: d.recupera || '', recModo: d.recModo || 'sustituye', recTope: tope === '' ? '' : Number(tope) };
    if (data.recupera && cal.instr.some(i => i.recupera === data.id)) { toast('Otros instrumentos recuperan a este: no puede ser también una recuperación'); return; }
    const ex = cal.instr.find(i => i.id === d.id); let quitadas = 0;
    if (ex) { data.notas = ex.notas || {}; data.rub = ex.rub || {};
      // valoraciones en niveles que ya no existen (se han quitado niveles a un ítem)
      Object.values(data.rub).forEach(sel => (data.items || []).forEach(it => { const antes = (ex.items || []).find(x => x.id === it.id);
        if (typeof sel[it.id] === 'number' && (!!antes?.libre !== !!it.libre || valItem(cal, it, sel[it.id]) === null)) { delete sel[it.id]; quitadas++; } }));
      Object.assign(ex, data); } else cal.instr.push(data);
    if (quitadas) setTimeout(() => toast(`${quitadas} valoraci${quitadas === 1 ? 'ón ya no vale' : 'ones ya no valen'} (has quitado niveles o cambiado a nota libre o al revés): vuelve a corregir${quitadas === 1 ? 'la' : 'las'}`), 2300);
    touchCal(g.id); UI.insD = null; closeModal(); if (d.ev !== UI.calEv && UI.calEv !== 'final') UI.calEv = d.ev; calRe(); toast(ex ? 'Instrumento guardado' : 'Instrumento creado'); },
  insdel() { UI.insD.confirmDel = true; insModal(); },
  insdelno() { UI.insD.confirmDel = false; insModal(); },
  insdelok() { const g = calG(); const cal = calDe(g); cal.instr = cal.instr.filter(i => i.id !== UI.insD.id); cal.instr.forEach(i => { if (i.recupera === UI.insD.id) i.recupera = ''; }); touchCal(g.id); UI.insD = null; closeModal(); calRe(); toast('Instrumento eliminado'); },
  calpick(el) { UI.pick = { tipo: el.dataset.tipo, id: el.dataset.id }; if (el.dataset.tipo === 'nodo') pickNodoModal(); else insModal(); },
  pickok() { UI.pick = null; insModal(); },
  calrub(el) { UI.rub = { ins: el.dataset.ins, al: el.dataset.al }; UI.calDirty = true; rubModal(); },
  rubnav(el) { const g = calG(); const i = g.alumnos.findIndex(a => a.id === UI.rub.al); const n = g.alumnos[i + Number(el.dataset.d)]; if (n) { UI.rub.al = n.id; rubModal(); } },
  rublvl(el) { const g = calG(); const cal = calDe(g); const ins = cal.instr.find(i => i.id === UI.rub.ins); const aid = UI.rub.al; ins.rub = ins.rub || {}; const s = ins.rub[aid] || (ins.rub[aid] = {}); const l = Number(el.dataset.l);
    if (s[el.dataset.it] === l) delete s[el.dataset.it]; else s[el.dataset.it] = l; if (!Object.keys(s).length) delete ins.rub[aid];
    if (ins.notas?.[aid] === 'NP' || ins.notas?.[aid] === 'EX') delete ins.notas[aid]; touchCal(g.id); UI.calDirty = true; rubModal(); },
  rubest(el) { const g = calG(); const cal = calDe(g); const ins = cal.instr.find(i => i.id === UI.rub.ins); const aid = UI.rub.al; ins.notas = ins.notas || {};
    if (el.dataset.v) { ins.notas[aid] = ins.notas[aid] === el.dataset.v ? undefined : el.dataset.v; if (!ins.notas[aid]) delete ins.notas[aid]; } else { delete ins.notas[aid]; if (ins.rub) delete ins.rub[aid]; }
    touchCal(g.id); UI.calDirty = true; rubModal(); },
  calal(el) { fichaCal(el.dataset.al); },
  calfinreset(el) { const cal = calC(); delete cal.finalManual[el.dataset.al]; touchCal(UI.calG); calRe(); },
  calsub(el) { const cal = calC(); const n = nodoPorId(cal, el.dataset.id); if (!n) return;
    if (!(n.hijos || []).length) { const tiene = cal.instr.some(i => i.nodo === n.id) || Object.keys(n.fuentes || {}).length;
      if (tiene) { const c = nodoN(n.nombre, 50, { modo: n.modo, fuentes: n.fuentes, pesoInstr: n.pesoInstr, reparto: n.reparto, crit: n.crit }); cal.instr.forEach(i => { if (i.nodo === n.id) i.nodo = c.id; }); n.hijos = [c, nodoN('Nueva subcategoría', 50)]; }
      else n.hijos = [nodoN('Nueva subcategoría', 100)];
      n.fuentes = {}; n.crit = []; }
    else { const k = n.hijos.length + 1; n.hijos.push(nodoN('Nueva subcategoría', 0)); n.hijos.forEach(h => { h.peso = Math.round(1000 / k) / 10; h.pesoEv = {}; }); }
    touchCal(UI.calG); calRe(); },
  caldelnodo(el) { const cal = calC(); const n = nodoPorId(cal, el.dataset.id); if (!n) return; const ids = new Set(); walk([n], x => ids.add(x.id)); const nIns = cal.instr.filter(i => ids.has(i.nodo)).length;
    const hacer = () => { const p = padreDe(cal, n.id); const L = p ? p.hijos : cal.arbol; L.splice(L.indexOf(n), 1); cal.instr = cal.instr.filter(i => !ids.has(i.nodo)); touchCal(UI.calG); };
    if (nIns) calConfirm(`<b>${esc(n.nombre)}</b> tiene ${nIns} ${nIns === 1 ? 'instrumento' : 'instrumentos'} con sus notas. Se borrarán también.`, hacer); else { hacer(); calRe(); } },
  calok() { const f = UI.calOk; UI.calOk = null; if (f) f(); closeModal(); calRe(); },
  calcatadd() { calC().arbol.push(nodoN('Nueva categoría', 0)); touchCal(UI.calG); calRe(); },
  calmodo(el) { nodoPorId(calC(), el.dataset.id).modo = el.dataset.v; touchCal(UI.calG); calRe(); },
  calreparto(el) { nodoPorId(calC(), el.dataset.id).reparto = el.dataset.v; touchCal(UI.calG); calRe(); },
  calplsave() { const nm = $('#cal-pl-n').value.trim(); if (!nm) { $('#cal-pl-n').focus(); return; } const cal = calC(); S.config.plantillasCal = S.config.plantillasCal || [];
    S.config.plantillasCal.push({ id: uid(), nombre: nm, arbol: clonarArbol(cal.arbol), niveles: [...cal.niveles], pesosPorEval: !!cal.pesosPorEval }); touch('config'); toast('Plantilla guardada'); calRe(); },
  calplapply() { const p = (S.config.plantillasCal || []).find(x => x.id === $('#cal-pl-s').value); if (!p) return; const cal = calC();
    const go = () => { aplicarArbol(cal, p.arbol); cal.niveles = fixNiv(p.niveles); cal.pesosPorEval = !!p.pesosPorEval; touchCal(UI.calG); toast('Plantilla aplicada'); };
    if (cal.instr.length) calConfirm('Se sustituyen las categorías y los pesos. Los instrumentos se mueven a la categoría con el mismo nombre (o a la primera).', go); else { go(); calRe(); } },
  calpldel() { const id = $('#cal-pl-s').value; S.config.plantillasCal = (S.config.plantillasCal || []).filter(x => x.id !== id); touch('config'); calRe(); },
  calcopy() { const src = S.cal[$('#cal-cp-s').value]; if (!src) return; const cal = calC();
    const go = () => { aplicarArbol(cal, src.arbol); cal.niveles = fixNiv(src.niveles); cal.pesosPorEval = !!src.pesosPorEval; cal.evalPesos = { ...(src.evalPesos || {}) }; touchCal(UI.calG); toast('Configuración copiada'); };
    if (cal.instr.length) calConfirm('Se sustituyen las categorías y los pesos por los del otro grupo. Los instrumentos se mueven a la categoría con el mismo nombre (o a la primera).', go); else { go(); calRe(); } },
});
Object.assign(Fd, {
  calg(el) { UI.calG = el.value; render(); },
  calnota(el) { const p = parseNota(el.value); if (p.err) return; const cal = calC(); const ins = cal.instr.find(i => i.id === el.dataset.ins); if (!ins) return; ins.notas = ins.notas || {};
    if (p.v === undefined) delete ins.notas[el.dataset.al]; else ins.notas[el.dataset.al] = p.v; touchCal(UI.calG); },
  calfinal(el) { const p = parseNota(el.value); if (p.err || p.v === 'NP' || p.v === 'EX') return; const cal = calC(); const aid = el.dataset.al;
    if (p.v === undefined) delete cal.finalManual[aid]; else cal.finalManual[aid] = { nota: p.v, motivo: cal.finalManual[aid]?.motivo || '' }; touchCal(UI.calG); },
  calmotivo(el) { const m = calC().finalManual[el.dataset.al]; if (m) { m.motivo = el.value; touchCal(UI.calG); } },
  calevpeso(el) { const cal = calC(); if (!Object.keys(cal.evalPesos).length) { const L = evals(); L.forEach(e => cal.evalPesos[e.id] = Math.round(10000 / L.length) / 100); } if (el.value === '') delete cal.evalPesos[el.dataset.ev]; else cal.evalPesos[el.dataset.ev] = Number(el.value) || 0; touchCal(UI.calG); },
  calcurr(el) { calC().curr = el.value; touchCal(UI.calG); calRe(); },
  calcrit(el) { UI.calCrit = el.checked; calRe(); },
  calppe(el) { const cal = calC(); cal.pesosPorEval = el.checked; if (el.checked) walk(cal.arbol, n => { n.pesoEv = n.pesoEv || {}; evals().forEach(e => { if (n.pesoEv[e.id] === undefined) n.pesoEv[e.id] = n.peso; }); }); touchCal(UI.calG); calRe(); },
  calnodo(el) { const n = nodoPorId(calC(), el.dataset.id); if (n) { n.nombre = el.value; touchCal(UI.calG); } },
  calpeso(el) { const cal = calC(); const n = nodoPorId(cal, el.dataset.id); if (!n) return; const v = el.value === '' ? 0 : Number(el.value); if (Number.isNaN(v)) return;
    if (cal.pesosPorEval) { const ev = UI.calEv === 'final' ? evals()[0].id : UI.calEv; n.pesoEv = n.pesoEv || {}; n.pesoEv[ev] = v; } else n.peso = v; touchCal(UI.calG); },
  calfuente(el) { const n = nodoPorId(calC(), el.dataset.id); n.fuentes = n.fuentes || {}; if (el.checked) n.fuentes[el.dataset.k] = 25; else delete n.fuentes[el.dataset.k]; touchCal(UI.calG); calRe(); },
  calfw(el) { const n = nodoPorId(calC(), el.dataset.id); const v = Number(el.value) || 0; if (el.dataset.k === '_instr') n.pesoInstr = v; else n.fuentes[el.dataset.k] = v; touchCal(UI.calG); },
  calmin(el) { const n = nodoPorId(calC(), el.dataset.id); if (!n) return; if (el.checked) n.minimo = { nota: 4, ambito: 'media', tope: 4 }; else delete n.minimo; touchCal(UI.calG); calRe(); },
  calminv(el) { const n = nodoPorId(calC(), el.dataset.id); if (!n?.minimo) return; const k = el.dataset.k;
    if (k === 'ambito') n.minimo.ambito = el.value; else { const v = Number(el.value.replace(',', '.')); if (el.value.trim() === '' || !Number.isFinite(v) || v < 0 || v > 10) return; n.minimo[k] = v; }
    touchCal(UI.calG); },
  calpeor(el) { const n = nodoPorId(calC(), el.dataset.id); if (!n) return; n.descartarPeor = el.checked; if (el.checked && !n.descMin) n.descMin = 3; touchCal(UI.calG); calRe(); },
  caldescmin(el) { const n = nodoPorId(calC(), el.dataset.id); if (!n) return; n.descMin = Math.max(2, Number(el.value) || 3); touchCal(UI.calG); },
  calred(el) { const cal = calC(); cal.redondeo = redDe(cal); const k = el.dataset.k; cal.redondeo[k] = el.type === 'checkbox' ? el.checked : k === 'decima' ? Number(el.value) : el.value; touchCal(UI.calG); calRe(); },
  calniv(el) { const cal = calC(); const v = Number(el.value); if (Number.isFinite(v)) { cal.niveles[Number(el.dataset.i)] = v; touchCal(UI.calG); } },
  insd(el) { const d = UI.insD; if (!d) return; d[el.dataset.k] = el.value; if (el.tagName === 'SELECT') insModal(); },
  inscp(el) { const x = UI.insD.crit.find(c => c.c === el.dataset.c); if (x) x.p = Number(el.value) || 0; },
  rublibre(el) { const g = calG(); const cal = calDe(g); const ins = cal.instr.find(i => i.id === UI.rub.ins); const aid = UI.rub.al; if (!ins) return;
    const t = el.value.trim().replace(',', '.'); const n = Number(t); const msg = document.querySelector(`[data-libmsg="${el.dataset.it}"]`);
    if (t !== '' && (!Number.isFinite(n) || n < 0 || n > 10)) { if (msg) msg.textContent = 'Escribe una nota de 0 a 10'; return; } if (msg) msg.textContent = '';
    ins.rub = ins.rub || {}; const s = ins.rub[aid] || (ins.rub[aid] = {});
    if (t === '') delete s[el.dataset.it]; else s[el.dataset.it] = Math.round(n * 100) / 100; if (!Object.keys(s).length) delete ins.rub[aid];
    if (ins.notas?.[aid] === 'NP' || ins.notas?.[aid] === 'EX') delete ins.notas[aid];
    touchCal(g.id); UI.calDirty = true;
    const r = notaInstr(cal, ins, aid); const box = document.querySelector('#modal .rubnota'); if (box) { box.textContent = r ? nf(r.g, 2) : '—'; box.classList.toggle('low', !!r && r.g < 5); } },
  insitlibre(el) { const it = UI.insD.items.find(i => i.id === el.dataset.id); if (!it) return; if (el.checked) it.libre = true; else delete it.libre; insModal(); },
  insitv(el) { const cal = calC(); const it = UI.insD.items.find(i => i.id === el.dataset.id); if (!it) return; const v = Number(el.value.replace(',', '.')); if (el.value.trim() === '' || !Number.isFinite(v) || v < 0 || v > 10) return;
    if (!it.vals) it.vals = [...cal.niveles]; it.vals[Number(el.dataset.l)] = v; },
  insit(el) { const it = UI.insD.items.find(i => i.id === el.dataset.id); if (!it) return; const k = el.dataset.k; if (k[0] === 'd' && k.length === 2) { it.desc = it.desc || ['', '', '', '']; it.desc[Number(k[1])] = el.value; } else if (k === 'peso') it.peso = Number(el.value) || 0; else it[k] = el.value; },
  inscopy(el) { if (!el.value) return; const [gid, id] = el.value.split('|'); if (grupo(gid)) calDe(grupo(gid)); const src = (S.cal[gid]?.instr || []).find(i => i.id === id); if (!src) return;
    const srcCal = S.cal[gid]; UI.insD.items = JSON.parse(JSON.stringify(src.items)).map(i => ({ ...i, id: uid(), v2: true, vals: i.vals || (srcCal && JSON.stringify(srcCal.niveles) !== JSON.stringify(calC().niveles) ? [...srcCal.niveles] : undefined) })); toast('Rúbrica copiada'); insModal(); },
  pickchk(el) { const c = el.dataset.c; const p = UI.pick; if (!p) return;
    if (p.tipo === 'nodo') { const cal = calC(); const n = nodoPorId(cal, p.id); n.crit = el.checked ? [...new Set([...(n.crit || []), c])] : (n.crit || []).filter(x => x !== c); touchCal(UI.calG); UI.calDirty = true; return; }
    const d = UI.insD;
    if (p.tipo === 'ins') { const has = d.crit.some(x => x.c === c); if (el.checked && !has) d.crit.push({ c, p: 0 }); if (!el.checked) d.crit = d.crit.filter(x => x.c !== c); const k = d.crit.length; d.crit.forEach(x => x.p = Math.round(1000 / k) / 10); }
    else { const it = d.items.find(i => i.id === p.id); if (it) it.crit = el.checked ? [...new Set([...(it.crit || []), c])] : (it.crit || []).filter(x => x !== c); }
  },
});
/* las notas se guardan al escribir; al salir de la casilla se recalcula y se vuelve a la casilla siguiente */
document.addEventListener('change', e => {
  const el = e.target; if (!el.dataset?.calre) return;
  if ((el.dataset.f === 'calnota' || el.dataset.f === 'calfinal') && parseNota(el.value).err) toast('Escribe una nota de 0 a 10' + (el.dataset.f === 'calnota' ? ', NP o EX' : ''));
  if (el.dataset.calre === 'modal') { if (UI.calModal) setTimeout(() => UI.calModal(), 0); return; }
  setTimeout(() => { const fid = document.activeElement?.dataset?.fid; if ($('#modal').innerHTML) return; UI.keepScroll = true; render();
    if (fid) { const n = document.querySelector(`[data-fid="${fid}"]`); if (n) { n.focus(); n.select?.(); } } }, 0);
});
document.addEventListener('keydown', e => {
  const el = e.target; if (e.key !== 'Enter' || !el.classList?.contains('calcell')) return; e.preventDefault();
  const n = document.querySelector(`.calcell[data-f="${el.dataset.f}"][data-r="${Number(el.dataset.r) + (e.shiftKey ? -1 : 1)}"][data-c="${el.dataset.c}"]`);
  if (n) n.focus(); else el.blur();
});
/* al cerrar una ventana de calificaciones, se actualiza la tabla de detrás */
closeModal = (orig => function () { UI.pick = null; UI.calModal = null; orig(); if (UI.calDirty) { UI.calDirty = false; if (UI.view === 'cal') { UI.keepScroll = true; render(); } } })(closeModal);
A['delgrupo-ok'] = (orig => function () { const id = UI.grupoId; if (S.cal[id]) { delete S.cal[id]; Save.dirty.delete('cal_' + id); Store.remove('cal_' + id).catch(() => {}); } return orig.apply(this, arguments); })(A['delgrupo-ok']);

/* ---- datos de ejemplo ---- */
function ejemploCal(G) {
  const ev = evActual();
  const CR = { 'byg-1eso': { ex: [['8.1', 60], ['8.3', 40]], it: ['1.2', '1.4', '1.5', '3.3'] }, 'byg-3eso': { ex: [['8.1', 50], ['9.5', 50]], it: ['1.4', '1.1', '1.2', '3.3'] }, bach2: { ex: [['6.1', 50], ['6.2', 50]], it: ['2.1', '1.1', '3.1', '1.2'] } };
  G.forEach((g, gi) => {
    const cal = calDe(g); const cr = CR[currId(cal.curr)]; if (!cr) return;
    const nEx = cal.arbol[0], nTr = cal.arbol[1];
    const ex = { id: uid(), nombre: ['Examen UD 1', 'Examen UD 2', 'Examen bloque A'][gi], nodo: nEx.id, ev, fecha: '', modo: 'directa', peso: 1, crit: cr.ex.map(([c, p]) => ({ c, p })), items: [], notas: {}, rub: {}, ejemplo: true };
    const items = [['Planteamiento e hipótesis', 25], ['Procedimiento y datos', 25], ['Conclusiones', 30], ['Presentación y lenguaje científico', 20]].map(([t, p], k) => ({ id: uid(), texto: t, peso: p, crit: [cr.it[k]], desc: ['No lo presenta', 'No lo hace o casi nada', 'Lo hace con errores importantes', 'Lo hace bien con algún fallo', 'Lo hace muy bien y completo'], v2: true }));
    const tr = { id: uid(), nombre: 'Informe de laboratorio', nodo: nTr.id, ev, fecha: '', modo: 'rubrica', peso: 1, crit: [], items, notas: {}, rub: {}, ejemplo: true };
    g.alumnos.forEach((a, j) => { const s = (j * 37 + gi * 11) % 13; ex.notas[a.id] = j === 4 ? 'NP' : Math.round((3.5 + s * 0.48) * 4) / 4; if (j !== 2) { tr.rub[a.id] = {}; items.forEach((it, k) => tr.rub[a.id][it.id] = 1 + ((j + k * 2 + gi) % 4)); } });
    cal.instr.push(ex, tr); touchCal(g.id);
  });
}


Object.assign(A, {
  tutnav(el) { const g = grupo(UI.grupoId); const i = g.alumnos.findIndex(a => a.id === UI.tutAl); const n = g.alumnos[i + Number(el.dataset.d)]; if (n) { UI.tutAl = n.id; UI.keepScroll = true; render(); } },
  tutsel(el) { UI.tutAl = el.dataset.id; render(); scrollA(0); },
  tutreu() { const g = grupo(UI.grupoId); tutDe(g, UI.tutAl).reu.push({ id: uid(), fecha: todayStr(), tipo: 'Presencial', con: 'Familia', tema: '' }); touch('grupos'); UI.keepScroll = true; render(); },
  tutreudel(el) { const g = grupo(UI.grupoId); const t = tutDe(g, UI.tutAl); t.reu = t.reu.filter(r => r.id !== el.dataset.id); touch('grupos'); UI.keepScroll = true; render(); },
});
