'use strict';
function avisoInstalarIOS() {
  const ios = /iP(hone|ad|od)/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const inst = window.matchMedia('(display-mode: standalone)').matches || navigator.standalone;
  let visto = false; try { visto = localStorage.getItem('bs:ios-inst') === '1'; } catch (e) {}
  if (!ios || inst || visto) return;
  const b = $('#ios-inst'); b.hidden = false;
  b.innerHTML = `<div class="row" style="flex-wrap:nowrap;align-items:flex-start"><span class="grow">Para usarla como una app: pulsa <b>Compartir</b> <span aria-hidden="true">⬆︎</span> y luego <b>Añadir a pantalla de inicio</b>. Así se abre a pantalla completa y Safari no borra la copia del dispositivo.</span><button class="iconbtn" aria-label="Cerrar aviso" id="ios-inst-x">✕</button></div>`;
  $('#ios-inst-x').onclick = () => { b.hidden = true; try { localStorage.setItem('bs:ios-inst', '1'); } catch (e) {} };
}
(async function start() {
  render.loading = true;
  Nube.alEstado = (t, err) => setSaveState(t, err);
  Nube.alPrefs = () => { if (UI.view === 'ajustes' && !$('#modal').innerHTML) { UI.keepScroll = true; render(); } };
  Nube.antesDeSalir = async () => { clearTimeout(Save.timer); if (Save.dirty.size) await flush(); };
  await Store.init(); ARCH.assets = dhEnvolverArchivos(Nube.archivos);
  try { hydrate(await Store.loadAll()); try { (S.agenda || []).forEach(vincularExamenAgenda); Object.entries(S.planes).forEach(([k, p]) => { const ex = (p?.eventos || []).find(e => e.tipo === 'examen'); if (ex && !(p.titulo || '').trim()) { p.titulo = ex.titulo || 'Examen'; touchPlan(k); } }); migrarPendientes(); } catch (e) {} } catch (e) { showBanner('No se han podido cargar tus datos. Recarga la página; si sigue igual, importa tu última copia.'); }
  if (Store.mode === 'local') showBanner('Estás usando la app sin cuenta: los datos se guardan solo en este navegador. Exporta copias desde Ajustes o entra con tu cuenta desde el botón ⌂ de arriba.');
  I18N.on(() => { idiomaFechas(); UI.keepScroll = true; render(); if ($('#modal').innerHTML) closeModal(); });
  if ((S.config.idiomaApp === 'va' || S.config.idiomaApp === 'es') && S.config.idiomaApp !== I18N.lang) I18N.set(S.config.idiomaApp);
  Nube.refrescarEstado();
  render(); avisoInstalarIOS();
  setTimeout(() => { try { currPrecargar(); } catch (e) {} }, 1500);
  try { escucharCambios(); } catch (e) {}
  setInterval(() => { if (UI.view === 'sesion' && UI.sesTab === 'directo' && !$('#modal').innerHTML && !document.activeElement?.matches('input,textarea')) { UI.keepScroll = true; render(); } }, 60000);
})();
