'use strict';
/* =========================================================================
   CURRÍCULO LOMLOE (Comunitat Valenciana)
   - El catálogo (asignaturas y cursos) va dentro de la app (abajo).
   - El currículo de cada asignatura y curso (competencias específicas, criterios
     de evaluación y saberes básicos) está en curr/<idioma>.json, en la web
     de la app. Solo se descarga el de las asignaturas de tus grupos, en el idioma
     de cada grupo, y se guarda en este dispositivo (no en tu nube).
   - Los paquetes se generan con los scripts de extracción de los decretos; el
     catálogo se escribe entre las marcas CAT (no editar a mano).
   ========================================================================= */
/*CAT>*/const CURR_CAT = [["cas","Lengua Castellana y Literatura","Llengua Castellana i Literatura",[["cas-1eso","1eso",null,null,9,37,73],["cas-2eso","2eso",null,null,9,37,73],["cas-3eso","3eso",null,null,9,37,78],["cas-4eso","4eso",null,null,9,37,78],["cas-1bach","1bach","Lengua Castellana y Literatura I","Llengua Castellana i Literatura I",10,22,47],["cas-2bach","2bach","Lengua Castellana y Literatura II","Llengua Castellana i Literatura II",10,21,46]]],["val","Valenciano: Lengua y Literatura","Valencià: Llengua i Literatura",[["val-1eso","1eso",null,null,9,37,73],["val-2eso","2eso",null,null,9,37,73],["val-3eso","3eso",null,null,9,37,78],["val-4eso","4eso",null,null,9,37,78],["val-1bach","1bach","Valenciano: Lengua y Literatura I","Valencià: Llengua i Literatura I",10,22,47],["val-2bach","2bach","Valenciano: Lengua y Literatura II","Valencià: Llengua i Literatura II",10,21,46]]],["le","Lengua Extranjera","Llengua Estrangera",[["le-1eso","1eso",null,null,7,21,27],["le-2eso","2eso",null,null,7,21,27],["le-3eso","3eso",null,null,7,21,28],["le-4eso","4eso",null,null,7,21,28],["le-1bach","1bach","Lengua Extranjera I","Llengua Estrangera I",6,16,23],["le-2bach","2bach","Lengua Extranjera II","Llengua Estrangera II",6,16,23]]],["sle","Francés (Segunda Lengua Extranjera)","Francés (Segona Llengua Estrangera)",[["sle-1eso","1eso","Francés","Francés",7,24,27],["sle-2eso","2eso","Francés","Francés",7,24,27],["sle-3eso-p1","3eso","Francés · perfil 1","Francés · perfil 1",7,24,27],["sle-3eso","3eso","Francés · perfil 2","Francés · perfil 2",7,24,31],["sle-4eso-p1","4eso","Francés · perfil 1","Francés · perfil 1",7,24,27],["sle-4eso","4eso","Francés · perfil 2","Francés · perfil 2",7,24,31],["sle-1bach","1bach","Francés I","Francés I",7,28,26],["sle-2bach","2bach","Francés II","Francés II",7,28,28]]],["geh","Geografía e Historia","Geografia i Història",[["geh-1eso","1eso",null,null,9,27,49],["geh-2eso","2eso",null,null,9,27,49],["geh-3eso","3eso",null,null,9,27,51],["geh-4eso","4eso",null,null,9,27,51]]],["mat","Matemáticas","Matemàtiques",[["mat-1eso","1eso",null,null,8,28,68],["mat-2eso","2eso",null,null,8,28,68],["mat-3eso","3eso",null,null,8,29,82],["mat-4eso-a","4eso","Matemáticas A","Matemàtiques A",8,29,79],["mat-4eso-b","4eso","Matemáticas B","Matemàtiques B",8,29,82],["mat-1bach","1bach","Matemáticas I","Matemàtiques I",9,18,40],["mat-2bach","2bach","Matemáticas II","Matemàtiques II",9,18,39]]],["macs","Matemáticas Aplicadas a las Ciencias Sociales","Matemàtiques Aplicades a les Ciències Socials",[["macs-1bach","1bach","Matemáticas Aplicadas a las Ciencias Sociales I","Matemàtiques Aplicades a les Ciències Socials I",9,18,35],["macs-2bach","2bach","Matemáticas Aplicadas a las Ciencias Sociales II","Matemàtiques Aplicades a les Ciències Socials II",9,17,32]]],["matg","Matemáticas Generales","Matemàtiques Generals",[["matg-2bach","2bach",null,null,9,18,38]]],["fyq","Física y Química","Física i Química",[["fyq-2eso","2eso",null,null,11,41,65],["fyq-3eso","3eso",null,null,11,49,47],["fyq-4eso","4eso",null,null,11,56,68],["fyq-1bach","1bach",null,null,6,17,19]]],["fis","Física","Física",[["fis-2bach","2bach",null,null,6,15,20]]],["qui","Química","Química",[["qui-2bach","2bach",null,null,6,19,44]]],["byg","Biología y Geología","Biologia i Geologia",[["byg-1eso","1eso",null,null,11,38,34],["byg-3eso","3eso",null,null,11,40,31],["byg-4eso","4eso",null,null,11,36,51]]],["bgca","Biología, Geología y Ciencias Ambientales","Biologia, Geologia i Ciències Ambientals",[["bgca-1bach","1bach",null,null,6,17,48]]],["bhs","Biología Humana y Salud","Biologia Humana i Salut",[["bhs-1bach","1bach",null,null,5,23,27]]],["bio","Biología","Biologia",[["bio-2bach","2bach",null,null,6,12,37]]],["gcca","Geología y Ciencias Ambientales","Geologia i Ciències Ambientals",[["gcca-2bach","2bach",null,null,6,13,39]]],["cg","Ciencias Generales","Ciències Generals",[["cg-2bach","2bach",null,null,6,15,31]]],["tyd","Tecnología y Digitalización","Tecnologia i Digitalització",[["tyd-1eso","1eso",null,null,7,27,73],["tyd-3eso","3eso",null,null,7,30,90]]],["tec","Tecnología","Tecnologia",[["tec-4eso","4eso",null,null,6,28,67]]],["ti","Tecnología e Ingeniería","Tecnologia i Enginyeria",[["ti-1bach","1bach","Tecnología e Ingeniería I","Tecnologia i Enginyeria I",6,17,23],["ti-2bach","2bach","Tecnología e Ingeniería II","Tecnologia i Enginyeria II",6,14,16]]],["dt","Dibujo Técnico","Dibuix Tècnic",[["dt-1bach","1bach","Dibujo Técnico I","Dibuix Tècnic I",5,13,24],["dt-2bach","2bach","Dibujo Técnico II","Dibuix Tècnic II",5,11,14]]],["ef","Educación Física","Educació Física",[["ef-1eso","1eso",null,null,5,17,64],["ef-2eso","2eso",null,null,5,17,64],["ef-3eso","3eso",null,null,5,17,80],["ef-4eso","4eso",null,null,5,17,80],["ef-1bach","1bach",null,null,5,15,31]]],["epva","Educación Plástica, Visual y Audiovisual","Educació Plàstica, Visual i Audiovisual",[["epva-2eso","2eso",null,null,5,21,33],["epva-3eso","3eso",null,null,5,21,43]]],["vce","Educación en Valores Cívicos y Éticos","Educació en Valors Cívics i Ètics",[["vce-4eso","4eso",null,null,7,23,39]]],["fil","Filosofía","Filosofia",[["fil-4eso","4eso",null,null,4,13,13],["fil-1bach","1bach",null,null,9,14,31]]],["hfi","Historia de la Filosofía","Història de la Filosofia",[["hfi-2bach","2bach",null,null,7,11,24]]],["geo","Geografía","Geografia",[["geo-2bach","2bach",null,null,7,13,15]]],["hes","Historia de España","Història d'Espanya",[["hes-2bach","2bach",null,null,8,17,29]]],["har","Historia del Arte","Història de l'Art",[["har-2bach","2bach",null,null,8,12,26]]],["ghv","Geografía e Historia Valencianas","Geografia i Història Valencianes",[["ghv-1bach","1bach",null,null,8,34,44],["ghv-2bach","2bach",null,null,8,34,44]]]];/*<CAT*/
const CURR_VER = 1; /* súbelo si cambian los paquetes de curr/: los guardados se renuevan solos */
const CURSOS_TXT = { '1eso': ['1.º ESO', '1r ESO'], '2eso': ['2.º ESO', '2n ESO'], '3eso': ['3.º ESO', '3r ESO'], '4eso': ['4.º ESO', '4t ESO'],
  '4eso-a': ['4.º ESO', '4t ESO'], '4eso-b': ['4.º ESO', '4t ESO'], '1bach': ['1.º Bach', '1r Batx'], '2bach': ['2.º Bach', '2n Batx'] };
