# Handoff

- **Objetivo de la sesión:** rediseñar el panel administrativo para que sea intuitivo y se haga el menor scroll posible
  (pedido del responsable el 2026-11-20). Fase 1: marco común + Contenidos + Redes.
- **Completado:**
  - Marco nuevo (`layouts/admin.vue`): menú lateral agrupado (Contenido, Distribución, SEO y datos, Sistema) y contraíble a
    íconos (cookie `panel-lateral-compacto`), barra superior con selector de sitio, paleta de navegación Ctrl K y menú de
    usuario. En celular el menú es un panel que se desliza.
  - Kit de componentes `components/admin/ui/`: `PanelModal` (modal o panel lateral con foco atrapado, Esc, bloqueo de scroll),
    `PanelPestanas`, `PanelPopover`, `PanelPaleta`. Estilos en `assets/css/panel-rediseno.css` (variables `--pn-*` en `:root`
    porque los modales se montan en `body`). Se quitaron de `admin.css` las 39 reglas del marco antiguo.
  - Contenidos: pestañas por estado con conteos, búsqueda y filtros en un popover, tabla densa que desplaza por dentro con
    paginación fija y tarjetas en celular. Atajo `?nuevo=1` abre «Nuevo borrador» (lo usa la paleta).
  - Redes: pestañas Noticias / Publicaciones propias / Programadas, lista densa, barra de selección y programación en lote en
    un modal (`ProgramacionMasivaSocial`); la cola vive en `ColaProgramadaSocial`. Cuentas, Agentes (formulario y llave nueva
    en modales) y Comunidades (textos en modal) compactadas.
  - Editor de contenido: barras pegajosas ajustadas al nuevo marco y cabecera de etapa más compacta.
- **Archivos modificados:** ver el commit; no se tocaron APIs, permisos, MFA ni migraciones.
- **Decisiones:** `admin.css` se conserva como base y `panel-rediseno.css` va después y manda; páginas con `pagina-ajustada`
  + `zona-desplazable` llenan la pantalla y desplazan solo su lista. Todas las vistas con `.titulo-vista-panel` ya salen con el
  encabezado compacto.
- **Validaciones ejecutadas:** lint, 983 pruebas, typecheck y build pasan. Revisión visual en Edge integrado a 1440 px y a
  375 px con datos de maqueta (middleware temporal local, no versionado).
- **Fallos:** ninguno conocido. No hay pruebas automáticas de componentes (el proyecto no tiene test-utils); los modales y
  pestañas se probaron a mano (Esc, foco, teclado, Ctrl K).
- **Pendientes:** fase 2 (Search Console: importación en modal; Ingestas; Multimedia; Revisión; Programación de partidos;
  Operación; Seguridad; Centro editorial; editores de redes `[id]` y `propias/[id]`; editor de contenido a fondo) y una
  pasada con datos reales después de desplegar.
- **Siguiente acción exacta:** abrir el panel real con sesión y revisar cada módulo; luego aplicar `pagina-ajustada`,
  `PanelModal` y `PanelPestanas` a los pendientes.
- **Commit base:** fb982bc
- **Commit final:** ver el PR
