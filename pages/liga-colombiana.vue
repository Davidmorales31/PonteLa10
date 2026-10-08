<script setup lang="ts">
import type { ResumenArticuloPublico } from '~/types/contenidoEditorial'
import { construirUrlAbsoluta } from '~/utils/seo'
import { etiquetaEstadoSeoPartido } from '~/utils/schemaPartidoSeo'
import type { EvaluacionFrescuraDeportiva } from '~/utils/frescuraDatosDeportivos'

interface PartidoLiga {
  slug: string
  competencia: string
  temporada: string
  jornada: string | null
  fechaIso: string
  local: string
  visitante: string
  estado: string
  golesLocal: number | null
  golesVisitante: number | null
  estadio: string | null
  ciudad: string | null
  fuenteOficialUrl: string | null
  escudoLocal: string | null
  escudoVisitante: string | null
  equipoLocalSlug?: string
  equipoVisitanteSlug?: string
  verificadoEn: string
}

interface PosicionLiga {
  competencia: string
  temporada: string
  fase: string
  equipoClave: string
  equipo: string
  posicion: number
  jugados: number
  ganados: number
  empatados: number
  perdidos: number
  golesFavor: number
  golesContra: number
  diferencia: number
  puntos: number
  escudo: string | null
  verificadoEn: string
}

interface RespuestaLiga {
  estado: 'disponible' | 'sin_datos'
  partidos: PartidoLiga[]
  tabla: PosicionLiga[]
  frescuraTablas: Record<string, EvaluacionFrescuraDeportiva>
  actualizadoEn: string | null
  consultadoEn: string
}

const configuracion = useRuntimeConfig()
const respuestaLigaVacia: RespuestaLiga = {
  estado: 'sin_datos',
  partidos: [],
  tabla: [],
  frescuraTablas: {},
  actualizadoEn: null,
  consultadoEn: ''
}
const { data: datosLiga } = await useFetch<RespuestaLiga>('/api/liga-colombiana', {
  default: (): RespuestaLiga => respuestaLigaVacia,
  key: 'liga-colombiana-hub'
})
const { data: noticias } = await useFetch<ResumenArticuloPublico[]>(
  '/api/articulos?tema=liga-betplay&limite=16',
  { default: () => [], key: 'noticias-liga-betplay' }
)
useCachePublica('tabla')

const escudosFallidos = ref<string[]>([])
const liga = computed(() => datosLiga.value || respuestaLigaVacia)
const noticiaPrincipal = computed(() => noticias.value?.[0] || null)
const ultimasNoticias = computed(() => noticias.value?.slice(1) || [])
const tablaLiga = computed(() => liga.value.tabla.filter(fila => fila.competencia === 'liga-betplay'))
const tablaTorneo = computed(() => liga.value.tabla.filter(fila => fila.competencia === 'torneo-betplay'))
const fasesLiga = computed(() => agruparTablaPorFase(tablaLiga.value))
const fasesTorneo = computed(() => agruparTablaPorFase(tablaTorneo.value))
const competiciones = ['liga-betplay', 'torneo-betplay', 'copa-colombia']
const hoyBogota = computed(() => fechaEnBogota(liga.value.consultadoEn || new Date().toISOString()))
const gruposCalendario = computed(() => {
  const inicioHoy = Date.parse(`${hoyBogota.value}T05:00:00.000Z`)
  const inicioOchoDias = inicioHoy + 8 * 24 * 60 * 60 * 1000
  const inicioTreintaDias = inicioHoy + 31 * 24 * 60 * 60 * 1000
  const partidos = liga.value.partidos.filter(partido => competiciones.includes(partido.competencia))
  const hoy = partidos.filter(partido => fechaEnBogota(partido.fechaIso) === hoyBogota.value).sort(ordenarPorHora)
  const semana = partidos.filter((partido) => {
    const inicio = Date.parse(partido.fechaIso)
    return inicio >= inicioHoy + 24 * 60 * 60 * 1000 && inicio < inicioOchoDias
  }).sort(ordenarPorHora).slice(0, 16)
  const mes = partidos.filter((partido) => {
    const inicio = Date.parse(partido.fechaIso)
    return inicio >= inicioOchoDias && inicio < inicioTreintaDias
  }).sort(ordenarPorHora).slice(0, 8)
  return [
    { id: 'hoy', titulo: 'Partidos de hoy', partidos: hoy },
    { id: 'siete-dias', titulo: 'Próximos 7 días', partidos: semana },
    { id: 'treinta-dias', titulo: 'Agenda de los siguientes 30 días', partidos: mes }
  ].filter(grupo => grupo.partidos.length)
})
const partidosRecientes = computed(() => liga.value.partidos
  .filter(partido => fechaEnBogota(partido.fechaIso) !== hoyBogota.value
    && /finish|full.?time|\bft\b|final/i.test(partido.estado || '')
    && Date.parse(partido.fechaIso) < Date.parse(liga.value.consultadoEn || new Date().toISOString()))
  .sort((a, b) => Date.parse(b.fechaIso) - Date.parse(a.fechaIso))
  .slice(0, 6))

