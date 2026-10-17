'use strict';
/* =========================================================================
   IDIOMA DE LA APP (castellano / valenciano)
   El código escribe los textos en castellano. Si el docente elige valenciano en
   Ajustes, aquí se traducen al pintarse en pantalla, con el diccionario de
   js/00-va.js (texto exacto o patrón con huecos {0}, {1}…).
   - Solo cambia lo que se ve: los datos del docente no se tocan nunca.
   - No se traducen los campos de texto, lo editable, [translate="no"] ni las
     zonas con atributo lang (material para el alumnado en el idioma del grupo),
     salvo lo marcado con data-tr dentro de ellas (botones de la app).
   - También se traducen alert / confirm / prompt y, con I18N.t(), los textos
     que van a archivos (Word, Excel).
   ========================================================================= */
const I18N = (() => {
  const KEY = 'bs:idioma';
  let lang = 'es';
  try { if (localStorage.getItem(KEY) === 'va') lang = 'va'; } catch (e) {}
  const ATTRS = ['title', 'placeholder', 'aria-label', 'alt'];
  const SALTA = new Set(['SCRIPT', 'STYLE', 'TEXTAREA', 'INPUT', 'NOSCRIPT', 'svg']);
  const exact = new Map(), idx = new Map(), cache = new Map(), pegados = [];
  const TXT = new WeakMap(), ATR = new WeakMap(), oyentes = [];
  let listo = false;
  const norm = s => String(s).replace(/[\s ]+/g, ' ').trim();
  const reEsc = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const LETRA = /\p{L}/u;

  function preparar() {
    if (listo) return; listo = true;
    const D = self.I18N_VA || {};
    for (const k in D) {
      const v = D[k]; if (typeof v !== 'string') continue;
      const kn = norm(k);
      if (!/\{\d+\}/.test(kn)) { exact.set(kn, v); continue; }
      const partes = kn.split(/(\{\d+\})/).filter(p => p !== '');
      let re = '^', lit = 0; const orden = [];
      partes.forEach((p, i) => {
        const m = p.match(/^\{(\d+)\}$/);
        if (m) { orden.push(+m[1]); re += '([\\s\\S]*?)'; return; }
        lit += (p.match(/\p{L}/gu) || []).length;
        let s = reEsc(p).replace(/ /g, '\\s+');
        if (i > 0) s = s.replace(/^\\s\+/, '\\s*');
        if (i < partes.length - 1) s = s.replace(/\\s\+$/, '\\s*');
        re += s;
      });
      const pal = (kn.replace(/\{\d+\}/g, ' ').toLowerCase().match(/\p{L}{2,}/gu) || []);
      if (lit < 3 || !pal.length) continue; // demasiado genérico
      /* palabra ancla: una que no vaya pegada a un hueco («instrumento{1}» cambia en plural) */
      const libres = (kn.replace(/\p{L}*\{\d+\}\p{L}*/gu, ' ').toLowerCase().match(/\p{L}{2,}/gu) || []);
      const p = { re: new RegExp(re + '$', 'u'), v, orden, lit };
      if (!libres.length) { pegados.push(p); continue; }
      const ancla = libres.sort((a, b) => b.length - a.length)[0];
      if (!idx.has(ancla)) idx.set(ancla, []); idx.get(ancla).push(p);
    }
    idx.forEach(l => l.sort((a, b) => b.lit - a.lit));
  }

  /* de + vocal → d' (d'octubre, d'avaluació) */
  const apos = s => s.replace(/(^|[\s(«"])([Dd])e ([aeiouàèéíòóúAEIOUÀÈÉÍÒÓÚ]|h[aeiouàèéíòóú])/g, (m, a, d, c) => `${a}${d}'${c}`);

  function patron(s, prof) {
    if (prof > 2) return null;
    const pal = s.toLowerCase().match(/\p{L}{2,}/gu); if (!pal) return null;
    const cand = []; const vistos = new Set();
    for (const w of pal) { const l = idx.get(w); if (l && !vistos.has(w)) { vistos.add(w); cand.push(...l); } }
    cand.push(...pegados);
    if (!cand.length) return null;
    cand.sort((a, b) => b.lit - a.lit);
    for (const p of cand) {
      const m = s.match(p.re); if (!m) continue;
      /* los huecos se traducen solo si son un texto conocido (exacto); el apóstrofo (de → d') solo toca la plantilla */
      const trozos = p.v.split(/(\{\d+\})/); let out = '';
      trozos.forEach((tz, k) => {
        const mm = tz.match(/^\{(\d+)\}$/);
        if (!mm) { out += apos(tz); return; }
        const j = p.orden.indexOf(+mm[1]); if (j < 0) return;
        const c = norm(m[j + 1] ?? ''); if (!c) return;
        const nm = c.match(/^([\d.,\/]+\s+)(.+)$/); const t = LETRA.test(c) ? (ex(c) ?? (nm && ex(nm[2]) !== undefined ? nm[1] + ex(nm[2]) : c)) : c;
        if (/(^|[\s(])[Dd]e $/.test(out) && /^([aeiouàèéíòóúAEIOUÀÈÉÍÒÓÚ]|h[aeiouàèéíòóú])/.test(t) && !/^\d/.test(t)) out = out.replace(/([Dd])e $/, "$1'");
        out += t;
      });
      return norm(out);
    }
    return null;
  }
  /* exacto, y si no, probando con la primera letra en mayúscula o minúscula («ganchos» ↔ «Ganchos») */
  const may = s => s.charAt(0).toUpperCase() + s.slice(1), min = s => s.charAt(0).toLowerCase() + s.slice(1);
  function ex(s) {
    let r = exact.get(s); if (r !== undefined) return r;
    const c0 = s.charAt(0);
    if (c0 !== c0.toUpperCase()) { r = exact.get(may(s)); if (r !== undefined) return min(r); }
    else if (c0 !== c0.toLowerCase()) { r = exact.get(min(s)); if (r !== undefined) return may(r); }
    return undefined;
  }
  /* «Avisos:», «(Ejemplo)», «¿Borrar?», «3 ganchos», «1. Datos»: se traduce el centro y se dejan signos y números */
  function signos(s, prof) {
    const m = s.match(/^([\s\d(¿¡«"'“‘\-–—•·›‹+*\/.,%\p{So}\p{Sm}\p{Extended_Pictographic}\uFE0F]*)(.*?)([\s)?!.,:;»"'”’…\-–—•·›‹*\p{So}\p{Sm}\p{Extended_Pictographic}\uFE0F]*)$/u);
    if (!m || !m[2] || (m[1] === '' && m[3] === '')) return null;
    const c = norm(m[2]); const t = ex(c) ?? patron(c, prof);
    return t == null ? null : m[1] + t + m[3];
  }
  /* un trozo suelto: exacto, patrón, signos o «a: b» */
  function trozo(x, prof) { const c = norm(x); return c && LETRA.test(c) ? (ex(c) ?? patron(c, prof) ?? signos(c, prof) ?? dosPuntos(c, prof)) : null; }
  /* «1.ª evaluación: faltan 3 días…»: cada lado por separado */
  function dosPuntos(s, prof) {
    const i = s.indexOf(': '); if (i < 1) return null;
    const a = s.slice(0, i), b = s.slice(i + 2);
    const una = x => { const c = norm(x); return c && LETRA.test(c) ? (ex(c) ?? patron(c, prof) ?? signos(c, prof)) : null; };
    const ta = una(a), tb = una(b);
    return ta != null || tb != null ? (ta ?? a) + ': ' + (tb ?? b) : null;
  }
  function trad(s, prof = 0) {
    if (!s) return null;
    if (prof === 0 && cache.has(s)) return cache.get(s);
    let r = ex(s);
    if (r === undefined) {
      r = null;
      if (s.includes(' · ')) {
        const ps = s.split(' · '); let alguno = false;
        const out = ps.map(p => { const t = trozo(p, prof); if (t != null) alguno = true; return t ?? p; });
        if (alguno) r = out.join(' · ');
      }
      if (r == null) r = patron(s, prof) ?? signos(s, prof) ?? dosPuntos(s, prof);
    }
    if (prof === 0) { if (cache.size > 20000) cache.clear(); cache.set(s, r); }
    return r;
  }
  /* texto suelto (una o varias líneas) → traducido; si no hay traducción, igual */
  function t(s) {
    if (lang !== 'va' || s == null) return s;
    preparar();
    return String(s).split('\n').map(l => { const c = norm(l); if (!c || !LETRA.test(c)) return l; const r = trad(c); return r == null ? l : l.match(/^\s*/)[0] + r + l.match(/\s*$/)[0]; }).join('\n');
  }

  /* ---- DOM ---- */
  function saltaEl(e) {
    if (SALTA.has(e.tagName) || e.tagName === 'svg') return true;
    if (e.getAttribute('translate') === 'no') return true;
    const ce = e.getAttribute('contenteditable'); if (ce === '' || ce === 'true' || ce === 'plaintext-only') return true;
    if (e.hasAttribute('data-tr')) return false;
    if (e !== document.documentElement && e.hasAttribute('lang')) return 'lang';
    return false;
  }
  /* ¿está el nodo dentro de una zona que no se traduce? */
  function dentroSalto(el) {
    for (let e = el; e && e.nodeType === 1 && e !== document.documentElement; e = e.parentElement) {
      if (e.hasAttribute('data-tr')) return false;
      const s = saltaEl(e); if (s) return true;
    }
    return false;
  }
  /* atributos: los campos de texto sí (su contenido no) */
  function attrSalto(el) { return (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') ? dentroSalto(el.parentElement) : dentroSalto(el); }
  function trNodo(n) {
    const v = n.nodeValue; if (!v || !LETRA.test(v)) return;
    const rec = TXT.get(n); if (rec && rec.t === v) return;
    const s = norm(v); const r = trad(s); if (r == null || r === s) return;
    const nv = v.match(/^\s*/)[0] + r + v.match(/\s*$/)[0];
    TXT.set(n, { o: v, t: nv }); n.nodeValue = nv;
  }
  function trAttr(el, a) {
    const v = el.getAttribute(a); if (!v || !LETRA.test(v)) return;
    let m = ATR.get(el); const rec = m && m[a]; if (rec && rec.t === v) return;
    const s = norm(v); const r = trad(s); if (r == null || r === s) return;
    if (!m) { m = {}; ATR.set(el, m); } m[a] = { o: v, t: r }; el.setAttribute(a, r);
  }
  function trAttrs(el) { for (const a of ATTRS) if (el.hasAttribute(a)) trAttr(el, a); }
  function recorrer(root) {
    if (root.nodeType === 3) { trNodo(root); return; }
    if (root.nodeType !== 1 && root.nodeType !== 11) return;
    if (root.nodeType === 1) trAttrs(root);
    const w = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT, {
      acceptNode(n) {
        if (n.nodeType === 3) return NodeFilter.FILTER_ACCEPT;
        const s = saltaEl(n);
        if (s === true && (n.tagName === 'INPUT' || n.tagName === 'TEXTAREA')) trAttrs(n);
        if (s === 'lang') { if (n.querySelector('[data-tr]')) { n.querySelectorAll('[data-tr]').forEach(x => recorrer(x)); } return NodeFilter.FILTER_REJECT; }
        return s ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT;
      }
    });
    let n; while ((n = w.nextNode())) { if (n.nodeType === 3) trNodo(n); else trAttrs(n); }
  }
  function revertir(root) {
    const w = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT);
    let n = root;
    do {
      if (n.nodeType === 3) { const r = TXT.get(n); if (r && n.nodeValue === r.t) n.nodeValue = r.o; TXT.delete(n); }
      else if (n.nodeType === 1) { const m = ATR.get(n); if (m) { for (const a in m) if (n.getAttribute(a) === m[a].t) n.setAttribute(a, m[a].o); ATR.delete(n); } }
    } while ((n = w.nextNode()));
  }
  const obs = new MutationObserver(muts => {
    if (lang !== 'va') return;
    for (const m of muts) {
      if (m.type === 'childList') {
        m.addedNodes.forEach(n => {
          if (n.nodeType === 3) { if (n.parentElement && !dentroSalto(n.parentElement)) trNodo(n); }
          else if (n.nodeType === 1) { if (!dentroSalto(n)) recorrer(n); else if ((n.tagName === 'INPUT' || n.tagName === 'TEXTAREA') && !dentroSalto(n.parentElement)) trAttrs(n); else if (n.querySelector?.('[data-tr]')) n.querySelectorAll('[data-tr]').forEach(x => recorrer(x)); }
        });
      } else if (m.type === 'characterData') { const p = m.target.parentElement; if (p && !dentroSalto(p)) trNodo(m.target); }
      else if (m.type === 'attributes') { if (!attrSalto(m.target)) trAttr(m.target, m.attributeName); }
    }
  });
  obs.observe(document.documentElement, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ATTRS });

  /* ventanas del navegador */
  ['alert', 'confirm', 'prompt'].forEach(f => { const o = window[f]; if (!o) return; window[f] = function (msg, ...r) { return o.call(window, t(msg), ...r); }; });

  function marcarHtml() { document.documentElement.lang = lang === 'va' ? 'ca-ES-valencia' : 'es'; }
  marcarHtml();
  if (lang === 'va') preparar();

  return {
    get lang() { return lang; },
    locale: () => lang === 'va' ? 'ca-ES' : 'es-ES',
    t,
    /* HTML en texto (para exportar) → traducido */
    html(s) { if (lang !== 'va') return s; preparar(); const tp = document.createElement('template'); tp.innerHTML = s; recorrer(tp.content); return tp.innerHTML; },
    on(fn) { oyentes.push(fn); },
    set(lg) {
      lg = lg === 'va' ? 'va' : 'es'; if (lg === lang) return;
      lang = lg; try { localStorage.setItem(KEY, lg); } catch (e) {}
      marcarHtml();
      if (lg === 'va') { preparar(); recorrer(document.body); } else revertir(document.body);
      oyentes.forEach(fn => { try { fn(lg); } catch (e) { console.error(e); } });
    },
    /* para pruebas: textos visibles que no se han traducido */
    pendientes(root = document.body) {
      const out = new Set(); if (lang !== 'va') return [];
      const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
      let n; while ((n = w.nextNode())) { const v = norm(n.nodeValue); if (!v || !LETRA.test(v) || !n.parentElement || dentroSalto(n.parentElement)) continue; if (!TXT.get(n) && trad(v) == null) out.add(v); }
      root.querySelectorAll?.('[title],[placeholder],[aria-label],[alt]').forEach(el => { if (attrSalto(el)) return; ATTRS.forEach(a => { const v = el.getAttribute(a); if (v && LETRA.test(v) && !(ATR.get(el)?.[a]) && trad(norm(v)) == null) out.add('@' + a + ': ' + norm(v)); }); });
      return [...out];
    }
  };
})();
