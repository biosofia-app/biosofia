'use strict';
/* =========================================================================
   BIOSOFÍA — fase 1
   Estructura pensada para migrar a app web:
   - Store: capa de almacenamiento (dispositivo + Google Drive / OneDrive, en nube.js)
   - Modelo: estado en memoria + funciones puras de calendario/cálculo
   - Vistas: funciones que devuelven HTML a partir del estado
   - Acciones: manejadores delegados por data-a / data-f
   ========================================================================= */

/* ---------- utilidades ---------- */
const $ = s => document.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
const pad = n => String(n).padStart(2, '0');
const ymd = d => `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
const parseD = s => { const [y,m,d] = s.split('-').map(Number); return new Date(y, m-1, d); };
const addDays = (s, n) => { const d = parseD(s); d.setDate(d.getDate()+n); return ymd(d); };
const dow = s => { const g = parseD(s).getDay(); return g === 0 ? 7 : g; }; // 1 = lunes
const mondayOf = s => addDays(s, 1 - dow(s));
const diffDays = (a, b) => Math.round((parseD(b) - parseD(a)) / 86400000);
const todayStr = () => ymd(new Date());
const nowMin = () => { const d = new Date(); return d.getHours()*60 + d.getMinutes(); };
const tmin = t => { if (!t) return 0; const [h,m] = t.split(':').map(Number); return h*60 + m; };
const tHM = m => `${Math.floor(m / 60)}:${String(m % 60).padStart(2, '0')}`;
const DIAS = ['', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
const DIAS_C = ['', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
const MESES = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
const fLong = s => { const d = parseD(s); return `${DIAS[dow(s)].toLowerCase()}, ${d.getDate()} de ${MESES[d.getMonth()]}`; };
const fShort = s => { const d = parseD(s); return `${DIAS_C[dow(s)]} ${d.getDate()}/${d.getMonth()+1}`; };
const cap = s => s.charAt(0).toUpperCase() + s.slice(1);
/* Idioma del material para el alumnado (el menú de la app siempre en castellano) */
const IDIOMAS = { es: 'Castellano', va: 'Valenciano' };
const L10N = {
  es: { dias: DIAS, meses: MESES, anterior: 'En la sesión anterior', hoy: 'Hoy', pend: 'Nos quedó por ver: ', fechas: 'Próximas fechas',
        rel: n => n === 0 ? 'hoy' : n === 1 ? 'mañana' : n > 0 ? `en ${n} días` : `hace ${-n} días`, de: m => 'de ' },
  va: { dias: ['', 'Dilluns', 'Dimarts', 'Dimecres', 'Dijous', 'Divendres', 'Dissabte', 'Diumenge'], meses: ['gener','febrer','març','abril','maig','juny','juliol','agost','setembre','octubre','novembre','desembre'],
        anterior: 'En la sessió anterior', hoy: 'Hui', pend: 'Ens va quedar per veure: ', fechas: 'Pròximes dates',
        rel: n => n === 0 ? 'hui' : n === 1 ? 'demà' : n > 0 ? `d'ací a ${n} dies` : `fa ${-n} dies`, de: m => /^[aeiouàèéíòóú]/i.test(m) ? "d'" : 'de ' }
};
const idiomaG = gid => (grupo(gid)?.idioma) || 'es';
const fLongL = (s, lg) => { const T = L10N[lg] || L10N.es; const d = parseD(s); const m = T.meses[d.getMonth()]; return `${T.dias[dow(s)].toLowerCase()}, ${d.getDate()} ${T.de(m)}${m}`; };
const rel = n => n === 0 ? 'hoy' : n === 1 ? 'mañana' : n === -1 ? 'ayer' : n > 0 ? `en ${n} días` : `hace ${-n} días`;
const words = s => (s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
const GCOLORS = [['g1','Malaquita'],['g2','Lapislázuli'],['g3','Ocre'],['g4','Amatista'],['g5','Hematites'],['g6','Olivino'],['g7','Rodocrosita'],['g8','Turquesa'],['g9','Grafito']];
const TAGS = ['TDAH','TEA','Dislexia','Altas capacidades','ACIS','PT','Nivel adaptado','Nouvingut','Repetidor'];
const TAGS_QUITADAS = ['Permiso baño', 'NEAE', 'Lectoescritura'];
const TAGS_DELANTE = ['TDAH', 'TEA', 'Dislexia', 'ACIS', 'PT', 'Nouvingut', 'Nivel adaptado'];
function normAlumno(a) { fijarNombre(a); if (a.tags?.length) a.tags = [...new Set(a.tags.map(t => t === 'Recién llegado' ? 'Nouvingut' : t))].filter(t => !TAGS_QUITADAS.includes(t)); const n = parseInt(a.num, 10); if (n > 0) a.num = n; else delete a.num; return a; }
const VAL3 = { si:'Sí', medias:'A medias', no:'No' };
const ASIS = { P:'Presente', R:'Retraso', F:'Falta', J:'Justificada' };
const SORTEO = { bien:'Bien', regular:'Regular', no:'No sabe' };
const ACT_NEG = ['Falta de respeto', 'Interrumpe', 'No hace caso'];
const ACT_POS = ['Interés', 'Participación'];
const ACT_OLD = { si: 5, medias: 3, no: 1 };
const actVal = v => v == null ? null : typeof v === 'string' ? { n: ACT_OLD[v] || null, tags: [] } : v;
const OTROS = { guardia: 'Guardia', ac: 'AC · Complementaria', at: 'AT · Atención a familias', ae: 'Atención educativa', reunion: 'Reunión' };
const OTROS_C = { guardia: 'Guardia', ac: 'AC', at: 'AT', ae: 'Atención educativa', reunion: 'Reunión' };
const TIPOS_AG = { tarea:'Tarea', clase:'Para clase', examen:'Examen', entrega:'Entrega', reunion:'Reunión', otro:'Otro' };
const TIPOS_IDEA = ['Actividad','Recurso','Anécdota','Dato curioso','Noticia','Pregunta','Experimento','Analogía','Error conceptual','Situación de aprendizaje','Salida','Otro'];
const ASIGNATURAS = [
  ['byg1eso', 'Biología y Geología · 1.º ESO', 'eso1', '1eso', '1.º ESO'],
  ['byg3eso', 'Biología y Geología · 3.º ESO', 'eso3', '3eso', '3.º ESO'],
  ['byg4eso', 'Biología y Geología · 4.º ESO', 'eso4', '4eso', '4.º ESO'],
  ['bgca1', 'Biología, Geología y CC. Ambientales · 1.º Bach', 'bach1', '1bach', '1.º Bach'],
  ['bhs1', 'Biología Humana y Salud · 1.º Bach', 'bhs1', 'bhs1', '1.º Bach'],
  ['geo2', 'Geología y CC. Ambientales · 2.º Bach', 'bach2', '2bach', '2.º Bach'],
  ['bio2', 'Biología · 2.º Bach', 'bio2', 'bio2', '2.º Bach'],
  ['pdc1', 'PDC 1 · Diversificación (3.º ESO)', 'custom', '3eso', '3.º ESO'],
  ['pdc2', 'PDC 2 · Diversificación (4.º ESO)', 'custom', '4eso', '4.º ESO'],
  ['tutoria', 'Tutoría', '', 'none', '']];
const ASIG = Object.fromEntries(ASIGNATURAS.map(([k, nombre, curr, banco, nivel]) => [k, { nombre, curr, banco, nivel }]));
const esTutoria = g => g?.asig === 'tutoria';
const asigSelect = (val, attrs) => `<select ${attrs}><option value="">Elige la asignatura…</option>${ASIGNATURAS.map(([k, n]) => `<option value="${k}" ${val === k ? 'selected' : ''}>${esc(n)}</option>`).join('')}</select>`;
const APARTADOS = [['motivar', 'Cómo contarlo · enganchar'], ['consejos', 'Cómo contarlo · explicar'], ['actividades', 'Actividades'], ['recursos', 'Recursos']];
const APT = Object.fromEntries(APARTADOS);
/* sección de Preparar donde va cada apartado (consejos y motivar van juntos en «Cómo contarlo») */
const secDe = apt => (apt === 'consejos' || apt === 'motivar') ? 'contar' : apt;
/* apartado de la sesión al que va una idea; las ideas antiguas sin apartado se deducen por su tipo */
function apartadoIdea(i) {
  if (i.apartado && APT[i.apartado]) return i.apartado; const t = i.tipo;
  if (['Actividad', 'Experimento', 'Salida', 'Situación de aprendizaje'].includes(t)) return 'actividades';
  if (t === 'Recurso') return 'recursos';
  if (['Analogía', 'Error conceptual', 'Pregunta'].includes(t)) return 'consejos';
  if (['Anécdota', 'Dato curioso', 'Noticia'].includes(t)) return 'motivar';
  return i.url ? 'recursos' : 'consejos';
}

/* ---------- almacenamiento (Store) ----------
   Documentos: config, grupos, agenda, ideas, pendientes, pendgrupo, materiales,
   plan_<lunes>, reg_<lunes>, cal_<grupo>, libro_<id>.
   Se guardan en el dispositivo (IndexedDB) y se sincronizan con el Google Drive
   o el OneDrive del docente: ver nube.js. */
const Store = {
  get mode() { return Nube.modo === 'nube' ? 'db' : 'local'; },
  async init() { await Nube.iniciar(); },
  loadAll() { return Nube.cargarTodo(); },
  write(id, data) { return Nube.guardar(id, data); },
  remove(id) { dhMarcar([id]); return Nube.borrar(id); }
};

/* ---------- estado ---------- */
const DEFAULT_CONFIG = () => ({
  curso: '', inicio: '', fin: '',
  evaluaciones: [], festivos: [], franjas: [], horario: [],
  pesos: { val3: { si: 10, medias: 5, no: 0 }, sorteo: { bien: 10, regular: 5, no: 0 } },
  avisos: { examenDias: 7 }
});
let S = { config: DEFAULT_CONFIG(), grupos: [], agenda: [], ideas: [], pendientes: [], pendgrupo: {}, planes: {}, regs: {}, cal: {}, materiales: { asigs: [] }, libros: {} };
const UI = { view: 'hoy', date: todayStr(), planMode: 'semana', planDate: todayStr(), grupoId: null, grupoTab: 'alumnado', sesion: null, sesTab: 'inicio', capa: 'asis', liveMode: 'capa', ideasF: { q: '', tipo: '', apt: '', sin: false }, fuentes: {}, pendF: false, agShowDone: false, verTodas: false, confirm: null, secOpen: {}, bsel: {}, bcatCerr: {} };

const COMPUESTOS = new Set(['maria jose','maria jesus','maria luisa','maria teresa','maria isabel','maria angeles','maria carmen','maria pilar','maria elena','maria victoria','maria eugenia','ana maria','ana belen','ana isabel','jose maria','jose luis','jose antonio','jose manuel','jose miguel','jose ignacio','jose vicente','jose carlos','jose ramon','jose pablo','juan jose','juan carlos','juan antonio','juan manuel','juan pablo','juan luis','juan francisco','miguel angel','luis miguel','francisco javier','francisco jose','pedro jose','angel luis','mari carmen','mari luz']);
/* alumnado: primera palabra = nombre, resto = apellidos; orden por apellidos */
function partirNombre(txt) {
  const t = txt.replace(/\t/g, ' ').replace(/\s+/g, ' ').trim();
  if (t.includes(',')) { const [ap, ...nm] = t.split(','); return { pila: nm.join(' ').trim(), apellidos: ap.trim() }; } // «Apellidos, Nombre»
  const w = t.split(' ');
  const dos = words(w.slice(0, 2).join(' '));
  if (w.length > 2 && COMPUESTOS.has(dos)) return { pila: w.slice(0, 2).join(' '), apellidos: w.slice(2).join(' ') };
  return { pila: w[0], apellidos: w.slice(1).join(' ') };
}
function fijarNombre(a) { if (a.pila === undefined) Object.assign(a, partirNombre(a.nombre || '')); a.nombre = [a.pila, a.apellidos].filter(Boolean).join(' '); return a; }
/* con número de lista: primero por número; sin número: detrás, por orden alfabético */
const numsRepetidos = g => { const c = {}; g.alumnos.forEach(a => { if (a.num) c[a.num] = (c[a.num] || 0) + 1; }); return Object.keys(c).filter(k => c[k] > 1).map(Number).sort((a, b) => a - b); };
const numPre = a => a.num ? `<span class="muted">${a.num}.</span> ` : '';
const ordenarAlumnos = g => g.alumnos.sort((x, y) => ((x.num || Infinity) - (y.num || Infinity) || 0) || (x.apellidos || '').localeCompare(y.apellidos || '', 'es', { sensitivity: 'base' }) || (x.pila || '').localeCompare(y.pila || '', 'es', { sensitivity: 'base' }));
function normMat(d) { const m = d && Array.isArray(d.asigs) ? d : { asigs: [] }; m.asigs.forEach(a => { a.carpetas = a.carpetas || []; a.archivos = a.archivos || []; }); return m; }
function hydrate(docs) {
  S = { config: Object.assign(DEFAULT_CONFIG(), docs.config || {}), grupos: docs.grupos?.list || [], agenda: docs.agenda?.list || [], ideas: docs.ideas?.list || [], pendientes: docs.pendientes?.list || [], pendgrupo: docs.pendgrupo?.map || {}, planes: {}, regs: {}, cal: {}, materiales: normMat(docs.materiales), libros: {}, anot: {}, plantillas: docs.plantillas?.list || [] };
  S.config.pesos = Object.assign(DEFAULT_CONFIG().pesos, S.config.pesos || {});
  S.grupos.forEach(g => { g.alumnos.forEach(normAlumno); ordenarAlumnos(g); });
  Object.keys(docs).forEach(id => {
    if (id.startsWith('plan_')) Object.assign(S.planes, docs[id].map || {});
    if (id.startsWith('reg_')) Object.assign(S.regs, docs[id].map || {});
    if (id.startsWith('cal_') && docs[id] && docs[id].arbol) S.cal[id.slice(4)] = docs[id];
    if (id.startsWith('libro_') && docs[id] && docs[id].id) S.libros[docs[id].id] = docs[id];
    if (id.startsWith('anot_') && docs[id] && docs[id].pages) S.anot[id.slice(5)] = docs[id];
  });
  dhIniciar();
}
function docData(id) {
  if (id === 'config') return S.config;
  if (['grupos', 'agenda', 'ideas', 'pendientes'].includes(id)) return { list: S[id] };
  if (id === 'pendgrupo') return { map: S.pendgrupo };
  if (id === 'materiales') return S.materiales;
  if (id === 'plantillas') return { list: S.plantillas || [] };
  if (id.startsWith('libro_')) return S.libros[id.slice(6)] || {};
  if (id.startsWith('cal_')) return S.cal[id.slice(4)] || {};
  if (id.startsWith('anot_')) return (S.anot || {})[id.slice(5)] || {};
  const [kind, wk] = [id.slice(0, id.indexOf('_')), id.slice(id.indexOf('_') + 1)];
  const src = kind === 'plan' ? S.planes : S.regs, map = {};
  Object.keys(src).forEach(k => { if (mondayOf(k.split('|')[1]) === wk) map[k] = src[k]; });
  return { map };
}
/* guardado con espera: una escritura a la vez por documento */
const Save = { dirty: new Set(), timer: null, busy: false, err: false };
function touch(...ids) { ids.forEach(i => Save.dirty.add(i)); dhMarcar(ids); clearTimeout(Save.timer); Save.timer = setTimeout(flush, 700); setSaveState('Guardando…'); }
const touchPlan = k => touch('plan_' + mondayOf(k.split('|')[1]));
const touchReg = k => touch('reg_' + mondayOf(k.split('|')[1]));
async function flush() {
  if (Save.busy) { Save.timer = setTimeout(flush, 500); return; }
  Save.busy = true;
  const ids = [...Save.dirty]; Save.dirty.clear();
  for (const id of ids) {
    try { await Store.write(id, docData(id)); Save.err = false; }
    catch (e) {
      if (Store.mode === 'db' && (e?.code === 'invalid_argument' || e?.code === 'not_granted' || e?.code === 'revoked')) {
        Store.mode = 'local'; showBanner('No tienes permiso para guardar en la nube en este enlace. Tus datos se guardan solo en este navegador.');
        ids.forEach(i => Save.dirty.add(i)); break;
      }
      if (e?.code === 'quota_exceeded') showBanner('Se ha llenado el espacio de almacenamiento. Exporta una copia y borra cursos antiguos.');
      Save.err = true; Save.dirty.add(id);
    }
  }
  Save.busy = false;
  if (Save.dirty.size) { Save.timer = setTimeout(flush, 2500); }
  if (Save.err) setSaveState('No se ha podido guardar en el dispositivo', true); else Nube.refrescarEstado();
}
function setSaveState(t, err) { const el = $('#savestate'); el.textContent = t; el.classList.toggle('err', !!err); }
function showBanner(t) { const b = $('#banner'); b.innerHTML = `<div>${esc(t)}</div>`; b.hidden = false; }
function allDocIds() {
  const ids = new Set(['config', 'grupos', 'agenda', 'ideas', 'pendientes', 'pendgrupo', 'materiales']); if ((S.plantillas || []).length) ids.add('plantillas');
  Object.keys(S.planes).forEach(k => ids.add('plan_' + mondayOf(k.split('|')[1])));
  Object.keys(S.regs).forEach(k => ids.add('reg_' + mondayOf(k.split('|')[1])));
  Object.keys(S.cal || {}).forEach(g => ids.add('cal_' + g));
  Object.keys(S.libros || {}).forEach(b => ids.add('libro_' + b));
  Object.keys(S.anot || {}).forEach(a => ids.add('anot_' + a));
  return [...ids];
}

/* ---------- deshacer ----------
   Cada acción de un toque (un clic en un botón con data-a) que cambia datos se puede deshacer.
   - base: cómo quedó cada documento tras la última acción (JSON). Al terminar una acción se compara
     con cómo está ahora; lo que cambió se guarda en la pila con su versión anterior.
   - Deshacer = volver a poner esa versión anterior en el estado y guardarla como un cambio normal.
   - Lo que se escribe en los campos no entra en la pila (para eso está el deshacer del propio navegador),
     pero sí actualiza la base, para que deshacer un clic posterior no borre lo escrito.
   - Los archivos subidos que se borran (Materiales, sesiones, libro) no se borran de Drive hasta pasados
     10 minutos, para poder recuperarlos al deshacer. */
const Deshacer = { base: new Map(), pila: [], pend: new Set(), timer: null, accion: null, n: 0, restaurando: false, msg: null, archPend: [] };
const DH_MAX = 20, DH_ARCH_MS = 10 * 60 * 1000;
/* clics que no se ofrecen para deshacer: navegación y operaciones que ya piden confirmación y sustituyen todo */
const DH_NO = new Set(['borrar-ok', 'imp-ok', 'ejemplo', 'quitarejemplo']);
/* texto del aviso cuando la acción no muestra el suyo */
const DH_TXT = { tapal: 'Anotado', 'delgrupo-ok': 'Grupo borrado', delidea: 'Idea borrada', delag: 'Tarea borrada', delitem: 'Borrado', delev: 'Borrado',
  additem: 'Añadido', addev: 'Añadido', usaridea: 'Idea añadida', usarsug: 'Idea añadida', bancoadd: 'Añadido a la sesión', desfijar: 'Idea quitada', quitarsug: 'Quitado' };
function dhVacio(id) {
  if (id === 'config') return JSON.stringify(DEFAULT_CONFIG());
  if (id === 'materiales') return JSON.stringify({ asigs: [] });
  if (/^(plan|reg)_/.test(id) || id === 'pendgrupo') return '{"map":{}}';
  if (/^(cal|libro|anot)_/.test(id)) return '{}';
  return '{"list":[]}';
}
function dhIniciar() {
  clearTimeout(Deshacer.timer); Deshacer.timer = null; Deshacer.pend.clear(); Deshacer.pila = []; Deshacer.base.clear();
  for (const id of allDocIds()) Deshacer.base.set(id, JSON.stringify(docData(id)));
  dhArchivosVencidos();
}
function dhMarcar(ids) {
  ids.forEach(i => Deshacer.pend.add(i));
  if (Deshacer.timer) return;
  /* tras un clic se cierra enseguida; al escribir se agrupa para no comparar en cada tecla */
  Deshacer.timer = setTimeout(dhCerrar, Deshacer.accion ? 0 : 600);
}
function dhCerrar() {
  clearTimeout(Deshacer.timer); Deshacer.timer = null;
  const ids = [...Deshacer.pend]; Deshacer.pend.clear();
  const antes = new Map();
  for (const id of ids) {
    const ahora = JSON.stringify(docData(id));
    const prev = Deshacer.base.has(id) ? Deshacer.base.get(id) : dhVacio(id);
    if (prev !== ahora) antes.set(id, prev);
    Deshacer.base.set(id, ahora);
  }
  const arch = Deshacer.archPend.splice(0);
  if (Deshacer.restaurando) { Deshacer.restaurando = false; arch.forEach(dhArchivoProgramar); return; }
  const ac = Deshacer.accion;
  if (!antes.size || !ac || DH_NO.has(ac.a) || ac.a.startsWith('pdf')) { arch.forEach(dhArchivoProgramar); return; }
  const ult = Deshacer.pila[Deshacer.pila.length - 1];
  if (ult && ult.t === ac.t) { antes.forEach((v, id) => { if (!ult.antes.has(id)) ult.antes.set(id, v); }); ult.archivos.push(...arch); }
  else {
    Deshacer.pila.push({ t: ac.t, antes, archivos: arch });
    while (Deshacer.pila.length > DH_MAX) Deshacer.pila.shift().archivos.forEach(dhArchivoProgramar);
  }
  arch.forEach(dhArchivoProgramar);
  const texto = Deshacer.msg && Deshacer.msg.t === ac.t ? Deshacer.msg.texto : (DH_TXT[ac.a] || (/^del/.test(ac.a) ? 'Borrado' : 'Hecho'));
  toastDeshacer(texto);
}
/* cada clic empieza una acción nueva; escribir en un campo, ninguna */
function dhEmpezar(a) {
  if (Deshacer.timer || Deshacer.pend.size) dhCerrar();
  Deshacer.accion = a ? { a, t: ++Deshacer.n } : null;
}
function deshacer() {
  if (Deshacer.timer || Deshacer.pend.size) dhCerrar();
  const e = Deshacer.pila.pop();
  if (!e) { toast('No hay nada que deshacer'); return; }
  const ids = [...e.antes.keys()];
  e.antes.forEach((json, id) => { Save.dirty.delete(id); aplicarDoc(id, JSON.parse(json)); });
  e.archivos.forEach(a => dhArchivoCancelar(a.id));
  Deshacer.restaurando = true; touch(...ids); dhCerrar();
  if (UI.view === 'grupo' && UI.grupoId && !grupo(UI.grupoId)) UI.view = 'grupos';
  UI.keepScroll = true; render();
  if (UI.agModalDay && $('#modal').innerHTML && typeof refreshAgModal === 'function') try { refreshAgModal(); } catch (err) {}
  toast('Deshecho');
}
/* un cambio que llega de otro dispositivo pasa a ser la nueva base y ya no se deshace desde aquí */
function dhRemoto(id) {
  Deshacer.base.set(id, JSON.stringify(docData(id)));
  Deshacer.pila.forEach(e => e.antes.delete(id));
  Deshacer.pila = Deshacer.pila.filter(e => e.antes.size);
}
function toastDeshacer(texto) {
  document.querySelectorAll('.toast').forEach(x => x.remove());
  const el = document.createElement('div'); el.className = 'toast toast-dh'; el.setAttribute('role', 'status');
  el.innerHTML = `<span>${esc(texto)}</span><button type="button" class="toast-btn">Deshacer</button>`;
  el.querySelector('button').onclick = ev => { ev.stopPropagation(); el.remove(); deshacer(); };
  document.body.appendChild(el); setTimeout(() => el.remove(), 7000);
}
/* archivos: el borrado real espera DH_ARCH_MS; la lista se guarda en el dispositivo por si se cierra la app */
function dhArchivosLeer() { try { return JSON.parse(localStorage.getItem('bs:borrar-archivos') || '[]'); } catch (e) { return []; } }
function dhArchivosGuardar(l) { try { localStorage.setItem('bs:borrar-archivos', JSON.stringify(l)); } catch (e) {} }
function dhEnvolverArchivos(base) {
  if (!base) return base;
  Deshacer.archBase = base;
  const w = Object.create(base);
  w.delete = id => { if (!id) return Promise.resolve(); Deshacer.archPend.push({ id, t: Date.now() }); if (!Deshacer.timer) dhMarcar([]); return Promise.resolve(); };
  setTimeout(dhArchivosVencidos, 5000);
  return w;
}
function dhArchivoProgramar(a) { const l = dhArchivosLeer(); if (!l.some(x => x.id === a.id)) { l.push(a); dhArchivosGuardar(l); } setTimeout(dhArchivosVencidos, DH_ARCH_MS + 1000); }
function dhArchivoCancelar(id) { dhArchivosGuardar(dhArchivosLeer().filter(x => x.id !== id)); }
function dhArchivosVencidos() {
  const base = Deshacer.archBase; if (!base) return;
  const ahora = Date.now(), enPila = new Set(Deshacer.pila.flatMap(e => e.archivos.map(a => a.id)));
  const l = dhArchivosLeer(), quedan = [];
  for (const a of l) {
    if (ahora - a.t >= DH_ARCH_MS && !enPila.has(a.id)) base.delete(a.id).catch(() => {});
    else quedan.push(a);
  }
  if (quedan.length !== l.length) dhArchivosGuardar(quedan);
}
document.addEventListener('click', e => {
  const el = e.target.closest?.('[data-a]');
  if (el && el.closest('.toast-dh')) return;
  dhEmpezar(el && typeof A !== 'undefined' && A[el.dataset.a] ? el.dataset.a : null);
}, true);
['input', 'change'].forEach(t => document.addEventListener(t, () => { if (Deshacer.accion) dhEmpezar(null); }, true));
document.addEventListener('keydown', e => {
  if (!(e.ctrlKey || e.metaKey) || e.shiftKey || e.altKey || e.key.toLowerCase() !== 'z') return;
  if (e.target.closest?.('input,textarea,select,[contenteditable="true"]')) return;
  e.preventDefault(); deshacer();
});

/* ---------- modelo: calendario ---------- */
const grupo = id => S.grupos.find(g => g.id === id);
const franja = id => S.config.franjas.find(f => f.id === id);
const franjasOrd = () => [...S.config.franjas].sort((a, b) => tmin(a.inicio) - tmin(b.inicio));
function festivoDe(s) {
  if (dow(s) > 5) return 'Fin de semana';
  const c = S.config;
  if (c.inicio && s < c.inicio) return 'Antes del inicio de curso';
  if (c.fin && s > c.fin) return 'Fuera del curso';
  const f = c.festivos.find(x => x.desde && s >= x.desde && s <= (x.hasta || x.desde));
  return f ? (f.nombre || 'Festivo') : null;
}
const keyOf = (gid, fecha, fid) => `${gid}|${fecha}|${fid}`;
function parseKey(k) { const [grupoId, fecha, franjaId] = k.split('|'); return { grupoId, fecha, franjaId }; }
function sesionesDia(s, incluirFest) {
  if (!incluirFest && festivoDe(s)) return [];
  const d = dow(s);
  return S.config.horario.filter(h => h.dia === d && grupo(h.grupoId) && franja(h.franjaId))
    .map(h => ({ key: keyOf(h.grupoId, s, h.franjaId), fecha: s, franja: franja(h.franjaId), grupo: grupo(h.grupoId), aula: h.aula || '' }))
    .sort((a, b) => tmin(a.franja.inicio) - tmin(b.franja.inicio));
}
function otrosDia(s) {
  if (festivoDe(s)) return [];
  return S.config.horario.filter(h => h.dia === dow(s) && h.tipo && OTROS[h.tipo] && franja(h.franjaId))
    .map(h => ({ otro: true, tipo: h.tipo, fecha: s, franja: franja(h.franjaId), aula: h.aula ? (h.tipo === 'ae' && /^\w{1,6}$/.test(h.aula) ? 'Aula ' + h.aula : h.aula) : '' }));
}
function ocurrencias(gid, desde, hasta) {
  const out = []; const hs = S.config.horario.filter(h => h.grupoId === gid && franja(h.franjaId));
  if (!hs.length || !desde || !hasta) return out;
  let s = desde, guard = 0;
  while (s <= hasta && guard++ < 800) {
    if (!festivoDe(s)) hs.filter(h => h.dia === dow(s)).sort((a, b) => tmin(franja(a.franjaId).inicio) - tmin(franja(b.franjaId).inicio))
      .forEach(h => out.push({ key: keyOf(gid, s, h.franjaId), fecha: s, franja: franja(h.franjaId), aula: h.aula || '' }));
    s = addDays(s, 1);
  }
  return out;
}
const cursoRango = () => [S.config.inicio || addDays(todayStr(), -60), S.config.fin || addDays(todayStr(), 240)];
function numSesion(key) { const { grupoId } = parseKey(key); const occ = ocurrencias(grupoId, ...cursoRango()); const i = occ.findIndex(o => o.key === key); return i < 0 ? null : { n: i + 1, total: occ.length }; }
function sesionVecina(key, dir) { const { grupoId } = parseKey(key); const occ = ocurrencias(grupoId, ...cursoRango()); const i = occ.findIndex(o => o.key === key); return i < 0 ? null : occ[i + dir] || null; }
/* sesión anterior/siguiente en mi horario, de cualquier grupo */
function sesionCronologica(key, dir) {
  const { fecha, franjaId } = parseKey(key); const t0 = tmin(franja(franjaId)?.inicio);
  let d = fecha;
  for (let i = 0; i < 60; i++) {
    const ses = sesionesDia(d);
    const cand = d === fecha ? ses.filter(x => dir > 0 ? tmin(x.franja.inicio) > t0 : tmin(x.franja.inicio) < t0) : ses;
    if (cand.length) return dir > 0 ? cand[0] : cand[cand.length - 1];
    d = addDays(d, dir);
  }
  return null;
}
function siguienteLectivo(s) { let d = addDays(s, 1), g = 0; while (festivoDe(d) && g++ < 30) d = addDays(d, 1); return d; }

/* estado de planificación de una sesión */
function estadoPlan(key) {
  const p = S.planes[key];
  if (p?.sinClase) return { c: 'off', t: 'Sin clase' };
  if ((p?.eventos || []).some(e => e.tipo === 'examen')) return { c: 'ok', t: 'Examen' }; // un examen no hay que prepararlo como clase
  if (!p || !(p.titulo || '').trim()) return { c: 'bad', t: 'Sin planificar' };
  const lleno = (p.eventos || []).some(e => e.tipo === 'examen') || (p.actividades || []).length || (p.explicacion || '').trim() || (p.bloques || []).length;
  return lleno ? { c: 'ok', t: 'Planificada' } : { c: 'warn', t: 'Solo título' };
}
const plan = key => S.planes[key] || (S.planes[key] = { titulo: '', unidad: '', etiquetas: '', objetivos: '', bloques: [], material: '', deberes: '', explicacion: '', enlaces: [], actividades: [], recursos: [], ideasUsadas: [], ideasOcultas: [] });
const reg = key => { const r = S.regs[key] || (S.regs[key] = {}); ['asis', 'deberes', 'trabajo', 'actitud'].forEach(c => r[c] = r[c] || {}); r.sorteos = r.sorteos || []; r.bano = r.bano || []; r.notas = r.notas || []; r.espera = r.espera || []; return r; };

/* desplazar planificación: la sesión indicada queda sin clase y todo avanza un hueco */
/* exámenes y entregas planificados en una sesión → agenda */
function syncEvento(key, ev) {
  const { grupoId, fecha, franjaId } = parseKey(key); const f = franja(franjaId);
  const fechaEv = ev.tipo === 'examen' ? fecha : (ev.fecha || '');
  let a = S.agenda.find(x => x.eventoId === ev.id);
  if (!a) { a = { id: uid(), done: false, comunicado: false, notas: '', recordar: { semana: ev.tipo === 'examen', tres: ev.tipo === 'entrega', antes: true, mismo: true } }; S.agenda.push(a); }
  Object.assign(a, { titulo: ev.titulo || (ev.tipo === 'examen' ? 'Examen' : 'Entrega'), tipo: ev.tipo, grupoId, fecha: fechaEv, hora: ev.tipo === 'examen' ? (f?.inicio || '') : (a.hora || ''), planKey: key, eventoId: ev.id });
  touch('agenda');
}
/* examen apuntado en la agenda con grupo y fecha → se vincula a la sesión de ese día */
function vincularExamenAgenda(a) {
  if (!a || a.tipo !== 'examen' || !a.grupoId || !a.fecha || a.planKey || a.done) return false;
  const occ = ocurrencias(a.grupoId, a.fecha, a.fecha).filter(o => !S.planes[o.key]?.sinClase);
  if (!occ.length) return false;
  const o = (a.hora && occ.find(x => x.franja?.inicio === a.hora)) || occ[0];
  const p = plan(o.key);
  const ev = { id: uid(), tipo: 'examen', titulo: a.titulo || 'Examen', fecha: '' };
  if ((p.titulo || '').trim() && p.titulo !== ev.titulo) p.tituloPrevio = p.titulo; p.titulo = ev.titulo; // el título de la sesión pasa a ser el del examen
  (p.eventos = p.eventos || []).push(ev);
  Object.assign(a, { planKey: o.key, eventoId: ev.id, hora: a.hora || o.franja?.inicio || '' });
  touchPlan(o.key); touch('agenda');
  return true;
}
function quitarEvento(evId) { const n = S.agenda.length; S.agenda = S.agenda.filter(a => a.eventoId !== evId); if (S.agenda.length !== n) touch('agenda'); }
function desplazar(key, motivo) {
  const { grupoId, fecha } = parseKey(key);
  const occ = ocurrencias(grupoId, fecha, cursoRango()[1]);
  const i = occ.findIndex(o => o.key === key); if (i < 0) return 0;
  let moved = 0;
  for (let k = occ.length - 2; k >= i; k--) {
    const from = occ[k].key, to = occ[k + 1].key;
    if (S.planes[from] && !S.planes[from].sinClase) { S.planes[to] = S.planes[from]; touchPlan(to); moved++; }
    else if (S.planes[to] && k + 1 > i) { delete S.planes[to]; touchPlan(to); }
  }
  const idxOf = {}; occ.forEach((o, j) => { idxOf[o.key] = j; }); const hechos = new Set();
  Object.entries(S.planes).forEach(([k, pp]) => { if (!pp || hechos.has(pp)) return; hechos.add(pp); const j = idxOf[pp.deberesPara]; if (j !== undefined && j >= i && occ[j + 1]) { pp.deberesPara = occ[j + 1].key; touchPlan(k); } });
  S.planes[key] = { sinClase: true, motivo: motivo || 'Clase perdida', titulo: '' }; touchPlan(key);
  occ.slice(i + 1).forEach(o => (S.planes[o.key]?.eventos || []).forEach(ev => syncEvento(o.key, ev)));
  return moved;
}

/* ideas que encajan con una sesión */
function ideasPara(key) {
  const { grupoId } = parseKey(key); const p = S.planes[key]; const g = grupo(grupoId);
  if (!p || !g) return [];
  const texto = words([p.titulo, p.unidad, p.etiquetas, p.objetivos].join(' '));
  if (!texto.trim()) return [];
  const ocultas = p.ideasOcultas || [];
  return S.ideas.filter(i => {
    if (ocultas.includes(i.id)) return false;
    const amb = i.ambito || 'todos';
    if (amb === 'grupo' && i.grupoId !== grupoId) return false;
    if (amb === 'nivel' && words(i.nivel) !== words(g.nivel)) return false;
    const tags = (i.etiquetas || []).map(words).filter(Boolean);
    return tags.some(t => texto.includes(t));
  }).sort((a, b) => ((b.ambito === 'grupo' || b.ambito === 'nivel') - (a.ambito === 'grupo' || a.ambito === 'nivel')) || (a.usos?.length || 0) - (b.usos?.length || 0));
}

/* agenda: recordatorios para una fecha */
function recordatoriosDe(s) {
  return S.agenda.filter(a => !a.done && a.fecha).map(a => {
    const n = diffDays(s, a.fecha); const r = a.recordar || { antes: true, mismo: true };
    const offs = [r.mismo && 0, r.antes && 1, r.tres && 3, r.semana && 7].filter(x => x !== false && x !== undefined);
    return offs.includes(n) ? { a, n } : null;
  }).filter(Boolean).sort((x, y) => x.n - y.n);
}
/* Hoy › Tareas: vencidas, de ese día, sin fecha de los grupos con clase y las que piden aviso antes («avisarme») */
function tareasDia(s, grIds) {
  const ya = new Set(), out = [];
  const add = (a, cuando, c, orden) => { if (ya.has(a.id)) return; ya.add(a.id); out.push({ a, cuando, c, orden }); };
  S.agenda.filter(a => !a.done && a.fecha && a.fecha < s).forEach(a => add(a, a.tipo === 'clase' ? 'desde ' + fShort(a.fecha) : 'vencida ' + rel(diffDays(s, a.fecha)), a.tipo === 'clase' ? '' : 'tx-warn', 0));
  S.agenda.filter(a => !a.done && a.fecha === s).forEach(a => add(a, '', '', 1));
  S.agenda.filter(a => !a.done && !a.fecha && a.grupoId && (grIds || []).includes(a.grupoId) && TIPOS_TAREA.has(a.tipo)).forEach(a => add(a, 'sin fecha', '', 2));
  recordatoriosDe(s).filter(r => r.n > 0).forEach(({ a, n }) => add(a, rel(n), '', 3));
  return out.sort((x, y) => x.orden - y.orden || (x.a.fecha || '').localeCompare(y.a.fecha || '') || (x.a.hora || '').localeCompare(y.a.hora || ''));
}
/* tareas de un grupo para una sesión: lo apuntado para ese grupo (tareas y «para clase») con fecha hasta ese día o sin fecha.
   Lo que no se marca sigue apareciendo en las sesiones siguientes. «key» deja ver también lo marcado en esa misma sesión. */
const TIPOS_TAREA = new Set(['tarea', 'clase']);
function tareasGrupo(gid, fecha, key) {
  return S.agenda.filter(a => a.grupoId === gid && TIPOS_TAREA.has(a.tipo) && (!a.done || (key && a.doneEn === key)) && (!a.fecha || !fecha || a.fecha <= fecha))
    .sort((a, b) => (a.fecha || '9').localeCompare(b.fecha || '9'));
}
/* fecha de la siguiente clase del grupo después de «fecha» ('' si no hay en los próximos 60 días) */
function siguienteClase(gid, fecha) { return ocurrencias(gid, addDays(fecha, 1), addDays(fecha, 60))[0]?.fecha || ''; }
function nuevaTareaClase(gid, t, fecha, extra) {
  const a = Object.assign({ id: uid(), titulo: t, tipo: 'clase', grupoId: gid, fecha: fecha || '', hora: '', notas: '', done: false, comunicado: false, recordar: { mismo: true } }, extra || {});
  S.agenda.push(a); return a;
}
/* los antiguos «Pendientes de clase» (documento pendgrupo) pasan a ser tareas «Para clase» de la agenda */
function migrarPendientes() {
  const m = S.pendgrupo || {}; let n = 0;
  Object.entries(m).forEach(([gid, L]) => (L || []).forEach(p => {
    if (!grupo(gid) || S.agenda.some(a => a.id === p.id)) return;
    const base = p.creado || todayStr();
    nuevaTareaClase(gid, p.t || '', p.done ? base : (siguienteClase(gid, addDays(base, -1)) || base), { id: p.id, done: !!p.done, doneEn: p.doneEn || null, origen: p.origen || null, creado: p.creado || null, ejemplo: p.ejemplo || undefined });
    n++;
  }));
  if (Object.keys(m).length) { S.pendgrupo = {}; touch('agenda', 'pendgrupo'); }
  return n;
}

/* seguimiento por alumno (sin motor de calificaciones: solo registros) */
function seguimiento(gid, desde, hasta) {
  const g = grupo(gid); const P = S.config.pesos; const out = {};
  g.alumnos.forEach(a => out[a.id] = { F: 0, J: 0, R: 0, deb: [], tra: [], act: [], actTags: {}, preg: [], bano: 0, notas: 0, sesiones: 0 });
  Object.keys(S.regs).forEach(k => {
    if (!k.startsWith(gid + '|')) return; const r = S.regs[k];
    if (desde || hasta) { const f = parseKey(k).fecha; if ((desde && f < desde) || (hasta && f > hasta)) return; }
    g.alumnos.forEach(a => {
      const o = out[a.id]; const as = r.asis?.[a.id];
      if (r.asis && Object.keys(r.asis).length || r.deberes || r.trabajo) o.sesiones++;
      if (as === 'F') o.F++; if (as === 'J') o.J++; if (as === 'R') o.R++;
      if (r.deberes?.[a.id]) o.deb.push(P.val3[r.deberes[a.id]]);
      if (r.trabajo?.[a.id]) o.tra.push(P.val3[r.trabajo[a.id]]);
      const av = actVal(r.actitud?.[a.id]); if (av) { if (av.n) o.act.push(av.n); (av.tags || []).forEach(t => { o.actTags[t] = (o.actTags[t] || 0) + 1; }); }
      (r.sorteos || []).filter(x => x.alumnoId === a.id && x.val && x.val !== 'skip').forEach(x => o.preg.push(P.sorteo[x.val]));
      o.bano += (r.bano || []).filter(x => x.alumnoId === a.id && x.permitido !== undefined).length;
      o.notas += (r.notas || []).filter(x => x.alumnoId === a.id).length;
    });
  });
  const avg = arr => arr.length ? arr.reduce((s, x) => s + x, 0) / arr.length : null;
  Object.values(out).forEach(o => {
    o.debM = avg(o.deb); o.traM = avg(o.tra); o.actM = avg(o.act); o.pregM = avg(o.preg);
    o.trabajoClase = avg([...o.tra, ...o.preg]); // cada registro de trabajo y cada pregunta cuentan como un ítem más
  });
  return out;
}
const n1 = v => v === null || v === undefined ? '—' : (Math.round(v * 10) / 10).toLocaleString('es-ES');

/* ---------- alertas para Hoy ---------- */
function alertas(s) {
  const out = [];
  const man = siguienteLectivo(s);
  const sinPlan = sesionesDia(man).filter(x => estadoPlan(x.key).c === 'bad');
  if (sinPlan.length) out.push({ c: 'bad', t: `<b>${sinPlan.length} ${sinPlan.length === 1 ? 'sesión' : 'sesiones'} sin planificar</b> para ${diffDays(s, man) === 1 ? 'mañana' : fLong(man)}: ${sinPlan.map(x => esc(x.grupo.nombre)).join(', ')}.`, key: sinPlan[0].key });
  const hoySin = sesionesDia(s).filter(x => estadoPlan(x.key).c === 'bad');
  if (hoySin.length) out.push({ c: 'bad', t: `<b>Hoy</b> tienes ${hoySin.length} ${hoySin.length === 1 ? 'sesión' : 'sesiones'} sin planificar.`, key: hoySin[0].key });
  S.agenda.filter(a => !a.done && a.tipo === 'examen' && a.grupoId && !a.comunicado && a.fecha >= s && diffDays(s, a.fecha) <= (S.config.avisos.examenDias || 7))
    .forEach(a => out.push({ c: 'warn', t: `<b>Examen sin comunicar</b>: ${esc(a.titulo)} (${esc(grupo(a.grupoId)?.nombre || '')}), ${rel(diffDays(s, a.fecha))}.`, go: 'agenda' }));
  S.grupos.forEach(g => {
    const keys = Object.keys(S.regs).filter(k => k.startsWith(g.id + '|') && Object.keys(S.regs[k].deberes || {}).length).sort((a, b) => parseKey(a).fecha.localeCompare(parseKey(b).fecha));
    const last3 = keys.slice(-3); if (last3.length < 3) return;
    g.alumnos.forEach(a => { if (last3.every(k => S.regs[k].deberes[a.id] === 'no')) out.push({ c: 'warn', t: `<b>${esc(a.nombre)}</b> (${esc(g.nombre)}) lleva 3 revisiones seguidas sin deberes.`, go: 'grupo', gid: g.id }); });
  });
  return out;
}

/* ---------- móvil: barra inferior, «＋» y «Más» ---------- */
const ICO = d => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
const TABS = [['hoy', 'Hoy', ICO('<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>')],
  ['plan', 'Planificar', ICO('<rect x="3" y="4" width="18" height="17" rx="2"/><path d="M3 9h18M8 2v4M16 2v4"/>')],
  ['+', 'Apuntar', ICO('<path d="M12 5v14M5 12h14"/>')],
  ['agenda', 'Agenda', ICO('<path d="M9 11l3 3 8-8"/><path d="M20 12v7a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h9"/>')],
  ['mas', 'Más', ICO('<circle cx="5" cy="12" r="1.2"/><circle cx="12" cy="12" r="1.2"/><circle cx="19" cy="12" r="1.2"/>')]];
const TAB_MAS = [['grupos', 'Grupos', '👥'], ['cal', 'Calificaciones', '📊'], ['ideas', 'Ideas', '💡'], ['materiales', 'Materiales', '📚'], ['ajustes', 'Ajustes', '⚙️']];
const esMovil = () => window.matchMedia('(max-width: 760px)').matches;

/* ---------- render ---------- */
const NAV = [['hoy', 'Hoy'], ['plan', 'Planificación'], ['grupos', 'Grupos'], ['cal', 'Calificaciones'], ['agenda', 'Agenda'], ['ideas', 'Ideas'], ['materiales', 'Materiales'], ['ajustes', 'Ajustes']];
function render() {
  const navView = UI.view === 'sesion' ? 'plan' : UI.view === 'grupo' ? 'grupos' : UI.view === 'libro' ? 'materiales' : UI.view;
  $('#nav').innerHTML = NAV.map(([v, t]) => `<button data-a="go" data-v="${v}" ${navView === v ? 'aria-current="page"' : ''}>${t}</button>`).join('');
  const enMas = TAB_MAS.some(([v]) => v === navView);
  $('#tabbar').innerHTML = TABS.map(([v, t, ic]) => v === '+' ? `<button class="tb-add" data-a="tbadd" aria-label="Apuntar algo rápido"><span class="ic">${ic}</span>${t}</button>`
    : v === 'mas' ? `<button data-a="tbmas" ${enMas ? 'aria-current="page"' : ''}>${ic}${t}</button>`
    : `<button data-a="go" data-v="${v}" ${navView === v ? 'aria-current="page"' : ''}>${ic}${t}</button>`).join('');
  const fn = VIEWS[UI.view] || VIEWS.hoy;
  const y = scrollY_();
  $('#main').innerHTML = fn();
  if (UI.keepScroll) { scrollA(y); UI.keepScroll = false; }
}
/* desplazamiento: en la app instalada en el móvil se mueve #main; si no, la ventana */
function scroller() { const m = $('#main'); return m && document.documentElement.classList.contains('pwa') && getComputedStyle(m).overflowY === 'auto' ? m : null; }
function scrollY_() { const m = scroller(); return m ? m.scrollTop : window.scrollY; }
function scrollA(y) { const m = scroller(); if (m) m.scrollTop = y; else window.scrollTo(0, y); }
const gchip = g => g ? `<span class="gchip"><span class="sw" style="background:var(--${g.color || 'g1'})"></span>${esc(g.nombre)}</span>` : '';
const pill = (c, t) => `<span class="pill ${c}">${esc(t)}</span>`;

function vacio() {
  return `<div class="panel welcome stack">
    <h1>Bienvenido a tu cuaderno</h1>
    <p>Para empezar necesitas tres cosas: las <b>fechas del curso</b>, tus <b>franjas horarias</b> y tus <b>grupos con su horario</b>. Con eso la app ya sabe qué clases tienes cada día.</p>
    <div class="row"><button class="btn primary" data-a="go" data-v="ajustes">Configurar mi curso</button>
    <button class="btn" data-a="ejemplo">Probar con datos de ejemplo</button></div>
    <p class="small muted">Tus datos son privados: si compartes la app, cada persona empieza con su propio cuaderno vacío.</p></div>`;
}

const VIEWS = {};

