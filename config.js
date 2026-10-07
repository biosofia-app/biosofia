/* =====================================================================
   BIOSOFÍA · configuración de la app web
   Rellena los dos identificadores de cliente siguiendo LEEME.md.
   No son secretos: es normal que estén en el código de una app web.
   ===================================================================== */
window.BIOSOFIA_CONFIG = {
  nombre: 'BIOSOFÍA',

  /* Google Cloud Console → APIs y servicios → Credenciales →
     ID de cliente de OAuth (tipo «Aplicación web»). Termina en .apps.googleusercontent.com */
  googleClientId: '',

  /* Microsoft Entra (portal.azure.com) → Registros de aplicaciones →
     Id. de aplicación (cliente). Plataforma «Aplicación de página única (SPA)». */
  microsoftClientId: '',

  /* 'common' admite cuentas personales y de centros (@edu.gva.es).
     Si solo quieres cuentas de la Conselleria, pon aquí el id del inquilino. */
  microsoftTenant: 'common',

  /* Dominios que se tratan como cuenta corporativa: con ellos, los datos del
     alumnado se guardan en la nube por defecto. Con cualquier otra cuenta,
     se quedan en el dispositivo salvo que se cambie en Ajustes. */
  dominiosCorporativos: ['edu.gva.es', 'gva.es'],

  /* Tamaño máximo de cada archivo subido a Materiales o a una sesión (MB). */
  maxArchivoMB: 100
};