function fechaPartido(valor: string) {
  return new Intl.DateTimeFormat('es-CO', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'America/Bogota'
  }).format(new Date(valor))
}

function fechaActualizacion(valor: string | null) {
  if (!valor || !Number.isFinite(Date.parse(valor))) return 'sin registro'
  return new Intl.DateTimeFormat('es-CO', {
    dateStyle: 'medium', timeStyle: 'short', timeZone: 'America/Bogota'
  }).format(new Date(valor))
}

function etiquetaCompetencia(slug: string) {
  if (slug === 'torneo-betplay') return 'Torneo BetPlay'
  if (slug === 'copa-colombia') return 'Copa Colombia'
  return 'Liga BetPlay'
}

function fechaEnBogota(valor: string) {
  const fecha = new Date(valor)
  if (Number.isNaN(fecha.getTime())) return ''
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Bogota', year: 'numeric', month: '2-digit', day: '2-digit'
  }).format(fecha)
}

function ordenarPorHora(a: PartidoLiga, b: PartidoLiga) {
  return Date.parse(a.fechaIso) - Date.parse(b.fechaIso)
    || prioridadCompetencia(a.competencia) - prioridadCompetencia(b.competencia)
}

function prioridadCompetencia(competencia: string) {
  return competencia === 'liga-betplay' ? 0 : competencia === 'copa-colombia' ? 1 : 2
}

function estadoVisible(estado: string) {
  return etiquetaEstadoSeoPartido(estado)
}

function agruparTablaPorFase(filas: PosicionLiga[]) {
  const grupos = new Map<string, PosicionLiga[]>()
  for (const fila of filas) {
    const grupo = grupos.get(fila.fase) || []
    grupo.push(fila)
    grupos.set(fila.fase, grupo)
  }
  return [...grupos.entries()].map(([fase, posiciones]) => ({
    fase,
    temporada: posiciones[0]?.temporada || '',
    verificadoEn: posiciones.reduce((ultimo, fila) => Date.parse(fila.verificadoEn) > Date.parse(ultimo)
      ? fila.verificadoEn : ultimo, posiciones[0]?.verificadoEn || ''),
    filas: posiciones.sort((a, b) => a.posicion - b.posicion)
  })).sort((a, b) => Date.parse(b.verificadoEn) - Date.parse(a.verificadoEn) || a.fase.localeCompare(b.fase, 'es'))
}

function iniciales(nombre: string) {
  return nombre.split(/\s+/).filter(Boolean).slice(0, 2).map(parte => parte[0]).join('').toLocaleUpperCase('es-CO')
}

function hayEscudo(url: string | null) {
  return Boolean(url && !escudosFallidos.value.includes(url))
}

function escudoFallido(url: string | null) {
  if (url && !escudosFallidos.value.includes(url)) escudosFallidos.value = [...escudosFallidos.value, url]
}

function rutaFichaEquipo(slug: string) {
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) ? `/equipos/${slug}` : null
}

useSeoPont3la10(() => ({
  titulo: 'Liga Colombiana: Liga BetPlay, Torneo y Copa Colombia | Pont3la10',
  descripcion: 'Sigue la Liga BetPlay y el fútbol colombiano: tabla de posiciones, calendario, resultados y noticias actualizadas de Liga A, Torneo B y Copa Colombia.',
  rutaCanonica: '/liga-colombiana',
  seccion: 'Fútbol colombiano',
  datosEstructurados: [{
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: 'Liga Colombiana',
    description: 'Noticias, tabla de posiciones, resultados y próximos partidos del fútbol profesional colombiano.',
    inLanguage: 'es-CO',
    url: construirUrlAbsoluta(String(configuracion.public.siteUrl), '/liga-colombiana'),
    mainEntity: {
      '@type': 'ItemList',
      itemListElement: (noticias.value || []).map((noticia, indice) => ({
        '@type': 'ListItem',
        position: indice + 1,
        name: noticia.titulo,
        url: construirUrlAbsoluta(String(configuracion.public.siteUrl), `/articulos/${noticia.slug}`)
      }))
    }
  }, {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Inicio', item: construirUrlAbsoluta(String(configuracion.public.siteUrl), '/') },
      { '@type': 'ListItem', position: 2, name: 'Liga colombiana', item: construirUrlAbsoluta(String(configuracion.public.siteUrl), '/liga-colombiana') }
    ]
  }]
}))
</script>

