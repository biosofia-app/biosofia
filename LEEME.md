# BIOSOFÍA · app web

Versión web de BIOSOFÍA: la misma app del artefacto, con inicio de sesión con **Google** o **Microsoft** y los datos guardados en el **Google Drive** o el **OneDrive** de esa cuenta. No hay servidor propio ni cuotas: la web es un conjunto de archivos estáticos y el navegador habla directamente con Google o Microsoft.

## Cómo funciona

| | Google | Microsoft (incluida @edu.gva.es) |
|---|---|---|
| Carpeta | `Mi unidad › BIOSOFÍA` | `Aplicaciones › BIOSOFÍA` |
| Permiso que pide | Solo los archivos que crea la propia app (`drive.file`) | Solo su carpeta (`Files.ReadWrite.AppFolder`) |
| Dentro | `datos/` (un JSON por documento: config, grupos, agenda, ideas, una semana de planificación…) y `archivos/` (lo subido a Materiales, sesiones y libro) | igual |
| Sesión | El permiso dura 1 hora; después aparece «Reconectar» (un toque). Mientras tanto todo se sigue guardando en el dispositivo | Se renueva sola hasta 24 h; luego vuelve a entrar sin preguntar |

- **Primero en el dispositivo, luego en la nube.** Cada cambio se guarda al momento en el navegador y se sube a los pocos segundos. Sin conexión se sigue trabajando y se sube al volver.
- **Varios dispositivos.** Cada 45 s y al volver a la pestaña la app comprueba si hay cambios de otro dispositivo. Si se edita lo mismo en dos sitios a la vez, se queda el último en sincronizar.
- **Datos del alumnado.** Con cuenta de `edu.gva.es` (dominios en `config.js`) van a la nube. Con cuenta personal se quedan **solo en ese dispositivo** salvo que se desmarque en *Ajustes › Tus datos*. Son: grupos y alumnado, registros de clase, calificaciones y pendientes.
- **Sin cuenta.** «Usar sin cuenta» guarda todo solo en el navegador. Desde el botón ⌂ se puede entrar después y subir esos datos.
- **Instalable.** En Android/Chrome: menú › *Instalar aplicación*. En iPhone/Safari: Compartir › *Añadir a pantalla de inicio*.

## Archivos

| Archivo | Qué es |
|---|---|
| `index.html` | La página: cabecera, barras y la lista de scripts que carga, en orden |
| `estilos.css` | Todo el aspecto: colores, letras, móvil, modo oscuro |
| `js/` | El código de la app, repartido por secciones (ver **Mapa del código**) |
| `nube.js` | Inicio de sesión, copia local y sincronización con Drive/OneDrive |
| `config.js` | **Lo único que hay que editar**: los dos identificadores de cliente |
| `sw.js` | Hace que la app abra sin conexión y sirve los archivos subidos |
| `manifest.webmanifest`, `icon*` | Instalación como app |
| `privacidad.html` | Política de privacidad (Google la pide). Pon tu correo de contacto al final |
| `fonts/` | Letras de la app (IBM Plex y Caveat) |
| `vendor/` | Librerías incluidas en la app para anotar PDF: PDF.js (Mozilla, licencia Apache 2.0) y pdf-lib (licencia MIT). Solo se cargan al abrir un PDF |

## Mapa del código

Los scripts de `js/` son **scripts normales** que se cargan **en este orden** (lo marca el número). Comparten todo entre ellos, como si fueran un solo archivo: una función de `06-sesion.js` puede usar otra de `02-base.js`.

