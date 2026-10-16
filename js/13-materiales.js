'use strict';
/* ===== MATERIALES: asignaturas (no grupos) → carpetas → archivos y enlaces ===== */
const OFFICE = { docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', doc: 'application/msword',
  pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation', ppt: 'application/vnd.ms-powerpoint',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', xls: 'application/vnd.ms-excel',
  odt: 'application/vnd.oasis.opendocument.text', odp: 'application/vnd.oasis.opendocument.presentation', ods: 'application/vnd.oasis.opendocument.spreadsheet' };
const MAT_TYPES = ['application/pdf', 'image/png', 'image/jpeg', 'image/gif', 'image/webp', 'image/svg+xml', 'video/mp4', 'video/webm', 'text/plain', 'text/csv', 'text/markdown', ...Object.values(OFFICE)];
const MAT_EXT = { md: 'text/markdown', csv: 'text/csv', txt: 'text/plain', ...OFFICE };
const MAT_EXT_DE = Object.fromEntries(Object.entries(OFFICE).map(([e, t]) => [t, e]));
const MAT_CARPETAS = ['Temario', 'Actividades', 'Exámenes', 'Prácticas de laboratorio', 'Recursos'];
const matDe = () => S.materiales.asigs || (S.materiales.asigs = []);
const matA = () => matDe().find(a => a.id === UI.matAsig) || matDe()[0] || null;
function matRuta(a, cid) { const out = []; let c = a.carpetas.find(x => x.id === cid), g = 0; while (c && g++ < 50) { out.unshift(c); const p = c.parent; c = a.carpetas.find(x => x.id === p); } return out; }
function matSub(a, cid) { const ids = new Set([cid]); let ch = true; while (ch) { ch = false; a.carpetas.forEach(c => { if (c.parent && ids.has(c.parent) && !ids.has(c.id)) { ids.add(c.id); ch = true; } }); } return ids; }
const tamTxt = b => !b ? '' : b < 1048576 ? Math.max(1, Math.round(b / 1024)) + ' KB' : (b / 1048576).toLocaleString('es-ES', { maximumFractionDigits: 1 }) + ' MB';
/* fila compacta de Materiales */
const matTag = t => t === 'enlace' ? ['WEB', 'tg-web'] : t === 'application/pdf' ? ['PDF', 'tg-pdf'] : /word|opendocument\.text/.test(t || '') ? ['DOC', 'tg-doc'] : /presentation|powerpoint/.test(t || '') ? ['PPT', 'tg-ppt'] : /sheet|excel/.test(t || '') ? ['XLS', 'tg-xls'] : (t || '').startsWith('image') ? ['IMG', 'tg-img'] : (t || '').startsWith('video') ? ['VÍD', 'tg-vid'] : ['TXT', 'tg-txt'];
const matNombreVer = n => (n || 'Sin nombre').replace(/[_]+/g, ' ').replace(/\s+/g, ' ').trim();
const matHref = f => f.tipo === 'enlace' ? (f.url || '#') : '_blob/' + f.assetId + '?n=' + encodeURIComponent((f.nombre || 'archivo') + (MAT_EXT_DE[f.tipo] ? '.' + MAT_EXT_DE[f.tipo] : ''));
function matMasModal(id, borrar) {
  const a = matA(); const f = a?.archivos.find(x => x.id === id); if (!f) { closeModal(); return; }
  const destinos = a.carpetas.map(c => ({ c, p: matRuta(a, c.id).map(x => x.nombre || 'Sin nombre').join(' › ') })).sort((x, y) => x.p.localeCompare(y.p, 'es'));
  modal(`<div class="row" style="flex-wrap:nowrap;align-items:flex-start;gap:10px"><span class="mtag ${matTag(f.tipo)[1]}">${matTag(f.tipo)[0]}</span><div class="grow"><b style="overflow-wrap:anywhere">${esc(matNombreVer(f.nombre))}</b><div class="mmeta">${matTipo(f.tipo)}${f.size ? ' · ' + tamTxt(f.size) : ''}${f.fecha ? ' · ' + fShort(f.fecha) : ''}</div></div></div>
    <div class="sheetlist">
      <a class="btn" style="justify-content:flex-start;border:0;padding:14px 6px;font-size:1rem;font-weight:700;background:none;border-radius:0" href="${esc(matHref(f))}" target="_blank" rel="noopener" data-a="close">Abrir</a>
      ${f.tipo === 'application/pdf' && f.assetId ? `<button data-a="pdfanotar" data-id="${esc(f.assetId)}" data-n="${esc(f.nombre || 'documento')}">✎ Anotar sobre el PDF</button>` : ''}
      <button data-a="matmasren" data-id="${f.id}">Cambiar el nombre</button>
      ${destinos.length ? `<label class="f" style="border-top:1px solid var(--line);padding:12px 6px">Mover a<select data-f="matmover2" data-id="${f.id}"><option value="" ${!f.carpeta ? 'selected' : ''}>${esc(a.nombre)} (inicio)</option>${destinos.map(({ c, p }) => `<option value="${c.id}" ${f.carpeta === c.id ? 'selected' : ''}>${esc(p)}</option>`).join('')}</select></label>` : ''}
      ${borrar ? `<div class="alert bad small" style="margin-top:6px"><span class="grow">¿Borrar <b>${esc(matNombreVer(f.nombre))}</b>? Podrás deshacerlo justo después.</span><button class="btn sm danger" data-a="matmasdelok" data-id="${f.id}">Borrar</button><button class="btn sm" data-a="matmas" data-id="${f.id}">Cancelar</button></div>`
        : `<button data-a="matmasdel" data-id="${f.id}" style="color:var(--bad)">Borrar</button>`}
    </div>
    <div class="row" style="margin-top:8px"><button class="btn" data-a="close" style="width:100%;justify-content:center">Cerrar</button></div>`, true);
}
const matTipo = t => t === 'enlace' ? 'Enlace' : t === 'application/pdf' ? 'PDF' : /word|opendocument\.text/.test(t || '') ? 'Word' : /presentation|powerpoint/.test(t || '') ? 'Presentación' : /sheet|excel/.test(t || '') ? 'Hoja de cálculo' : (t || '').startsWith('image') ? 'Imagen' : (t || '').startsWith('video') ? 'Vídeo' : 'Texto';
const matIcon = t => t === 'enlace' ? '🔗' : t === 'application/pdf' ? '📕' : /word|opendocument\.text/.test(t || '') ? '📘' : /presentation|powerpoint/.test(t || '') ? '📙' : /sheet|excel/.test(t || '') ? '📗' : (t || '').startsWith('image') ? '🖼️' : (t || '').startsWith('video') ? '🎬' : '📄';
VIEWS.materiales = () => {
  const L = matDe(); const a = matA(); if (a) UI.matAsig = a.id;
  const head = `<div class="page-head"><div><div class="label">Materiales</div><h1>Materiales</h1><div class="sub">Organizados por asignatura, no por grupo: lo que guardes aquí sirve para todos los grupos que la den. Dentro de cada asignatura puedes crear carpetas y subcarpetas.</div></div></div>`;
  const tabs = `<div class="tabs" role="tablist">${L.map(x => `<button role="tab" aria-selected="${!!a && x.id === a.id}" data-a="matasig" data-id="${x.id}">${esc(x.nombre || 'Sin nombre')}</button>`).join('')}<button data-a="matnueva" style="color:var(--accent)">+ Asignatura</button></div>`;
  if (!a) return head + tabs + `<div class="panel empty">Todavía no hay asignaturas. Añade la primera con «+ Asignatura».</div>`;
  if (UI.matCarpeta && !a.carpetas.some(c => c.id === UI.matCarpeta)) UI.matCarpeta = null;
  const cid = UI.matCarpeta || null; const ruta = matRuta(a, cid);
  const subs = a.carpetas.filter(c => (c.parent || null) === cid).sort((x, y) => (x.nombre || '').localeCompare(y.nombre || '', 'es'));
  const arch = a.archivos.filter(f => (f.carpeta || null) === cid).sort((x, y) => (x.nombre || '').localeCompare(y.nombre || '', 'es'));
  const cuenta = c => { const ids = matSub(a, c.id); return { f: a.archivos.filter(x => ids.has(x.carpeta)).length, c: ids.size - 1 }; };
  const destinos = a.carpetas.map(c => ({ c, p: matRuta(a, c.id).map(x => x.nombre || 'Sin nombre').join(' › ') })).sort((x, y) => x.p.localeCompare(y.p, 'es'));
  const mover = f => `<select data-f="matmover" data-id="${f.id}" aria-label="Mover a otra carpeta" title="Mover a otra carpeta" style="width:auto;max-width:190px"><option value="" ${!f.carpeta ? 'selected' : ''}>${esc(a.nombre)} (inicio)</option>${destinos.map(({ c, p }) => `<option value="${c.id}" ${f.carpeta === c.id ? 'selected' : ''}>${esc(p)}</option>`).join('')}</select>`;
  const migas = `<div class="row small"><a href="#" data-a="matcd" data-id="">📚 ${esc(a.nombre || 'Sin nombre')}</a>${ruta.map(c => ` <span class="muted">›</span> <a href="#" data-a="matcd" data-id="${c.id}">${esc(c.nombre || 'Sin nombre')}</a>`).join('')}</div>`;
  const conf = UI.confirm || '';
  const filaCarpeta = c => { const n = cuenta(c); return `<div class="li matrow">${UI.matRen === c.id ? `<span aria-hidden="true">📁</span><input type="text" value="${esc(c.nombre)}" data-f="matcren" data-id="${c.id}" class="grow" aria-label="Nombre de la carpeta"><button class="btn sm" data-a="matrenok">Listo</button>`
    : `<button class="matopen grow" data-a="matcd" data-id="${c.id}"><span aria-hidden="true">📁</span> <b>${esc(c.nombre || 'Sin nombre')}</b> <span class="tiny muted">${n.f} ${n.f === 1 ? 'archivo' : 'archivos'}${n.c ? ' · ' + n.c + (n.c === 1 ? ' carpeta' : ' carpetas') : ''}</span></button><button class="iconbtn" data-a="matren" data-id="${c.id}" aria-label="Cambiar el nombre" title="Cambiar el nombre">✎</button><button class="iconbtn" data-a="confirm" data-c="matdelc:${c.id}" aria-label="Borrar carpeta" title="Borrar carpeta">✕</button>`}</div>
    ${conf === 'matdelc:' + c.id ? `<div class="alert bad small"><span class="grow">Se borrará la carpeta <b>${esc(c.nombre)}</b>${n.f || n.c ? ` con todo lo que contiene (${n.f} ${n.f === 1 ? 'archivo' : 'archivos'}${n.c ? ', ' + n.c + (n.c === 1 ? ' subcarpeta' : ' subcarpetas') : ''})` : ''}. Podrás deshacerlo justo después.</span><button class="btn sm danger" data-a="matdelc" data-id="${c.id}">Borrar</button><button class="btn sm" data-a="cancel">Cancelar</button></div>` : ''}`; };
  const filaArchivo = f => `<div class="li matrow matfile">${UI.matRen === f.id ? `<span class="mtag ${matTag(f.tipo)[1]}">${matTag(f.tipo)[0]}</span><input type="text" value="${esc(f.nombre)}" data-f="matfren" data-id="${f.id}" class="grow" aria-label="Nombre del archivo"><button class="btn sm" data-a="matrenok">Listo</button>`
    : `<span class="mtag ${matTag(f.tipo)[1]}" aria-hidden="true">${matTag(f.tipo)[0]}</span><div class="grow" style="min-width:0"><a class="mname" href="${esc(matHref(f))}" target="_blank" rel="noopener" title="${esc(f.nombre || '')}">${esc(matNombreVer(f.nombre))}</a><div class="mmeta">${matTipo(f.tipo)}${f.size ? ' · ' + tamTxt(f.size) : ''}${f.fecha ? ' · ' + fShort(f.fecha) : ''}${f.tipo === 'enlace' ? ' · ' + esc((f.url || '').replace(/^https?:\/\//, '').slice(0, 40)) : ''}</div></div>
      <span class="mdesk">${f.tipo === 'application/pdf' && f.assetId ? botonAnotar(f.assetId, f.nombre) : ''}${destinos.length ? mover(f) : ''}<button class="iconbtn" data-a="matren" data-id="${f.id}" aria-label="Cambiar el nombre" title="Cambiar el nombre">✎</button><button class="iconbtn" data-a="confirm" data-c="matdelf:${f.id}" aria-label="Borrar" title="Borrar">✕</button></span>
      <button class="iconbtn mmas" data-a="matmas" data-id="${f.id}" aria-label="Opciones de ${esc(f.nombre || 'archivo')}">⋯</button>`}</div>
    ${conf === 'matdelf:' + f.id ? `<div class="alert bad small"><span class="grow">¿Borrar <b>${esc(f.nombre)}</b>? Podrás deshacerlo justo después.</span><button class="btn sm danger" data-a="matdelf" data-id="${f.id}">Borrar</button><button class="btn sm" data-a="cancel">Cancelar</button></div>` : ''}`;
  const puedeSubir = !!ARCH.assets;
  const barra = `<div class="row">${puedeSubir ? `<button class="btn sm primary" data-a="matsubir">⬆ Subir archivos</button>` : ''}<button class="btn sm" data-a="matcarpeta">+ Carpeta</button><button class="btn sm" data-a="matenlace">+ Enlace</button></div>`;
  const nueva = UI.matForm === 'carpeta' ? `<div class="row"><input type="text" id="mat-nc" placeholder="Nombre de la carpeta${cid ? ' (dentro de ' + esc(ruta[ruta.length - 1].nombre) + ')' : ''}" class="grow" style="min-width:180px"><button class="btn sm primary" data-a="matcarpetaok">Crear</button><button class="btn sm" data-a="matformx">Cancelar</button></div>`
    : UI.matForm === 'enlace' ? `<div class="row"><input type="text" id="mat-en" placeholder="Nombre (p. ej. Presentación UD 3 en Drive)" style="flex:1;min-width:160px"><input type="url" id="mat-eu" placeholder="https://…" style="flex:1;min-width:160px"><button class="btn sm primary" data-a="matenlaceok">Añadir</button><button class="btn sm" data-a="matformx">Cancelar</button></div>` : '';
  const vacia = !subs.length && !arch.length;
  const main = `<div class="panel stack matdrop" data-drop="mat"><div class="row between">${migas}${barra}</div>${nueva}
    ${vacia ? `<p class="empty">${cid ? 'Carpeta vacía.' : 'Aún no hay nada en esta asignatura.'} ${puedeSubir ? 'Sube archivos con el botón o arrástralos aquí.' : ''}</p>` : `<div class="list">${subs.map(filaCarpeta).join('')}${arch.map(filaArchivo).join('')}</div>`}
    ${UI.matSubiendo ? `<p class="small muted" style="margin:0">Subiendo ${esc(UI.matSubiendo)}…</p>` : ''}</div>`;
  const total = a.archivos.filter(f => f.tipo !== 'enlace').reduce((s, f) => s + (f.size || 0), 0);
  const side = `<div class="stack"><div class="panel stack"><h3>Asignatura</h3>
      <label class="f">Nombre de la pestaña<input type="text" value="${esc(a.nombre)}" data-f="matnombre"></label>
      <label class="f">Asignatura del currículo (opcional)${asigSelect(a.asig || '', 'data-f="matasigcurr"')}</label>
      <p class="tiny muted" style="margin:0">Sirve para enlazarla con las sesiones de los grupos que dan esta asignatura (por ejemplo, para el libro digital más adelante).</p>
      <p class="small muted" style="margin:0">${a.archivos.length} ${a.archivos.length === 1 ? 'elemento' : 'elementos'} · ${a.carpetas.length} ${a.carpetas.length === 1 ? 'carpeta' : 'carpetas'}${total ? ' · ' + tamTxt(total) : ''}</p>
      <div class="row"><button class="btn sm ghost" data-a="matmov" data-d="-1" ${L[0] === a ? 'disabled' : ''}>‹ Mover pestaña</button><button class="btn sm ghost" data-a="matmov" data-d="1" ${L[L.length - 1] === a ? 'disabled' : ''}>Mover pestaña ›</button></div>
      ${conf === 'matdela' ? `<div class="alert bad small"><span class="grow">Se borrará la asignatura con todas sus carpetas y archivos. Podrás deshacerlo justo después.</span><button class="btn sm danger" data-a="matdela">Borrar</button><button class="btn sm" data-a="cancel">Cancelar</button></div>` : `<button class="btn sm danger" data-a="confirm" data-c="matdela" style="align-self:flex-start">Borrar asignatura</button>`}</div>
    <div class="panel small"><h3>Qué se puede subir</h3><p class="muted" style="margin:0">PDF, imágenes, vídeos (MP4, WebM), texto y documentos de Office o LibreOffice (Word, PowerPoint, Excel), hasta ${Nube.MAX_MB} MB cada uno. Se guardan en tu ${esc(Nube.nubeNombre || 'nube')}; los PDF, imágenes y vídeos se ven en la app y los de Office se descargan al abrirlos.${puedeSubir ? '' : ' <b>Para subir archivos entra con tu cuenta de Google o Microsoft.</b>'}</p>
      <p class="muted" style="margin:6px 0 0">La copia de seguridad de Ajustes guarda las carpetas y los enlaces, pero no los archivos, que se quedan en el almacenamiento de la app.</p></div></div>`;
  return head + tabs + `<div class="cols"><div class="stack">${librosPanel(a)}${main}</div>${side}</div>`;
};
function matNuevaModal() {
  const usadas = new Set(matDe().map(a => a.asig).filter(Boolean));
  modal(`<h2>Nueva asignatura</h2><div class="stack" style="gap:10px">
    <label class="f">Asignatura<select id="mat-as"><option value="">Otra (escribe el nombre)</option>${ASIGNATURAS.filter(([k]) => k !== 'tutoria').map(([k, n]) => `<option value="${k}" ${usadas.has(k) ? 'disabled' : ''}>${esc(n)}${usadas.has(k) ? ' (ya está)' : ''}</option>`).join('')}</select></label>
    <label class="f">Nombre de la pestaña<input type="text" id="mat-an" placeholder="Si lo dejas vacío, el de la asignatura"></label>
    <label class="check small"><input type="checkbox" id="mat-ac" checked>Crear carpetas iniciales: ${MAT_CARPETAS.join(', ')}</label>
    <div class="row"><button class="btn primary" data-a="matnuevaok">Crear</button><button class="btn" data-a="close">Cancelar</button></div></div>`);
  setTimeout(() => $('#mat-as')?.focus(), 30);
}
async function matSubir(files) {
  const a = matA(); if (!a) return; if (!ARCH.assets) { toast('Para subir archivos entra con tu cuenta de Google o Microsoft'); return; }
  const cid = UI.matCarpeta || null; let ok = 0; const mal = [];
  for (const file of files) {
    const ext = (file.name.split('.').pop() || '').toLowerCase(); const tipo = file.type || MAT_EXT[ext] || '';
    if (!MAT_TYPES.includes(tipo)) { mal.push(file.name + ' (tipo no admitido)'); continue; }
    if (file.size > Nube.MAX_MB * 1048576) { mal.push(file.name + ` (más de ${Nube.MAX_MB} MB)`); continue; }
    UI.matSubiendo = file.name; UI.keepScroll = true; render();
    try { const r = await ARCH.assets.upload(file.type ? file : new Blob([file], { type: tipo }));
      a.archivos.push({ id: uid(), nombre: file.name.replace(/\.[^.]+$/, '') || file.name, tipo, assetId: r.id, size: r.sizeBytes || file.size, carpeta: cid, fecha: todayStr() }); ok++; touch('materiales');
    } catch (e) { mal.push(file.name + (e?.code === 'too_large' ? ' (demasiado grande)' : /quota/.test(e?.code || '') ? ' (sin espacio)' : '')); }
  }
  UI.matSubiendo = null; UI.keepScroll = true; render();
  if (mal.length) modal(`<h2>${ok ? `Subidos ${ok}; algunos no se han podido subir` : 'No se han podido subir'}</h2><ul class="small">${mal.map(m => `<li>${esc(m)}</li>`).join('')}</ul><p class="small muted">Se admiten PDF, imágenes, vídeo, texto y documentos de Office de hasta ${Nube.MAX_MB} MB.</p><div class="row"><button class="btn primary" data-a="close">Entendido</button></div>`);
  else if (ok) toast(ok === 1 ? 'Archivo subido' : ok + ' archivos subidos');
}
const matRe = () => { UI.keepScroll = true; render(); };
const matBorrarArchivo = f => { if (f?.assetId && ARCH.assets) ARCH.assets.delete(f.assetId).catch(() => {}); };
Object.assign(A, {
  matasig(el) { UI.matAsig = el.dataset.id; UI.matCarpeta = null; UI.matForm = null; UI.matRen = null; UI.confirm = null; render(); },
  matnueva() { matNuevaModal(); },
  matnuevaok() { const k = $('#mat-as').value; const nm = $('#mat-an').value.trim() || (k ? ASIG[k].nombre : ''); if (!nm) { toast('Elige la asignatura o escribe su nombre'); $('#mat-an').focus(); return; }
    const a = { id: uid(), nombre: nm, asig: k || '', carpetas: $('#mat-ac').checked ? MAT_CARPETAS.map(n => ({ id: uid(), nombre: n, parent: null })) : [], archivos: [] };
    matDe().push(a); touch('materiales'); UI.matAsig = a.id; UI.matCarpeta = null; closeModal(); render(); },
  matcd(el) { UI.matCarpeta = el.dataset.id || null; UI.matForm = null; UI.matRen = null; UI.confirm = null; matRe(); },
  matsubir() { $('#matup').click(); },
  matcarpeta() { UI.matForm = 'carpeta'; matRe(); setTimeout(() => $('#mat-nc')?.focus(), 0); },
  matenlace() { UI.matForm = 'enlace'; matRe(); setTimeout(() => $('#mat-en')?.focus(), 0); },
  matformx() { UI.matForm = null; matRe(); },
  matcarpetaok() { const n = $('#mat-nc').value.trim(); if (!n) { $('#mat-nc').focus(); return; } matA().carpetas.push({ id: uid(), nombre: n, parent: UI.matCarpeta || null }); touch('materiales'); UI.matForm = null; matRe(); },
  matenlaceok() { let u = $('#mat-eu').value.trim(); if (!u) { $('#mat-eu').focus(); return; } if (!/^https?:\/\//i.test(u)) u = 'https://' + u; const n = $('#mat-en').value.trim() || u.replace(/^https?:\/\//i, '').slice(0, 60);
    matA().archivos.push({ id: uid(), nombre: n, tipo: 'enlace', url: u, carpeta: UI.matCarpeta || null, fecha: todayStr() }); touch('materiales'); UI.matForm = null; matRe(); },
  matren(el) { UI.matRen = el.dataset.id; matRe(); setTimeout(() => { const i = document.querySelector('[data-f="matcren"],[data-f="matfren"]'); if (i) { i.focus(); i.select(); } }, 0); },
  matrenok() { UI.matRen = null; matRe(); },
  matdelf(el) { const a = matA(); matBorrarArchivo(a.archivos.find(x => x.id === el.dataset.id)); a.archivos = a.archivos.filter(x => x.id !== el.dataset.id); touch('materiales'); UI.confirm = null; matRe(); toast('Borrado'); },
  matdelc(el) { const a = matA(); const ids = matSub(a, el.dataset.id); a.archivos.filter(f => ids.has(f.carpeta)).forEach(matBorrarArchivo);
    a.archivos = a.archivos.filter(f => !ids.has(f.carpeta)); a.carpetas = a.carpetas.filter(c => !ids.has(c.id)); touch('materiales'); UI.confirm = null; matRe(); toast('Carpeta borrada'); },
  matdela() { const a = matA(); a.archivos.forEach(matBorrarArchivo); librosMat(a.id).forEach(b => { delete S.libros[b.id]; Save.dirty.delete('libro_' + b.id); Store.remove('libro_' + b.id).catch(() => {}); }); S.materiales.asigs = matDe().filter(x => x !== a); touch('materiales'); UI.matAsig = null; UI.matCarpeta = null; UI.confirm = null; render(); toast('Asignatura borrada'); },
  matmas(el) { matMasModal(el.dataset.id); },
  matmasdel(el) { matMasModal(el.dataset.id, true); },
  matmasdelok(el) { closeModal(); A.matdelf(el); },
  matmasren(el) { closeModal(); A.matren(el); },
  matmov(el) { const L = matDe(); const i = L.indexOf(matA()); const j = i + Number(el.dataset.d); if (j < 0 || j >= L.length) return; [L[i], L[j]] = [L[j], L[i]]; touch('materiales'); matRe(); },
});
Object.assign(Fd, {
  matnombre(el) { const a = matA(); a.nombre = el.value; touch('materiales'); const t = document.querySelector(`[data-a="matasig"][data-id="${a.id}"]`); if (t) t.textContent = el.value || 'Sin nombre'; },
  matasigcurr(el) { matA().asig = el.value; touch('materiales'); },
  matcren(el) { const c = matA().carpetas.find(x => x.id === el.dataset.id); if (c) { c.nombre = el.value; touch('materiales'); } },
  matfren(el) { const f = matA().archivos.find(x => x.id === el.dataset.id); if (f) { f.nombre = el.value; touch('materiales'); } },
  matmover(el) { const f = matA().archivos.find(x => x.id === el.dataset.id); if (f) { f.carpeta = el.value || null; touch('materiales'); matRe(); toast('Movido'); } },
});
$('#matup').addEventListener('change', e => { const fs = [...e.target.files]; e.target.value = ''; if (fs.length) matSubir(fs); });
document.addEventListener('dragover', e => { const z = e.target.closest?.('[data-drop="mat"]'); if (z && e.dataTransfer?.types?.includes('Files')) { e.preventDefault(); z.classList.add('over'); } });
document.addEventListener('dragleave', e => { e.target.closest?.('[data-drop="mat"]')?.classList.remove('over'); });
document.addEventListener('drop', e => { const z = e.target.closest?.('[data-drop="mat"]'); if (!z) return; e.preventDefault(); z.classList.remove('over'); const fs = [...(e.dataTransfer?.files || [])]; if (fs.length) matSubir(fs); });

