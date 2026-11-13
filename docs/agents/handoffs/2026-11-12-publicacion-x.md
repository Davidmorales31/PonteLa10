# Handoff

- **Rechazo de primer post:** registro failed/post_rechazado, attempt_count1,
  sin id proveedor. Consulta oficial de créditos confirmó bloqueo de crédito
  API. No se repitió POST ni se compró saldo. No inferir HTTP402 del primer error:
  se había descartado el cuerpo/estado específico. Utilitario corregido para
  distinguir402/credits-depleted,429,401 y otros4xx; sin reflejar cuerpos privados.
  Lint,653 pruebas,typecheck y diff-check pasan. Sin cambio de rutas, esquema,
  dependencias o UI; build no requerido por matriz de utilitarios.

- **Cierre de conexión real:** consentimiento completado por responsable en
  localhost:3001. @Pont3la10 persistida cifrada por callback auditado; identidad
  HTTP200, tweet.write/media.write/offline.access presentes, carga de imagen
  real HTTP200 con id válido. Tokens temporales sin media.write eliminados tras
  verificar. Ningún post público creado. Configuración ya completa; próxima
  acción es revisión/confirmación humana de una noticia desde Vista rápida X.

- **Configuración privada completada:** responsable entregó clave servidor
  Supabase; lectura real de social_x_connections HTTP200, guardado privado y
  reinicio en3001. Cuatro variables requeridas presentes. Ya no falta ningún
  secreto. Esperar clic Conectar X y consentimiento del usuario para media.write;
  herramientas de navegador sin host. Verificar fila/scopes y retirar tokens
  temporales anteriores al confirmar conexión nueva. No hubo post.

- **Credenciales X posteriores:** usuario entregó OAuth tokens y Client ID/Secret.
  Identidad API 200 @Pont3la10, renovación confidencial 200. Credenciales app y
  clave de cifrado configuradas en `.env` principal sin exponer valores. Tokens
  rotados guardados cifrados en `.codex/private/x-tokens-pendientes.json`, material
  temporal sin importación a conexión activa.
- **Diagnóstico X comprobado:** scopes devueltos incluyen tweet.write y omiten
  media.write; carga de imagen de marca fue 403. Necesita reautorizar desde el
  botón existente que solicita media.write. No se publicó ningún post.
- **Único secreto pendiente:** NUXT_SUPABASE_SERVICE_ROLE_KEY. Se abrió un prompt
  local oculto para ese campo, `.codex/configurar-supabase-x.ps1`, PID inicial
  29608. Al guardar reinicia la rama en3001. Claves app/callback validados; API
  noticias200. Esperar entrada privada del secreto y consentimiento OAuth real.

- **Actualización posterior autorizada (2026-11-12):** Juan autorizó las operaciones.
  Aplicadas solo las migraciones sociales pendientes: publicación X remota
  `20261113033946` y generador remota `20261113034540`; conservar equivalencia con
  nombres/versiones locales. Grants/RLS/RPC verificados y 21 comprobaciones SQL
  del generador pasan. Advisors del módulo solo INFO RLS sin política en tablas
  exclusivas de servicio. Cero conexiones y cero posts.
- **Puerto corregido:** rama de redes activa en localhost:3001, API local sin proxy
  global a producción; 3002 detenido. API noticias 200 con ocho resultados y primer
  titular verificado en la portada HTML 200. API redes sin sesión 401.
- **Bloqueo real restante:** cuatro variables privadas X/Supabase ausentes. CLI sin
  autenticación, conexión Vercel sin proyectos y host de navegador no disponible.
  Se abrió ventana PowerShell local de configuración con secretos ocultos (PID al
  inicio 29892); al completar `.env`, reinicia automáticamente esta rama en 3001.
  Ayudantes temporales en `.codex/configurar-y-arrancar-x.ps1` y
  `.codex/iniciar-local-redes.mjs`. Esperar claves en ventana local, nunca en chat,
  y después consentimiento OAuth @Pont3la10 desde `/admin/redes/cuentas`.