<template>
  <main class="pagina-contenido pagina-publica-medio modulo-futbol-colombia">
    <nav class="migas-navegacion" aria-label="Migas de pan">
      <ol>
        <li><NuxtLink to="/">Inicio</NuxtLink></li>
        <li><span class="miga-actual" aria-current="page">Liga colombiana</span></li>
      </ol>
    </nav>

    <header class="cabecera-pagina cabecera-noticias-medio cabecera-liga-colombia">
      <div>
        <p class="etiqueta-seccion">FÚTBOL COLOMBIANO</p>
        <h1>Liga Colombiana</h1>
        <p>Noticias, posiciones, resultados y próximos partidos de la Liga BetPlay, el Torneo BetPlay y la Copa Colombia.</p>
      </div>
      <nav class="navegacion-liga-colombia" aria-label="Secciones de fútbol colombiano">
        <a href="#liga-betplay">Liga BetPlay</a>
        <a href="#torneo-betplay">Torneo BetPlay</a>
        <a href="#partidos">Partidos</a>
        <a href="#posiciones">Tabla</a>
        <a href="#noticias">Noticias</a>
      </nav>
    </header>

    <nav class="competiciones-permanentes-liga" aria-label="Páginas permanentes de competiciones">
      <NuxtLink to="/competiciones/liga-betplay"><strong>Liga BetPlay</strong><span>Tabla, calendario y resultados <span aria-hidden="true">→</span></span></NuxtLink>
      <NuxtLink to="/competiciones/torneo-betplay"><strong>Torneo BetPlay</strong><span>Equipos, jornadas y resultados <span aria-hidden="true">→</span></span></NuxtLink>
      <NuxtLink to="/competiciones/copa-colombia"><strong>Copa Colombia</strong><span>Fases y próximos partidos <span aria-hidden="true">→</span></span></NuxtLink>
    </nav>

    <div class="grilla-principal-liga">
      <section class="columna-editorial-liga" aria-label="Actualidad de la Liga Colombiana">
        <article v-if="noticiaPrincipal" class="noticia-destacada-medio">
          <NuxtLink
            v-if="noticiaPrincipal.imagen"
            :to="`/articulos/${noticiaPrincipal.slug}`"
            class="imagen-noticia-destacada"
            tabindex="-1"
            aria-hidden="true"
          >
            <ImagenEditorialPublica
              :src="noticiaPrincipal.imagen"
              :alt="noticiaPrincipal.titulo"
              width="1280"
              height="720"
              :ancho-original="noticiaPrincipal.imagenAncho"
              sizes="(max-width: 760px) 100vw, 1280px"
              loading="eager"
              prioridad-alta
            />
          </NuxtLink>
          <div class="contenido-noticia-destacada">
            <p class="etiqueta-seccion">{{ noticiaPrincipal.categoria }} · ÚLTIMA HORA</p>
            <h2><NuxtLink :to="`/articulos/${noticiaPrincipal.slug}`">{{ noticiaPrincipal.titulo }}</NuxtLink></h2>
            <p>{{ noticiaPrincipal.resumen }}</p>
            <NuxtLink class="boton-leer-noticia" :to="`/articulos/${noticiaPrincipal.slug}`">Leer noticia <span aria-hidden="true">→</span></NuxtLink>
          </div>
        </article>
        <section v-else class="estado-vacio-articulos">
          <h2>Actualidad del fútbol colombiano</h2>
          <p>Las noticias de Liga A, Torneo B y Copa Colombia aparecerán aquí cuando sean publicadas por el equipo editorial.</p>
          <NuxtLink class="boton-primario" to="/articulos?categoria=futbol-colombiano">Ver fútbol colombiano</NuxtLink>
        </section>

        <PublicidadAdsterraSlot formato="leaderboard" contexto="liga colombiana" />

        <section id="partidos" class="bloque-liga-colombia" aria-labelledby="titulo-partidos-liga">
          <div class="encabezado-noticias-listado">
            <div>
              <p class="etiqueta-seccion">CALENDARIO Y MARCADORES</p>
              <h2 id="titulo-partidos-liga">Próximos partidos</h2>
            </div>
            <NuxtLink to="/partidos-hoy">Partidos de hoy <span aria-hidden="true">→</span></NuxtLink>
          </div>
          <div v-if="gruposCalendario.length" class="grupos-calendario-liga">
            <section v-for="grupo in gruposCalendario" :key="grupo.id" class="grupo-calendario-liga" :aria-label="grupo.titulo">
              <h3>{{ grupo.titulo }}</h3>
              <div class="lista-partidos-liga">
                <article v-for="partido in grupo.partidos" :key="`${partido.competencia}-${partido.local}-${partido.fechaIso}`" class="tarjeta-partido-liga">
                  <div class="meta-partido-liga">
                    <span>{{ etiquetaCompetencia(partido.competencia) }}<template v-if="partido.jornada"> · {{ partido.jornada }}</template></span>
                    <span class="estado-partido-liga" :class="{ 'estado-partido-liga--vivo': estadoVisible(partido.estado) === 'EN VIVO' }">{{ estadoVisible(partido.estado) }}</span>
                  </div>
                  <p class="fecha-partido-liga">{{ fechaPartido(partido.fechaIso) }}</p>
                  <div class="equipos-partido-liga">
                    <span class="equipo-liga">
                      <NuxtLink v-if="hayEscudo(partido.escudoLocal)" :to="`/partidos/${partido.slug}`" :aria-label="`Ficha de ${partido.local} vs ${partido.visitante}`">
                        <EscudoEquipoPublico :src="partido.escudoLocal || ''" :alt="`Escudo de ${partido.local}`" :width="30" :height="30" sizes="30px" loading="lazy" @error="escudoFallido(partido.escudoLocal)" />
                      </NuxtLink>
                      <b v-else class="escudo-fallback" aria-hidden="true">{{ iniciales(partido.local) }}</b>
                      <strong><NuxtLink v-if="partido.equipoLocalSlug" :to="`/equipos/${partido.equipoLocalSlug}`">{{ partido.local }}</NuxtLink><template v-else>{{ partido.local }}</template></strong>
                    </span>
                    <span class="versus-liga">{{ partido.golesLocal !== null && partido.golesVisitante !== null ? `${partido.golesLocal}–${partido.golesVisitante}` : 'vs' }}</span>
                    <span class="equipo-liga visitante">
                      <NuxtLink v-if="hayEscudo(partido.escudoVisitante)" :to="`/partidos/${partido.slug}`" :aria-label="`Ficha de ${partido.local} vs ${partido.visitante}`">
                        <EscudoEquipoPublico :src="partido.escudoVisitante || ''" :alt="`Escudo de ${partido.visitante}`" :width="30" :height="30" sizes="30px" loading="lazy" @error="escudoFallido(partido.escudoVisitante)" />
                      </NuxtLink>
                      <b v-else class="escudo-fallback" aria-hidden="true">{{ iniciales(partido.visitante) }}</b>
                      <strong><NuxtLink v-if="partido.equipoVisitanteSlug" :to="`/equipos/${partido.equipoVisitanteSlug}`">{{ partido.visitante }}</NuxtLink><template v-else>{{ partido.visitante }}</template></strong>
                    </span>
                  </div>
                  <nav class="enlaces-partido-liga" :aria-label="`Ficha de ${partido.local} vs ${partido.visitante}`">
                    <NuxtLink :to="`/partidos/${partido.slug}`">Ficha del partido</NuxtLink>
                    <a v-if="partido.fuenteOficialUrl" :href="partido.fuenteOficialUrl" target="_blank" rel="noopener noreferrer">Programación DIMAYOR</a>
                  </nav>
                  <p v-if="partido.estadio || partido.ciudad" class="sede-partido-liga">{{ [partido.estadio, partido.ciudad].filter(Boolean).join(' · ') }}</p>
                </article>
              </div>
            </section>
          </div>
          <div v-else class="estado-vacio-articulos">
            <h3>Calendario en actualización</h3>
            <p>No hay partidos verificados en el rango publicado. Consulta el <a href="https://dimayor.com.co/" target="_blank" rel="noopener noreferrer">calendario oficial de DIMAYOR</a>.</p>
          </div>
        </section>

        <section v-if="partidosRecientes.length" class="bloque-liga-colombia">
          <div class="encabezado-noticias-listado"><h2>Resultados recientes</h2></div>
          <div class="lista-partidos-liga">
            <article v-for="partido in partidosRecientes" :key="`${partido.competencia}-${partido.visitante}-${partido.fechaIso}`" class="tarjeta-partido-liga resultado-reciente-liga">
              <span class="meta-resultado-liga">{{ etiquetaCompetencia(partido.competencia) }} · {{ fechaPartido(partido.fechaIso) }}</span>
              <div class="equipos-partido-liga">
                <span class="equipo-liga">
                  <EscudoEquipoPublico v-if="hayEscudo(partido.escudoLocal)" :src="partido.escudoLocal || ''" :alt="`Escudo de ${partido.local}`" :width="30" :height="30" sizes="30px" loading="lazy" @error="escudoFallido(partido.escudoLocal)" />
                  <b v-else class="escudo-fallback" aria-hidden="true">{{ iniciales(partido.local) }}</b>
                  <strong><NuxtLink v-if="partido.equipoLocalSlug" :to="`/equipos/${partido.equipoLocalSlug}`">{{ partido.local }}</NuxtLink><template v-else>{{ partido.local }}</template></strong>
                </span>
                <span class="versus-liga">{{ partido.golesLocal ?? '—' }}–{{ partido.golesVisitante ?? '—' }}</span>
                <span class="equipo-liga visitante">
                  <EscudoEquipoPublico v-if="hayEscudo(partido.escudoVisitante)" :src="partido.escudoVisitante || ''" :alt="`Escudo de ${partido.visitante}`" :width="30" :height="30" sizes="30px" loading="lazy" @error="escudoFallido(partido.escudoVisitante)" />
                  <b v-else class="escudo-fallback" aria-hidden="true">{{ iniciales(partido.visitante) }}</b>
                  <strong><NuxtLink v-if="partido.equipoVisitanteSlug" :to="`/equipos/${partido.equipoVisitanteSlug}`">{{ partido.visitante }}</NuxtLink><template v-else>{{ partido.visitante }}</template></strong>
                </span>
              </div>
              <nav class="enlaces-partido-liga" :aria-label="`Más información de ${partido.local} vs ${partido.visitante}`">
                <NuxtLink :to="`/partidos/${partido.slug}`">Ver partido y resultado</NuxtLink>
              </nav>
            </article>
          </div>
        </section>
      </section>

      <aside class="columna-tabla-liga" aria-label="Posiciones de la Liga Colombiana">
        <section id="posiciones" class="panel-noticias-lateral panel-tabla-liga">
          <div class="encabezado-panel-lateral">
            <div><p class="etiqueta-seccion">{{ tablaLiga[0]?.temporada || 'Liga BetPlay' }}</p><h2>Tabla de posiciones</h2></div>
          </div>
          <p v-if="liga.frescuraTablas['liga-betplay'] && !liga.frescuraTablas['liga-betplay'].actualizado" class="aviso-frescura-liga" role="status">
            Tabla pendiente de actualización. Última verificación: {{ fechaActualizacion(liga.frescuraTablas['liga-betplay'].verificadoEn) }} (hora de Colombia).
          </p>
          <div v-if="fasesLiga.length" class="tablas-por-fase-liga">
            <section v-for="grupo in fasesLiga" :key="grupo.fase" class="fase-tabla-liga">
              <h3>{{ grupo.fase }}</h3>
              <div class="tabla-liga-scroll">
                <table>
                  <caption>{{ grupo.fase }} · {{ grupo.temporada }}</caption>
                  <thead><tr><th scope="col">Pos.</th><th scope="col">Equipo</th><th scope="col">PJ</th><th scope="col">DG</th><th scope="col">Pts</th></tr></thead>
                  <tbody>
                    <tr v-for="fila in grupo.filas" :key="`${fila.fase}-${fila.equipoClave}`">
                      <td>{{ fila.posicion }}</td>
                      <th scope="row"><span class="equipo-tabla-liga"><EscudoEquipoPublico v-if="hayEscudo(fila.escudo)" :src="fila.escudo || ''" :alt="`Escudo de ${fila.equipo}`" :width="30" :height="30" sizes="30px" loading="lazy" @error="escudoFallido(fila.escudo)" /><b v-else class="escudo-fallback" aria-hidden="true">{{ iniciales(fila.equipo) }}</b><NuxtLink v-if="rutaFichaEquipo(fila.equipoClave)" :to="rutaFichaEquipo(fila.equipoClave) || '/liga-colombiana'">{{ fila.equipo }}</NuxtLink><template v-else>{{ fila.equipo }}</template></span></th>
                      <td>{{ fila.jugados }}</td><td>{{ fila.diferencia > 0 ? `+${fila.diferencia}` : fila.diferencia }}</td><td><strong>{{ fila.puntos }}</strong></td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </section>
          </div>
          <p v-else class="estado-tabla-liga">La clasificación verificada de Liga BetPlay todavía no está disponible.</p>
          <NuxtLink class="enlace-tabla-liga" to="/resultados/futbol">Ver resultados de fútbol <span aria-hidden="true">→</span></NuxtLink>
        </section>

        <PublicidadAdsterraSlot formato="nativo" contexto="tabla liga colombiana" />

        <section id="torneo-betplay" class="panel-noticias-lateral panel-tabla-liga">
          <div class="encabezado-panel-lateral"><div><p class="etiqueta-seccion">{{ tablaTorneo[0]?.temporada || 'Segunda división' }}</p><h2>Torneo BetPlay</h2></div></div>
          <p v-if="liga.frescuraTablas['torneo-betplay'] && !liga.frescuraTablas['torneo-betplay'].actualizado" class="aviso-frescura-liga" role="status">
            Tabla pendiente de actualización. Última verificación: {{ fechaActualizacion(liga.frescuraTablas['torneo-betplay'].verificadoEn) }} (hora de Colombia).
          </p>
          <div v-if="fasesTorneo.length" class="tablas-por-fase-liga">
            <section v-for="grupo in fasesTorneo" :key="grupo.fase" class="fase-tabla-liga">
              <h3>{{ grupo.fase }}</h3>
              <div class="tabla-liga-scroll">
                <table>
                  <caption>{{ grupo.fase }} · {{ grupo.temporada }}</caption>
                  <thead><tr><th scope="col">Pos.</th><th scope="col">Equipo</th><th scope="col">PJ</th><th scope="col">DG</th><th scope="col">Pts</th></tr></thead>
                  <tbody><tr v-for="fila in grupo.filas" :key="`${fila.fase}-${fila.equipoClave}`"><td>{{ fila.posicion }}</td><th scope="row"><span class="equipo-tabla-liga"><EscudoEquipoPublico v-if="hayEscudo(fila.escudo)" :src="fila.escudo || ''" :alt="`Escudo de ${fila.equipo}`" :width="30" :height="30" sizes="30px" loading="lazy" @error="escudoFallido(fila.escudo)" /><b v-else class="escudo-fallback" aria-hidden="true">{{ iniciales(fila.equipo) }}</b><NuxtLink v-if="rutaFichaEquipo(fila.equipoClave)" :to="rutaFichaEquipo(fila.equipoClave) || '/liga-colombiana'">{{ fila.equipo }}</NuxtLink><template v-else>{{ fila.equipo }}</template></span></th><td>{{ fila.jugados }}</td><td>{{ fila.diferencia > 0 ? `+${fila.diferencia}` : fila.diferencia }}</td><td><strong>{{ fila.puntos }}</strong></td></tr></tbody>
                </table>
              </div>
            </section>
          </div>
          <p v-else class="estado-tabla-liga">La tabla del Torneo BetPlay aparecerá aquí cuando haya datos públicos verificados.</p>
        </section>
      </aside>
    </div>

    <section id="liga-betplay" class="bloque-liga-colombia seccion-noticias-liga">
      <div class="encabezado-noticias-listado"><div><p class="etiqueta-seccion">ACTUALIDAD</p><h2 id="noticias">Últimas noticias de Liga BetPlay y Copa Colombia</h2></div><NuxtLink to="/articulos?categoria=futbol-colombiano">Ver fútbol colombiano <span aria-hidden="true">→</span></NuxtLink></div>
      <div v-if="ultimasNoticias.length" class="grilla-noticias-medio">
        <article v-for="articulo in ultimasNoticias" :key="articulo.slug" class="tarjeta-noticia-medio">
          <NuxtLink v-if="articulo.imagen" :to="`/articulos/${articulo.slug}`" class="imagen-tarjeta-noticia-medio" tabindex="-1" aria-hidden="true">
            <ImagenEditorialPublica
              :src="articulo.imagen"
              :alt="articulo.titulo"
              width="640"
              height="360"
              :ancho-original="articulo.imagenAncho"
              sizes="(max-width: 760px) 100vw, 640px"
            />
          </NuxtLink>
          <div><p class="etiqueta-seccion">{{ articulo.categoria }}</p><h3><NuxtLink :to="`/articulos/${articulo.slug}`">{{ articulo.titulo }}</NuxtLink></h3><p class="meta-noticia-medio">{{ new Intl.DateTimeFormat('es-CO', { dateStyle: 'medium', timeZone: 'America/Bogota' }).format(new Date(articulo.publicadoEn)) }}</p></div>
        </article>
      </div>
      <p v-else class="estado-vacio-articulos">Aún no hay noticias publicadas bajo la etiqueta Liga BetPlay.</p>
      <p class="contenido-seo-liga">Consulta la actualidad de la Liga BetPlay Dimayor, la tabla de posiciones, las fechas del campeonato y los resultados del fútbol profesional colombiano. También encontrarás noticias de Copa Colombia y del Torneo BetPlay, con información que se actualiza cuando hay datos oficiales publicados.</p>
    </section>
  </main>
