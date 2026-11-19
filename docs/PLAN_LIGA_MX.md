# Plan Liga MX: el mismo sitio en `mx.pont3la10.com`

Estado (2026-11-19, noche): **construido y fusionado casi todo; México NO está lanzado.** Autor: Claude.
Avance por fase (detalle en `docs/agents/handoffs/2026-11-19-sitios-liga-mx-fase-*.md`):

| Fase | Estado |
| --- | --- |
| 1 Base (`sites`, `site`, host → sitio) | Hecha (#179) |
| 2 Marca, menú, pie, SEO; México noindex | Hecha (#180) |
| 3 Lecturas públicas y panel por sitio | Hecha (#181) |
| 4A/4B/4C Datos de Liga MX, páginas, clubes | Hechas (#182–#184); derechos de publicación confirmados por el responsable el 2026-11-19 (bandera propia `NUXT_FUTBOL_MX_DERECHOS_PUBLICACION_CONFIRMADOS`, solo afecta a México) |
| 5 Selección Mexicana y Mexicanos en el exterior | Hecha (#186); sin fichas estáticas (se verifican una a una) |
| 6 Corridas y tareas programadas de México | Hecha (#185); tarea de Claude ACTIVADA el 2026-11-19 por el responsable (`habilitada:true`); falta la de Codex |
| 7 Redes por sitio (dominio de la pieza) | Hecha (#187); sin prueba de publicación real |
| 8A Mapas y feed listos | Hecha (#188) |
| 8B Idioma/zona por sitio, Partidos de hoy, filtros de Noticias y Quiénes somos de México | Hecha (#189–#192) |
| Lanzamiento (DNS, Search Console, GA4, `indexable`) | Pendiente del responsable (ver handoff 8A) |

Pendientes técnicos conocidos (no bloquean el lanzamiento, mejoran México):
- Grafo de entidades SEO de México: los artículos de México enlazan los clubes de la Liga MX que nombran (`/clubes/...`, relación «mentions», sin tocar el grafo de Colombia); falta el grafo completo con competiciones y partidos.
- ~~Frescura y salud de los datos de México en el panel de Operación~~ (hecho: bloque «México» en Operación y alerta si hay datos vencidos).
- «Dónde ver» y fichas de jugadores de México (requieren datos verificados).
- Separación de 15 minutos entre publicaciones y detección de duplicados de la agenda: hoy comparten fila los dos sitios.
- Alcance por sitio en las llaves de agentes de redes y prueba de publicación real en redes con un artículo de México.
- Textos legales: privacidad y términos citan la ley colombiana; el responsable decide si añade la mexicana.
- Automatización de Codex para México (12:30 y 20:30) por quien administre las automatizaciones de Codex.

Texto original de la investigación (se conserva abajo). Los datos de «Hoy» describen el estado ANTES de construir.

Decisiones del responsable: dominio gratis `mx.pont3la10.com`; mismo código, misma
cuenta y mismo panel; **tareas programadas distintas** para México; compartir todo
lo posible.

Lo que se verificó en el repositorio está marcado **[verificado]**. Lo que depende de
un tercero o de datos que cambian está marcado **[por verificar]**.

---

## 1. Idea central

Una sola aplicación Nuxt, un solo despliegue, un solo proyecto Supabase. Se añade una
dimensión **`sitio`** (`co` | `mx`) que decide:

1. qué configuración de marca, navegación, textos y rutas se muestra (según el host);
2. qué contenido se lee y se escribe (columna `site` en las tablas de contenido);
3. qué proveedor, ligas y fuentes usan las sincronizaciones;
4. qué tareas programadas, prompts y listas de fuentes corren.

Colombia sigue funcionando igual: `site = 'co'` es el valor por defecto de todo lo
que ya existe, así la migración no cambia nada visible.

Host → sitio: `www.pont3la10.com` y `pont3la10.com` → `co`; `mx.pont3la10.com` → `mx`.
Una sola función (`useSitio()` en cliente, `sitioDesdeHost()` en servidor) lee el host y
devuelve la configuración. En local se simula con `?sitio=mx` o una variable.

---

## 2. Dominio

- `pont3la10.mx.com` **no es posible** (`mx.com` no es tuyo).
- **`mx.pont3la10.com`**: gratis. Se crea un registro DNS `mx` (CNAME al mismo destino
  del sitio) y se añade el dominio en el hosting. **[por verificar]** dónde está
  desplegado hoy (los documentos mencionan Vercel y un PC/VPS para los workers).
- Search Console: si la propiedad actual es de tipo *dominio* (`pont3la10.com`), ya cubre
  los subdominios; si es de *prefijo de URL*, hay que añadir `https://mx.pont3la10.com/`.
- Google Analytics: mismo ID `G-PHNWBM2D7X` hoy; se separa por nombre de host en los
  informes, o se crea otro flujo de datos. **[decisión pendiente]**

---

## 3. Módulo por módulo (páginas públicas)

Leyenda: **C** = compartido tal cual, **P** = compartido pero parametrizado por sitio,
**N** = nuevo contenido/datos para México.

| # | Página (Colombia hoy) | Equivalente en México | Qué hay que homologar | Tipo |
|---|---|---|---|---|
| 1 | **Inicio** `/` (1474 líneas, 59 menciones a Colombia) | Misma estructura y mismas secciones | Noticias con etiqueta México; bloque Liga BetPlay → Liga MX (tabla, calendario, próximo partido); bloque Selección Colombia → Selección Mexicana; "Colombianos en Europa" → "Mexicanos en el exterior"; equipos y competiciones seguidos; franja de marcadores; zona horaria; textos y categorías | P |
| 2 | **Fútbol colombiano** `/futbol-colombiano` | `/futbol-mexicano` | Categoría `futbol-mexicano`; filtro de artículos | P |
| 3 | **Liga colombiana** `/liga-colombiana` (1862 líneas, 97 menciones) | `/liga-mx` | Tabla, calendario, jornadas, equipos, noticias; Liga BetPlay/Torneo/Copa Colombia → Liga MX (Apertura/Clausura), Liguilla, Copa MX, Campeón de Campeones, Leagues Cup, Liga MX Femenil | P + N |
| 4 | **Selección Colombia** `/seleccion-colombia` (780 líneas) | `/seleccion-mexicana` | Convocatoria, calendario oficial, partidos, noticias (datos propios de la FMF) | P + N |
| 5 | **Colombianos en Europa** `/colombianos-en-europa` | `/mexicanos-en-el-exterior` | Fichas, historias, calendario por jugador. Incluye Europa y MLS/otras ligas | P + N |
| 6 | **Fútbol internacional** `/futbol-internacional` | Igual | Categoría `futbol-mundial`: es contenido común | C |
| 7 | **Partidos de hoy** `/partidos-hoy` | Igual | Ligas prioritarias de México primero; zona horaria America/Mexico_City | P |
| 8 | **Resultados** (índice, fútbol, baloncesto, béisbol, tenis, en vivo, detalle) | Igual | Casi todo es genérico. Cambia la liga prioritaria y la zona horaria | C/P |
| 9 | **Cómo quedó** `/como-quedo/[slug]` | Igual | Plantilla SEO por partido; textos con "Colombia" | P |
| 10 | **Dónde ver** `/donde-ver/[slug]` | Igual | Tabla `colombian_match_broadcast_options` con canales colombianos → canales de México (TUDN, Canal 5, TV Azteca, Fox, Amazon Prime, ViX, etc.) **[por verificar]** | P + N |
| 11 | **Competiciones** `/competiciones/[slug]` y jornadas | Igual | Catálogo `competicionesPublicas` (hoy 3 slugs colombianos) | P + N |
| 12 | **Equipos** `/equipos/[slug]` | Los 18 clubes de Liga MX | Perfil, palmarés, estadio, redes oficiales, tabla del club | N |
| 13 | **Jugadores** `/jugadores/[slug]` | Mexicanos en el exterior | Ficha con fuente oficial y foto con crédito | N |
| 14 | **Partidos** `/partidos/[slug]` | Igual | Plantilla SEO, escudos, cartel; entidades | P |
| 15 | **Artículos** y archivo `/articulos` | Igual | Filtrar por `site`; categorías y temas propios | P |
| 16 | **Autores** `/autores/[slug]` | Igual (mismos autores) | Perfil editorial único; un autor puede publicar en ambos | C |
| 17 | **Especiales** `/especiales` | Igual | Módulos especiales con `site` | P |
| 18 | **Legales**: quiénes somos, política editorial, correcciones, términos, privacidad | Mismas páginas | Una sola política; solo cambia mención de dominio y país de operación | C |
| 19 | **Cuenta y acceso** | Una cuenta para ambos sitios | Sin cambios; el login es único | C |
| 20 | **`[...slug]`** (páginas genéricas) | Igual | Filtrar por `site` | P |

Navegación y pie: `data/sitioPublico.ts` hoy es una sola lista. Pasa a una función
`navegacionDe(sitio)`:

- Inicio · Partidos de hoy · **Liga MX** · **Selección Mexicana** · **Mexicanos en el exterior** · Resultados · Noticias
- Más: Fútbol mexicano · Fútbol internacional · Especiales · Tech deportiva · Gaming · Tendencias · Opinión

---

## 4. Panel de administración (`/admin`)

Es **uno solo**, con un selector "Sitio: Colombia / México" arriba. Todo lo que se
lista, crea o programa se filtra por el sitio elegido.

| Módulo del panel | Cambio |
|---|---|
| Centro editorial / resumen | Contadores por sitio |
| Contenidos (borradores, revisión, flujo) | Campo `site` obligatorio al crear; el editor no cambia |
| Taxonomías | Categorías y temas por sitio (más abajo) |
| Grafo de entidades SEO | Entidades de México (clubes, ligas, jugadores) |
| Ingestas (TikTok, etc.) | Sin cambios, solo etiquetar el sitio |
| Biblioteca de medios | **Compartida** (una foto sirve a ambos) |
| Redes (publicaciones, agentes, comunidades, cuentas, móvil, propias) | Cuentas de redes por sitio (ver §9). Programación masiva ya lee la hora de Colombia: debe aceptar zona horaria del sitio |
| Programación de partidos | Competiciones del sitio |
| Operación y auditoría | Salud por sitio: frescura de datos, corridas, errores |
| Search Console y poda de contenido | Filtro por host |
| Seguridad / MFA / roles | **Compartido** (mismo usuario y permisos) |

---

## 5. Servidor, API y datos (lo que más trabajo da)

### 5.1 Hay Colombia escrita en código y en la base de datos [verificado]

Conteo de menciones a Colombia/DIMAYOR/BetPlay por archivo (los que más):

| Archivo | Menciones |
|---|---|
| `pages/liga-colombiana.vue` | 97 |
| `components/publico/PaginaCompeticionPublica.vue` | 84 |
| `pages/index.vue` | 59 |
| `server/utils/tablaPosicionesDimayor.ts` | 50 |
| `pages/seleccion-colombia.vue` | 48 |
| `pages/colombianos-en-europa.vue` | 34 |
| `data/historiasJugadoresEuropa.ts` | 31 |
| `data/jugadoresColombianosEuropa.ts` | 28 |
| `data/seleccionColombia2026.ts` | 21 |
| `server/api/internal/futbol/tabla-dimayor.post.ts` | 20 |
| `pages/equipos/[slug].vue` | 19 |
| `server/utils/proveedoresFutbol/sincronizadorCalendarioColombiano.ts` | 17 |
| `server/utils/competicionesPublicas.ts` | 17 |
| `config/fuentesFutbolColombiano.json` | 17 |
| `components/publico/PlantillaPartidoSeo.vue` | 17 |

Otros ~60 archivos con 1 a 14 menciones (sitemaps, SEO, analítica, zona horaria,
agenda de redes, instrucciones de redacción de IA).

### 5.2 Reglas rígidas en el código y la base [verificado]

- Las tablas de fútbol tienen restricciones `check (competition_slug in ('liga-betplay','torneo-betplay','copa-colombia'))`
  (migración `20261005101132`, `20261007051308`). Para México hay que ampliarlas.
- Se asume **20 equipos** en Liga BetPlay y **16** en Torneo (`equiposEsperados`,
  validaciones de 190/120 partidos, fase "Todos contra todos"). **Liga MX tiene 18
  equipos**, fase regular + Liguilla. Hay que parametrizar esos números.
- La temporada se llama `2026-II`; Liga MX usa **Apertura y Clausura** (otra convención).
- Las tablas se llaman `colombian_league_*`. No hace falta renombrarlas: se añade
  `site`/`competition_slug` y se conservan los nombres (evita una migración riesgosa).
- Fuente de la tabla: se raspa `dimayor.com.co`. Para México se necesita otra
  (proveedor de datos o sitio oficial de la Liga MX).
- Zona horaria `America/Bogota` fija en agenda, rangos de mes y programación social.
  México (CDMX) es UTC−6 todo el año; Bogotá UTC−5. **[por verificar]** que ninguna
  zona de Liga MX use horario distinto en esas fechas.

### 5.3 Proveedores de datos de fútbol

- Hoy: API-Football (principal) y Goal API (respaldo), más TheSportsDB para resultados.
- API-Football suele numerar Liga MX con el id 262 y Liga MX Femenil 673.
  **[por verificar]**: confirmarlo contra la lista de ligas de la cuenta.
- Goal API usa IDs propios (ver `ligasPrioritariasGoal.ts`). **[por verificar]** los de México.
- Cuota diaria: el presupuesto se reparte entre dos sitios (tabla
  `football_provider_daily_usage`). Hay que medir si alcanza antes de activar.
- Tabla de posiciones de México: usar `/standings` del proveedor (ya existe en el
  adaptador) en lugar de raspar una web; así no se escribe un scraper nuevo.

### 5.4 Endpoints y utilidades

| Pieza | Cambio |
|---|---|
| `/api/articulos`, `/api/articulos/destacada` | Filtro `site` (desde el host) |
| `/api/liga-colombiana` | Se generaliza a `/api/liga/[sitio]` (o parámetro `competiciones`) |
| `/api/competiciones`, `/api/equipos`, `/api/jornadas`, `/api/partidos-seo`, `/api/resultados` | Parámetro `site` |
| `/api/futbol/clasificacion`, `/fixtures` | Ligas según el sitio |
| `/api/internal/futbol/*` (tabla, calendario, liga-resultados, fixtures) | Reciben `site`; cada uno sincroniza las ligas de ese sitio |
| `/api/internal/codex/*` | La corrida declara el `site` y solo escribe ahí |
| `/api/agentes/redes/v1` | Las llaves de agente llevan `site` permitido |
| Sitemaps (11 rutas), `feed.xml`, `news-sitemap`, `robots.txt` | Generados por host, con URLs `mx.pont3la10.com` |
| `grafoEntidadesSeo`, `clasificacionLigaPublica`, `resultadosLigaPublica` | Reconocer nombres de ligas mexicanas |

### 5.5 Esquema de base de datos (migraciones, en orden)

1. Tabla `sites` (`co`, `mx`: nombre, dominio, zona horaria, idioma, moneda no aplica).
2. Columna `site text not null default 'co'` en: `articles`, `categories`,
   `editorial_tags`, `special_modules`, `editorial_home_feature`,
   `editorial_codex_runs` / `proposals` / `agenda_candidates`,
   `colombian_league_fixtures` / `standings` / `snapshots`,
   `football_fixtures_today`, `football_standings_today`, `football_provider_*`,
   `social_*` (publicaciones, programadas, claves de agente).
   **`media_files`, `user_*`, `editorial_permissions` NO llevan `site`** (compartidos).
3. Ampliar las restricciones de `competition_slug` y los conteos de equipos por competición.
4. Políticas RLS: la lectura pública filtra por `site`; el servidor valida el `site` del usuario/llave.
5. Insertar categorías y temas de México (ver §6).

Regla del proyecto: **primero migración, luego código** (como en las migraciones anteriores).

---

## 6. Contenido editorial de México

### 6.1 Categorías y temas

| Colombia | México |
|---|---|
| `futbol-colombiano` | `futbol-mexicano` |
| tema `liga-betplay` | tema `liga-mx` |
| tema `seleccion-colombia` (en sitemap: categoría `colombia`) | tema `seleccion-mexicana` |
| tema `colombianos-en-europa` | tema `mexicanos-en-el-exterior` |
| `futbol-mundial`, tecnología, gaming, tendencias, opinión | **compartidas** (misma categoría, filtradas por `site`) |

Decisión simple: cada artículo tiene **un** `site`. Si un contenido sirve a los dos
(por ejemplo un Mundial), se publica dos veces con textos adaptados, o se marca
`site = 'ambos'` **[decisión pendiente]**.

### 6.2 Datos propios que hay que investigar y cargar (tarea de investigación)

| Dato | Equivale a (Colombia) | Fuente a usar |
|---|---|---|
| 18 clubes de Liga MX con escudo, estadio, ciudad, fundación, palmarés, redes | `config/fuentesFutbolColombiano.json` (20 clubes) y `equiposLigaPublicos` | Sitio oficial de la Liga MX y de cada club |
| Selección Mexicana: convocatoria, calendario, cuerpo técnico | `data/seleccionColombia2026.ts` | FMF (fmf.mx) |
| Mexicanos en el exterior: fichas verificadas | `data/jugadoresColombianosEuropa.ts` (+ historias) | Web oficial de cada club + FMF |
| Cuentas oficiales (X, Instagram, Facebook, YouTube) de liga, selección y clubes | `cuentasOficiales` | Fichas oficiales |
| Periodistas y medios de referencia | `periodistas` | Búsqueda verificada |
| Banco evergreen México | `config/bancoEvergreen.json` | Datos del propio sitio |
| Canales de transmisión | `colombian_match_broadcast_options` | Anuncios oficiales de la liga |

Hallazgos de la investigación web (2026-11-19) **[por verificar antes de usar]**:

- Liga MX varonil: 18 equipos; el Apertura 2026 mantiene calificación directa de los
  ocho primeros a la Liguilla (una fuente dice que no hay play-in en la varonil).
- Liga MX Femenil: formato nuevo en el Apertura 2026 (dos grupos de nueve, 14 jornadas,
  liguilla de ocho).
- Selección Mexicana: convocó un récord de jugadores en Europa para el Mundial 2026 (13 en
  ocho ligas según un medio). Varios traspasos cambiaron después del Mundial; **no
  se escribe ningún club de jugador sin contrastarlo con su fuente oficial el día de la carga**.
- Un proveedor externo (TheStatsAPI) ofrece Liga MX con id `comp_298265`; no es
  proveedor actual del proyecto.

Importante: no se usan nombres de patrocinador de la liga en rutas ni títulos
("Liga MX", no el nombre comercial), igual que se evita atar Colombia a un patrocinador.

---

## 7. Tareas programadas: inventario y versión de México

### 7.1 Hoy (todas son de Colombia) [verificado]

| # | Tarea | Dónde corre | Cuándo (Bogotá) | Qué hace |
|---|---|---|---|---|
| 1 | `pont3la10-corrida-futbol-claude` | Tarea de Claude, en tu PC | 11:30 y 19:30 | Investiga, redacta y programa 8–12 artículos |
| 2 | Corrida editorial Codex | Automatización de Codex | 08:00 y 15:00 | Igual, con Codex (config `automatizacionEditorial.json`) |
| 3 | `pont3la10-video-diario` | Tarea de Claude, en tu PC | 18:00 | Guion y proyecto del video diario |
| 4 | `pont3la10-programador-social` | pg_cron en Supabase | Cada minuto | Despacha publicaciones sociales programadas |
| 5 | Sincronizador de fútbol local | `workers/sincronizar_futbol_local.mjs`, en tu PC | Fixtures cada 15 s, resultados cada 15 min, tabla cada 60 s, calendario 1 vez | Trae partidos, tabla y calendario (solo Colombia) |
| 6 | Latido y worker de ingestas | `workers/latido_worker.mjs`, `procesar_ingestas_durable.mjs` | Continuo | Transcripciones y salud |
| 7 | `seo-sitemap-health` | GitHub Actions | Lunes 08:17 UTC | Audita sitemaps |
| 8 | `performance-cwv-production` | GitHub Actions | Martes 14:17 UTC | Mide Core Web Vitals |
| 9 | Plugin `programadorSocial.ts` | Servidor local | Continuo | Cola de redes en el PC |
| 10 | Plugin `monitor404Publico.ts` | Servidor | Continuo | Detecta 404 |

### 7.2 Para México (todas **distintas**, nunca compartidas con las de Colombia)

| Tarea nueva | Basada en | Propuesta de horario | Qué cambia |
|---|---|---|---|
| `pont3la10-mx-corrida-futbol-mexicano` (Claude) | #1 | 09:30 y 17:30 hora Bogotá (8:30 y 16:30 en CDMX) | Skill `pont3la10-futbol-mexicano-run`, fuentes de México, `site = mx` |
| Corrida editorial Codex MX | #2 | Distinta de la de Colombia (no el mismo minuto) | `config/automatizacionEditorialMx.json` propio: `maxCorridasPorDia`, `enfoque`, `skill`, `prompt` |
| `pont3la10-mx-video-diario` (opcional) | #3 | 20:00 Bogotá, para no chocar con el de Colombia | Otro guion, otra rúbrica, carpeta `videos/diario-mx/` |
| Sincronizador de fútbol MX | #5 | Mismos intervalos, otro proceso | Ligas 262 (y las que se definan), tabla desde el proveedor |
| Programador social | #4 | Sin cambio (ya corre cada minuto) | Despacha por `site` y por cuenta |
| Auditoría de sitemaps y rendimiento | #7, #8 | Mismo calendario | Revisar también `mx.pont3la10.com` |
| Monitor de 404 | #10 | Sin cambio | Registrar el host |

Por qué horarios distintos: las corridas, el video y el PC comparten recursos (cuota
del proveedor, CPU, estudio de video, límite de publicaciones). Si corrieran a la misma
hora se pisarían.

Para que sean realmente independientes, cada tarea lleva: su prompt, su archivo de
configuración, su lista de fuentes, su cupo diario, su registro en `editorial_codex_runs`
con `site`, y su propia llave de agente con alcance solo a `mx`.

---

## 8. Qué se comparte y qué se separa

### Se comparte (cero trabajo extra o casi)

- Código, repositorio, despliegue, build y pruebas.
- Proyecto Supabase, autenticación, roles, permisos, MFA y auditoría.
- Panel de administración y editor (con selector de sitio).
- Biblioteca de medios y procesador de imágenes.
- Infraestructura de redes: cola, cola de publicaciones, renderizador de tarjetas,
  carruseles, programación masiva, agentes API/MCP.
- Estudio de video, generador de proyectos, música, rúbrica, miniaturas (con
  configuración por sitio).
- Utilidades SEO: sitemaps, schema.org, grafo de entidades, enlaces internos.
- Componentes de interfaz (tarjetas, tablas, escudos, marcadores, carruseles).
- Resultados genéricos (baloncesto, béisbol, tenis, partidos de otras ligas).
- Páginas legales y política editorial.
- Autores y equipo editorial.
- Fútbol internacional y categorías de tecnología, gaming, tendencias, opinión.
- Un único registro de uso de cuota del proveedor (para vigilar el techo).

### Se separa (México)

- Artículos, categorías, temas, especiales y portada.
- Competiciones, clubes, jugadores, partidos y tabla.
- Fuentes del proveedor (ligas), raspadores y zona horaria.
- Lista de fuentes y clubes de las corridas editoriales, bancos evergreen, prompts, skills.
- Navegación, textos y marca de la cabecera/pie.
- Canal de transmisión ("dónde ver").
- Cuentas y destinos de redes (si decides separarlas).
- Estadísticas, Search Console y sitemaps por host.
- **Todas las tareas programadas.**

---

## 9. Redes sociales

Dijiste "todo el contenido a la misma cuenta". El plan lo interpreta así:
**mismo panel y mismo usuario**, y las publicaciones de México salen a las **mismas
páginas** de Facebook/Instagram/X (`@pont3ladiez`, "Pont3 la 10 Centro Digital",
`@Pont3la10`) con firma/enlace a `mx.pont3la10.com`.

Alternativa posterior, sin tocar el código: crear páginas separadas para México y
registrarlas como otro destino. **[decisión pendiente]**

---

## 10. Riesgos

1. **Cuota del proveedor de fútbol**: dos sitios comparten el presupuesto diario.
2. **Datos de México**: la mayor parte del trabajo real es cargarlos y verificarlos;
   las páginas son lo fácil.
3. **Asunciones de Colombia en código y base de datos** (20/16 equipos, `2026-II`,
   "Todos contra todos", `America/Bogota`): hay que revisar ~80 archivos uno por uno.
4. **SEO**: contenido duplicado entre subdominios; se evita con `canonical` por host,
   `hreflang es-CO` / `es-MX` y sitemaps separados.
5. **PC como scheduler**: dos sitios aumentan la carga del PC; el plan de VPS ya
   existente cobra más sentido.
6. **Roles y RLS**: un error de política podría mostrar contenido de un sitio en el otro.
7. **Datos que cambian**: traspasos, entrenadores, formato de torneo.

---

## 11. Fases propuestas (cada una con su PR y sin romper Colombia)

| Fase | Entrega | Señal de "hecho" |
|---|---|---|
| 0 | Decisiones abiertas (§12) y verificar IDs de ligas en los proveedores | Respuestas por escrito |
| 1 | Migración `sites` + columna `site` por defecto `co`; `useSitio()` y detección por host | Colombia idéntica, pruebas verdes |
| 2 | Parametrizar marca, navegación, textos y zona horaria; sitemaps por host | `mx.pont3la10.com` carga con marca y menú de México (sin datos aún) |
| 3 | Panel: selector de sitio; contenidos y taxonomías por sitio | Se puede crear y publicar un artículo de México |
| 4 | Datos de fútbol: ligas, tabla, calendario y clubes de Liga MX | Tabla y partidos reales en `/liga-mx` |
| 5 | Selección Mexicana y Mexicanos en el exterior (investigación y fichas) | Páginas con fuentes verificadas |
| 6 | Tareas programadas de México (corridas, sincronizador, video opcional) | Corrida de prueba en modo sombra, sin publicar |
| 7 | Redes y agentes por sitio; auditorías y monitor por host | Publicación de prueba aprobada por ti |
| 8 | Lanzamiento: DNS, Search Console, GA4 | Sitio en producción |

---

## 12. Decisiones pendientes

1. ¿Se publican los contenidos comunes (Mundial, internacional) en un solo sitio o en ambos?
2. ¿Redes: las mismas páginas, o páginas nuevas para México?
3. ¿GA4: el mismo ID filtrado por host o un flujo nuevo?
4. ¿Hay video diario de México o solo corridas editoriales?
5. ¿Femenil entra desde el primer día o en una segunda etapa?
6. ¿Dónde está desplegado el sitio (Vercel u otro) para dar de alta el subdominio?

## Corrección 2026-11-19: origen por sitio en datos estructurados

Las páginas compartidas (artículo, autores, resultados, Partidos de hoy general, Noticias y legales) armaban URLs
absolutas, `@id` y migas de JSON-LD con `siteUrl` (www). En México apuntaban a Colombia. Ahora usan
`useOrigenSitio()` (`composables/useOrigenSitio.ts`): Colombia conserva el origen configurado; México usa
`https://mx.pont3la10.com`.