const cursoTxt = (k, lg) => (CURSOS_TXT[k] || [k, k])[lg === 'va' ? 1 : 0];
/* id del paquete → datos del catálogo */
const CURR_PAQ = {};
CURR_CAT.forEach(([a, nes, nva, cs]) => cs.forEach(([id, k, ces, cva, nce, ncr, nsab]) => { CURR_PAQ[id] = { asig: a, k, nombre: { es: nes, va: nva }, curso: { es: ces, va: cva }, n: [nce, ncr, nsab] }; }));
/* grupos de versiones anteriores: sus claves de asignatura y de currículo siguen valiendo */
const ASIG_ANT = { byg1eso: 'byg-1eso', byg3eso: 'byg-3eso', byg4eso: 'byg-4eso', bgca1: 'bgca-1bach', bhs1: 'bhs-1bach', geo2: 'gcca-2bach', bio2: 'bio-2bach' };
const CURR_ANT = { eso1: 'byg-1eso', eso3: 'byg-3eso', eso4: 'byg-4eso', bach1: 'bgca-1bach', bhs1: 'bhs-1bach', bio2: 'bio-2bach', bach2: 'gcca-2bach' };
const ASIG_DE_PAQ = Object.fromEntries(Object.entries(ASIG_ANT).map(([k, v]) => [v, k]));
/* cursos del banco de ideas de la app (solo Biología y Geología) */
const BANCO_DE = { 'byg-1eso': '1eso', 'byg-3eso': '3eso', 'byg-4eso': '4eso', 'bgca-1bach': '1bach', 'bhs-1bach': 'bhs1', 'gcca-2bach': '2bach', 'bio-2bach': 'bio2' };
const currId = k => CURR_ANT[k] || k;
/* textos con datos dentro: se escriben ya en el idioma de la app */
const L2 = (es, va) => appLg() === 'va' ? va : es;
/* «Matemáticas» o «Matemáticas I»; con el curso: «Matemáticas · 2.º ESO» */
const paqMateria = (id, lg) => { const P = CURR_PAQ[id]; return P ? (P.curso[lg] || P.nombre[lg]) : id; };
const paqTitulo = (id, lg) => { const P = CURR_PAQ[id]; return P ? `${paqMateria(id, lg)} · ${cursoTxt(P.k, lg)}` : id; };