| Archivo | Qué hay | Mira aquí si falla… |
|---|---|---|
| `01-banco-ideas.js` | Banco de la app: 95 temas con ideas (solo datos) | Las sugerencias de «Sugerir» |
| `02-base.js` | Utilidades, idioma del grupo, guardado (Store), estado, **Deshacer**, calendario, avisos de Hoy, barra del móvil y `render()` | Que no se guarde, Deshacer, fechas y festivos, que no se pinte nada |
| `03-hoy.js` | Pantalla **Hoy**: avisos, tareas, línea del día | Hoy |
| `04-planificacion.js` | **Planificación**: Rápida, Semana (lista de días en el móvil), Mes | Planificación |
| `05-grupos.js` | **Grupos**: alumnado, seguimiento, datos del grupo (y la pestaña Evaluación) | Grupos |
| `06-sesion.js` | **Sesión**: 4 pestañas (Preparar · En clase · Anotaciones · Cierre), pestaña según la hora, secciones ocultables, «Cómo contarlo», fichas de actividad, Word, archivos | Cualquier pestaña de la sesión |
| `07-tutoria-plano.js` | Tutoría, plano de clase y propuesta de sitios | Tutoría, plano |
| `08-agenda-ideas-ajustes.js` | Pantallas **Agenda**, **Ideas** y **Ajustes** | Esas pantallas |
| `09-modales-acciones.js` | Ventanas, y qué hace cada botón (`data-a`) y cada campo (`data-f`) | Un botón que no responde |
| `10-copias-ejemplo.js` | Exportar e importar copia, datos de ejemplo | Copias |
| `11-curriculo.js` | Currículo LOMLOE (CV): competencias y criterios (solo datos) | Criterios que faltan |
| `12-calificaciones.js` | **Calificaciones**: cálculo, reglas, rúbricas, competencias, Excel | Notas |
| `13-materiales.js` | **Materiales**: carpetas y archivos | Materiales |
| `14-libro.js` | **Libro digital** y su PDF | Libro |
| `15-importar-copiar-plantillas.js` | Importar instrumentos, copiar sesiones entre grupos, plantillas de planificación | Copiar y plantillas |
| `16-buscar.js` | **Búsqueda global** (lupa, Ctrl+K o «/») | La búsqueda |
| `17-evaluacion.js` | **Informe para la sesión de evaluación** (Grupos › Evaluación) e impresión de zonas | Ese informe, imprimir |
| `18-familias.js` | **Informe para la familia**, con frases en castellano y valenciano | Ese informe |
| `19-programacion.js` | **Programación exportable** (Planificación › Programación), PDF y Word | La programación |
| `20-pdf.js` | **Anotar sobre PDF**: visor, herramientas y PDF con anotaciones | Anotar |
| `21-arranque.js` | Arranque de la app (va el último) | Que la app no abra |

**Si algo no funciona:**

1. Abre la consola del navegador (ordenador: F12 › *Consola*). El error dice el archivo y la línea, por ejemplo `12-calificaciones.js:230`.
2. Para volver atrás solo ese archivo: en GitHub, abre el archivo › *History* › elige la versión anterior › *View file* › copia su contenido y pégalo en la versión actual (lápiz ✏️) › *Commit changes*.

**Reglas para no romper nada:**

- Un archivo nuevo de `js/` va en **dos sitios**: su `<script>` al final de `index.html` (en orden) y la lista `JS` de `sw.js`. Después, sube el número de `V` en `sw.js`.
- Una función nueva puede ir en el archivo de su sección. Si se usa al arrancar, tiene que estar en un archivo **anterior** a donde se llama (o dentro de una función, que es lo normal).
- No cambies el orden de los `<script>`.

---

## Puesta en marcha (unos 30 minutos, una sola vez)

### 1. Publicar la web en GitHub Pages (gratis)

