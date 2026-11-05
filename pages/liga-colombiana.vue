<script setup lang="ts">
import { ArrowRight, CircleDot, History, Newspaper, Trophy } from '@lucide/vue'
import type { ResumenArticuloPublico } from '~/types/contenidoEditorial'
import type { PartidoLiga } from '~/types/partidosLiga'
import { construirUrlAbsoluta } from '~/utils/seo'
import { etiquetaEstadoSeoPartido } from '~/utils/schemaPartidoSeo'

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
  actualizadoEn: string | null
  consultadoEn: string
}

const configuracion = useRuntimeConfig()
const respuestaLigaVacia: RespuestaLiga = {
  estado: 'sin_datos',
  partidos: [],
  tabla: [],
  actualizadoEn: null,
  consultadoEn: ''
}
const { data: datosLiga } = await useFetch<RespuestaLiga>('/api/liga-colombiana', {
  default: (): RespuestaLiga => respuestaLigaVacia,
  key: 'liga-colombiana-hub'
})
const { data: noticias } = await useFetch<ResumenArticuloPublico[]>(
  '/api/articulos?tema=liga-betplay&limite=17',
  { default: () => [], key: 'noticias-liga-betplay-v2' }
)
useCachePublica('tabla')

const escudosFallidos = ref<string[]>([])
const liga = computed(() => datosLiga.value || respuestaLigaVacia)
const noticiasCarrusel = computed(() => noticias.value?.slice(0, 5) || [])
const ultimasNoticias = computed(() => noticias.value?.slice(5) || [])
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
    <MigasNavegacion :elementos="[{ etiqueta: 'Inicio', ruta: '/' }, { etiqueta: 'Liga colombiana' }]" />

    <header class="portada-liga-imagen">
      <img
        src="/images/celebracion-futbol-colombiano-1600.webp"
        srcset="/images/celebracion-futbol-colombiano-768.webp 768w, /images/celebracion-futbol-colombiano-1600.webp 1600w"
        sizes="(max-width: 800px) calc(100vw - 32px), 1240px"
        alt="Liga BetPlay DIMAYOR: el pulso del fútbol profesional colombiano, con accesos a posiciones, calendario, noticias y partidos de hoy."
        width="3000"
        height="1000"
        fetchpriority="high"
      >
      <nav class="enlaces-portada-mapa" aria-label="Accesos de la portada">
        <a class="enlace-portada-posiciones" href="#posiciones" aria-label="Ver posiciones" />
        <a class="enlace-portada-calendario" href="#partidos" aria-label="Ver calendario" />
        <a class="enlace-portada-noticias" href="#noticias" aria-label="Ver noticias" />
        <NuxtLink class="enlace-portada-partidos" to="/partidos-hoy" aria-label="Ver los partidos de hoy" />
      </nav>
    </header>

    <nav class="competiciones-permanentes-liga" aria-label="Competiciones del fútbol colombiano">
      <NuxtLink class="tarjeta-competicion tarjeta-competicion-liga" to="/competiciones/liga-betplay">
        <span class="escudo-competicion"><img src="/competencias/dimayor-liga-betplay.png" width="25" height="25" alt=""></span>
        <span class="texto-competicion"><strong>Liga BetPlay</strong><span>Primera división · tabla y resultados</span></span>
        <ArrowRight class="flecha-competicion" aria-hidden="true" />
      </NuxtLink>
      <NuxtLink class="tarjeta-competicion tarjeta-competicion-torneo" to="/competiciones/torneo-betplay">
        <span class="escudo-competicion"><img src="/competencias/dimayor-torneo-betplay.png" width="25" height="25" alt=""></span>
        <span class="texto-competicion"><strong>Torneo BetPlay</strong><span>Segunda división · fases y jornadas</span></span>
        <ArrowRight class="flecha-competicion" aria-hidden="true" />
      </NuxtLink>
      <NuxtLink class="tarjeta-competicion tarjeta-competicion-copa" to="/competiciones/copa-colombia">
        <span class="escudo-competicion"><img src="/competencias/dimayor-copa-betplay.png" width="25" height="25" alt=""></span>
        <span class="texto-competicion"><strong>Copa BetPlay</strong><span>El camino hacia el título</span></span>
        <ArrowRight class="flecha-competicion" aria-hidden="true" />
      </NuxtLink>
    </nav>

    <div class="grilla-principal-liga">
      <section class="columna-editorial-liga" aria-label="Actualidad de la Liga Colombiana">
        <PublicoCarruselNoticiasLiga :noticias="noticiasCarrusel" />

        <PublicidadAdsterraSlot formato="leaderboard" contexto="liga colombiana" />

        <section v-if="partidosRecientes.length" class="bloque-liga-colombia">
          <div class="encabezado-noticias-listado"><h2><History aria-hidden="true" /> Partidos recientes</h2></div>
          <div class="lista-partidos-liga">
            <TarjetaPartido
              v-for="partido in partidosRecientes"
              :key="`${partido.competencia}-${partido.visitante}-${partido.fechaIso}`"
              :partido="partido"
              :competencia="etiquetaCompetencia(partido.competencia)"
              :fecha="fechaPartido(partido.fechaIso)"
              :estado="estadoVisible(partido.estado)"
            />
          </div>
        </section>
      </section>

      <aside class="columna-tabla-liga" aria-label="Posiciones de la Liga Colombiana">
        <section id="posiciones" class="panel-noticias-lateral panel-tabla-liga">
          <div class="encabezado-panel-lateral">
            <div>
              <p class="etiqueta-seccion">{{ tablaLiga[0]?.temporada || 'Liga BetPlay' }}</p>
              <h2><Trophy aria-hidden="true" /> Tabla de posiciones</h2>
              <p v-if="fasesLiga[0]" class="subtitulo-tabla-liga">{{ fasesLiga[0].fase }} · {{ fasesLiga[0].temporada }}</p>
            </div>
            <NuxtLink class="enlace-tabla-completa-liga" to="/competiciones/liga-betplay">Ver tabla completa <ArrowRight aria-hidden="true" /></NuxtLink>
          </div>
          <div v-if="fasesLiga.length" class="tablas-por-fase-liga">
            <section v-for="grupo in fasesLiga.slice(0, 1)" :key="grupo.fase" class="fase-tabla-liga">
              <h3>{{ grupo.fase }}</h3>
              <div class="tabla-liga-scroll">
                <table>
                  <caption>{{ grupo.fase }} · {{ grupo.temporada }}</caption>
                  <thead><tr><th scope="col">Pos.</th><th scope="col">Equipo</th><th scope="col">PJ</th><th scope="col">DG</th><th scope="col">Pts</th></tr></thead>
                  <tbody>
                    <tr v-for="fila in grupo.filas.slice(0, 5)" :key="`${fila.fase}-${fila.equipoClave}`">
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
        </section>

        <PublicidadAdsterraSlot formato="nativo" contexto="tabla liga colombiana" />

        <section id="torneo-betplay" class="panel-noticias-lateral panel-tabla-liga">
          <div class="encabezado-panel-lateral"><div><p class="etiqueta-seccion">{{ tablaTorneo[0]?.temporada || 'Segunda división' }}</p><h2><CircleDot aria-hidden="true" /> Torneo BetPlay</h2></div></div>
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

    <section id="partidos" class="seccion-calendario-liga" aria-labelledby="titulo-partidos-liga">
      <header class="encabezado-calendario-liga">
        <div>
          <p class="etiqueta-seccion">Calendario y marcadores</p>
          <h2 id="titulo-partidos-liga">Próximos partidos</h2>
          <span class="subrayado-calendario-liga" aria-hidden="true" />
        </div>
        <NuxtLink to="/partidos-hoy">Partidos de hoy <ArrowRight aria-hidden="true" /></NuxtLink>
      </header>
      <div v-if="gruposCalendario.length" class="grupos-calendario-liga">
        <section
          v-for="grupo in gruposCalendario"
          :key="grupo.id"
          class="grupo-calendario-liga"
          :aria-labelledby="`titulo-grupo-${grupo.id}-liga`"
        >
          <h3 :id="`titulo-grupo-${grupo.id}-liga`">{{ grupo.titulo }}</h3>
          <div class="lista-partidos-liga" :class="grupo.id === 'hoy' ? 'lista-partidos-liga--tarjetas' : 'lista-partidos-liga--filas'">
            <template v-for="partido in grupo.partidos" :key="`${partido.competencia}-${partido.local}-${partido.fechaIso}`">
              <TarjetaPartido
                v-if="grupo.id === 'hoy'"
                :partido="partido"
                :competencia="etiquetaCompetencia(partido.competencia)"
                :fecha="fechaPartido(partido.fechaIso)"
                :estado="estadoVisible(partido.estado)"
              />
              <PartidoFila
                v-else
                :partido="partido"
                :competencia="etiquetaCompetencia(partido.competencia)"
                :fecha="fechaPartido(partido.fechaIso)"
                :estado="estadoVisible(partido.estado)"
              />
            </template>
          </div>
        </section>
      </div>
      <div v-else class="estado-vacio-articulos">
        <h3>Calendario en actualización</h3>
        <p>No hay partidos verificados en el rango publicado. Consulta el <a href="https://dimayor.com.co/" target="_blank" rel="noopener noreferrer">calendario oficial de DIMAYOR</a>.</p>
      </div>
    </section>

    <section id="liga-betplay" class="bloque-liga-colombia seccion-noticias-liga">
      <div class="encabezado-noticias-listado"><div><p class="etiqueta-seccion">Actualidad</p><h2 id="noticias"><Newspaper aria-hidden="true" /> Últimas noticias de Liga BetPlay y Copa Colombia</h2></div><NuxtLink to="/articulos?categoria=futbol-colombiano">Ver fútbol colombiano <span aria-hidden="true">→</span></NuxtLink></div>
      <div v-if="ultimasNoticias.length" class="grilla-noticias-medio grilla-noticias-editorial-liga">
        <template v-for="(articulo, indice) in ultimasNoticias" :key="articulo.slug">
          <TarjetaNoticiaPrincipal
            v-if="indice === 0"
            class="noticia-editorial-liga--principal"
            :articulo="articulo"
            nivel-titulo="h2"
            prioridad-alta
          />
          <TarjetaNoticiaSecundaria v-else :articulo="articulo" mostrar-resumen />
          <PublicidadAdsterraSlot
            v-if="indice === 7"
            :key="`anuncio-noticias-${articulo.slug}`"
            class="anuncio-noticias-pausa-liga"
            formato="leaderboard"
            contexto="noticias de Liga Colombiana, después de ocho artículos"
          />
        </template>
      </div>
      <PublicidadAdsterraSlot v-if="ultimasNoticias.length >= 8" formato="nativo" contexto="lectura de noticias de Liga Colombiana" />
      <p v-if="!ultimasNoticias.length" class="estado-vacio-articulos">Aún no hay noticias publicadas bajo la etiqueta Liga BetPlay.</p>
      <p class="contenido-seo-liga">Consulta la actualidad de la Liga BetPlay Dimayor, la tabla de posiciones, las fechas del campeonato y los resultados del fútbol profesional colombiano. También encontrarás noticias de Copa Colombia y del Torneo BetPlay, con información que se actualiza cuando hay datos oficiales publicados.</p>
    </section>
  </main>
