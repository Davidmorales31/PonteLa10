# Handoff

- **Objetivo de la sesión:** que el hub de Selección Colombia no pierda un
  partido recién disputado cuando la base deportiva se purga al cambiar el día,
  pero sin inventar ni asumir un marcador.
- **Completado:** se añade el partido publicado por FCF a “Resultados recientes”
  solo desde el día siguiente y por siete días como máximo si no hay marcador
  confirmado en la fuente del producto ni en el catálogo FCF. El marcador queda
  en blanco y el texto explica que espera confirmación oficial; el enlace apunta
  al calendario de la Federación. Si el fixture aún es de hoy, sigue en la
  agenda; los resultados verificados mantienen prioridad y evitan duplicados.
- **Archivos modificados:** `utils/seleccionColombia.ts`,
  `pages/seleccion-colombia.vue`, `tests/unit/seleccionColombia.test.ts`,
  `docs/agents/ESTADO_ACTUAL.md`, el handoff previo y este archivo.
- **Decisiones:** `/api/resultados` conserva su contrato y su consumo de cuota;
  el fallback usa solo el calendario FCF ya guardado. No se crea escritura,
  cron ni llamada a proveedor. Se admite un marcador pendiente por un máximo de
  siete días desde la fecha oficial. No se publica un score cuya fuente oficial
  todavía no lo confirme.
- **Fuentes:** [calendario oficial FCF](https://www.fcf.com.co/calendario/) y
  [previa FCF Colombia–Perú del 6 de octubre de 2026](https://fcf.com.co/2026/10/06/hoy-juega-colombia-361/).
  Al comprobar la página durante el partido, FCF verificaba fecha y hora, no un
  marcador final. El endpoint de producción devolvió HTTP 200 y diez partidos
  del día, pero no un registro de Colombia–Perú.
- **Validaciones ejecutadas:** prueba relacionada: 1 archivo/7 pruebas; suite
  completa: 76 archivos/376 pruebas; `npm.cmd run lint`; `npm.cmd run typecheck`;
  build con `NUXT_PUBLIC_SITE_URL=https://www.pont3la10.com` y
  `NITRO_PRESET=vercel`; todo pasó. Build conserva aviso upstream `DEP0155` de
  `@vue/shared`. `git diff --check` pasó después de todos los cambios.
  El navegador local renderizó la ruta y su árbol accesible: Colombia–Perú sigue
  en la agenda de hoy con marcador no confirmado, y Resultados recientes conserva
  solo México 1–1 y Colombia 0–1 Paraguay. La API local respondió HTTP 200 pero
  cero partidos por falta de credenciales locales; no se importaron secretos. La
  API pública de Production respondió HTTP 200, `origen=base-datos` y diez
  partidos, ninguno Colombia–Perú en la instantánea del día. Esto no valida el
  marcador futuro, que deliberadamente queda sin inventar.
- **Fallos:** ninguno hasta el momento.
- **Pendientes:** visualización responsive en varios tamaños/temas no certificada;
  solo se inspeccionó la ruta y árbol accesible local. Abrir PR, esperar checks y,
  si pasan, integrar por flujo `main`/GitHub; verificar en Production página,
  sitemap y API. Vercel API connector no tiene permiso para leer deployment
  details; usar smoke del dominio público.
- **Siguiente acción exacta:** validar cambio, crear PR sobre `main`, esperar
  checks automáticos y verificar el deploy live sin modificar protección Vercel.
- **Commit base:** `2fb6980` (PR #72, HU-SEO-09 en Production).
- **Commit final:** sin commit | pendiente de CI.