/* ---------- asignaturas de los grupos ---------- */
const ASIG = {};
for (const id in CURR_PAQ) {
  const P = CURR_PAQ[id];
  ASIG[ASIG_DE_PAQ[id] || id] = { curr: id, banco: BANCO_DE[id] || null,
    get nombre() { return paqTitulo(id, appLg()); }, get materia() { return paqMateria(id, appLg()); }, get nivel() { return cursoTxt(P.k, appLg()); } };
}
const ASIG_OTRAS = {
  pdc1: { curr: 'custom', banco: '3eso', es: ['PDC 1 · Diversificación (3.º ESO)', 'Diversificación', '3.º ESO'], va: ['PDC 1 · Diversificació (3r ESO)', 'Diversificació', '3r ESO'] },
  pdc2: { curr: 'custom', banco: '4eso', es: ['PDC 2 · Diversificación (4.º ESO)', 'Diversificación', '4.º ESO'], va: ['PDC 2 · Diversificació (4t ESO)', 'Diversificació', '4t ESO'] },
  tutoria: { curr: '', banco: 'none', es: ['Tutoría', 'Tutoría', ''], va: ['Tutoria', 'Tutoria', ''] } };
for (const k in ASIG_OTRAS) { const o = ASIG_OTRAS[k]; ASIG[k] = { curr: o.curr, banco: o.banco, get nombre() { return o[appLg()][0]; }, get materia() { return o[appLg()][1]; }, get nivel() { return o[appLg()][2]; } }; }

