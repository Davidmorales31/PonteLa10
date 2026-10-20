# Handoff

- **Objetivo de la sesión:** actualizar visualmente el módulo «Próximo partido»
  de Inicio y añadir el acceso solicitado a publicidad y Win Sports.
- **Completado:** icono de calendario; competición centrada, con icono de copa,
  sin fondo azul y con color estándar; escudos sin placas de fondo; separador
  `vs` sin fondo amarillo. Se añadió un CTA «Ver en vivo» con imagen raster
  generada y etiqueta real accesible. El primer clic abre el Smartlink público
  de Adsterra configurado en el runtime; los clics siguientes de la misma
  pestaña abren el plan de Win Play. La interfaz explica el destino patrocinado.
- **Archivos modificados:** `pages/index.vue`,
  `public/images/ui/boton-ver-en-vivo.webp`, `docs/agents/ESTADO_ACTUAL.md` y
  este handoff.
- **Decisiones:** se reutiliza `NUXT_PUBLIC_ADSTERRA_MATCH_PROMO_URLS` y su
  Smartlink existente, se valida que el destino sea HTTPS y se usa
  `sessionStorage` para limitar el desvío a la primera pulsación de esa pestaña.
  Win Sports presenta actualmente su plataforma online como Win Play; el enlace
  lleva a `https://winplay.co/plans`. El WebP fue generado con la herramienta
  integrada `image_gen` (prompt: cuerpo de botón deportivo horizontal, fondo
  transparente, esmalte azul marino, brillo cian, acento amarillo; sin texto ni
  logos) y optimizado de 1,25 MB a 27 KB.
- **Validaciones ejecutadas:** `npx.cmd eslint pages/index.vue` sin errores ni
  advertencias; `git diff --check`; SSR local `GET /` (200), presencia de icono,
  CTA y aviso patrocinado; WebP local (200); la tabla conserva 20 filas.
- **Fallos:** la automatización CUA no tuvo navegador disponible y Playwright
  no está instalado, por lo que no se obtuvo captura interactiva de escritorio
  o móvil. No se probó la navegación real para evitar abrir destinos externos.
- **Pendientes:** inspección manual responsive y accesible; suite unitaria,
  typecheck y build según la matriz. No se ejecutaron en esta sesión para
  preservar el servidor local activo y separar la validación que puede afectar
  la preparación de Nuxt.
- **Siguiente acción exacta:** abrir `http://127.0.0.1:3333` en un navegador
  disponible, revisar escritorio y 390 px, y validar la secuencia de destinos
  con navegación externa interceptada.
- **Commit base:** sin commit nuevo en esta sesión.
- **Commit final:** sin commit.