</template>

<style scoped>
.cabecera-liga-colombia { position: relative; overflow: hidden; min-height: 210px; align-content: end; border-radius: 12px; background: linear-gradient(125deg, #0b2341, #103c62 58%, #0b2341); padding: 28px; }
.cabecera-liga-colombia > div, .navegacion-liga-colombia { position: relative; z-index: 1; }
.cabecera-liga-colombia h1, .cabecera-liga-colombia p:not(.etiqueta-seccion) { color: #fff; }
body.tema-publico-azul main.modulo-futbol-colombia .cabecera-liga-colombia h1,
body.tema-publico-blanco main.modulo-futbol-colombia .cabecera-liga-colombia h1 { color: #fff; }
.cabecera-liga-colombia .etiqueta-seccion { color: #ffd343; }
body.tema-publico-azul main.modulo-futbol-colombia :is(h2, h3) { color: #edf3ff; }
body.tema-publico-blanco main.modulo-futbol-colombia :is(h2, h3) { color: #08204a; }
body.tema-publico-azul main.modulo-futbol-colombia .etiqueta-seccion { color: #78dcf4; }
body.tema-publico-blanco main.modulo-futbol-colombia .etiqueta-seccion { color: #145996; }
body.tema-publico-blanco main.modulo-futbol-colombia .cabecera-liga-colombia .etiqueta-seccion { color: #ffd343; }
main.modulo-futbol-colombia .encabezado-noticias-listado h2 { color: #08204a; }
main.modulo-futbol-colombia .encabezado-noticias-listado p { color: #145996; }
body.tema-publico-azul main.modulo-futbol-colombia .encabezado-noticias-listado h2 { color: #edf3ff; }
body.tema-publico-azul main.modulo-futbol-colombia .encabezado-noticias-listado p { color: #78dcf4; }
body.tema-publico-blanco main.modulo-futbol-colombia .encabezado-noticias-listado h2 { color: #08204a; }
body.tema-publico-blanco main.modulo-futbol-colombia .encabezado-noticias-listado p { color: #145996; }
.navegacion-liga-colombia { display: flex; flex-wrap: wrap; gap: 9px; margin-top: 18px; }
.navegacion-liga-colombia a { border: 1px solid rgba(255,255,255,.28); border-radius: 999px; color: #fff; padding: 8px 13px; text-decoration: none; }
.competiciones-permanentes-liga { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 12px; margin: 20px 0 24px; }
.competiciones-permanentes-liga a { display: grid; gap: 6px; padding: 16px 18px; border: 1px solid #294362; border-radius: 12px; background: #10243d; color: #edf3ff; text-decoration: none; transition: transform .18s ease, border-color .18s ease; }
.competiciones-permanentes-liga a:hover, .competiciones-permanentes-liga a:focus-visible { transform: translateY(-2px); border-color: #78dcf4; outline: 2px solid #78dcf4; outline-offset: 2px; }
.competiciones-permanentes-liga strong { font-size: 1.08rem; }
.competiciones-permanentes-liga a > span { color: #afc2db; font-size: .86rem; }
:global(body.tema-publico-blanco) .competiciones-permanentes-liga a { border-color: #dce5f1; background: #fff; color: #123252; }
:global(body.tema-publico-blanco) .competiciones-permanentes-liga a > span { color: #586980; }
.grilla-principal-liga { display: grid; grid-template-columns: minmax(0, 1.55fr) minmax(300px, .85fr); gap: 24px; margin-top: 24px; }
.columna-editorial-liga, .columna-tabla-liga { display: grid; align-content: start; gap: 22px; min-width: 0; }
.bloque-liga-colombia { margin-top: 32px; }
.encabezado-noticias-listado h2, .encabezado-panel-lateral h2 { margin: 0; }
.grupos-calendario-liga, .grupo-calendario-liga, .tablas-por-fase-liga { display: grid; gap: 12px; }
.grupo-calendario-liga > h3, .fase-tabla-liga > h3 { margin: 10px 0 0; font-size: 1rem; }
.lista-partidos-liga { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; }
.tarjeta-partido-liga, .panel-tabla-liga { border: 1px solid #294362; border-radius: 12px; background: #10243d; padding: 16px; }
.meta-partido-liga, .tarjeta-partido-liga > span, .fecha-partido-liga, .sede-partido-liga { color: #afc2db; font-size: .82rem; }
.meta-partido-liga { display: flex; justify-content: space-between; gap: 10px; color: #78dcf4; font-weight: 800; }
.estado-partido-liga { flex: 0 0 auto; border-radius: 999px; background: rgba(122,148,177,.18); padding: 3px 8px; font-size: .7rem; }
.estado-partido-liga--vivo { background: #b91c34; color: #fff; }
.fecha-partido-liga { margin: 10px 0; }
.equipos-partido-liga { display: grid; grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr); align-items: center; gap: 8px; }
.equipo-liga { display: flex; align-items: center; gap: 8px; min-width: 0; }
.equipo-liga strong { overflow-wrap: anywhere; }
.equipo-liga img, .equipo-tabla-liga img { width: 30px; height: 30px; object-fit: contain; flex: 0 0 auto; }
.equipo-liga.visitante { justify-content: flex-end; text-align: right; }
.versus-liga { color: #ffd343; font-weight: 900; }
.escudo-fallback { display: inline-grid; width: 30px; height: 30px; flex: 0 0 auto; place-items: center; border-radius: 50%; background: #17466b; color: #fff; font-size: .65rem; }
.sede-partido-liga { margin: 12px 0 0; }
.meta-resultado-liga { display: block; margin-bottom: 12px; color: #afc2db; font-size: .82rem; }
.enlaces-partido-liga { display: flex; gap: 14px; margin-top: 12px; }
.enlaces-partido-liga a { color: #78dcf4; font-size: .82rem; font-weight: 800; }
.tabla-liga-scroll { overflow-x: auto; }
.tabla-liga-scroll table { width: 100%; border-collapse: collapse; font-size: .82rem; }
.tabla-liga-scroll caption { text-align: left; padding: 0 0 10px; color: #afc2db; }
.tabla-liga-scroll th, .tabla-liga-scroll td { border-bottom: 1px solid rgba(157,176,201,.2); padding: 9px 5px; text-align: right; white-space: nowrap; }
.tabla-liga-scroll th:nth-child(2), .tabla-liga-scroll td:nth-child(2) { text-align: left; }
.equipo-tabla-liga { display: inline-flex; align-items: center; gap: 8px; white-space: normal; }
.estado-tabla-liga, .contenido-seo-liga { color: #afc2db; line-height: 1.7; }
.aviso-frescura-liga { margin: 0 0 12px; border-left: 3px solid #e6a100; border-radius: 6px; background: rgba(230,161,0,.12); padding: 10px 12px; color: #744b00; font-size: .88rem; line-height: 1.5; }
.enlace-tabla-liga { display: inline-block; margin-top: 12px; color: #78dcf4; font-weight: 800; }
.resultado-reciente-liga .equipos-partido-liga { padding: 10px 0; }
.resultado-reciente-liga .versus-liga { font-size: 1.1rem; }
.seccion-noticias-liga { margin-top: 36px; }
.contenido-seo-liga { max-width: 920px; margin-top: 24px; }
body.tema-publico-blanco .tarjeta-partido-liga, body.tema-publico-blanco .panel-tabla-liga { border-color: #dce5f1; background: #fff; color: #13253d; }
body.tema-publico-blanco .meta-partido-liga, body.tema-publico-blanco .tarjeta-partido-liga > span, body.tema-publico-blanco .fecha-partido-liga, body.tema-publico-blanco .sede-partido-liga, body.tema-publico-blanco .tabla-liga-scroll caption, body.tema-publico-blanco .estado-tabla-liga, body.tema-publico-blanco .contenido-seo-liga { color: #586980; }
body.tema-publico-blanco .enlaces-partido-liga a { color: #145996; }
body.tema-publico-blanco .estado-partido-liga { background: #e7eef7; color: #4b5f78; }
body.tema-publico-blanco .estado-partido-liga--vivo { background: #b91c34; color: #fff; }
body.tema-publico-blanco .meta-resultado-liga { color: #586980; }
body.tema-publico-blanco .tabla-liga-scroll th, body.tema-publico-blanco .tabla-liga-scroll td { border-color: #e2e8f0; }
body.tema-publico-azul .aviso-frescura-liga { color: #ffe2a6; }
@media (max-width: 820px) { .grilla-principal-liga { grid-template-columns: minmax(0, 1fr); } .lista-partidos-liga { grid-template-columns: minmax(0, 1fr); } .competiciones-permanentes-liga { grid-template-columns: minmax(0, 1fr); } }
@media (max-width: 520px) { .cabecera-liga-colombia { padding: 20px; } .pagina-publica-medio.modulo-futbol-colombia { width: min(100% - 24px, 1240px); } }
</style>