/* opciones de los desplegables de asignatura (agrupadas por materia, en el idioma de la app) */
function asigOpciones(val, opt = {}) {
  const lg = appLg(); const o = (k, t) => `<option value="${k}" ${val === k ? 'selected' : ''} ${opt.usadas?.has(k) ? 'disabled' : ''}>${esc(t)}${opt.usadas?.has(k) ? ' ' + (lg === 'va' ? '(ja hi és)' : '(ya está)') : ''}</option>`;
  return CURR_CAT.map(([, nes, nva, cs]) => `<optgroup label="${esc(lg === 'va' ? nva : nes)}">${cs.map(([id]) => o(ASIG_DE_PAQ[id] || id, paqTitulo(id, lg))).join('')}</optgroup>`).join('')
    + `<optgroup label="${lg === 'va' ? 'Altres' : 'Otras'}">${['pdc1', 'pdc2', ...(opt.sinTutoria ? [] : ['tutoria'])].map(k => o(k, ASIG[k].nombre)).join('')}</optgroup>`;
}
const asigSelect = (val, attrs) => `<select ${attrs} translate="no"><option value="">${esc(I18N.t('Elige la asignatura…'))}</option>${asigOpciones(val)}</select>`;
/* desplegable de currículos (grupos sin asignatura: Calificaciones › Configuración) */
const currOpciones = val => { const lg = appLg(); val = currId(val || ''); return CURR_CAT.map(([, nes, nva, cs]) => `<optgroup label="${esc(lg === 'va' ? nva : nes)}">${cs.map(([id]) => `<option value="${id}" ${val === id ? 'selected' : ''}>${esc(paqTitulo(id, lg))}</option>`).join('')}</optgroup>`).join(''); };

/* ---------- paquetes: descarga y almacén del dispositivo ---------- */
const CURR_LS = 'bs:curr:';
const CURR_MEM = {}, CURR_DESC = {}, CURR_ERR = {};
const currAdaptar = (p, lg) => ({ id: p.id, lg, nombre: paqMateria(p.id, lg), corto: cursoTxt(CURR_PAQ[p.id]?.k, lg),
  /* ce: [número, título (corto si lo hay, si no el enunciado), criterios, enunciado completo, competencias clave] */
  ce: (p.ce || []).map(([n, enun, cr, cc, tit]) => [n, tit || enun, cr, enun, cc || []]), sab: p.sab || [] });
/* paquete listo para usar, o null (y empieza a descargarse) */
function currPaq(id, lg) {
  const k = lg + '/' + id; if (CURR_MEM[k]) return CURR_MEM[k];
  if (!CURR_PAQ[id]) return null;
  let viejo = false;
  try { const s = localStorage.getItem(CURR_LS + k); if (s) { const o = JSON.parse(s); if (o && o.p) { CURR_MEM[k] = currAdaptar(o.p, lg); viejo = o.v !== CURR_VER; } } } catch (e) {}
  if (!CURR_MEM[k] || viejo) currBajar(id, lg);
  return CURR_MEM[k] || null;
}
/* todos los currículos de un idioma van en un solo archivo (curr/es.json, curr/va.json); se pide una vez por sesión
   y de él solo se guarda en el dispositivo lo que usan tus grupos */
