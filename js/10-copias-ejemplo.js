'use strict';
/* ---------- exportar / importar ---------- */
async function exportar(obj, nombre) {
  const data = JSON.stringify(obj, null, 1); const filename = `${nombre}-${todayStr()}.json`;
  let dl = null; try { dl = Nube.descargas; } catch (e) {}
  if (dl) { try { await dl.save({ filename, data }); toast('Copia guardada'); return; } catch (e) { if (e?.code === 'declined') return; } }
  modal(`<h2>Copia de tus datos</h2><p class="small">No se ha podido descargar el archivo aquí. Copia este texto y guárdalo en un archivo <b>${esc(filename)}</b>.</p><textarea id="exp-t" rows="10" readonly>${esc(data)}</textarea><div class="row" style="margin-top:10px"><button class="btn primary" data-a="copyexp">Copiar</button><button class="btn" data-a="close">Cerrar</button></div>`);
}
A.copyexp = () => { const t = $('#exp-t'); navigator.clipboard?.writeText(t.value).then(() => toast('Copiado'), () => { t.select(); }); };
$('#filein').addEventListener('change', async e => {
  const f = e.target.files[0]; e.target.value = ''; if (!f) return;
  let obj; try { obj = JSON.parse(await f.text()); } catch (er) { toast('El archivo no es una copia válida'); return; }
  if (UI.importMode === 'ideas') {
    const ideas = obj.tipo === 'banco-ideas' ? obj.ideas : obj.docs?.ideas?.list; if (!Array.isArray(ideas)) { toast('No hay ideas en este archivo'); return; }
    const ex = new Set(S.ideas.map(i => words(i.titulo + i.texto)));
    const nuevas = ideas.filter(i => !ex.has(words(i.titulo + i.texto))).map(i => ({ ...i, id: uid(), usos: [], grupoId: null, ambito: i.ambito === 'grupo' ? 'todos' : (i.ambito || 'todos'), origen: f.name }));
    S.ideas.push(...nuevas); touch('ideas'); toast(`${nuevas.length} ideas importadas`); render(); return;
  }
  if (obj.tipo !== 'cuaderno-docente' || !obj.docs) { toast('El archivo no es una copia del cuaderno'); return; }
  UI.pendingImport = obj;
  modal(`<h2>Importar copia</h2><p>Esta copia es del ${esc((obj.exportado || '').slice(0, 10))}. Sustituirá <b>todos</b> los datos actuales.</p><div class="row"><button class="btn primary" data-a="imp-ok">Sustituir mis datos</button><button class="btn" data-a="close">Cancelar</button></div>`);
});
async function aplicarImport() {
  const old = allDocIds(); hydrate(UI.pendingImport.docs); UI.pendingImport = null; closeModal();
  const nu = new Set(allDocIds()); for (const id of old) if (!nu.has(id)) { try { await Store.remove(id); } catch (e) {} }
  touch(...nu); UI.view = 'hoy'; toast('Copia importada'); render();
}
async function borrarTodo() {
  const ids = allDocIds(); for (const id of ids) { try { await Store.remove(id); } catch (e) {} }
  S = { config: DEFAULT_CONFIG(), grupos: [], agenda: [], ideas: [], pendientes: [], pendgrupo: {}, planes: {}, regs: {}, cal: {}, materiales: { asigs: [] }, libros: {} };
  UI.confirm = null; UI.view = 'hoy'; toast('Datos borrados'); render();
}

