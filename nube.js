/* =====================================================================
   BIOSOFÍA · capa de nube
   - Inicio de sesión con Google (Google Identity Services) o Microsoft
     (OAuth 2.0 con PKCE, sin servidor propio).
   - Los datos se guardan primero en el dispositivo (IndexedDB) y se
     sincronizan con la carpeta de la app en el Drive o el OneDrive del
     docente. Funciona sin conexión y sube los cambios al volver.
   - Archivos (Materiales, sesiones, libro) en la subcarpeta «archivos».
   No hay servidor de BIOSOFÍA: el navegador habla directamente con
   Google o Microsoft.
   ===================================================================== */
'use strict';
(function () {
  const CFG = window.BIOSOFIA_CONFIG || {};
  const NOMBRE = CFG.nombre || 'BIOSOFÍA';
  const MAX_MB = CFG.maxArchivoMB || 100;
  const SES_K = 'bs:sesion', TOK_K = 'bs:token';
  const BLOBS = 'biosofia-blobs';
  const now = () => Date.now();
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const b64url = buf => btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  const rnd = n => b64url(crypto.getRandomValues(new Uint8Array(n)));
  const lsGet = k => { try { return JSON.parse(localStorage.getItem(k)); } catch (e) { return null; } };
  const lsSet = (k, v) => { try { v == null ? localStorage.removeItem(k) : localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} };
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  class NubeError extends Error { constructor(code, msg, status) { super(msg || code); this.code = code; this.status = status; } }
  const blobKey = id => new URL('_blob/' + encodeURIComponent(id), location.href).href;

  /* ---------------- almacén local (IndexedDB) ---------------- */
  const IDB = {
    db: null, name: null, mem: null,
    abrir(name) {
      this.name = name;
      return new Promise(res => {
        let r; try { r = indexedDB.open(name, 1); } catch (e) { this.mem = new Map(); this.memMeta = new Map(); return res(); }
        r.onupgradeneeded = () => { const d = r.result; d.createObjectStore('docs', { keyPath: 'id' }); d.createObjectStore('meta'); };
        r.onsuccess = () => { this.db = r.result; res(); };
        r.onerror = () => { this.mem = new Map(); this.memMeta = new Map(); res(); };
      });
    },
    req(store, mode, f) {
      return new Promise((res, rej) => {
        const t = this.db.transaction(store, mode); const r = f(t.objectStore(store));
        t.oncomplete = () => res(r ? r.result : undefined); t.onerror = t.onabort = () => rej(t.error || new Error('idb'));
      });
    },
    async all() { return this.mem ? [...this.mem.values()].map(clon) : this.req('docs', 'readonly', s => s.getAll()); },
    async get(id) { return this.mem ? clon(this.mem.get(id)) : this.req('docs', 'readonly', s => s.get(id)); },
    async put(rec) { if (this.mem) { this.mem.set(rec.id, clon(rec)); return; } return this.req('docs', 'readwrite', s => s.put(rec)); },
    async del(id) { if (this.mem) { this.mem.delete(id); return; } return this.req('docs', 'readwrite', s => s.delete(id)); },
    async meta(k) { return this.mem ? this.memMeta.get(k) : this.req('meta', 'readonly', s => s.get(k)); },
    async setMeta(k, v) { if (this.mem) { this.memMeta.set(k, v); return; } return this.req('meta', 'readwrite', s => s.put(v, k)); },
    borrarBase(name) { try { this.db?.close(); } catch (e) {} return new Promise(res => { try { const r = indexedDB.deleteDatabase(name); r.onsuccess = r.onerror = r.onblocked = () => res(); } catch (e) { res(); } }); }
  };
  const clon = x => x == null ? x : JSON.parse(JSON.stringify(x));
  const nombreBase = s => !s || s.prov === 'local' ? 'biosofia-local' : 'biosofia-' + s.prov + '-' + s.sub;

  /* ---------------- sesión y token ---------------- */
  const Auth = {
    sesion: lsGet(SES_K), tok: lsGet(TOK_K), reconectar: false,
    guardarSesion(s) { this.sesion = s; lsSet(SES_K, s); },
    guardarTok(t) { this.tok = t; lsSet(TOK_K, t); if (this.reconectar) { this.reconectar = false; UI.barra(); } },
    async token() {
      if (this.tok?.access && this.tok.exp - 60000 > now()) return this.tok.access;
      const s = this.sesion; if (!s || s.prov === 'local') throw new NubeError('auth');
      if (s.prov === 'ms' && this.tok?.refresh) {
        try { await MS.refrescar(); return this.tok.access; } catch (e) { if (e.code === 'offline') throw e; }
      }
      this.pedirReconexion(); throw new NubeError('auth', 'Hay que volver a conectar la cuenta');
    },
    invalidar() { if (this.tok) { this.tok.exp = 0; lsSet(TOK_K, this.tok); } },
    pedirReconexion() { if (!this.reconectar) { this.reconectar = true; UI.barra(); Registro.add('caducado', 'El permiso de Google caducó y no se pudo renovar solo: se mostró «Reconectar»'); } }
  };

  /* ---------------- registro de inicios de sesión (para encontrar cierres de sesión inesperados) ----------------
     Se guarda en el dispositivo (sobrevive a «Cerrar sesión») y una copia por dispositivo en la nube
     («_registro_<dispositivo>»), para poder verlo desde cualquier sitio. */
  const Registro = {
    K: 'bs:registro', DK: 'bs:dispositivo', _t: null,
    disp() { let d = lsGet(this.DK); const nuevo = !d; if (!d) { d = rnd(9).replace(/[^a-zA-Z0-9]/g, 'x'); lsSet(this.DK, d); } return { id: d, nuevo }; },
    desc() {
      const ua = navigator.userAgent;
      const sis = /iPhone/.test(ua) ? 'iPhone' : /iPad/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1) ? 'iPad' : /Android/.test(ua) ? 'Android' : /Mac/.test(ua) ? 'Mac' : /Windows/.test(ua) ? 'Windows' : /CrOS|Linux/.test(ua) ? 'Linux' : 'Otro';
      const nav = /EdgA?\/|EdgiOS/.test(ua) ? 'Edge' : /SamsungBrowser/.test(ua) ? 'Samsung Internet' : /CriOS|Chrome\//.test(ua) ? 'Chrome' : /FxiOS|Firefox\//.test(ua) ? 'Firefox' : /Safari\//.test(ua) ? 'Safari' : 'navegador';
      const inst = window.matchMedia?.('(display-mode: standalone)').matches || navigator.standalone;
      return `${sis} · ${inst ? 'app instalada' : nav}`;
    },
    lista() { return lsGet(this.K) || []; },
    add(tipo, texto, extra = {}) {
      const L = this.lista(); L.push(Object.assign({ t: new Date().toISOString(), tipo, texto, cuenta: Auth.sesion?.email || '', disp: this.desc() }, extra));
      while (L.length > 300) L.shift(); lsSet(this.K, L); this.subir();
    },
    subir() {
      clearTimeout(this._t);
      this._t = setTimeout(() => {
        if (!Sync.drv || !Auth.sesion || Auth.sesion.prov === 'local') return;
        const d = this.disp().id; const ev = this.lista().filter(e => !e.cuenta || e.cuenta === Auth.sesion.email).slice(-200);
        Nube.guardar('_registro_' + d, { id: d, disp: this.desc(), eventos: ev }).catch(() => {});
      }, 1500);
    }
  };

  /* llamada a una API con el token y reintentos */
  async function api(url, opt = {}, intento = 0) {
    const token = await Auth.token();
    let r;
    try { r = await fetch(url, Object.assign({}, opt, { headers: Object.assign({}, opt.headers, { Authorization: 'Bearer ' + token }) })); }
    catch (e) { throw new NubeError('offline', 'Sin conexión'); }
    if (r.status === 401 && intento === 0) { Auth.invalidar(); return api(url, opt, 1); }
    let txt = '';
    if (!r.ok) { try { txt = await r.text(); } catch (e) {} }
    const limite = r.status === 429 || r.status >= 500 || (r.status === 403 && /rateLimit|userRateLimit/i.test(txt));
    if (limite && intento < 5) { const ra = +r.headers.get('Retry-After') || 0; await sleep(ra ? ra * 1000 : 700 * 2 ** intento + Math.random() * 300); return api(url, opt, intento + 1); }
    if (!r.ok) {
      const code = r.status === 404 ? 'not_found' : r.status === 401 ? 'auth' : (r.status === 507 || /quota|storageQuota/i.test(txt)) ? 'quota' : r.status === 403 ? 'forbidden' : 'http';
      if (code === 'auth') Auth.pedirReconexion();
      throw new NubeError(code, `HTTP ${r.status} ${txt.slice(0, 300)}`, r.status);
    }
    return r;
  }

  /* ---------------- Google ---------------- */
  const G = {
    scope: 'openid email profile https://www.googleapis.com/auth/drive.file',
    _gis: null,
    cargar() {
      if (window.google?.accounts?.oauth2) return Promise.resolve();
      if (!this._gis) this._gis = new Promise((res, rej) => {
        const s = document.createElement('script'); s.src = 'https://accounts.google.com/gsi/client'; s.async = true;
        s.onload = () => res(); s.onerror = () => { this._gis = null; rej(new NubeError('offline', 'No se ha podido cargar el inicio de sesión de Google')); };
        document.head.appendChild(s);
      });
      return this._gis;
    },
    async pedirToken(elegirCuenta, hint) {
      await this.cargar();
      return new Promise((res, rej) => {
        const tc = google.accounts.oauth2.initTokenClient({
          client_id: CFG.googleClientId, scope: this.scope, prompt: elegirCuenta ? 'select_account' : '', login_hint: hint || undefined,
          callback: r => r.error ? rej(new NubeError('auth', r.error_description || r.error)) : res(r),
          error_callback: e => rej(new NubeError(e?.type === 'popup_closed' ? 'cancelado' : e?.type === 'popup_failed_to_open' ? 'popup' : 'auth', e?.message || e?.type))
        });
        tc.requestAccessToken();
      });
    },
    async guardar(r) {
      if (!google.accounts.oauth2.hasGrantedAllScopes(r, 'https://www.googleapis.com/auth/drive.file'))
        throw new NubeError('permiso', `Hay que marcar la casilla que deja a ${NOMBRE} guardar sus archivos en tu Drive.`);
      Auth.guardarTok({ access: r.access_token, exp: now() + (+r.expires_in || 3599) * 1000 });
    },
    async entrar() {
      await this.guardar(await this.pedirToken(true));
      const u = await (await api('https://www.googleapis.com/oauth2/v3/userinfo')).json();
      return { prov: 'google', sub: u.sub, email: u.email || '', nombre: u.name || u.email || 'Google' };
    },
    async reconectar() { await this.guardar(await this.pedirToken(false, Auth.sesion?.email)); },

    /* Renovación automática: Google da permisos de 1 hora y solo deja pedir otro desde un toque del usuario
       (si no, el navegador bloquea la ventana). Se prepara el cliente de antemano y, en el primer toque
       después de que caduque (o 5 minutos antes), se pide uno nuevo: la ventanita de Google aparece un
       instante y se cierra sola. */
    auto: null, ocupado: false, ultimoIntento: 0,
    async prepararAuto() {
      try { await this.cargar(); } catch (e) { return; }
      this.auto = google.accounts.oauth2.initTokenClient({
        client_id: CFG.googleClientId, scope: this.scope, prompt: '', login_hint: Auth.sesion?.email || undefined,
        callback: async r => {
          this.ocupado = false; const seg = Math.round((now() - this.ultimoIntento) / 100) / 10;
          if (r.error) { Registro.add('renovar-fallo', 'No se pudo renovar el permiso de Google', { error: r.error, seg }); Auth.pedirReconexion(); return; }
          try { await this.guardar(r); Auth.reconectar = false; UI.barra(); Sync.programar(200); Registro.add('renovar', 'Permiso de Google renovado al tocar la pantalla', { seg }); }
          catch (e) { Registro.add('renovar-fallo', 'Permiso renovado sin acceso a Drive', { seg }); Auth.pedirReconexion(); }
        },
        error_callback: e => { this.ocupado = false; Registro.add('renovar-fallo', 'Se cerró o bloqueó la ventana de Google al renovar', { error: e?.type || '', seg: Math.round((now() - this.ultimoIntento) / 100) / 10 }); Auth.pedirReconexion(); }
      });
    },
    necesita() { return !(Auth.tok?.access && Auth.tok.exp - 5 * 60000 > now()); },
    renovarEnToque() {
      if (!this.auto || this.ocupado || !navigator.onLine || !this.necesita()) return false;
      if (now() - this.ultimoIntento < 20000) return false;
      this.ocupado = true; this.ultimoIntento = now();
      try { this.auto.requestAccessToken(); } catch (e) { this.ocupado = false; return false; }
      return true;
    }
  };

  /* ---------------- Microsoft (PKCE) ---------------- */
  const MS = {
    scope: 'openid profile email offline_access User.Read Files.ReadWrite.AppFolder',
    base() { return 'https://login.microsoftonline.com/' + (CFG.microsoftTenant || 'common') + '/oauth2/v2.0/'; },
    redirect() { return location.origin + location.pathname.replace(/index\.html$/, ''); },
    async entrar(op = {}) {
      const verifier = rnd(48), state = rnd(16);
      const challenge = b64url(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier)));
      sessionStorage.setItem('bs:pkce', JSON.stringify({ verifier, state, silencioso: !!op.silencioso }));
      const p = new URLSearchParams({ client_id: CFG.microsoftClientId, response_type: 'code', redirect_uri: this.redirect(), response_mode: 'query',
        scope: this.scope, state, code_challenge: challenge, code_challenge_method: 'S256' });
      if (op.silencioso) p.set('prompt', 'none'); else p.set('prompt', 'select_account');
      if (op.hint) p.set('login_hint', op.hint);
      await UI.antesDeSalir();
      location.assign(this.base() + 'authorize?' + p);
      return new Promise(() => {});
    },
    /* al volver de la página de Microsoft */
    async volver() {
      const q = new URLSearchParams(location.search);
      if (!q.has('code') && !q.has('error')) return null;
      const pk = (() => { try { return JSON.parse(sessionStorage.getItem('bs:pkce')); } catch (e) { return null; } })();
      sessionStorage.removeItem('bs:pkce');
      history.replaceState(null, '', location.pathname + location.hash);
      if (!pk || q.get('state') !== pk.state) throw new NubeError('auth', 'La respuesta de Microsoft no coincide con la petición. Vuelve a intentarlo.');
      if (q.has('error')) {
        if (pk.silencioso) return { silencioso: true };
        throw new NubeError(q.get('error') === 'access_denied' ? 'cancelado' : 'auth', q.get('error_description') || q.get('error'));
      }
      await this.pedir({ grant_type: 'authorization_code', code: q.get('code'), redirect_uri: this.redirect(), code_verifier: pk.verifier });
      const u = await (await api('https://graph.microsoft.com/v1.0/me?$select=id,displayName,mail,userPrincipalName')).json();
      return { prov: 'ms', sub: u.id, email: u.mail || u.userPrincipalName || '', nombre: u.displayName || u.mail || 'Microsoft' };
    },
    async pedir(params) {
      const body = new URLSearchParams(Object.assign({ client_id: CFG.microsoftClientId, scope: this.scope }, params));
      let r; try { r = await fetch(this.base() + 'token', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body }); }
      catch (e) { throw new NubeError('offline', 'Sin conexión'); }
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new NubeError('auth', j.error_description || j.error || ('HTTP ' + r.status));
      Auth.guardarTok({ access: j.access_token, exp: now() + (+j.expires_in || 3599) * 1000, refresh: j.refresh_token || Auth.tok?.refresh });
    },
    _ref: null,
    refrescar() {
      if (!this._ref) this._ref = this.pedir({ grant_type: 'refresh_token', refresh_token: Auth.tok.refresh }).finally(() => { this._ref = null; });
      return this._ref;
    },
    async reconectar() {
      if (Auth.tok?.refresh) { try { await this.refrescar(); return; } catch (e) { if (e.code === 'offline') throw e; } }
      await this.entrar({ hint: Auth.sesion?.email });
    }
  };

  /* ---------------- Google Drive ---------------- */
  const GD = {
    nube: 'Google Drive', API: 'https://www.googleapis.com/drive/v3/', UP: 'https://www.googleapis.com/upload/drive/v3/', c: null,
    async carpeta(nombre, padre) {
      const q = `name='${nombre.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}' and mimeType='application/vnd.google-apps.folder' and trashed=false and '${padre}' in parents`;
      const j = await (await api(this.API + 'files?' + new URLSearchParams({ q, fields: 'files(id,name)', spaces: 'drive', orderBy: 'createdTime' }))).json();
      if (j.files?.length) return j.files[0].id;
      const n = await (await api(this.API + 'files?fields=id', { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: nombre, mimeType: 'application/vnd.google-apps.folder', parents: [padre] }) })).json();
      return n.id;
    },
    async preparar(forzar) {
      if (this.c && !forzar) return;
      if (!forzar) { const m = await IDB.meta('carpetas'); if (m?.datos) { this.c = m; return; } }
      const raiz = await this.carpeta(NOMBRE, 'root');
      this.c = { raiz, datos: await this.carpeta('datos', raiz), archivos: await this.carpeta('archivos', raiz) };
      await IDB.setMeta('carpetas', this.c);
    },
    async listar() {
      const out = []; let pageToken = '';
      do {
        const p = new URLSearchParams({ q: `'${this.c.datos}' in parents and trashed=false`, fields: 'nextPageToken,files(id,name,modifiedTime)', pageSize: '1000', spaces: 'drive' });
        if (pageToken) p.set('pageToken', pageToken);
        const j = await (await api(this.API + 'files?' + p)).json();
        (j.files || []).forEach(f => out.push({ name: f.name, ref: f.id, rev: f.modifiedTime }));
        pageToken = j.nextPageToken || '';
      } while (pageToken);
      return out;
    },
    async leer(ref) { return (await api(this.API + 'files/' + ref + '?alt=media')).json(); },
    async multipart(meta, blob, fields) {
      const b = 'bs' + rnd(12).replace(/[^a-zA-Z0-9]/g, '');
      const body = new Blob([`--${b}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(meta)}\r\n--${b}\r\nContent-Type: ${meta.mimeType}\r\n\r\n`, blob, `\r\n--${b}--`]);
      return (await api(this.UP + 'files?uploadType=multipart&fields=' + fields, { method: 'POST', headers: { 'Content-Type': 'multipart/related; boundary=' + b }, body })).json();
    },
    async conCarpeta(f) { try { return await f(); } catch (e) { if (e.code !== 'not_found') throw e; await this.preparar(true); return f(); } },
    async escribir(nombre, texto, ref) {
      const blob = new Blob([texto], { type: 'application/json' });
      if (ref) {
        try { const j = await (await api(this.UP + 'files/' + ref + '?uploadType=media&fields=id,modifiedTime', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: blob })).json(); return { ref: j.id, rev: j.modifiedTime }; }
        catch (e) { if (e.code !== 'not_found') throw e; }
      }
      const j = await this.conCarpeta(() => this.multipart({ name: nombre, parents: [this.c.datos], mimeType: 'application/json' }, blob, 'id,modifiedTime'));
      return { ref: j.id, rev: j.modifiedTime };
    },
    async borrar(ref) { try { await api(this.API + 'files/' + ref, { method: 'DELETE' }); } catch (e) { if (e.code !== 'not_found') throw e; } },
    async subir(file, nombre) {
      const tipo = file.type || 'application/octet-stream';
      return this.conCarpeta(async () => {
        const meta = { name: nombre, parents: [this.c.archivos], mimeType: tipo };
        if (file.size <= 5 * 1048576) { const j = await this.multipart(meta, file, 'id,size'); return { id: j.id, size: +j.size || file.size }; }
        const r = await api(this.UP + 'files?uploadType=resumable&fields=id,size', { method: 'POST',
          headers: { 'Content-Type': 'application/json; charset=UTF-8', 'X-Upload-Content-Type': tipo, 'X-Upload-Content-Length': String(file.size) }, body: JSON.stringify(meta) });
        const loc = r.headers.get('Location'); if (!loc) throw new NubeError('http', 'Google no ha devuelto la dirección de subida');
        const j = await (await api(loc, { method: 'PUT', headers: { 'Content-Type': tipo }, body: file })).json();
        return { id: j.id, size: +j.size || file.size };
      });
    },
    async enlace() { await this.preparar(); return 'https://drive.google.com/drive/folders/' + this.c.raiz; }
  };

  /* ---------------- OneDrive (carpeta de la app: Aplicaciones/<nombre>) ---------------- */
  const OD = {
    nube: 'OneDrive', G: 'https://graph.microsoft.com/v1.0/me/drive/', listo: false, web: null,
    async preparar(forzar) {
      if (this.listo && !forzar) return;
      if (!forzar) { const m = await IDB.meta('odListo'); if (m) { this.listo = true; this.web = m.web; return; } }
      const j = await (await api(this.G + 'special/approot?$select=id,webUrl')).json(); this.web = j.webUrl;
      for (const name of ['datos', 'archivos']) {
        try { await api(this.G + 'special/approot/children', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name, folder: {}, '@microsoft.graph.conflictBehavior': 'fail' }) }); }
        catch (e) { if (e.status !== 409) throw e; }
      }
      this.listo = true; await IDB.setMeta('odListo', { web: this.web });
    },
    async listar() {
      const out = []; let url = this.G + 'special/approot:/datos:/children?$select=id,name,eTag,lastModifiedDateTime&$top=999';
      while (url) { const j = await (await api(url)).json(); (j.value || []).forEach(f => out.push({ name: f.name, ref: f.id, rev: f.eTag || f.lastModifiedDateTime })); url = j['@odata.nextLink'] || ''; }
      return out;
    },
    /* el enlace /content redirige y el navegador no deja seguirlo con cabeceras: se usa downloadUrl */
    async descargar(ref) {
      const j = await (await api(this.G + 'items/' + ref + '?select=id,@microsoft.graph.downloadUrl')).json();
      let r; try { r = await fetch(j['@microsoft.graph.downloadUrl']); } catch (e) { throw new NubeError('offline', 'Sin conexión'); }
      if (!r.ok) throw new NubeError(r.status === 404 ? 'not_found' : 'http', 'HTTP ' + r.status, r.status);
      return r;
    },
    async leer(ref) { return (await this.descargar(ref)).json(); },
    async subirRuta(ruta, blob) {
      const enc = ruta.split('/').map(encodeURIComponent).join('/');
      const hazlo = async () => {
        if (blob.size <= 4 * 1048576) return (await api(this.G + 'special/approot:/' + enc + ':/content', { method: 'PUT', headers: { 'Content-Type': blob.type || 'application/octet-stream' }, body: blob })).json();
        const s = await (await api(this.G + 'special/approot:/' + enc + ':/createUploadSession', { method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ item: { '@microsoft.graph.conflictBehavior': 'replace' } }) })).json();
        const CH = 320 * 1024 * 12; let pos = 0, last = null;
        while (pos < blob.size) {
          const fin = Math.min(pos + CH, blob.size); let r;
          try { r = await fetch(s.uploadUrl, { method: 'PUT', headers: { 'Content-Range': `bytes ${pos}-${fin - 1}/${blob.size}` }, body: blob.slice(pos, fin) }); }
          catch (e) { throw new NubeError('offline', 'Sin conexión'); }
          if (!r.ok) throw new NubeError(r.status === 507 ? 'quota' : 'http', 'HTTP ' + r.status, r.status);
          last = r; pos = fin;
        }
        return last.json();
      };
      try { return await hazlo(); } catch (e) { if (e.code !== 'not_found') throw e; await this.preparar(true); return hazlo(); }
    },
    async escribir(nombre, texto) { const it = await this.subirRuta('datos/' + nombre, new Blob([texto], { type: 'application/json' })); return { ref: it.id, rev: it.eTag || it.lastModifiedDateTime }; },
    async borrar(ref) { try { await api(this.G + 'items/' + ref, { method: 'DELETE' }); } catch (e) { if (e.code !== 'not_found') throw e; } },
    async subir(file, nombre) { const it = await this.subirRuta('archivos/' + nombre, file); return { id: it.id, size: +it.size || file.size }; },
    async enlace() { await this.preparar(); return this.web; }
  };

  /* ---------------- preferencias (por cuenta y dispositivo) ---------------- */
  const ALUMNADO = /^(grupos|pendientes|reg_|cal_)/; // documentos con datos del alumnado
  const Prefs = {
    k: () => 'bs:prefs:' + nombreBase(Auth.sesion),
    get() { return lsGet(this.k()) || {}; },
    set(p) { lsSet(this.k(), Object.assign(this.get(), p)); },
    corporativa(email) { const d = (email || '').split('@')[1]?.toLowerCase() || ''; return (CFG.dominiosCorporativos || []).some(x => d === x || d.endsWith('.' + x)); },
    alumnadoLocal() { const p = this.get(); return p.alumnadoLocal ?? !this.corporativa(Auth.sesion?.email); },
    definida() { return this.get().alumnadoLocal !== undefined; }
  };

  /* ---------------- sincronización ---------------- */
  const encId = id => encodeURIComponent(id) + '.json';
  const decId = n => { try { return decodeURIComponent(n.replace(/\.json$/, '')); } catch (e) { return null; } };
  const Sync = {
    drv: null, timer: null, corre: null, otra: false, alCambiar: null, ultimo: null, error: null,
    soloAqui(id) { return Prefs.alumnadoLocal() && ALUMNADO.test(id); },
    programar(ms = 1500) { if (!this.drv) return; clearTimeout(this.timer); this.timer = setTimeout(() => this.ciclo(), ms); },
    async ciclo() {
      if (!this.drv) return;
      if (!navigator.onLine) { Estado.set('Sin conexión · guardado aquí'); return; }
      if (this.corre) { this.otra = true; return this.corre; }
      this.corre = (async () => {
        try {
          Estado.set('Sincronizando…');
          await this.drv.preparar(); await this.bajar(); if (await this.prefsCuenta()) { this.cambioPrefs = true; await this.bajar(); } await this.subir();
          this.ultimo = now(); this.error = null; await IDB.setMeta('ultimaSync', this.ultimo); await Estado.ok();
        } catch (e) { this.error = e; Estado.fallo(e); }
      })();
      await this.corre; this.corre = null;
      if (this.otra) { this.otra = false; this.programar(300); }
    },
    async bajar() {
      const remotos = await this.drv.listar();
      const recs = new Map((await IDB.all()).map(r => [r.id, r]));
      const sincronizados = [...recs.values()].filter(r => r.ref && !r.dirty && !r.deleted && !this.soloAqui(r.id));
      // carpeta vacía pero aquí hay datos ya subidos: se habrá borrado o movido la carpeta; se vuelven a subir en vez de borrar nada
      if (!remotos.length && sincronizados.length) {
        for (const r of sincronizados) { r.ref = null; r.rev = null; r.dirty = true; await IDB.put(r); }
        await IDB.setMeta('carpetas', null); await IDB.setMeta('odListo', null); this.drv.c = null; this.drv.listo = false; await this.drv.preparar(true);
        return;
      }
      // la preferencia de la cuenta va primero: si otro dispositivo ha pasado a «solo en el dispositivo», aquí no se borra nada del alumnado
      remotos.sort((a, b) => (b.name === '_prefs.json') - (a.name === '_prefs.json'));
      const vistos = new Set();
      for (const f of remotos) {
        const id = f.name.endsWith('.json') ? decId(f.name) : null;
        if (!id || vistos.has(id)) continue; vistos.add(id);
        if (this.soloAqui(id)) continue;
        const r = recs.get(id);
        if (r && r.rev === f.rev) { if (r.ref !== f.ref) { r.ref = f.ref; await IDB.put(r); } continue; }
        if (r && (r.dirty || r.deleted)) { r.ref = f.ref; await IDB.put(r); continue; } // mandan los cambios de este dispositivo
        let data; try { data = await this.drv.leer(f.ref); } catch (e) { if (e.code === 'not_found') continue; if (e instanceof SyntaxError) { console.warn('Documento ilegible', f.name); continue; } throw e; }
        const cur = await IDB.get(id); if (cur && (cur.dirty || cur.deleted)) continue;
        await IDB.put({ id, data, ref: f.ref, rev: f.rev, dirty: false, ver: cur?.ver || 0 });
        if (id === '_prefs' && data?.alumnado === 'local' && !Prefs.alumnadoLocal()) { Prefs.set({ alumnadoLocal: true }); this.alPrefs?.(); }
        else this.alCambiar?.(id, data);
      }
      for (const r of sincronizados) if (!vistos.has(r.id) && !this.soloAqui(r.id)) { await IDB.del(r.id); this.alCambiar?.(r.id, null); }
    },
    async subir() {
      for (const r of (await IDB.all()).filter(x => x.dirty || x.deleted)) {
        if (this.soloAqui(r.id)) continue;
        if (r.deleted) {
          if (r.ref) await this.drv.borrar(r.ref);
          const cur = await IDB.get(r.id); if (cur?.deleted && cur.ver === r.ver) await IDB.del(r.id);
          continue;
        }
        const res = await this.drv.escribir(encId(r.id), JSON.stringify(r.data), r.ref);
        const cur = await IDB.get(r.id); if (!cur) continue;
        cur.ref = res.ref; cur.rev = res.rev; if (cur.ver === r.ver) cur.dirty = false;
        await IDB.put(cur);
      }
    },
    async pendientes() { return (await IDB.all()).filter(r => (r.dirty || r.deleted) && !this.soloAqui(r.id)).length; },
    /* la opción «datos del alumnado solo en el dispositivo» es de la cuenta (documento «_prefs» en la nube):
       la primera vez se pregunta; después se aplica sola en todos los dispositivos. Devuelve true si hay que volver a bajar. */
    async prefsCuenta() {
      const rec = await IDB.get('_prefs'); const remoto = rec?.data?.alumnado;
      if (remoto) {
        if (rec.dirty) return false; // la acaba de cambiar este dispositivo: se sube en este ciclo
        const quiereLocal = remoto === 'local';
        if (Prefs.definida() && quiereLocal === Prefs.alumnadoLocal()) return false;
        if (quiereLocal) { Prefs.set({ alumnadoLocal: true }); this.alPrefs?.(); return false; }
        const ok = await activarNube({ remoto: true }); this.alPrefs?.(); return ok;
      }
      if (rec?.dirty) return false;
      let local;
      if (Prefs.definida()) local = Prefs.alumnadoLocal(); // dispositivos que ya lo tenían elegido (versión anterior)
      else { UI.cargando(null); local = await UI.preguntaAlumnado(); }
      await guardarPrefs(local);
      if (!local && Prefs.alumnadoLocal()) { await activarNube({ remoto: false }); this.alPrefs?.(); return true; }
      Prefs.set({ alumnadoLocal: local }); this.alPrefs?.(); return false;
    }
  };

  async function guardarPrefs(local) { const cur = (await IDB.get('_prefs'))?.data || {}; await Nube.guardar('_prefs', Object.assign({}, cur, { alumnado: local ? 'local' : 'nube', fecha: new Date().toISOString(), desde: Registro.desc() })); }
  /* pasar los datos del alumnado de este dispositivo a la nube; pregunta qué copia vale si hay datos en los dos sitios */
  async function activarNube({ remoto }) {
    const recs = (await IDB.all()).filter(r => ALUMNADO.test(r.id));
    let remotos = [];
    try { await Sync.drv.preparar(); remotos = (await Sync.drv.listar()).filter(f => ALUMNADO.test(decId(f.name) || '')); } catch (e) { if (!remoto) { alert('Hace falta conexión para pasar los datos del alumnado a la nube.'); return false; } throw e; }
    const enNube = new Set(remotos.map(f => decId(f.name)));
    const choque = recs.some(r => !r.deleted && r.data && enNube.has(r.id));
    const usarNube = choque && confirm((remoto ? 'Has activado la sincronización de los datos del alumnado desde otro dispositivo, y en este también hay datos del alumnado.\n\n' : 'En tu nube ya hay datos del alumnado guardados desde otro dispositivo.\n\n')
      + 'Aceptar = usar los de la nube (se sustituyen los de este dispositivo)\nCancelar = usar los de este dispositivo (se sustituyen los de la nube)');
    Prefs.set({ alumnadoLocal: false });
    for (const r of recs) {
      if (r.deleted) continue;
      if (usarNube && enNube.has(r.id)) { r.dirty = false; r.rev = null; } else { r.dirty = true; r.ver = (r.ver || 0) + 1; }
      await IDB.put(r);
    }
    return true;
  }

  /* ---------------- estado visible ---------------- */
  const Estado = {
    txt: '', err: false, hook: null,
    set(t, err) { this.txt = t; this.err = !!err; this.hook?.(t, this.err); },
    async ok() { const n = await Sync.pendientes(); this.set(n ? 'Pendiente de subir' : 'Guardado en ' + Sync.drv.nube); },
    fallo(e) {
      if (e.code === 'offline' || !navigator.onLine) this.set('Sin conexión · guardado aquí');
      else if (e.code === 'auth') this.set('Reconecta para sincronizar', true);
      else if (e.code === 'quota') this.set('Sin espacio en ' + Sync.drv.nube, true);
      else if (e.code === 'forbidden') { this.set('Sin permiso en ' + Sync.drv.nube, true); console.warn(e); }
      else { console.warn(e); this.set('Error al sincronizar', true); Sync.programar(30000); }
    },
    async refrescar() {
      if (!Sync.drv) { this.set(Auth.sesion?.prov === 'local' ? 'Guardado en este dispositivo' : 'Guardado'); return; }
      if (Sync.corre) return;
      if (Sync.error) this.fallo(Sync.error); else await this.ok();
    }
  };

  /* ---------------- interfaz propia: entrada, cuenta, aviso ---------------- */
  const LOGO_G = '<svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"/><path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z"/><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z"/></svg>';
  const LOGO_M = '<svg width="16" height="16" viewBox="0 0 21 21" aria-hidden="true"><rect x="1" y="1" width="9" height="9" fill="#f25022"/><rect x="11" y="1" width="9" height="9" fill="#7fba00"/><rect x="1" y="11" width="9" height="9" fill="#00a4ef"/><rect x="11" y="11" width="9" height="9" fill="#ffb900"/></svg>';
  const CSS = `
  #nube-entrada{position:fixed;inset:0;z-index:100;background:var(--bg,#f2f5f4);display:flex;align-items:center;justify-content:center;padding:24px 16px;overflow:auto}
  .ne-caja{width:100%;max-width:420px;background:var(--surface,#fff);border:1px solid var(--line,#d2dbd8);border-radius:14px;padding:28px 24px;box-shadow:0 2px 16px rgba(20,35,40,.08);display:flex;flex-direction:column;gap:14px}
  .ne-marca{display:flex;align-items:center;gap:10px;font-family:var(--font-d);font-weight:700;font-size:1.5rem}
  .ne-marca span{width:30px;height:30px;border-radius:8px;background:linear-gradient(135deg,var(--g1),var(--g2));display:inline-block}
  .ne-caja p{margin:0;color:var(--ink-2);font-size:.95rem}
  .ne-btn{display:flex;align-items:center;justify-content:center;gap:10px;width:100%;padding:11px 14px;border-radius:9px;border:1px solid var(--line);background:var(--surface);cursor:pointer;font-weight:700;font-size:.98rem;color:var(--ink)}
  .ne-btn:hover:not([disabled]){border-color:var(--ink-2)} .ne-btn[disabled]{opacity:.5;cursor:default}
  .ne-link{background:none;border:0;color:var(--accent);cursor:pointer;font-weight:700;padding:4px;font-size:.9rem}
  .ne-nota{font-size:.8rem!important;color:var(--muted)!important;line-height:1.45}
  .ne-err{background:var(--bad-soft);color:var(--ink);border-radius:8px;padding:9px 12px;font-size:.88rem}
  .ne-err:empty{display:none}
  #nube-cuenta{position:relative;flex:none}
  .nc-btn{width:32px;height:32px;border-radius:50%;border:1px solid var(--line);background:var(--accent-soft);color:var(--accent);font-weight:700;cursor:pointer;font-size:.82rem}
  .nc-menu{position:absolute;right:0;top:40px;z-index:30;width:280px;background:var(--surface);border:1px solid var(--line);border-radius:10px;box-shadow:0 6px 24px rgba(20,35,40,.14);padding:12px;display:flex;flex-direction:column;gap:6px}
  .nc-menu .nc-q{font-weight:700;overflow-wrap:anywhere} .nc-menu .nc-s{font-size:.8rem;color:var(--muted)}
  .nc-menu button,.nc-menu a{text-align:left;border:0;background:none;padding:7px 8px;border-radius:7px;cursor:pointer;font-weight:700;font-size:.9rem;color:var(--ink);text-decoration:none}
  .nc-menu button:hover,.nc-menu a:hover{background:var(--surface-2)} .nc-menu .nc-sal{color:var(--bad)}
  .nk-fondo{position:fixed;inset:0;z-index:110;background:rgba(10,20,22,.5);display:flex;align-items:center;justify-content:center;padding:16px;overflow:auto}
  .np-op{justify-content:flex-start;text-align:left;padding:12px 14px}
  #nube-barra{position:fixed;left:50%;transform:translateX(-50%);bottom:calc(14px + env(safe-area-inset-bottom,0px));z-index:60;background:var(--ink);color:var(--surface);border-radius:12px;padding:10px 12px 10px 16px;display:flex;align-items:center;gap:12px;max-width:calc(100% - 24px);box-shadow:0 4px 18px rgba(0,0,0,.25);font-size:.9rem}
  #nube-barra button{border:0;border-radius:8px;padding:7px 12px;font-weight:700;cursor:pointer;background:var(--accent);color:var(--accent-ink);white-space:nowrap}
  `;
  const UI = {
    antesDeSalir: async () => {},
    estilo() { if (document.getElementById('nube-css')) return; const s = document.createElement('style'); s.id = 'nube-css'; s.textContent = CSS; document.head.appendChild(s); },
    entrada(msg) {
      this.estilo();
      return new Promise(resolve => {
        const el = document.createElement('div'); el.id = 'nube-entrada';
        const sinG = !CFG.googleClientId, sinM = !CFG.microsoftClientId;
        el.innerHTML = `<div class="ne-caja" role="dialog" aria-labelledby="ne-t">
          <div class="ne-marca"><span aria-hidden="true"></span><h1 id="ne-t" style="font-size:1.5rem">${esc(NOMBRE)}</h1></div>
          <p>Tu cuaderno docente. Entra con tu cuenta y tus datos se guardan en tu propio Google Drive o OneDrive: nadie más los ve.</p>
          <div class="ne-err" id="ne-err">${esc(msg || '')}</div>
          <button class="ne-btn" data-p="google" ${sinG ? 'disabled' : ''}>${LOGO_G}Entrar con Google</button>
          <button class="ne-btn" data-p="ms" ${sinM ? 'disabled' : ''}>${LOGO_M}Entrar con Microsoft</button>
          ${sinG || sinM ? `<p class="ne-nota">${sinG && sinM ? 'Falta configurar los inicios de sesión' : sinG ? 'Falta configurar el inicio con Google' : 'Falta configurar el inicio con Microsoft'} (archivo <b>config.js</b>, ver LEEME).</p>` : ''}
          <button class="ne-link" data-p="local">Usar sin cuenta, solo en este dispositivo</button>
          <p class="ne-nota">Con cuenta corporativa (@edu.gva.es) se guarda todo en la nube. Con cuenta personal, los datos del alumnado (grupos, registros, calificaciones) se quedan en este dispositivo; se puede cambiar en Ajustes. <a href="privacidad.html" target="_blank" rel="noopener">Privacidad</a></p>
        </div>`;
        document.body.appendChild(el);
        el.addEventListener('click', async e => {
          const b = e.target.closest('[data-p]'); if (!b || b.disabled) return;
          const err = el.querySelector('#ne-err'); err.textContent = '';
          const p = b.dataset.p;
          try {
            if (p === 'local') { el.remove(); return resolve({ prov: 'local', sub: 'local', email: '', nombre: 'Este dispositivo' }); }
            if (p === 'ms') { b.disabled = true; await MS.entrar(); return; }
            b.disabled = true; b.textContent = 'Conectando con Google…';
            const s = await G.entrar(); el.remove(); resolve(s);
          } catch (er) {
            el.querySelectorAll('[data-p]').forEach(x => { x.disabled = (x.dataset.p === 'google' && sinG) || (x.dataset.p === 'ms' && sinM); });
            el.querySelector('[data-p=google]').innerHTML = LOGO_G + 'Entrar con Google';
            err.textContent = er.code === 'cancelado' ? 'Se ha cerrado la ventana sin terminar. Vuelve a intentarlo.'
              : er.code === 'popup' ? 'El navegador ha bloqueado la ventana de Google. Permite las ventanas emergentes para esta página.'
              : er.code === 'offline' ? 'No hay conexión a internet.' : (er.message || 'No se ha podido entrar.');
          }
        });
      });
    },
    preguntaAlumnado() {
      this.estilo();
      return new Promise(resolve => {
        const el = document.createElement('div'); el.id = 'nube-pregunta'; el.className = 'nk-fondo';
        el.innerHTML = `<div class="ne-caja" role="dialog" aria-labelledby="np-t" style="max-width:460px">
          <h2 id="np-t" style="margin:0;font-size:1.2rem">¿Dónde guardamos los datos del alumnado?</h2>
          <p>Grupos y alumnado, registros de clase, calificaciones y materias pendientes. Lo demás (planificación, agenda, ideas, materiales) siempre se sincroniza.</p>
          <button class="ne-btn np-op" data-v="nube"><span style="text-align:left;flex:1">🔄 <b>Sincronizarlos en todos mis dispositivos</b><br><span class="ne-nota" style="font-weight:400">Se guardan en tu ${esc(Sync.drv?.nube || 'nube')} y los ves igual en el ordenador y en el móvil.</span></span></button>
          <button class="ne-btn np-op" data-v="local"><span style="text-align:left;flex:1">📱 <b>Solo en cada dispositivo</b><br><span class="ne-nota" style="font-weight:400">No salen del aparato donde los escribes y no se sincronizan. Conviene exportar copias de vez en cuando.</span></span></button>
          <p class="ne-nota">Se aplica en todos los dispositivos donde entres con esta cuenta y puedes cambiarlo en <b>Ajustes › Tus datos</b>. Si tienes dudas sobre la protección de datos del alumnado, consúltalo en tu centro.</p>
        </div>`;
        document.body.appendChild(el);
        el.querySelectorAll('.np-op').forEach(b => b.onclick = () => { el.remove(); resolve(b.dataset.v === 'local'); });
      });
    },
    cargando(t) {
      this.estilo(); let el = document.getElementById('nube-entrada');
      if (!t) { el?.remove(); return; }
      if (!el) { el = document.createElement('div'); el.id = 'nube-entrada'; document.body.appendChild(el); }
      el.innerHTML = `<div class="ne-caja"><div class="ne-marca"><span aria-hidden="true"></span>${esc(NOMBRE)}</div><p>${esc(t)}</p></div>`;
    },
    cuenta() {
      const cont = document.getElementById('nube-cuenta'); if (!cont) return;
      const s = Auth.sesion; const ini = (s?.nombre || '?').split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase();
      cont.innerHTML = `<button class="nc-btn" aria-haspopup="true" aria-expanded="false" title="${esc(s?.email || s?.nombre || '')}">${s?.prov === 'local' ? '⌂' : esc(ini)}</button>`;
      const btn = cont.querySelector('.nc-btn');
      btn.onclick = async ev => {
        ev.stopPropagation();
        const ab = cont.querySelector('.nc-menu'); if (ab) { ab.remove(); btn.setAttribute('aria-expanded', 'false'); return; }
        const m = document.createElement('div'); m.className = 'nc-menu'; btn.setAttribute('aria-expanded', 'true');
        const local = s.prov === 'local'; const n = local ? 0 : await Sync.pendientes();
        const ult = Sync.ultimo ? new Date(Sync.ultimo).toLocaleString('es-ES', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : 'todavía no';
        m.innerHTML = local
          ? `<div class="nc-q">Sin cuenta</div><div class="nc-s">Los datos están solo en este navegador. Exporta copias desde Ajustes.</div>
             <button data-m="entrar">Entrar con Google o Microsoft…</button>`
          : `<div class="nc-q">${esc(s.nombre)}</div><div class="nc-s">${esc(s.email)} · ${s.prov === 'google' ? 'Google Drive' : 'OneDrive'}</div>
             <div class="nc-s">Última sincronización: ${esc(ult)}${n ? ` · ${n} cambio${n > 1 ? 's' : ''} por subir` : ''}</div>
             <button data-m="sync">Sincronizar ahora</button><button data-m="carpeta">Abrir la carpeta de ${esc(NOMBRE)}</button>
             <button data-m="salir" class="nc-sal">Cerrar sesión en este dispositivo</button>`;
        cont.appendChild(m);
        const cerrar = () => { m.remove(); btn.setAttribute('aria-expanded', 'false'); document.removeEventListener('click', fuera); };
        const fuera = e => { if (!m.contains(e.target)) cerrar(); };
        setTimeout(() => document.addEventListener('click', fuera), 0);
        m.onclick = async e => {
          const a = e.target.closest('[data-m]')?.dataset.m; if (!a) return;
          if (a === 'sync') { cerrar(); if (Auth.reconectar) return UI.reconectar(); Sync.ciclo(); }
          if (a === 'carpeta') { cerrar(); try { const u = await Sync.drv.enlace(); if (u) window.open(u, '_blank', 'noopener'); } catch (er) { alert('No se ha podido abrir la carpeta: ' + (er.message || er.code)); } }
          if (a === 'salir') { cerrar(); Nube.salir(); }
          if (a === 'entrar') { cerrar(); if (confirm('Vas a entrar con una cuenta. Después te preguntaré si quieres subir los datos de este dispositivo a tu nube. ¿Continuar?')) { lsSet('bs:traer-local', true); await UI.antesDeSalir(); Auth.guardarSesion(null); location.reload(); } }
        };
      };
    },
    barra() {
      this.estilo(); let el = document.getElementById('nube-barra');
      if (!Auth.reconectar) { el?.remove(); return; }
      if (!el) { el = document.createElement('div'); el.id = 'nube-barra'; el.setAttribute('role', 'status'); document.body.appendChild(el); }
      el.innerHTML = `<span>La conexión con ${Auth.sesion?.prov === 'google' ? 'Google Drive' : 'OneDrive'} ha caducado. Tus cambios se guardan en este dispositivo${Auth.sesion?.prov === 'google' ? ' y se reconecta al tocar cualquier sitio' : ''}.</span><button>Reconectar</button>`;
      el.querySelector('button').onclick = () => { if (Auth.sesion?.prov === 'google' && (G.ocupado || now() - G.ultimoIntento < 3000)) return; UI.reconectar(); };
    },
    async reconectar() {
      const t0 = now();
      try { if (Auth.sesion.prov === 'google') await G.reconectar(); else await MS.reconectar(); Auth.reconectar = false; this.barra(); Sync.ciclo();
        Registro.add('reconectar', 'Reconexión con el botón «Reconectar»', { seg: Math.round((now() - t0) / 100) / 10 }); }
      catch (e) { Registro.add('renovar-fallo', 'Falló la reconexión con el botón', { error: e.code || '' }); if (e.code !== 'cancelado') alert('No se ha podido reconectar: ' + (e.message || e.code)); }
    }
  };

  /* ---------------- service worker: caché de la app y archivos ---------------- */
  async function prepararSW() {
    if (!('serviceWorker' in navigator)) return;
    navigator.serviceWorker.addEventListener('message', async e => {
      if (e.data?.tipo !== 'token?' || !e.ports?.[0]) return;
      let token = null; try { token = await Auth.token(); } catch (er) {}
      e.ports[0].postMessage({ prov: Auth.sesion?.prov, token });
    });
    try { navigator.serviceWorker.startMessages?.(); } catch (e) {}
    try {
      await navigator.serviceWorker.register('sw.js');
      if (!navigator.serviceWorker.controller) await Promise.race([new Promise(r => navigator.serviceWorker.addEventListener('controllerchange', r, { once: true })), sleep(3000)]);
    } catch (e) { console.warn('Sin service worker', e); }
  }

  /* ---------------- archivos y descargas (misma forma que usaba el artefacto) ---------------- */
  const nombreSeguro = n => (n || 'archivo').normalize('NFC').replace(/[\\/:*?"<>|#%{}~&]+/g, '_').replace(/\s+/g, ' ').trim().slice(0, 80) || 'archivo';
  const archivos = {
    async upload(file) {
      if (!Sync.drv) throw new NubeError('sin_nube');
      if (file.size > MAX_MB * 1048576) throw new NubeError('too_large');
      await Sync.drv.preparar();
      let r;
      try { r = await Sync.drv.subir(file, Date.now().toString(36) + '-' + nombreSeguro(file.name)); }
      catch (e) { throw new NubeError(e.code === 'quota' ? 'quota_or_state' : e.code, e.message); }
      try { const c = await caches.open(BLOBS); await c.put(blobKey(r.id), new Response(file, { headers: { 'Content-Type': file.type || 'application/octet-stream' } })); } catch (e) {}
      return { id: r.id, sizeBytes: r.size };
    },
    async delete(id) {
      try { const c = await caches.open(BLOBS); await c.delete(blobKey(id)); } catch (e) {}
      if (Sync.drv) await Sync.drv.borrar(id);
    }
  };
  const MIME = { pdf: 'application/pdf', docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', json: 'application/json', txt: 'text/plain', csv: 'text/csv', xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' };
  const descargas = {
    async save({ filename, data }) {
      const ext = (filename.split('.').pop() || '').toLowerCase();
      const blob = data instanceof Blob ? data : new Blob([data], { type: MIME[ext] || 'application/octet-stream' });
      const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = filename; a.rel = 'noopener';
      document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 4000);
    }
  };

  /* ---------------- traer los datos del modo sin cuenta ---------------- */
  async function traerLocal() {
    if (!lsGet('bs:traer-local')) return; lsSet('bs:traer-local', null);
    const otra = Object.create(IDB); otra.db = null; otra.mem = null;
    await otra.abrir('biosofia-local'); const recs = (await otra.all()).filter(r => r.data && !r.deleted);
    try { otra.db?.close(); } catch (e) {}
    if (!recs.length) return;
    const aqui = (await IDB.all()).filter(r => r.data && !r.deleted).length;
    if (!confirm(`Hay ${recs.length} documentos guardados en este dispositivo sin cuenta. ¿Subirlos a tu ${Sync.drv.nube}?${aqui ? ' Sustituirán a los que tengas con el mismo nombre en tu cuenta.' : ''}`)) return;
    for (const r of recs) { const cur = await IDB.get(r.id); await IDB.put({ id: r.id, data: r.data, ref: cur?.ref || null, rev: cur?.rev || null, dirty: true, ver: (cur?.ver || 0) + 1 }); }
    await IDB.borrarBase('biosofia-local').catch(() => {});
    await IDB.abrir(nombreBase(Auth.sesion));
  }

  /* ---------------- API pública ---------------- */
  const Nube = {
    archivos: null, descargas, MAX_MB, Error: NubeError,
    get modo() { return Auth.sesion?.prov === 'local' ? 'local' : 'nube'; },
    get proveedor() { return Auth.sesion?.prov; },
    get nubeNombre() { return Sync.drv?.nube || ''; },
    set alCambiar(f) { Sync.alCambiar = f; },
    set alEstado(f) { Estado.hook = f; if (Estado.txt) f(Estado.txt, Estado.err); },
    set antesDeSalir(f) { UI.antesDeSalir = async () => { try { await f(); } catch (e) {} }; },

    async iniciar() {
      UI.estilo();
      const swP = prepararSW();
      let msg = '';
      const disp = Registro.disp(); const ultimo = Registro.lista().slice(-1)[0];
      const motivo = disp.nuevo ? 'primera vez en este dispositivo o navegador, o el sistema había borrado los datos de la app' : ultimo?.tipo === 'salir' ? 'después de cerrar sesión' : 'la app había perdido la sesión sin cerrarla';
      try {
        const v = await MS.volver();
        if (v?.silencioso) Auth.pedirReconexion();
        else if (v) { Auth.guardarSesion(v); Registro.add('entrar', 'Entrada con Microsoft', { motivo: sessionStorage.getItem('bs:motivo') || motivo }); }
      } catch (e) { msg = e.code === 'cancelado' ? 'Se ha cancelado el inicio de sesión con Microsoft.' : (e.message || 'No se ha podido entrar con Microsoft.'); Auth.guardarSesion(null); }
      if (!Auth.sesion || msg) {
        sessionStorage.setItem('bs:motivo', motivo);
        Auth.guardarSesion(await UI.entrada(msg));
        if (Auth.sesion.prov === 'google') Registro.add('entrar', 'Entrada con Google', { motivo });
        else if (Auth.sesion.prov === 'local') Registro.add('entrar', 'Entrada sin cuenta', { motivo });
      } else Registro.add('abrir', 'App abierta con la sesión guardada', { permiso: Auth.tok?.exp > now() ? 'vigente' : 'caducado' });
      await swP;
      await IDB.abrir(nombreBase(Auth.sesion));
      if (Auth.sesion.prov !== 'local') {
        Sync.drv = Auth.sesion.prov === 'google' ? GD : OD;
        this.archivos = archivos;
        // Microsoft: si la renovación ha caducado, se intenta entrar sin preguntar una vez por sesión del navegador
        if (Auth.sesion.prov === 'ms' && !(Auth.tok?.exp > now()) && navigator.onLine) {
          try { await MS.refrescar(); } catch (e) { if (e.code !== 'offline' && !sessionStorage.getItem('bs:silencioso')) { sessionStorage.setItem('bs:silencioso', '1'); await MS.entrar({ silencioso: true, hint: Auth.sesion.email }); } }
        }
        if (Auth.sesion.prov === 'google') {
          G.prepararAuto();
          document.addEventListener('click', () => { if (Auth.sesion?.prov === 'google') G.renovarEnToque(); }, true);
          document.addEventListener('keydown', e => { if (e.key === 'Enter' && Auth.sesion?.prov === 'google') G.renovarEnToque(); }, true);
        }
        Registro.subir();
        Sync.ultimo = await IDB.meta('ultimaSync') || null;
        if (!Sync.ultimo) {
          UI.cargando('Preparando tu carpeta en ' + Sync.drv.nube + '…');
          await Sync.ciclo(); if (Sync.cambioPrefs) { Sync.cambioPrefs = false; await Sync.ciclo(); }
          await traerLocal();
          UI.cargando(null);
          if (Sync.error && Sync.error.code !== 'offline') alert('No se ha podido conectar con ' + Sync.drv.nube + ': ' + (Sync.error.message || Sync.error.code) + '\nPuedes seguir trabajando: los cambios se guardan aquí y se subirán después.');
        } else { await traerLocal(); Sync.programar(200); }
        setInterval(() => { if (document.visibilityState === 'visible' && navigator.onLine && !Auth.reconectar) Sync.ciclo(); }, 45000);
        document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible' && !Auth.reconectar) Sync.programar(300); });
        window.addEventListener('online', () => Sync.programar(300));
        window.addEventListener('offline', () => Estado.set('Sin conexión · guardado aquí'));
      } else Estado.set('Guardado en este dispositivo');
      UI.cuenta(); UI.barra();
    },
    async cargarTodo() { const out = {}; (await IDB.all()).forEach(r => { if (!r.deleted && r.data != null && r.id[0] !== '_') out[r.id] = r.data; }); return out; },
    set alPrefs(f) { Sync.alPrefs = f; },
    /* registros de todos los dispositivos de la cuenta (los de la nube y el de este) */
    async registro() {
      const d = Registro.disp().id; const out = new Map();
      if (Auth.sesion?.prov !== 'local') (await IDB.all()).filter(r => r.id.startsWith('_registro_') && r.data && !r.deleted).forEach(r => out.set(r.data.id, r.data));
      out.set(d, { id: d, disp: Registro.desc(), eventos: Registro.lista().filter(e => !e.cuenta || !Auth.sesion?.email || e.cuenta === Auth.sesion.email) });
      return [...out.values()].map(x => Object.assign({ este: x.id === d }, x));
    },
    async guardar(id, data) {
      const r = (await IDB.get(id)) || { id, ver: 0, ref: null, rev: null };
      r.data = clon(data); r.dirty = true; r.deleted = false; r.ver = (r.ver || 0) + 1;
      await IDB.put(r); Sync.programar();
    },
    async borrar(id) {
      const r = await IDB.get(id); if (!r) return;
      if (!r.ref) { await IDB.del(id); return; }
      r.deleted = true; r.dirty = false; r.data = null; r.ver = (r.ver || 0) + 1; await IDB.put(r); Sync.programar();
    },
    refrescarEstado() { Estado.refrescar(); },
    sincronizar() { return Sync.ciclo(); },

    /* datos del alumnado solo en este dispositivo */
    get alumnadoLocal() { return Prefs.alumnadoLocal(); },
    get corporativa() { return Prefs.corporativa(Auth.sesion?.email); },
    async setAlumnadoLocal(v, borrarDeLaNube) {
      if (v === Prefs.alumnadoLocal()) return;
      const recs = (await IDB.all()).filter(r => ALUMNADO.test(r.id));
      if (!v) {
        if (!Sync.drv) return false;
        if (!(await activarNube({ remoto: false }))) return false;
        await guardarPrefs(false); await Sync.ciclo(); return true;
      }
      Prefs.set({ alumnadoLocal: true });
      if (Sync.drv) { await guardarPrefs(true); await Sync.ciclo(); }
      if (borrarDeLaNube && Sync.drv) {
        try { await Sync.drv.preparar(); for (const r of recs) if (r.ref) { await Sync.drv.borrar(r.ref); r.ref = null; r.rev = null; await IDB.put(r); } }
        catch (e) { alert('No se han podido borrar las copias de la nube: ' + (e.message || e.code) + '. Vuelve a intentarlo con conexión.'); }
      }
    },

    async salir() {
      const n = Auth.sesion?.prov !== 'local' ? await Sync.pendientes() : 0;
      if (n && !confirm(`Hay ${n} cambio${n > 1 ? 's' : ''} sin subir a ${Sync.drv.nube}. Si cierras la sesión ahora se perderán. ¿Cerrar igualmente?`)) return;
      const soloAqui = Prefs.alumnadoLocal() && (await IDB.all()).some(r => ALUMNADO.test(r.id) && r.data);
      if (soloAqui && !confirm('Los datos del alumnado están guardados solo en este dispositivo y se borrarán al cerrar la sesión. Exporta antes una copia desde Ajustes si la necesitas. ¿Cerrar igualmente?')) return;
      await UI.antesDeSalir();
      Registro.add('salir', 'Has cerrado la sesión'); clearTimeout(Registro._t);
      const base = nombreBase(Auth.sesion);
      lsSet(Prefs.k(), null); Auth.guardarSesion(null); Auth.guardarTok(null);
      await IDB.borrarBase(base);
      try { await caches.delete(BLOBS); } catch (e) {}
      try { window.google?.accounts?.id?.disableAutoSelect?.(); } catch (e) {}
      location.reload();
    }
  };
  window.Nube = Nube;
})();