1. Crea una cuenta en [github.com](https://github.com) si no tienes.
2. **New repository** → nombre `biosofia` → *Public* → **Create repository**.
3. En el repositorio: **Add file › Upload files** y arrastra **todos los archivos de esta carpeta** (no la carpeta). **Commit changes**.
4. **Settings › Pages** → *Source: Deploy from a branch* → rama `main`, carpeta `/ (root)` → **Save**.
5. Al minuto la web estará en `https://TU-USUARIO.github.io/biosofia/`. Apúntala: la necesitas en los pasos 2 y 3.

> El repositorio es público, pero solo contiene el código de la app vacía. Tus datos nunca pasan por GitHub.
> Alternativa sin cuenta de GitHub: [Netlify Drop](https://app.netlify.com/drop) (arrastrar la carpeta). La dirección será `https://NOMBRE.netlify.app/`.

### 2. Inicio de sesión con Google

1. Entra en [console.cloud.google.com](https://console.cloud.google.com) con tu cuenta de Google → **Crear proyecto** → `BIOSOFIA`.
2. **APIs y servicios › Biblioteca** → busca **Google Drive API** → **Habilitar**.
3. **Google Auth Platform** (o *Pantalla de consentimiento de OAuth*):
   - *Branding*: nombre `BIOSOFÍA`, tu correo, página principal `https://TU-USUARIO.github.io/biosofia/` y política `https://TU-USUARIO.github.io/biosofia/privacidad.html`.
   - *Público*: **Externo**. Mientras esté «En prueba», añade en **Usuarios de prueba** las cuentas que vayan a usarla (la tuya).
   - *Acceso a datos* › **Añadir o quitar permisos**: marca `.../auth/drive.file` (no es un permiso sensible).
4. **Clientes › Crear cliente** → tipo **Aplicación web** → en **Orígenes de JavaScript autorizados** añade `https://TU-USUARIO.github.io` (sin la ruta). No hace falta URI de redirección.
5. Copia el **ID de cliente** (termina en `.apps.googleusercontent.com`).

> Para que la usen otros docentes sin añadirlos uno a uno: *Público › Publicar aplicación*. Al ser `drive.file` un permiso no sensible, Google solo revisa la marca (nombre, logo, enlaces).

### 3. Inicio de sesión con Microsoft

1. Entra en [entra.microsoft.com](https://entra.microsoft.com) (o portal.azure.com) con una cuenta Microsoft **personal** (outlook/hotmail). Si te pide crear un directorio o una cuenta gratuita de Azure, créala: no se cobra nada por registrar apps.
2. **Aplicaciones › Registros de aplicaciones › Nuevo registro**:
   - Nombre: `BIOSOFÍA` (será el nombre de la carpeta en OneDrive).
   - Tipos de cuenta: **Cuentas de cualquier directorio organizativo y cuentas Microsoft personales**.
   - URI de redirección: plataforma **Aplicación de página única (SPA)** → `https://TU-USUARIO.github.io/biosofia/` (con la barra final).
3. **Permisos de API › Agregar un permiso › Microsoft Graph › Permisos delegados**: `Files.ReadWrite.AppFolder`, `offline_access`, `openid`, `profile`, `email` (`User.Read` ya viene).
4. Copia el **Id. de aplicación (cliente)** de la página *Información general*.

> **Cuenta @edu.gva.es.** Es el punto que quedó pendiente de comprobar: si la Conselleria no deja a los usuarios autorizar apps externas, al entrar aparecerá «Se necesita aprobación del administrador». En ese caso hay que pedirlo al coordinador TIC o usar Google/cuenta personal (con los datos del alumnado en el dispositivo).

### 4. Rellenar `config.js`

En GitHub, abre `config.js` → lápiz ✏️ → pega los dos identificadores → **Commit changes**:

```js
googleClientId: '1234567890-abc.apps.googleusercontent.com',
microsoftClientId: '00000000-0000-0000-0000-000000000000',
```

Si solo configuras uno, el otro botón aparece desactivado.

### 5. Pasar los datos del artefacto

1. En el artefacto BIOSOFÍA: **Ajustes › Exportar copia completa** (descarga un `.json`).
2. En la web, ya con tu cuenta: **Ajustes › Importar copia**.
3. Los **archivos** subidos en el artefacto (Materiales, imágenes del libro, archivos de sesiones) no viajan en la copia: hay que volver a subirlos.

## Probar en el ordenador antes de publicar

```bash
cd biosofia-web
python3 -m http.server 8000
```

Abre `http://localhost:8000`. Para entrar con Google o Microsoft en local añade también `http://localhost:8000` como origen (Google) y como URI de redirección SPA (Microsoft).

## Actualizar la app

Sustituye los archivos en GitHub (Upload files), **incluida la carpeta `js/`** y `estilos.css`, pero **no `config.js`**. La app carga la versión nueva la próxima vez que se abra con conexión. Si cambias la lista de archivos de `sw.js`, sube el número de `V` (ahora `biosofia-v24`).

## Límites conocidos

- Sin notificaciones al móvil: necesitarían un servidor. Los avisos se ven al abrir la app.
- Google pide **Reconectar** cuando pasa una hora; los cambios no se pierden mientras tanto.
- Los Word, PowerPoint y Excel subidos se descargan al abrirlos (los PDF, imágenes y vídeos se ven en la app).
- «Cerrar sesión» borra la copia del dispositivo; si los datos del alumnado estaban solo ahí, la app avisa antes.
- Protección de datos: antes de meter datos reales del alumnado, consulta al centro o al DPD (ver `privacidad.html`).