/* ---------- datos de ejemplo (inventados) ---------- */
function cargarEjemplo() {
  const hoy = todayStr(); const lun = mondayOf(hoy);
  const y = parseD(hoy).getMonth() >= 8 ? parseD(hoy).getFullYear() : parseD(hoy).getFullYear() - 1;
  const fr = [['08:00', '08:55'], ['08:55', '09:50'], ['09:50', '10:45'], ['11:15', '12:10'], ['12:10', '13:05'], ['13:05', '14:00']].map(([i, f]) => ({ id: uid(), inicio: i, fin: f }));
  if (!S.config.franjas.length) S.config.franjas = fr;
  const F = S.config.franjas;
  if (!S.config.inicio) Object.assign(S.config, { curso: `${y}-${String(y + 1).slice(2)} (ejemplo)`, inicio: `${y}-09-08`, fin: `${y + 1}-06-18`,
    evaluaciones: [{ id: uid(), nombre: '1.ª evaluación', fin: `${y}-12-18` }, { id: uid(), nombre: '2.ª evaluación', fin: `${y + 1}-03-20` }, { id: uid(), nombre: '3.ª evaluación', fin: `${y + 1}-06-18` }],
    festivos: [{ id: uid(), nombre: 'Día de la Comunitat Valenciana', desde: `${y}-10-09`, hasta: '' }, { id: uid(), nombre: 'Fiesta Nacional', desde: `${y}-10-12`, hasta: '' }, { id: uid(), nombre: 'Navidad (orientativo)', desde: `${y}-12-23`, hasta: `${y + 1}-01-06` }] });
  const nombres = [['Alba Ferrer Soler', 'Biel Navarro Pons', 'Carla Ruiz Montañés', 'Dani Sanchis Vidal', 'Elena Gómez Belda', 'Hugo Martí Llopis', 'Irene Castelló Roig', 'Jorge Peris Climent', 'Lucía Benlloch Mas', 'Marc Ortega Alemany', 'Nora Vicent Albiol', 'Pablo Esteve Gil'],
    ['Aitana Mora Sendra', 'Bruno Calatayud Ferri', 'Clara Domènech Pla', 'Diego Lozano Roca', 'Emma Puig Vilaplana', 'Gael Torres Moll', 'Inés Bonet Garcia', 'Leo Campos Serra', 'Marta Insa Cervera', 'Óscar Ribes Tormo', 'Sara Blasco Fuster'],
    ['Adrián Pastor Grau', 'Berta Llorens Saez', 'Carlos Vives Martí', 'Daniela Ramos Peiró', 'Eric Montesinos Bas', 'Julia Gascó Ivars', 'Laura Segarra Monzó', 'Raúl Fenollar Sanz']];
  const G = [{ nombre: '1.º ESO A (ejemplo)', materia: 'Biología y Geología', nivel: '1.º ESO', color: 'g1', asig: 'byg1eso' }, { nombre: '3.º ESO B (ejemplo)', materia: 'Biologia i Geologia', nivel: '3.º ESO', color: 'g2', idioma: 'va', asig: 'byg3eso' }, { nombre: '2.º Bach (ejemplo)', materia: 'Geología y Ciencias Ambientales', nivel: '2.º Bach', color: 'g3', asig: 'geo2' }]
    .map((g, i) => ({ id: uid(), ...g, ejemplo: true, alumnos: nombres[i].map(n => fijarNombre({ id: uid(), ...partirNombre(n), tags: [], obs: '' })) }));
  G.forEach(ordenarAlumnos);
  G[0].alumnos[3].tags = ['TDAH']; G[0].alumnos[3].obs = 'Instrucciones de una en una; adaptación de tiempo y formato en exámenes.';
  G[0].alumnos[7].tags = ['Nivel adaptado']; G[1].alumnos[4].tags = ['Nouvingut']; G[1].alumnos[4].obs = 'Glosario bilingüe.'; G[1].alumnos[9].tags = ['Repetidor'];
  S.grupos.push(...G);
  const H = [[1, 0, 0, '12'], [1, 3, 1, 'Lab'], [1, 4, 2, '21'], [2, 1, 1, '14'], [2, 2, 0, '12'], [3, 0, 2, '21'], [3, 3, 0, 'Lab'], [4, 1, 1, '14'], [4, 4, 2, '21'], [5, 2, 0, '12'], [5, 3, 1, '14']];
  [[1, 1, 'guardia', 'Sala de profesores'], [2, 3, 'at', 'Despacho de tutoría'], [3, 1, 'ac', 'Biblioteca'], [4, 5, 'reunion', 'Departamento de Ciencias']].forEach(([d, fi, tipo, aula]) => { if (F[fi] && !S.config.horario.find(h => h.dia === d && h.franjaId === F[fi].id)) S.config.horario.push({ id: uid(), dia: d, franjaId: F[fi].id, grupoId: null, tipo, aula }); });
  H.forEach(([d, fi, gi, aula]) => { if (F[fi] && !S.config.horario.find(h => h.dia === d && h.franjaId === F[fi].id)) S.config.horario.push({ id: uid(), dia: d, franjaId: F[fi].id, grupoId: G[gi].id, aula }); });
  const P = (gi, fecha, o) => { const occ = ocurrencias(G[gi].id, fecha, fecha); occ.forEach(x => { S.planes[x.key] = Object.assign(plan(x.key), o); touchPlan(x.key); }); return occ[0]?.key; };
  const prevDay = d => { let x = addDays(d, -1), g = 0; while (festivoDe(x) && g++ < 10) x = addDays(x, -1); return x; };
  const d0 = festivoDe(hoy) ? siguienteLectivo(hoy) : hoy; const d1 = siguienteLectivo(d0); const dm1 = prevDay(d0);
  [dm1, d0, d1].forEach((d, idx) => {
    sesionesDia(d).forEach(x => {
      const gi = G.findIndex(g => g.id === x.grupo.id);
      if (idx === 2 && gi === 2) return; // mañana: 2.º Bach sin planificar (para ver el aviso)
      const T = [
        [{ titulo: 'Los seres vivos: niveles de organización', unidad: 'UD 2 · La célula', etiquetas: 'célula, seres vivos', objetivos: 'Distinguir célula, tejido, órgano y sistema.' }, { titulo: 'La célula: procariota y eucariota', unidad: 'UD 2 · La célula', etiquetas: 'célula, microscopio', objetivos: 'Comparar los dos tipos de célula.' }, { titulo: 'Práctica: observar células de cebolla', unidad: 'UD 2 · La célula', etiquetas: 'microscopio, laboratorio, célula' }],
        [{ titulo: 'Estructura interna de la Terra', unidad: 'UD 3 · Geodinàmica interna', etiquetas: 'tectónica, tierra' }, { titulo: 'Tectònica de plaques: límits divergents', unidad: 'UD 3 · Geodinàmica interna', etiquetas: 'tectónica, placas, dorsal', objetivos: 'Explicar què passa en una dorsal oceànica.' }, { titulo: 'Límits convergents i volcans', unidad: 'UD 3 · Geodinàmica interna', etiquetas: 'tectónica, volcanes, placas' }],
        [{ titulo: 'Riesgos geológicos: conceptos', unidad: 'Bloque Riesgos', etiquetas: 'riesgos, peligrosidad, vulnerabilidad' }, { titulo: 'Riesgo de inundación', unidad: 'Bloque Riesgos', etiquetas: 'riesgos, inundación, ramblas' }, null]][gi][idx];
      if (!T) return;
      S.planes[x.key] = Object.assign(plan(x.key), T, idx < 2 ? { bloques: [{ id: uid(), fase: 'Repaso e inicio', min: 5 }, { id: uid(), fase: 'Explicación', min: 20 }, { id: uid(), fase: 'Actividad', min: 25 }, { id: uid(), fase: 'Cierre', min: 5 }], actividades: [{ id: uid(), texto: 'Actividades 1–4 de la pág. 52', tipo: 'Parejas' }] } : {});
      if (idx === 0) { S.planes[x.key].cierre = { estado: 'completa', visto: T.titulo + '. ' + (T.objetivos || ''), hecho: true, en: dm1 }; S.planes[x.key].deberes = 'Actividades 5 y 6 de la pág. 52';
        const r = reg(x.key); G[gi].alumnos.forEach((a, j) => { if (j % 5 === 1) r.deberes[a.id] = 'no'; else r.deberes[a.id] = j % 3 ? 'si' : 'medias'; r.trabajo[a.id] = j % 4 ? 'si' : 'medias'; }); r.asis[G[gi].alumnos[2].id] = 'F'; r.sorteos.push({ alumnoId: G[gi].alumnos[0].id, val: 'bien', t: Date.now() }, { alumnoId: G[gi].alumnos[5].id, val: 'regular', t: Date.now() }); touchReg(x.key); }
      touchPlan(x.key);
    });
  });
  G.forEach(g => (S.pendgrupo[g.id] = S.pendgrupo[g.id] || []).push({ id: uid(), t: 'Corregir deberes: actividades 5 y 6 de la pág. 52', done: false, creado: dm1 }));
  S.pendgrupo[G[1].id].push({ id: uid(), t: 'Recoger autorizaciones de la salida al Parque Natural', done: false, creado: dm1 });
  const ag = (o) => S.agenda.push(Object.assign({ id: uid(), done: false, comunicado: false, ejemplo: true, hora: '', notas: '', recordar: { antes: true, mismo: true } }, o));
  ag({ titulo: 'Examen UD 3', tipo: 'examen', grupoId: G[1].id, fecha: ocurrencias(G[1].id, addDays(d0, 5), addDays(d0, 20))[0]?.fecha || addDays(d0, 7) });
  ag({ titulo: 'Entrega informe de laboratorio', tipo: 'entrega', grupoId: G[0].id, fecha: addDays(d0, 3), comunicado: true });
  ag({ titulo: 'Reunión de departamento', tipo: 'reunion', fecha: d1, hora: '14:00' });
  ag({ titulo: 'Preparar autorizaciones salida de campo', tipo: 'tarea', grupoId: G[1].id, fecha: d0 });
  const id = (o) => S.ideas.push(Object.assign({ id: uid(), creada: new Date().toISOString(), usos: [], ambito: 'todos', ejemplo: true }, o));
  id({ titulo: 'Marie Tharp y el mapa del fondo oceánico', tipo: 'Anécdota', texto: 'Cartógrafa que en los años 50 descubrió el valle del rift en la dorsal atlántica dibujando los datos de sondeos. Al principio no la creyeron. Sirve para abrir tectónica y hablar de mujeres en la ciencia.', etiquetas: ['tectónica', 'dorsal', 'mujeres científicas'] });
  id({ titulo: 'Las placas como la corteza de un pan', tipo: 'Analogía', texto: 'La litosfera se rompe en trozos como la corteza de un pan al hornearse. Ojo: el manto no es líquido, es sólido que fluye muy despacio.', etiquetas: ['tectónica', 'placas'] });
  id({ titulo: 'La DANA y las ramblas', tipo: 'Noticia', texto: 'Usar fotos de ramblas secas y de la misma rambla en una DANA para hablar de peligrosidad y vulnerabilidad.', etiquetas: ['riesgos', 'inundación', 'ramblas'], ambito: 'nivel', nivel: '2.º Bach' });
  id({ titulo: 'Células de cebolla con lugol', tipo: 'Experimento', texto: 'Epidermis de cebolla + lugol. Si sobra tiempo, mucosa bucal con azul de metileno.', etiquetas: ['microscopio', 'célula'] });
  id({ titulo: '¿Cuántos minerales hay en tu móvil?', tipo: 'Dato curioso', texto: 'Un smartphone contiene más de 30 elementos distintos extraídos de minerales.', etiquetas: ['minerales', 'recursos'] });
  G[1].alumnos[9].pendiente = 'ByG 1.º ESO'; G[2].alumnos[2].pendiente = 'Biología y Geología 1.º Bach'; G[2].alumnos[2].pendRecuperada = true;
  ejemploCal(G);
  touch('config', 'grupos', 'agenda', 'ideas', 'pendientes', 'pendgrupo');
  UI.view = 'hoy'; UI.date = todayStr(); toast('Datos de ejemplo cargados'); render();
}