</template>

<style scoped>
.modulo-futbol-colombia {
  --liga-tinta: #132b47;
  --liga-tinta-suave: #536980;
  --liga-superficie: #ffffff;
  --liga-superficie-secundaria: #f3f7fb;
  --liga-borde: #d8e2ec;
  --liga-acento: #075d9b;
  --liga-acento-suave: #e8f3fb;
  --liga-amarillo: #e3ad25;
  color: var(--liga-tinta);
  padding-bottom: clamp(44px, 7vw, 88px);
}

:global(body.tema-publico-azul) .modulo-futbol-colombia {
  --liga-tinta: #edf4fd;
  --liga-tinta-suave: #b2c5da;
  --liga-superficie: #102943;
  --liga-superficie-secundaria: #0b2138;
  --liga-borde: #2c4b69;
  --liga-acento: #8ce5f5;
  --liga-acento-suave: #153d58;
  --liga-amarillo: #ffd75b;
}

.modulo-futbol-colombia a:focus-visible {
  outline: 3px solid #e8b629;
  outline-offset: 4px;
}

.portada-liga-colombia {
  position: relative;
  isolation: isolate;
  display: grid;
  min-height: 370px;
  overflow: hidden;
  align-items: center;
  border: 1px solid #224767;
  border-radius: 28px;
  background:
    radial-gradient(ellipse at 85% 12%, rgb(36 118 159 / 35%), transparent 37%),
    linear-gradient(115deg, #071a2d 4%, #0b2943 58%, #0c3651);
  color: #f7fbff;
  padding: clamp(26px, 5vw, 56px);
  box-shadow: 0 22px 55px rgb(8 30 54 / 18%);
}

.portada-liga-imagen {
  position: relative;
  overflow: hidden;
  border-radius: 28px;
  background: #071a2d;
  box-shadow: 0 22px 55px rgb(8 30 54 / 18%);
}

.portada-liga-imagen img {
  display: block;
  width: 100%;
  height: auto;
}

.enlace-portada-partidos {
  position: absolute;
  top: 80%;
  left: 5%;
  width: 23.5%;
  height: 11%;
  border-radius: 999px;
}

.enlaces-portada-mapa a {
  position: absolute;
  border-radius: 999px;
}

.enlace-portada-posiciones {
  top: 67%;
  left: 5%;
  width: 9%;
  height: 9%;
}

.enlace-portada-calendario {
  top: 67%;
  left: 14%;
  width: 10%;
  height: 9%;
}

.enlace-portada-noticias {
  top: 67%;
  left: 25%;
  width: 9%;
  height: 9%;
}

.enlace-portada-partidos:focus-visible {
  outline: 3px solid #fff;
  outline-offset: 3px;
}

@media (max-width: 640px) {
  .portada-liga-imagen {
    border-radius: 18px;
  }
}

.portada-liga-colombia::after {
  position: absolute;
  z-index: -1;
  inset: auto 0 0;
  height: 5px;
  background: linear-gradient(90deg, #f4cc50 0 32%, #1687ae 32% 68%, #f4cc50 68%);
  content: '';
}

.portada-liga-cancha {
  position: absolute;
  z-index: -1;
  top: 50%;
  right: clamp(20px, 5vw, 58px);
  width: min(39%, 420px);
  aspect-ratio: 1.45;
  transform: translateY(-50%);
  border: 1px solid rgb(181 224 241 / 28%);
  border-radius: 18px;
  opacity: .8;
}

.portada-liga-cancha::before {
  position: absolute;
  inset: 0 50%;
  border-left: 1px solid rgb(181 224 241 / 28%);
  content: '';
}

.portada-liga-cancha::after {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 29%;
  aspect-ratio: 1;
  transform: translate(-50%, -50%);
  border: 1px solid rgb(181 224 241 / 28%);
  border-radius: 50%;
  content: '';
}

.portada-liga-cancha span {
  position: absolute;
  top: 23%;
  bottom: 23%;
  left: -1px;
  width: 15%;
  border: 1px solid rgb(181 224 241 / 28%);
  border-left: 0;
}

.portada-liga-contenido {
  display: grid;
  grid-template-columns: minmax(0, 1.2fr) minmax(260px, .8fr);
  align-items: center;
  gap: clamp(30px, 6vw, 76px);
}

.portada-liga-copy,
.portada-liga-resumen {
  position: relative;
  z-index: 1;
}

.portada-liga-sobrelinea {
  display: inline-flex;
  align-items: center;
  gap: 9px;
  margin: 0 0 18px;
  color: #f7d45c;
  font-size: .85rem;
  font-weight: 800;
  letter-spacing: .02em;
}

.portada-liga-sobrelinea svg {
  width: 19px;
  height: 19px;
}

.portada-liga-colombia h1 {
  max-width: 740px;
  margin: 0;
  color: #fff;
  font-size: clamp(2.8rem, 6vw, 5.35rem);
  font-weight: 900;
  letter-spacing: -.055em;
  line-height: .96;
}

.portada-liga-bajada {
  max-width: 580px;
  margin: 18px 0 24px;
  color: #d2e1ee;
  font-size: clamp(1rem, 1.6vw, 1.16rem);
  line-height: 1.55;
}

.accion-portada-liga {
  display: inline-flex;
  min-height: 48px;
  align-items: center;
  justify-content: center;
  gap: 9px;
  border: 1px solid #f6d457;
  border-radius: 12px;
  background: #f6d457;
  color: #132b42;
  font-weight: 850;
  padding: 0 17px;
  text-decoration: none;
  transition: background-color .18s ease, transform .18s ease;
}

.accion-portada-liga svg {
  width: 18px;
  height: 18px;
}

.accion-portada-liga:hover {
  transform: translateY(-2px);
  background: #ffe57d;
}

.portada-liga-resumen {
  display: grid;
  gap: 20px;
  border: 1px solid rgb(188 216 235 / 24%);
  border-radius: 20px;
  background: rgb(5 21 37 / 58%);
  padding: 20px;
  backdrop-filter: blur(8px);
}

.sello-liga {
  display: flex;
  align-items: center;
  gap: 13px;
}

.cifras-portada-liga {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  border-top: 1px solid rgb(188 216 235 / 20%);
  border-bottom: 1px solid rgb(188 216 235 / 20%);
  padding: 15px 0;
}

.cifras-portada-liga > div {
  display: grid;
  gap: 5px;
  padding: 0 10px;
}

.cifras-portada-liga > div:first-child {
  padding-left: 0;
}

.cifras-portada-liga > div + div {
  border-left: 1px solid rgb(188 216 235 / 20%);
}

.cifras-portada-liga strong {
  color: #fff;
  font-size: 1.45rem;
  font-weight: 900;
  line-height: 1;
}

.cifras-portada-liga span {
  color: #c0d3e1;
  font-size: .7rem;
  line-height: 1.35;
}

.navegacion-liga-colombia {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.navegacion-liga-colombia a {
  display: inline-flex;
  min-height: 37px;
  align-items: center;
  gap: 7px;
  border: 1px solid rgb(185 218 239 / 27%);
  border-radius: 10px;
  color: #f1f7fb;
  font-size: .78rem;
  font-weight: 750;
  padding: 0 10px;
  text-decoration: none;
  transition: background-color .18s ease, border-color .18s ease;
}

.navegacion-liga-colombia a:hover {
  border-color: #f6d457;
  background: rgb(246 212 87 / 12%);
}

.navegacion-liga-colombia svg {
  width: 15px;
  height: 15px;
  color: #f6d457;
}

.competiciones-permanentes-liga {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: clamp(11px, 1vw, 18px);
  margin: 17px 0 24px;
}

.tarjeta-competicion {
  position: relative;
  display: grid;
  min-height: clamp(86px, 5vw, 108px);
  grid-template-columns: clamp(50px, 4.2vw, 68px) minmax(0, 1fr) clamp(32px, 2.2vw, 38px);
  align-items: center;
  gap: clamp(9px, 1vw, 15px);
  overflow: hidden;
  border: 1px solid var(--liga-borde);
  border-radius: 15px;
  background: var(--liga-superficie);
  color: var(--liga-tinta);
  padding: 9px clamp(11px, 1vw, 16px);
  box-shadow: 0 4px 13px rgb(17 48 76 / 5%);
  text-decoration: none;
  transition: transform .2s ease, border-color .2s ease, box-shadow .2s ease;
}

.tarjeta-competicion::before {
  position: absolute;
  inset: 0 auto 0 0;
  width: 4px;
  background: var(--competicion-color, #0a77a8);
  content: '';
}

.tarjeta-competicion:hover {
  transform: translateY(-1px);
  border-color: var(--competicion-color, #0a77a8);
  box-shadow: 0 8px 20px rgb(18 51 82 / 10%);
}

.tarjeta-competicion-liga { --competicion-color: #0878a6; }
.tarjeta-competicion-torneo { --competicion-color: #3b8e62; }
.tarjeta-competicion-copa { --competicion-color: #c28f17; }

.icono-competicion {
  display: grid;
  width: 44px;
  height: 44px;
  place-items: center;
  border-radius: 14px;
  background: color-mix(in srgb, var(--competicion-color) 12%, var(--liga-superficie));
  color: var(--competicion-color);
}

.icono-competicion svg {
  width: 21px;
  height: 21px;
}

.texto-competicion {
  display: grid;
  gap: 3px;
}

.texto-competicion strong {
  font-size: clamp(.92rem, 1vw, 1.1rem);
  font-weight: 800;
  line-height: 1.15;
}

.texto-competicion > span {
  color: var(--liga-tinta-suave);
  font-size: clamp(.7rem, .8vw, .82rem);
  line-height: 1.35;
}

.flecha-competicion {
  box-sizing: border-box;
  width: clamp(32px, 2.2vw, 38px);
  height: clamp(32px, 2.2vw, 38px);
  border-radius: 50%;
  background: color-mix(in srgb, var(--competicion-color) 9%, var(--liga-superficie));
  color: var(--competicion-color);
  padding: 8px;
  transition: transform .2s ease, background-color .2s ease;
}

.tarjeta-competicion:hover .flecha-competicion {
  transform: translateX(2px);
  background: color-mix(in srgb, var(--competicion-color) 15%, var(--liga-superficie));
}

.grilla-principal-liga {
  display: grid;
  grid-template-columns: minmax(0, 1.65fr) minmax(360px, .95fr);
  align-items: start;
  gap: 22px;
}

.columna-editorial-liga,
.columna-tabla-liga {
  display: grid;
  min-width: 0;
  align-content: start;
  gap: 20px;
}

.columna-editorial-liga > .noticia-destacada-medio {
  min-height: 390px;
  border-color: var(--liga-borde);
  border-radius: 20px;
  box-shadow: 0 14px 34px rgb(11 36 61 / 12%);
}

.columna-editorial-liga > .noticia-destacada-medio.sin-imagen {
  background: linear-gradient(120deg, #0b2341, #103c62 58%, #0b2341);
}

.columna-editorial-liga > .noticia-destacada-medio .contenido-noticia-destacada {
  min-height: 390px;
  padding: clamp(22px, 3.5vw, 36px);
}

.columna-editorial-liga > .noticia-destacada-medio .contenido-noticia-destacada h2,
.columna-editorial-liga > .noticia-destacada-medio .contenido-noticia-destacada h2 a {
  color: #fff;
}

.columna-editorial-liga > .noticia-destacada-medio .boton-leer-noticia {
  border-color: #f6d457;
  border-radius: 12px;
  background: #f6d457;
  box-shadow: none;
  color: #132b42;
}

.columna-editorial-liga > .noticia-destacada-medio .boton-leer-noticia:hover {
  background: #ffe57d;
}

:global(body.tema-publico-blanco) .modulo-futbol-colombia .noticia-destacada-medio.sin-imagen .contenido-noticia-destacada h2,
:global(body.tema-publico-blanco) .modulo-futbol-colombia .noticia-destacada-medio.sin-imagen .contenido-noticia-destacada p:not(.etiqueta-seccion) {
  color: #fff;
}

.columna-editorial-liga > .bloque-liga-colombia,
.panel-tabla-liga,
.seccion-noticias-liga {
  border: 1px solid var(--liga-borde);
  border-radius: 20px;
  background: var(--liga-superficie);
  color: var(--liga-tinta);
  box-shadow: 0 10px 28px rgb(17 48 76 / 5%);
}

.columna-editorial-liga > .bloque-liga-colombia,
.panel-tabla-liga,
.seccion-noticias-liga {
  padding: clamp(17px, 2.1vw, 24px);
}

.bloque-liga-colombia {
  margin-top: 0;
}

.encabezado-noticias-listado,
.encabezado-panel-lateral {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.encabezado-noticias-listado h2,
.encabezado-panel-lateral h2 {
  display: flex;
  align-items: center;
  gap: 10px;
  margin: 0;
  color: var(--liga-tinta);
  font-size: clamp(1.3rem, 2.2vw, 1.7rem);
  letter-spacing: -.025em;
  line-height: 1.15;
}

.encabezado-noticias-listado h2 svg,
.encabezado-panel-lateral h2 svg {
  width: 21px;
  height: 21px;
  flex: 0 0 auto;
  color: var(--liga-acento);
}

.encabezado-noticias-listado .etiqueta-seccion,
.encabezado-panel-lateral .etiqueta-seccion {
  margin: 0 0 7px;
  color: var(--liga-acento);
  font-size: .78rem;
  font-weight: 800;
}

.encabezado-noticias-listado > a,
.enlace-tabla-liga {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  color: var(--liga-acento);
  font-size: .82rem;
  font-weight: 800;
  text-decoration: none;
}

.encabezado-noticias-listado > a:hover,
.enlace-tabla-liga:hover {
  text-decoration: underline;
  text-underline-offset: 3px;
}

.grupos-calendario-liga,
.grupo-calendario-liga,
.tablas-por-fase-liga {
  display: grid;
  gap: 12px;
}

.grupo-calendario-liga > h3,
.fase-tabla-liga > h3 {
  margin: 13px 0 0;
  color: var(--liga-tinta);
  font-size: .94rem;
  font-weight: 850;
}

.lista-partidos-liga {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 11px;
}

.seccion-calendario-liga {
  margin: clamp(36px, 5vw, 68px) 0 34px;
}

.encabezado-calendario-liga {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 24px;
  margin-bottom: 44px;
}

.encabezado-calendario-liga .etiqueta-seccion {
  margin: 0 0 11px;
  color: var(--liga-tinta-suave);
  font-size: .87rem;
  font-weight: 800;
  letter-spacing: .16em;
  text-transform: uppercase;
}

.encabezado-calendario-liga h2 {
  margin: 0;
  color: var(--liga-tinta);
  font-size: clamp(2.4rem, 5vw, 4rem);
  font-weight: 900;
  letter-spacing: -.045em;
  line-height: 1.05;
}

.subrayado-calendario-liga {
  display: block;
  width: 88px;
  height: 7px;
  margin-top: 17px;
  border-radius: 99px;
  background: #ffd000;
}

.encabezado-calendario-liga > a {
  display: inline-flex;
  align-items: center;
  gap: 12px;
  color: var(--liga-acento);
  font-size: clamp(1rem, 1.4vw, 1.35rem);
  font-weight: 850;
  text-decoration: none;
  white-space: nowrap;
}

.encabezado-calendario-liga > a:hover {
  text-decoration: underline;
  text-underline-offset: 4px;
}

.encabezado-calendario-liga > a svg {
  width: 24px;
  height: 24px;
}

.seccion-calendario-liga .grupos-calendario-liga {
  gap: clamp(38px, 5vw, 72px);
}

.seccion-calendario-liga .grupo-calendario-liga {
  gap: 23px;
}

.seccion-calendario-liga .grupo-calendario-liga > h3 {
  display: flex;
  align-items: center;
  gap: 20px;
  margin: 0;
  color: var(--liga-tinta);
  font-size: clamp(1.4rem, 2.5vw, 2rem);
  font-weight: 850;
  letter-spacing: -.03em;
}

.seccion-calendario-liga .grupo-calendario-liga > h3::after {
  height: 1px;
  flex: 1;
  background: var(--liga-borde);
  content: '';
}

.seccion-calendario-liga .lista-partidos-liga--tarjetas {
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 22px;
}

.seccion-calendario-liga .lista-partidos-liga--filas {
  grid-template-columns: minmax(0, 1fr);
  gap: 18px;
}

.tarjeta-partido-liga {
  min-width: 0;
  border: 1px solid var(--liga-borde);
  border-radius: 15px;
  background: var(--liga-superficie-secundaria);
  color: var(--liga-tinta);
  padding: 15px;
}

.meta-partido-liga {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  color: var(--liga-acento);
  font-size: .75rem;
  font-weight: 800;
}

.estado-partido-liga {
  flex: 0 0 auto;
  border-radius: 999px;
  background: color-mix(in srgb, var(--liga-tinta-suave) 14%, transparent);
  color: var(--liga-tinta-suave);
  padding: 4px 8px;
  font-size: .66rem;
  font-weight: 850;
}

.estado-partido-liga--vivo {
  background: #b91c34;
  color: #fff;
}

.fecha-partido-liga,
.meta-resultado-liga,
.sede-partido-liga {
  color: var(--liga-tinta-suave);
  font-size: .78rem;
}

.fecha-partido-liga {
  margin: 11px 0;
}

.equipos-partido-liga {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr);
  align-items: center;
  gap: 8px;
}

.equipo-liga {
  display: flex;
  min-width: 0;
  align-items: center;
  gap: 8px;
}

.equipo-liga strong {
  overflow-wrap: anywhere;
  font-size: .83rem;
  line-height: 1.25;
}

.equipo-liga img,
.equipo-tabla-liga img {
  width: 30px;
  height: 30px;
  flex: 0 0 auto;
  object-fit: contain;
}

.equipo-liga.visitante {
  justify-content: flex-end;
  text-align: right;
}

.versus-liga {
  color: var(--liga-amarillo);
  font-size: .83rem;
  font-weight: 950;
  white-space: nowrap;
}

.escudo-fallback {
  display: inline-grid;
  width: 30px;
  height: 30px;
  flex: 0 0 auto;
  place-items: center;
  border: 1px solid var(--liga-borde);
  border-radius: 50%;
  background: var(--liga-acento-suave);
  color: var(--liga-acento);
  font-size: .65rem;
  font-weight: 900;
}

.sede-partido-liga {
  margin: 12px 0 0;
  line-height: 1.4;
}

.enlaces-partido-liga {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-top: 13px;
}

.enlaces-partido-liga a {
  color: var(--liga-acento);
  font-size: .77rem;
  font-weight: 800;
  text-underline-offset: 3px;
}

.resultado-reciente-liga .equipos-partido-liga {
  padding: 10px 0;
}

.resultado-reciente-liga .versus-liga {
  color: var(--liga-tinta);
  font-size: 1rem;
}

.panel-tabla-liga {
  overflow: hidden;
}

.encabezado-panel-lateral {
  margin-bottom: 14px;
}

.encabezado-panel-lateral h2 {
  font-size: 1.3rem;
}

.subtitulo-tabla-liga {
  margin: 3px 0 0;
  color: var(--liga-tinta-suave);
  font-size: .76rem;
}

.enlace-tabla-completa-liga {
  display: inline-flex;
  flex: 0 0 auto;
  align-items: center;
  gap: 6px;
  color: var(--liga-acento);
  font-size: .78rem;
  font-weight: 800;
  text-decoration: none;
}

.enlace-tabla-completa-liga svg {
  width: 16px;
  height: 16px;
}

.aviso-frescura-liga {
  margin: 0 0 14px;
  border: 1px solid color-mix(in srgb, #d8a321 48%, var(--liga-borde));
  border-left: 4px solid #d8a321;
  border-radius: 10px;
  background: color-mix(in srgb, #f4d369 17%, var(--liga-superficie));
  color: #694e11;
  padding: 11px 13px;
  font-size: .8rem;
  line-height: 1.5;
}

.tabla-liga-scroll {
  overflow-x: auto;
  overscroll-behavior-inline: contain;
  scrollbar-color: var(--liga-borde) transparent;
}

.tabla-liga-scroll table {
  width: 100%;
  min-width: 340px;
  border-collapse: collapse;
  font-size: .79rem;
}

.tabla-liga-scroll caption {
  padding: 0 0 10px;
  color: var(--liga-tinta-suave);
  font-size: .76rem;
  text-align: left;
}

.tabla-liga-scroll thead {
  background: var(--liga-superficie-secundaria);
}

.tabla-liga-scroll th,
.tabla-liga-scroll td {
  border-bottom: 1px solid var(--liga-borde);
  color: var(--liga-tinta);
  padding: 9px 6px;
  text-align: right;
  white-space: nowrap;
}

.tabla-liga-scroll thead th {
  color: var(--liga-tinta-suave);
  font-size: .69rem;
  font-weight: 850;
}

.tabla-liga-scroll th:nth-child(2),
.tabla-liga-scroll td:nth-child(2) {
  text-align: left;
}

.tabla-liga-scroll tbody tr:hover {
  background: var(--liga-superficie-secundaria);
}

.tabla-liga-scroll tbody tr:nth-child(-n+3) > td:first-child {
  color: var(--liga-acento);
  font-weight: 950;
}

.tabla-liga-scroll tbody tr:nth-child(-n+3) > td:last-child strong {
  color: var(--liga-acento);
}

.equipo-tabla-liga {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  white-space: normal;
}

.equipo-tabla-liga a {
  color: var(--liga-tinta);
  font-weight: 750;
  text-decoration: none;
}

.equipo-tabla-liga a:hover {
  color: var(--liga-acento);
  text-decoration: underline;
}

.estado-tabla-liga,
.contenido-seo-liga {
  color: var(--liga-tinta-suave);
  line-height: 1.65;
}

.enlace-tabla-liga {
  margin-top: 13px;
}

.seccion-noticias-liga {
  margin-top: 25px;
}

.seccion-noticias-liga .grilla-noticias-medio {
  margin-top: 17px;
}

.seccion-noticias-liga .tarjeta-noticia-medio {
  min-height: 100%;
  border-color: var(--liga-borde);
  border-radius: 15px;
  background: var(--liga-superficie-secundaria);
  color: var(--liga-tinta);
}

.seccion-noticias-liga .tarjeta-noticia-medio h3,
.seccion-noticias-liga .tarjeta-noticia-medio h3 a {
  color: var(--liga-tinta);
}

.seccion-noticias-liga .tarjeta-noticia-medio h3 a {
  text-decoration: none;
}

.seccion-noticias-liga .tarjeta-noticia-medio h3 a:hover {
  color: var(--liga-acento);
}

.seccion-noticias-liga .tarjeta-noticia-medio .etiqueta-seccion {
  border-color: color-mix(in srgb, var(--liga-acento) 35%, transparent);
  background: var(--liga-acento-suave);
  color: var(--liga-acento);
}

.seccion-noticias-liga .meta-noticia-medio {
  color: var(--liga-tinta-suave);
}

.contenido-seo-liga {
  max-width: 920px;
  margin: 22px 0 0;
  font-size: .86rem;
}

.estado-vacio-articulos,
.estado-tabla-liga {
  border-color: var(--liga-borde);
  border-radius: 15px;
  background: var(--liga-superficie-secundaria);
  color: var(--liga-tinta);
  padding: 18px;
}

.estado-vacio-articulos p {
  color: var(--liga-tinta-suave);
  line-height: 1.55;
}

.estado-vacio-articulos a,
.estado-vacio-articulos .boton-primario {
  color: var(--liga-acento);
}

:global(body.tema-publico-azul) .modulo-futbol-colombia .aviso-frescura-liga {
  color: #ffe3a3;
}

:global(body.tema-publico-azul) .modulo-futbol-colombia .seccion-noticias-liga .tarjeta-noticia-medio h3,
:global(body.tema-publico-azul) .modulo-futbol-colombia .seccion-noticias-liga .tarjeta-noticia-medio h3 a,
:global(body.tema-publico-azul) .modulo-futbol-colombia .equipo-tabla-liga a {
  color: var(--liga-tinta);
}

@media (max-width: 980px) {
  .seccion-calendario-liga .lista-partidos-liga--tarjetas {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .competiciones-permanentes-liga {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .tarjeta-competicion:last-child {
    grid-column: 1 / -1;
  }

  .portada-liga-contenido {
    grid-template-columns: minmax(0, 1fr);
  }

  .portada-liga-colombia {
    min-height: 0;
  }

  .portada-liga-resumen {
    max-width: 510px;
  }

  .portada-liga-cancha {
    top: 20px;
    right: 20px;
    width: 32%;
    transform: none;
  }

  .grilla-principal-liga {
    grid-template-columns: minmax(0, 1fr);
  }

  .columna-tabla-liga {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    align-items: start;
  }
}

@media (max-width: 680px) {
  .encabezado-calendario-liga {
    align-items: flex-start;
    flex-direction: column;
    gap: 16px;
    margin-bottom: 28px;
  }

  .encabezado-calendario-liga h2 {
    font-size: clamp(2rem, 9vw, 3rem);
  }

  .seccion-calendario-liga .grupos-calendario-liga {
    gap: 38px;
  }

  .seccion-calendario-liga .grupo-calendario-liga {
    gap: 16px;
  }

  .seccion-calendario-liga .lista-partidos-liga--tarjetas {
    grid-template-columns: minmax(0, 1fr);
    gap: 13px;
  }

  .portada-liga-colombia {
    border-radius: 22px;
    padding: 25px 20px 23px;
  }

  .portada-liga-cancha {
    top: 16px;
    right: 16px;
    width: 37%;
    opacity: .45;
  }

  .portada-liga-contenido {
    gap: 23px;
  }

  .portada-liga-colombia h1 {
    max-width: 450px;
    font-size: clamp(2.55rem, 12vw, 4rem);
  }

  .portada-liga-bajada {
    max-width: 460px;
    margin-top: 14px;
  }

  .portada-liga-resumen {
    gap: 16px;
    padding: 15px;
  }

  .competiciones-permanentes-liga {
    grid-template-columns: minmax(0, 1fr);
    gap: 9px;
    margin-bottom: 20px;
  }

  .tarjeta-competicion {
    min-height: 82px;
    grid-template-columns: 50px minmax(0, 1fr) 32px;
    gap: 9px;
    padding: 8px 11px;
  }

  .columna-tabla-liga {
    grid-template-columns: minmax(0, 1fr);
  }

  .lista-partidos-liga {
    grid-template-columns: minmax(0, 1fr);
  }

  .columna-editorial-liga > .noticia-destacada-medio,
  .columna-editorial-liga > .noticia-destacada-medio .contenido-noticia-destacada {
    min-height: 330px;
  }

  .columna-editorial-liga > .bloque-liga-colombia,
  .panel-tabla-liga,
  .seccion-noticias-liga {
    border-radius: 17px;
    padding: 17px;
  }

  .encabezado-noticias-listado {
    align-items: flex-start;
  }

  .encabezado-noticias-listado > a {
    flex: 0 0 auto;
    padding-top: 3px;
  }

  .seccion-noticias-liga .grilla-noticias-medio {
    grid-template-columns: minmax(0, 1fr);
  }
}

@media (max-width: 420px) {
  .portada-liga-colombia {
    padding-inline: 17px;
  }

  .portada-liga-sobrelinea {
    font-size: .77rem;
  }

  .cifras-portada-liga > div {
    padding-inline: 7px;
  }

  .cifras-portada-liga strong {
    font-size: 1.25rem;
  }

  .cifras-portada-liga span {
    font-size: .65rem;
  }

  .navegacion-liga-colombia a {
    min-height: 35px;
    font-size: .73rem;
  }

  .modulo-futbol-colombia .encabezado-noticias-listado {
    flex-direction: column;
    align-items: flex-start;
  }

  .modulo-futbol-colombia .equipos-partido-liga {
    gap: 5px;
  }

  .modulo-futbol-colombia .equipo-liga {
    gap: 5px;
  }

  .modulo-futbol-colombia .equipo-liga strong {
    font-size: .75rem;
  }
}

@media (prefers-reduced-motion: reduce) {
  .modulo-futbol-colombia *,
  .modulo-futbol-colombia *::before,
  .modulo-futbol-colombia *::after {
    scroll-behavior: auto !important;
    transition-duration: .01ms !important;
  }
}
.sello-liga > img {
  width: 54px;
  height: 54px;
  flex: 0 0 auto;
  object-fit: contain;
}

.escudo-competicion {
  position: relative;
  display: grid;
  width: clamp(50px, 4.2vw, 68px);
  height: clamp(52px, 4.3vw, 72px);
  flex: 0 0 auto;
  place-items: center start;
}

.escudo-competicion::after {
  position: absolute;
  top: 5%;
  right: 0;
  bottom: 5%;
  border-right: 1px solid var(--liga-borde);
  content: '';
}

.escudo-competicion img {
  box-sizing: border-box;
  width: clamp(42px, 3.4vw, 56px);
  height: clamp(50px, 4vw, 68px);
  border: 1px solid #d9e2eb;
  border-radius: 15px;
  background: #fff;
  object-fit: contain;
  padding: 5px;
}

.modulo-futbol-colombia .seccion-noticias-liga .grilla-noticias-editorial-liga {
  grid-template-columns: repeat(4, minmax(0, 1fr));
  grid-auto-rows: minmax(120px, auto);
  align-items: stretch;
  gap: 14px;
  margin-top: 18px;
}

.seccion-noticias-liga .noticia-editorial-liga {
  position: relative;
  display: grid;
  min-width: 0;
  min-height: 310px;
  grid-template-rows: 160px 1fr;
  overflow: hidden;
  border: 1px solid var(--liga-borde);
  border-radius: 17px;
  background: var(--liga-superficie-secundaria);
  color: var(--liga-tinta);
  box-shadow: 0 8px 22px rgb(12 39 67 / 8%);
  transition: transform .2s ease, box-shadow .2s ease;
}

.seccion-noticias-liga .noticia-editorial-liga:hover {
  transform: translateY(-3px);
  box-shadow: 0 15px 30px rgb(12 39 67 / 15%);
}

.seccion-noticias-liga .noticia-editorial-liga .imagen-tarjeta-noticia-medio {
  position: relative;
  display: block;
  height: 160px;
  overflow: hidden;
  background: #0c2742;
}

.seccion-noticias-liga .noticia-editorial-liga .imagen-tarjeta-noticia-medio img {
  transition: transform .35s ease;
}

.seccion-noticias-liga .noticia-editorial-liga:hover .imagen-tarjeta-noticia-medio img {
  transform: scale(1.04);
}

.contenido-noticia-editorial-liga {
  display: grid;
  align-content: start;
  gap: 9px;
  padding: 15px;
}

.seccion-noticias-liga .contenido-noticia-editorial-liga .etiqueta-seccion {
  width: fit-content;
  margin: 0;
}

.contenido-noticia-editorial-liga h3 {
  margin: 0;
  font-size: .98rem;
  line-height: 1.24;
}

.contenido-noticia-editorial-liga h3 a {
  color: var(--liga-tinta);
  text-decoration: none;
  text-underline-offset: 3px;
}

.contenido-noticia-editorial-liga h3 a:hover {
  color: var(--liga-acento);
  text-decoration: underline;
}

.resumen-noticia-editorial-liga {
  display: -webkit-box;
  overflow: hidden;
  margin: 0;
  color: var(--liga-tinta-suave);
  font-size: .78rem;
  line-height: 1.45;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 3;
}

.contenido-noticia-editorial-liga .meta-noticia-medio {
  margin: 2px 0 0;
}

.noticia-editorial-liga--principal {
  grid-column: span 2;
  grid-row: span 2;
  min-height: 420px;
  grid-template-rows: 1fr;
  background: #102943;
}

.noticia-editorial-liga--principal .imagen-tarjeta-noticia-medio {
  position: absolute;
  inset: 0;
  z-index: 0;
  height: auto;
}

.noticia-editorial-liga--principal .imagen-tarjeta-noticia-medio::after {
  position: absolute;
  inset: 0;
  background: linear-gradient(0deg, rgb(5 19 34 / 96%), rgb(5 19 34 / 6%) 78%);
  content: '';
}

.noticia-editorial-liga--principal .contenido-noticia-editorial-liga {
  position: relative;
  z-index: 1;
  align-self: end;
  align-content: end;
  min-height: 100%;
  padding: clamp(20px, 2.5vw, 30px);
}

.noticia-editorial-liga--principal .contenido-noticia-editorial-liga h3 {
  max-width: 580px;
  font-size: clamp(1.3rem, 2.1vw, 2rem);
}

.noticia-editorial-liga--principal .contenido-noticia-editorial-liga h3 a,
.noticia-editorial-liga--principal .resumen-noticia-editorial-liga,
.noticia-editorial-liga--principal .meta-noticia-medio {
  color: #fff;
}

.noticia-editorial-liga--principal .resumen-noticia-editorial-liga {
  -webkit-line-clamp: 4;
}

.noticia-editorial-liga--principal .etiqueta-seccion {
  border-color: transparent;
  background: #f6d457;
  color: #132b42;
}

.noticia-editorial-liga--principal.sin-imagen {
  background: linear-gradient(135deg, #0b2341, #155179);
}

.noticia-editorial-liga--ancha {
  grid-column: span 2;
  grid-template-columns: minmax(120px, .9fr) minmax(0, 1.1fr);
  grid-template-rows: 1fr;
  min-height: 235px;
}

.noticia-editorial-liga--ancha .imagen-tarjeta-noticia-medio {
  height: 100%;
  min-height: 235px;
}

.noticia-editorial-liga--ancha.sin-imagen {
  grid-template-columns: minmax(0, 1fr);
}

.noticia-editorial-liga:focus-within {
  outline: 3px solid #e1ad24;
  outline-offset: 3px;
}

.anuncio-noticias-pausa-liga {
  grid-column: 1 / -1;
  margin: 0;
}

:global(body.tema-publico-blanco) .modulo-futbol-colombia .portada-liga-resumen {
  border-color: #d7e2eb;
  background: #fff;
  box-shadow: 0 16px 38px rgb(7 34 61 / 12%);
  backdrop-filter: none;
}

:global(body.tema-publico-blanco) .modulo-futbol-colombia .cifras-portada-liga strong {
  color: #132b47;
}

:global(body.tema-publico-blanco) .modulo-futbol-colombia .cifras-portada-liga span {
  color: #536980;
}

:global(body.tema-publico-blanco) .modulo-futbol-colombia .cifras-portada-liga,
:global(body.tema-publico-blanco) .modulo-futbol-colombia .cifras-portada-liga > div + div {
  border-color: #e0e8ef;
}

:global(body.tema-publico-blanco) .modulo-futbol-colombia .navegacion-liga-colombia a {
  border-color: #d7e2eb;
  background: #f7fafc;
  color: #173550;
}

:global(body.tema-publico-blanco) .modulo-futbol-colombia .navegacion-liga-colombia svg {
  color: #0878a6;
}

:global(body.tema-publico-blanco) .modulo-futbol-colombia .navegacion-liga-colombia a:hover {
  border-color: #c69a2a;
  background: #fff8dd;
}

@media (max-width: 1160px) {
  .modulo-futbol-colombia .seccion-noticias-liga .grilla-noticias-editorial-liga {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}

@media (max-width: 680px) {
  .escudo-competicion {
    width: 40px;
    height: 40px;
  }

  .modulo-futbol-colombia .seccion-noticias-liga .grilla-noticias-editorial-liga {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 520px) {
  .modulo-futbol-colombia .seccion-noticias-liga .grilla-noticias-editorial-liga {
    grid-template-columns: minmax(0, 1fr);
  }

  .seccion-noticias-liga .noticia-editorial-liga--principal,
  .seccion-noticias-liga .noticia-editorial-liga--ancha {
    grid-column: auto;
    grid-row: auto;
    grid-template-columns: minmax(0, 1fr);
  }

  .seccion-noticias-liga .noticia-editorial-liga--principal {
    min-height: 370px;
  }

  .seccion-noticias-liga .noticia-editorial-liga--ancha .imagen-tarjeta-noticia-medio {
    min-height: 160px;
  }
}
.seccion-noticias-liga .noticia-editorial-liga.sin-imagen:not(.noticia-editorial-liga--principal) {
  grid-template-rows: 1fr;
  background: linear-gradient(135deg, #0b2341, #155179);
}

.seccion-noticias-liga .noticia-editorial-liga.sin-imagen:not(.noticia-editorial-liga--principal) .contenido-noticia-editorial-liga h3 a,
.seccion-noticias-liga .noticia-editorial-liga.sin-imagen:not(.noticia-editorial-liga--principal) .resumen-noticia-editorial-liga,
.seccion-noticias-liga .noticia-editorial-liga.sin-imagen:not(.noticia-editorial-liga--principal) .meta-noticia-medio {
  color: #fff;
}

.seccion-noticias-liga .noticia-editorial-liga.sin-imagen:not(.noticia-editorial-liga--principal) .etiqueta-seccion {
  border-color: rgb(255 255 255 / 25%);
  background: rgb(255 255 255 / 11%);
  color: #f6d457;
}

.modulo-futbol-colombia .seccion-noticias-liga .grilla-noticias-editorial-liga {
  grid-template-columns: repeat(4, minmax(0, 1fr));
  grid-auto-rows: minmax(150px, auto);
  align-items: stretch;
}

.seccion-noticias-liga .grilla-noticias-editorial-liga :deep(.tarjeta-noticia-principal.noticia-editorial-liga--principal) {
  grid-column: span 2;
  grid-row: span 2;
  min-height: 420px;
}

.seccion-noticias-liga .grilla-noticias-editorial-liga :deep(.tarjeta-noticia-secundaria) {
  min-height: 0;
}

@media (max-width: 1160px) {
  .modulo-futbol-colombia .seccion-noticias-liga .grilla-noticias-editorial-liga { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .seccion-noticias-liga .grilla-noticias-editorial-liga :deep(.tarjeta-noticia-principal.noticia-editorial-liga--principal) { grid-column: span 2; grid-row: span 1; }
}

@media (max-width: 520px) {
  .modulo-futbol-colombia .seccion-noticias-liga .grilla-noticias-editorial-liga { grid-template-columns: minmax(0, 1fr); }
  .seccion-noticias-liga .grilla-noticias-editorial-liga :deep(.tarjeta-noticia-principal.noticia-editorial-liga--principal) { grid-column: auto; grid-row: auto; }
}
</style>