- **Objetivo de la sesión:** habilitar la publicación manual en X desde Vista rápida y explicar la redirección local al login.
- **Completado:** botón Publicar en X con confirmación; token refresh cifrado; render de hasta cuatro imágenes optimizadas a 5 MB; conteo oficial ponderado de 280 caracteres; crear post con texto/media; reserva única, recibo y estados para impedir duplicados; solo artículos publicados.
- **Archivos modificados:** `components/admin/VistaRapidaPublicacionSocial.vue`, `pages/admin/redes/cuentas.vue`, `server/api/admin/redes/[id]/publicar-x.post.ts`, `server/api/admin/redes/[id]/exportar.post.ts`, `server/api/admin/redes/oauth/x/callback.get.ts`, `server/utils/oauthX.ts`, nuevos utilitarios de render/conteo, helper predeterminado, tipos/dependencia, migración y pruebas relacionadas.
- **Decisiones:** conservar login/MFA/capacidad; el botón exige revisión humana. El servidor nunca acepta desde el navegador texto, imagen o URL para publicar. Artículo y medio se cargan desde Supabase. Un timeout/5xx de creación pasa a `uncertain` y no se reintenta solo. Sin tabla de composición se publica el mismo documento predeterminado del preview.
- **Base remota:** no se aplicó `20261113024745_publicar_x_idempotente.sql` ni ninguna migración adicional. La nueva tabla y RPC están protegidas con RLS, grants solo al backend de servicio, funciones `security invoker` y auditoría sin texto ni tokens. No hubo publicaciones reales ni llamadas X pagadas.
- **Validaciones ejecutadas:** `npm ci`; `npm run lint`; suite completa 123 archivos/651 pruebas; typecheck; pruebas focales 5 archivos/25 pruebas; PGlite 12 comprobaciones de grants/RLS/idempotencia/estados/auditoría; `git diff --check`. Build de producción completo con una capa temporal de Nuxt a `.codex/build-validation-output`. El build estándar llega a compilar cliente/servidor y falla al limpiar `.output` por `EPERM` en `libvips-42.dll`. Ruta local de la rama en `127.0.0.1:3002`; `GET /admin/redes` sin sesión devolvió 302 a `/login?redirigir=/admin/redes`. Edge no estuvo disponible para inspección visual.
- **Revisión de seguridad:** sin bloqueos. Se corrigió el autoimport de Nitro sobre el parámetro OAuth `error`. Riesgo menor: dos posts distintos pueden renovar a la vez y el segundo puede fallar si X rota el refresh token antes de que el primero lo guarde; la ruta relee la conexión actual, no publica dos veces y puede requerir que el usuario confirme de nuevo.
- **Fallos/limitaciones:** no hay credenciales privadas X ni conexión real @Pont3la10 en el entorno local; se verificó solo presencia booleana. Para publicar de verdad falta autorizar @Pont3la10, disponer de claves privadas en el servidor y aplicar la migración nueva. El callback configurado usa `localhost:3001`; ese puerto pertenece a otro checkout, por lo que el preview actual de la rama está en 3002 y no puede completar OAuth con el callback actual. No exponer ni pegar secretos en el chat.
- **Siguiente acción exacta:** decidir/aprobar la aplicación de la migración en la base Supabase objetivo; configurar credenciales con `scripts/configurar-oauth-x.ps1`; usar el checkout de redes en el origen autorizado `http://localhost:3001`; iniciar sesión en `/login?redirigir=/admin/redes`, conectar @Pont3la10 y probar primero solo después de revisar el texto/imagen y el cargo de API indicado por X.
- **Commit base:** `f3593fc`, rama `feat/generador-publicaciones-redes`.
- **Commit final:** sin commit; sin push ni deploy.