const CURR_LOTE = {};
function currLote(lg) {
  return CURR_LOTE[lg] || (CURR_LOTE[lg] = fetch(`curr/${lg}.json`, { cache: 'no-cache' }).then(r => { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
    .catch(e => { setTimeout(() => { delete CURR_LOTE[lg]; }, 20000); throw e; }));
}
function currBajar(id, lg) {
  const k = lg + '/' + id; if (CURR_DESC[k]) return CURR_DESC[k];
  return CURR_DESC[k] = currLote(lg).then(L => { const p = L[id]; if (!p) throw new Error('no está ' + id); return p; })
    .then(p => { try { localStorage.setItem(CURR_LS + k, JSON.stringify({ v: CURR_VER, p })); } catch (e) {}
      const nuevo = !CURR_MEM[k]; CURR_MEM[k] = currAdaptar(p, lg); delete CURR_ERR[k]; if (nuevo) currAlLlegar(); return true; })
    .catch(() => { CURR_ERR[k] = true; setTimeout(() => { delete CURR_DESC[k]; }, 20000); if (!CURR_MEM[k]) currAlLlegar(); return false; });
}
/* al llegar un currículo se repinta la página (si no estás escribiendo ni con una ventana abierta) */
function currAlLlegar() {
  clearTimeout(currAlLlegar.t);
  currAlLlegar.t = setTimeout(() => {
    if (!S?.grupos) return;
    if ($('#modal')?.innerHTML || document.activeElement?.matches?.('input,textarea,select')) { currAlLlegar.t = setTimeout(currAlLlegar, 1500); return; }
    UI.keepScroll = true; render();
  }, 120);
}
const currEstado = (id, lg) => { const k = lg + '/' + id; return CURR_MEM[k] ? 'ok' : CURR_ERR[k] ? 'error' : 'bajando'; };
/* idioma del currículo de un grupo = idioma de la asignatura del grupo */
const currLg = g => g?.idioma === 'va' ? 'va' : 'es';
/* currículo de las calificaciones de un grupo (o undefined si no tiene) */
function currOf(cal, g) {
  if (!cal?.curr) return undefined;
  if (cal.curr === 'custom') return { nombre: I18N.t('Criterios propios'), corto: I18N.t('elaboración propia'), ce: cal.custom?.ce || [], sab: [], propio: true };
  const id = currId(cal.curr); if (!CURR_PAQ[id]) return undefined;
  g = g || S.grupos.find(x => S.cal[x.id] === cal); const lg = currLg(g);
  return currPaq(id, lg) || { id, lg, nombre: paqMateria(id, lg), corto: cursoTxt(CURR_PAQ[id].k, lg), ce: [], sab: [], cargando: true, error: currEstado(id, lg) === 'error' };
}
/* aviso para cuando el currículo aún no está en el dispositivo */
const currAviso = C => C?.cargando ? `<p class="tiny ${C.error ? 'warnc' : 'muted'}" style="margin:0">${C.error ? 'No se ha podido descargar el currículo. Conéctate a internet y vuelve a entrar en esta página.' : 'Descargando el currículo…'}</p>` : '';
/* descarga en segundo plano los currículos de todos tus grupos */
function currPrecargar() {
  for (const g of S.grupos || []) { const id = currId(ASIG[g.asig]?.curr || S.cal?.[g.id]?.curr || ''); if (CURR_PAQ[id]) currPaq(id, currLg(g)); }
}
/* lo guardado en este dispositivo: [{ lg, id, bytes }] */
function currGuardados() {
  const L = [];
  try { for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (!k || !k.startsWith(CURR_LS)) continue; const [lg, id] = k.slice(CURR_LS.length).split('/'); L.push({ lg, id, bytes: (localStorage.getItem(k) || '').length * 2 }); } } catch (e) {}
  return L.sort((a, b) => paqTitulo(a.id, 'es').localeCompare(paqTitulo(b.id, 'es'), 'es') || a.lg.localeCompare(b.lg));
}
function currBorrarGuardado(lg, id) { try { localStorage.removeItem(CURR_LS + lg + '/' + id); } catch (e) {} delete CURR_MEM[lg + '/' + id]; }
/* currículos que usan tus grupos: Set de «lg/id» */
function currEnUso() {
  const s = new Set();
  for (const g of S.grupos || []) { const id = currId(ASIG[g.asig]?.curr || S.cal?.[g.id]?.curr || ''); if (CURR_PAQ[id]) s.add(currLg(g) + '/' + id); }
  return s;
}

/* ---------- saberes básicos ---------- */
/* recorre el árbol: fn(código, texto, profundidad, esHoja) */
function sabRecorrer(sab, fn, prof = 0) { for (const n of sab || []) { const hoja = n.length < 3 || !n[2]?.length; fn(n[0], n[1], prof, hoja); if (!hoja) sabRecorrer(n[2], fn, prof + 1); } }
function sabMapa(C) { const m = {}; sabRecorrer(C?.sab, (c, t) => { m[c] = t; }); return m; }
/* atributo lang para el texto del currículo (así la traducción de la app no lo toca) */
const currLangAttr = C => C && !C.propio && C.lg ? ` lang="${C.lg === 'va' ? 'ca-ES-valencia' : 'es'}"` : '';
const cortaTxt = (t, n) => { t = String(t || ''); return t.length > n ? t.slice(0, n - 1).replace(/\s+\S*$/, '') + '…' : t; };
Object.assign(A, {
  currborrar(el) { const [lg, id] = el.dataset.k.split('/'); currBorrarGuardado(lg, id); UI.keepScroll = true; render(); toast('Currículo borrado del dispositivo'); },
  currlimpiar() { const uso = currEnUso(); currGuardados().filter(x => !uso.has(x.lg + '/' + x.id)).forEach(x => currBorrarGuardado(x.lg, x.id)); UI.keepScroll = true; render(); toast('Hecho'); },
  async currrenovar() { const L = [...currEnUso()]; toast('Descargando…'); delete CURR_LOTE.es; delete CURR_LOTE.va; const ok = await Promise.all(L.map(k => { const [lg, id] = k.split('/'); delete CURR_DESC[k]; return currBajar(id, lg); }));
    UI.keepScroll = true; render(); toast(ok.every(Boolean) ? 'Currículos actualizados' : 'Alguno no se ha podido descargar'); }
});
