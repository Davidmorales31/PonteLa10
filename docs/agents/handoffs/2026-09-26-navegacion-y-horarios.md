# Handoff

- **Objetivo de la sesión:** mejorar el menú desplegable móvil, las migas de navegación y los horarios de `/partidos-hoy` para que respeten la zona horaria del dispositivo.
- **Completado:** menú móvil agrupado y responsive con accesibilidad básica; componente compartido de migas con estilos para temas azul y blanco; consulta/fecha/horas de partidos parametrizadas por zona horaria válida del navegador y respaldo a Bogotá; indicador de zona localizado y enlaces relacionados de resultados estilizados como controles.
- **Archivos modificados:** `components/CabeceraPrincipal.vue`, `components/MigasNavegacion.vue`, `assets/css/landing.css`, `pages/articulos/[slug].vue`, `pages/partidos-hoy.vue`, `pages/resultados/en-vivo.vue`, `utils/zonasHorarias.ts`, `utils/resultadosDeportivos.ts`, `server/api/resultados/index.get.ts`, `server/utils/clienteApiBasketball.ts`, `components/EtiquetaEstadoPartido.vue`, `components/TarjetaMarcadorCompacto.vue`, pruebas unitarias.
- **Decisiones:** para visitas SSR, usar Bogotá inicialmente para que el render sea determinista; tras montar, enviar la zona del navegador al endpoint y mostrar la fecha y horas en esa zona. Las zonas no válidas se normalizan a Bogotá. El endpoint cachea por fecha y zona.
- **Validaciones ejecutadas:** `npm.cmd run lint` (pasa); `npm.cmd run test:unit` (17 archivos, 92 pruebas, pasa); `npm.cmd run typecheck` (pasa); `git diff --check` (pasa).
- **Fallos:** ninguno en validaciones ejecutadas.
- **Pendientes:** revisar visualmente el menú en ancho móvil y ambos temas; build omitido para no interferir con el servidor local activo en `3001`. El usuario completó el cambio de Vercel y redeploy; deployment `8rXU7by5tM3LJApYWmR2k8qq82NZ` está Ready en main (`a1fa711`). GET público de producción y local para America/Bogota devolvió 30 partidos y `mixto`; los tres primeros fixtures coincidieron, con posibles cambios normales en datos live. El último despliegue no contiene los ajustes visuales/timezone que siguen sin commit en `codex/ui-ux-publico` desde base `21483de`.
- **Siguiente acción exacta:** cuando se quiera publicar el ajuste visual, preparar commit/PR de los cambios locales, integrar en main y verificar deployment; después revisar en viewport móvil los dos temas.
- **Commit base:** `21483de` (`codex/ui-ux-publico`).
- **Commit final:** sin commit.
