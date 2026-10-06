# Handoff

- **Objetivo de la sesión:** completar HU-GRO-03 y reparar los filtros SSR de
  artículos de fútbol colombiano.
- **Completado:** la API de Production respondía `200` con `articulos: []` para
  `categoria=futbol-colombiano`, mientras que el listado general tenía artículos.
  La base contiene 57 artículos publicados en esa categoría y la RPC devuelve
  páginas de 20. La causa era un contrato desalineado: el alias map enviaba cinco
  términos, pero la función SQL rechaza más de cuatro. Se dejó el `slug` de
  categoría como filtro canónico y cuatro alias específicos: Liga BetPlay,
  Torneo BetPlay, Copa Colombia y Selección.
- **Archivos modificados:** `utils/articulosLanding.ts`,
  `tests/unit/landing.test.ts`, `tests/unit/filtrosArticulosPublicos.test.ts`,
  `docs/agents/ESTADO_ACTUAL.md` y este handoff.
- **Decisiones:** no se cambió Supabase porque la RPC existente ya limita y pagina
  correctamente los resultados. El alias genérico `futbol colombiano` era
  redundante para artículos con la categoría canónica; mantener los cuatro
  términos específicos evita el rechazo total. No se añadió otro anuncio: el hub
  ya tiene un slot nativo Adsterra condicionado al consentimiento.
- **Validaciones ejecutadas:**
  - `npm.cmd run lint`: pasó.
  - Pruebas relacionadas (`landing.test.ts` y `filtrosArticulosPublicos.test.ts`):
    2 archivos / 8 pruebas pasaron.
  - Suite completa serial (`npm.cmd run test:unit -- --maxWorkers=1`): 75 archivos /
    369 pruebas pasaron.
  - `npm.cmd run typecheck`: pasó.
  - `npm.cmd run build` con `NITRO_PRESET=vercel` y dominio canónico: pasó; quedó
    el aviso upstream no bloqueante `DEP0155` de `@vue/shared`.
  - Lectura SQL de Production (solo lectura): la RPC respondió 21 filas para
    `limit=21`, y 20 filas en cada desplazamiento `0`, `20` y `40` con los cuatro
    alias. No se hicieron escrituras en Supabase ni llamadas a APIs deportivas.
  - `git diff --check`: pasó.
- **Fallos:** el primer test focalizado no pudo preparar Nuxt sin
  `NUXT_PUBLIC_SITE_URL`; se repitió con `https://www.pont3la10.com` y pasó. Antes
  del fix, el endpoint público filtrado y el HTML SSR de esa categoría no
  contenían artículos (reproducido con cache MISS).
- **Pendientes:** publicar el cambio y confirmar en Production que la API
  filtrada devuelve 20 artículos y `hayMas=true`, la segunda página trae otros 20
  sin duplicados, y `/articulos?categoria=futbol-colombiano` renderiza los
  artículos desde SSR. HU-GRO-02 sigue pendiente porque la cuenta Google abierta
  no tiene ninguna propiedad de Search Console; HU-GRO-01 aún requiere verificar
  DebugView de Pont3la10.
- **Siguiente acción exacta:** abrir/actualizar PR contra `main`; tras checks,
  integrar y hacer smoke de API y SSR en el dominio de Production.
- **Commit base:** `81e1303` (`origin/main`, deploy de Production observado).
- **Commit final:** sin commit.
