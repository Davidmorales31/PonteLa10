<script setup lang="ts">
import type { ResumenArticuloPublico } from '~/types/contenidoEditorial'
import type { RespuestaResultados } from '~/types/resultados'
import { ArrowRight, CalendarDays, ChartNoAxesColumnIncreasing, CircleDot, ExternalLink, Globe2, Newspaper, Search, Star, UsersRound } from '@lucide/vue'
import { construirUrlAbsoluta, robotsNoIndex } from '~/utils/seo'
import { evaluarIndexabilidad } from '~/utils/indexabilidadPublica'
import { jugadoresColombianosEuropa, normalizarNombreClubJugador } from '~/data/jugadoresColombianosEuropa'
import { prepararPartidosClubesEuropa } from '~/utils/partidosEuropa'
import { obtenerFechaEnZonaHoraria } from '~/utils/zonasHorarias'

const configuracion = useRuntimeConfig()
const ruta = useRoute()
const hashNavegacion = ref('')
watch(() => ruta.hash, hash => { hashNavegacion.value = hash })
const { data: respuestaNoticias, error } = await useFetch<ResumenArticuloPublico[]>(
  '/api/articulos?tema=colombianos-en-europa&limite=24',
  { default: () => [], key: 'noticias-colombianos-europa' }
)
const noticias = computed(() => Array.isArray(respuestaNoticias.value) ? respuestaNoticias.value : [])
const ultimasNoticias = computed(() => noticias.value.slice(1))
const noticiasDestacadas = computed(() => noticias.value.slice(0, 5))
const busquedaJugador = ref('')
const ligaSeleccionada = ref('todas')
const soloSeguidos = ref(false)
const { estaSiguiendo } = useSeguimientoJugadores()
const competencias = [...new Set(jugadoresColombianosEuropa.map(perfil => perfil.competencia))].sort((primera, segunda) => primera.localeCompare(segunda, 'es'))
const jugadoresVisibles = computed(() => {
  const busqueda = normalizarNombreClubJugador(busquedaJugador.value)
  return jugadoresColombianosEuropa.filter(perfil =>
    (ligaSeleccionada.value === 'todas' || perfil.competencia === ligaSeleccionada.value)
    && (!soloSeguidos.value || estaSiguiendo(perfil.slug))
    && (!busqueda || normalizarNombreClubJugador(`${perfil.nombre} ${perfil.club} ${perfil.posicion}`).includes(busqueda))
  )
})
const navegacion = [
  { etiqueta: 'Noticias', ruta: '#noticias', icono: Newspaper },
  { etiqueta: 'Futbolistas', ruta: '#jugadores', icono: UsersRound },
  { etiqueta: 'Partidos', ruta: '#agenda', icono: CalendarDays },
  { etiqueta: 'Resultados', ruta: '#resultados-europa', icono: ChartNoAxesColumnIncreasing },
  { etiqueta: 'Selección Colombia', ruta: '/seleccion-colombia', icono: CircleDot },
  { etiqueta: 'Liga colombiana', ruta: '/liga-colombiana', icono: Globe2 }
]
const { data: respuestaResultados, error: errorPartidos, refresh: refrescarPartidos } = await useFetch<RespuestaResultados>('/api/resultados', {
  key: 'hub-europa-resultados',
  query: { deporte: 'futbol', timeZone: 'America/Bogota' },
  default: (): RespuestaResultados => ({ partidos: [], clasificacion: [], actualizadoEn: '', origen: 'base-datos' })
})
const ahoraIso = useState('hub-europa-ahora', () => new Date().toISOString())
const fechaHoy = computed(() => obtenerFechaEnZonaHoraria(new Date(ahoraIso.value)))
const partidosEuropa = computed(() => prepararPartidosClubesEuropa(
  Array.isArray(respuestaResultados.value?.partidos) ? respuestaResultados.value.partidos : [],
  jugadoresColombianosEuropa,
  respuestaResultados.value?.actualizadoEn || ''
))
const partidosHoy = computed(() => partidosEuropa.value.filter(evento => evento.estado !== 'FINALIZADO' && obtenerFechaEnZonaHoraria(new Date(evento.partido.fechaIso)) === fechaHoy.value))
const proximosPartidos = computed(() => partidosEuropa.value.filter(evento => evento.estado !== 'FINALIZADO' && obtenerFechaEnZonaHoraria(new Date(evento.partido.fechaIso)) > fechaHoy.value).slice(0, 4))
const resultadosRecientes = computed(() => partidosEuropa.value.filter(evento => evento.estado === 'FINALIZADO').slice().reverse().slice(0, 4))
const calendariosDestacados = jugadoresColombianosEuropa.filter((perfil, indice, perfiles) => perfiles.findIndex(otro => otro.calendarioOficialUrl === perfil.calendarioOficialUrl) === indice).slice(0, 3)

function fechaPartido(fecha: string): string {
  return new Intl.DateTimeFormat('es-CO', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit', timeZone: 'America/Bogota' }).format(new Date(fecha))
}

function limpiarFiltros() {
  busquedaJugador.value = ''
  ligaSeleccionada.value = 'todas'
  soloSeguidos.value = false
}

let intervaloPartidos: ReturnType<typeof setInterval> | undefined
onMounted(() => {
  hashNavegacion.value = ruta.hash
  ahoraIso.value = new Date().toISOString()
  intervaloPartidos = setInterval(() => {
    if (document.hidden) return
    ahoraIso.value = new Date().toISOString()
    void refrescarPartidos()
  }, 60_000)
})
onBeforeUnmount(() => {
  if (intervaloPartidos) clearInterval(intervaloPartidos)
})
const perfilesIndexables = computed(() => jugadoresColombianosEuropa.filter(perfil => evaluarIndexabilidad({
  tipo: 'jugador',
  ...perfil
})))
const indexable = computed(() => evaluarIndexabilidad({
  tipo: 'hub',
  articulosDisponibles: noticias.value.length,
  entidadesVerificadas: perfilesIndexables.value.length,
  fuenteDisponible: !error.value
}))

useSeoPont3la10(() => ({
  titulo: 'Colombianos en Europa: jugadores y noticias | Pont3la10',
  descripcion: 'Perfiles verificados y noticias de futbolistas colombianos en Europa: club actual, posición, calendario oficial y actualidad.',
  rutaCanonica: '/colombianos-en-europa',
  seccion: 'Colombianos en Europa',
  robots: indexable.value ? undefined : robotsNoIndex,
  datosEstructurados: [{
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: 'Colombianos en Europa',
    description: 'Noticias de futbolistas colombianos en clubes y competiciones europeas.',
    inLanguage: 'es-CO',
    url: construirUrlAbsoluta(String(configuracion.public.siteUrl), '/colombianos-en-europa'),
    mainEntity: {
      '@type': 'ItemList',
        itemListElement: [
          ...perfilesIndexables.value.map((perfil, indice) => ({
            '@type': 'ListItem',
            position: indice + 1,
            name: perfil.nombre,
            url: construirUrlAbsoluta(String(configuracion.public.siteUrl), `/jugadores/${perfil.slug}`)
          })),
          ...noticias.value.map((noticia, indice) => ({
            '@type': 'ListItem',
            position: perfilesIndexables.value.length + indice + 1,
            name: noticia.titulo,
            url: construirUrlAbsoluta(String(configuracion.public.siteUrl), `/articulos/${noticia.slug}`)
          }))
        ]
    }
  }, {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Inicio', item: construirUrlAbsoluta(String(configuracion.public.siteUrl), '/') },
      { '@type': 'ListItem', position: 2, name: 'Noticias', item: construirUrlAbsoluta(String(configuracion.public.siteUrl), '/articulos') },
      { '@type': 'ListItem', position: 3, name: 'Colombianos en Europa', item: construirUrlAbsoluta(String(configuracion.public.siteUrl), '/colombianos-en-europa') }
    ]
  }]
}))
</script>

<template>
  <div class="pagina-contenido pagina-publica-medio modulo-colombianos-europa">
    <MigasNavegacion :elementos="[{ etiqueta: 'Inicio', ruta: '/' }, { etiqueta: 'Noticias', ruta: '/articulos' }, { etiqueta: 'Colombianos en Europa' }]" />
    <header class="cabecera-europa">
      <div>
        <p class="etiqueta-europa"><span aria-hidden="true" />FÚTBOL INTERNACIONAL</p>
        <h1>Colombianos en Europa</h1>
        <p>La actualidad de los nuestros: goles, actuaciones y noticias en las ligas y competiciones europeas.</p>
      </div>
      <NuxtLink class="accion-principal-europa" to="#jugadores"><UsersRound aria-hidden="true" />Ver futbolistas<ArrowRight aria-hidden="true" /></NuxtLink>
    </header>

    <nav class="navegacion-europa" aria-label="Secciones de Colombianos en Europa">
      <NuxtLink v-for="(enlace, indice) in navegacion" :key="enlace.ruta" :to="enlace.ruta" :aria-current="hashNavegacion === enlace.ruta || (!hashNavegacion && indice === 0) ? 'location' : undefined"><component :is="enlace.icono" aria-hidden="true" />{{ enlace.etiqueta }}</NuxtLink>
    </nav>

    <section id="noticias" class="bloque-europa noticias-europa" aria-labelledby="titulo-noticias-europa">
      <header class="encabezado-seccion-europa">
        <div><p>ACTUALIDAD</p><h2 id="titulo-noticias-europa"><Newspaper aria-hidden="true" />Noticias de los nuestros</h2></div>
        <NuxtLink to="/articulos?tema=colombianos-en-europa">Ver todas<ArrowRight aria-hidden="true" /></NuxtLink>
      </header>
      <PublicoCarruselNoticiasLiga
        :noticias="noticiasDestacadas"
        etiqueta="Colombianos en Europa · Actualidad"
        descripcion-accesible="Noticias destacadas de colombianos en Europa"
        titulo-vacio="Historias de colombianos en Europa"
        ruta-noticias="/articulos?categoria=futbol-mundial"
      />
      <p v-if="error" class="aviso-europa" role="status">No pudimos cargar las noticias. Puedes consultar los perfiles y los calendarios de sus clubes.</p>

      <PublicidadAdsterraSlot v-if="noticias.length >= 3" formato="leaderboard" contexto="colombianos en europa" />
      <div v-if="ultimasNoticias.length" class="grilla-noticias-medio">
        <CarruselNoticiasSecundarias :noticias="ultimasNoticias" etiqueta="Colombianos en Europa" descripcion-accesible="Más noticias de colombianos en Europa" />
      </div>
      <PublicidadAdsterraSlot v-if="ultimasNoticias.length >= 6" formato="leaderboard" contexto="colombianos en Europa · archivo de actualidad" />
    </section>

    <section id="jugadores" class="bloque-europa" aria-labelledby="titulo-jugadores-europa">
      <header class="encabezado-seccion-europa">
        <div><p>FUTBOLISTAS Y CLUBES</p><h2 id="titulo-jugadores-europa"><UsersRound aria-hidden="true" />Los nuestros en Europa</h2></div>
        <span class="cantidad-jugadores-europa" aria-live="polite">{{ jugadoresVisibles.length }} de {{ jugadoresColombianosEuropa.length }} futbolistas</span>
      </header>
      <div class="filtros-jugadores-europa">
        <label class="buscador-jugadores-europa"><Search aria-hidden="true" /><span class="solo-lectores">Buscar futbolista, club o posición</span><input v-model="busquedaJugador" type="search" placeholder="Buscar futbolista o club" autocomplete="off"></label>
        <label class="selector-liga-europa"><span>Liga</span><select v-model="ligaSeleccionada"><option value="todas">Todas las ligas</option><option v-for="competencia in competencias" :key="competencia" :value="competencia">{{ competencia }}</option></select></label>
        <button class="filtro-seguidos-europa" type="button" :aria-pressed="soloSeguidos" @click="soloSeguidos = !soloSeguidos"><Star aria-hidden="true" />Mis jugadores</button>
      </div>
      <div v-if="jugadoresVisibles.length" class="grilla-jugadores-europa">
        <TarjetaJugadorEuropa v-for="jugador in jugadoresVisibles" :key="jugador.slug" :jugador="jugador" />
      </div>
      <div v-else class="estado-vacio-europa">
        <UsersRound aria-hidden="true" /><h3>{{ soloSeguidos ? 'No hay jugadores seguidos con estos filtros' : 'No encontramos futbolistas con estos filtros' }}</h3>
        <p>{{ soloSeguidos ? 'Pulsa “Seguir jugador” en una tarjeta para añadirlo a tu lista.' : 'Prueba con otro nombre, club o liga.' }}</p>
        <button type="button" @click="limpiarFiltros">Ver todos los futbolistas<ArrowRight aria-hidden="true" /></button>
      </div>
    </section>

    <section id="agenda" class="bloque-europa" aria-labelledby="titulo-agenda-europa">
      <header class="encabezado-seccion-europa">
        <div><p>CALENDARIO Y MARCADORES</p><h2 id="titulo-agenda-europa"><CalendarDays aria-hidden="true" />Partidos de sus clubes</h2></div>
        <NuxtLink to="/partidos-hoy">Partidos de hoy<ArrowRight aria-hidden="true" /></NuxtLink>
      </header>
      <div class="paneles-partidos-europa">
        <section class="panel-partidos-europa" aria-labelledby="titulo-hoy-europa">
          <header class="encabezado-panel-europa"><h3 id="titulo-hoy-europa"><CalendarDays aria-hidden="true" />Partidos de hoy</h3><span>Hora de Colombia</span></header>
          <div v-if="partidosHoy.length" class="tarjetas-partidos-europa">
            <TarjetaPartido v-for="evento in partidosHoy" :key="evento.id" :partido="evento.partido" :competencia="evento.partido.competencia" :fecha="fechaPartido(evento.partido.fechaIso)" :estado="evento.estado" :ruta-partido="evento.ruta" />
          </div>
          <div v-else class="sin-partidos-europa">
            <CalendarDays aria-hidden="true" /><h4>{{ errorPartidos ? 'No pudimos cargar la agenda' : 'Consulta la próxima fecha de sus clubes' }}</h4><p>{{ errorPartidos ? 'Consulta la programación en los calendarios oficiales de sus clubes.' : 'No hay partidos de estos clubes publicados para esta jornada.' }}</p>
            <ul class="calendarios-clubes-europa"><li v-for="perfil in calendariosDestacados" :key="perfil.slug"><a :href="perfil.calendarioOficialUrl" target="_blank" rel="noopener noreferrer">{{ perfil.club }}<ExternalLink aria-hidden="true" /></a></li></ul>
          </div>
        </section>
        <section id="resultados-europa" class="panel-partidos-europa" aria-labelledby="titulo-resultados-europa">
          <header class="encabezado-panel-europa"><h3 id="titulo-resultados-europa"><ChartNoAxesColumnIncreasing aria-hidden="true" />Resultados recientes</h3><NuxtLink to="/resultados/futbol">Ver todos<ArrowRight aria-hidden="true" /></NuxtLink></header>
          <div v-if="resultadosRecientes.length" class="tarjetas-partidos-europa">
            <TarjetaPartido v-for="evento in resultadosRecientes" :key="evento.id" :partido="evento.partido" :competencia="evento.partido.competencia" :fecha="fechaPartido(evento.partido.fechaIso)" :estado="evento.estado" :ruta-partido="evento.ruta" />
          </div>
          <div v-else class="sin-partidos-europa"><ChartNoAxesColumnIncreasing aria-hidden="true" /><h4>{{ errorPartidos ? 'No pudimos cargar los resultados' : 'Los marcadores, al finalizar' }}</h4><p>{{ errorPartidos ? 'Puedes consultar el centro de resultados e intentarlo de nuevo.' : 'Aún no hay resultados finales publicados de estos clubes en la jornada de hoy.' }}</p><NuxtLink to="/resultados/futbol">Consultar resultados<ArrowRight aria-hidden="true" /></NuxtLink></div>
        </section>
      </div>
      <section v-if="proximosPartidos.length" class="proximos-partidos-europa" aria-labelledby="titulo-proximos-europa">
        <h3 id="titulo-proximos-europa">Próximos partidos</h3>
        <PartidoFila v-for="evento in proximosPartidos" :key="evento.id" :partido="evento.partido" :competencia="evento.partido.competencia" :fecha="fechaPartido(evento.partido.fechaIso)" :estado="evento.estado" :ruta-partido="evento.ruta" />
      </section>
    </section>
    <p class="texto-seo-europa">Sigue el recorrido de los futbolistas colombianos en Europa, sus goles, convocatorias y partidos en ligas nacionales, Champions League, Europa League y otros torneos continentales. Cada perfil reúne su club, posición, noticias y calendario oficial.</p>
  </div>
</template>

<style scoped>
.modulo-colombianos-europa { --europa-tinta: #102342; --europa-tinta-suave: #405778; --europa-acento: #075ba9; --europa-borde: #dce5ef; --europa-superficie: #fff; --liga-tinta: var(--europa-tinta); --liga-tinta-suave: var(--europa-tinta-suave); --liga-acento: var(--europa-acento); --liga-borde: var(--europa-borde); --liga-superficie: var(--europa-superficie); padding-bottom: 44px; color: var(--europa-tinta); }
.cabecera-europa { display: flex; align-items: end; justify-content: space-between; gap: 24px; margin: 22px 0 18px; }
.etiqueta-europa { display: flex; align-items: center; gap: 10px; margin: 0 0 6px; color: var(--europa-acento); font-size: .78rem; font-weight: 850; }
.etiqueta-europa > span { width: 6px; height: 18px; border-radius: 5px; background: #ffca08; }
.cabecera-europa h1 { margin: 0; color: var(--europa-tinta); font-size: clamp(2.1rem, 3.4vw, 3.15rem); font-weight: 900; letter-spacing: -.045em; line-height: 1.08; }
.cabecera-europa > div > p:last-child { max-width: 750px; margin: 7px 0 0; color: var(--europa-tinta-suave); font-size: .95rem; line-height: 1.5; }
.accion-principal-europa { display: inline-flex; min-height: 44px; flex: 0 0 auto; align-items: center; justify-content: center; gap: 8px; border-radius: 12px; background: #ffda28; padding: 10px 15px; color: #102342; font-size: .82rem; font-weight: 850; text-decoration: none; }
.accion-principal-europa svg { width: 18px; height: 18px; }
.navegacion-europa { display: flex; min-width: 0; gap: 6px; overflow-x: auto; margin: 0 0 22px; border-bottom: 1px solid var(--europa-borde); padding: 4px 0 9px; scrollbar-width: thin; }
.navegacion-europa a { display: inline-flex; min-height: 42px; flex: 0 0 auto; align-items: center; gap: 8px; border-radius: 999px; padding: 8px 14px; color: var(--europa-tinta); font-size: .83rem; text-decoration: none; white-space: nowrap; }
.navegacion-europa a svg { width: 18px; height: 18px; color: var(--europa-acento); }
.navegacion-europa a[aria-current] { background: #e4efff; color: #0758a4; font-weight: 850; }
.bloque-europa { min-width: 0; margin: 0 0 32px; scroll-margin-top: 90px; }
.encabezado-seccion-europa { display: flex; align-items: end; justify-content: space-between; gap: 18px; margin-bottom: 16px; }
.encabezado-seccion-europa > div { min-width: 0; border-left: 6px solid #ffce17; padding-left: 12px; }
.encabezado-seccion-europa > div > p { margin: 0 0 3px; color: var(--europa-acento); font-size: .7rem; font-weight: 900; }
.encabezado-seccion-europa h2 { display: flex; align-items: center; gap: 9px; margin: 0; color: var(--europa-tinta); font-size: clamp(1.4rem, 2.4vw, 2rem); font-weight: 900; letter-spacing: -.035em; line-height: 1.12; }
.encabezado-seccion-europa h2 svg { width: 23px; height: 23px; flex: 0 0 auto; color: var(--europa-acento); }
.encabezado-seccion-europa > a, .encabezado-panel-europa > a { display: inline-flex; min-height: 34px; flex: 0 0 auto; align-items: center; gap: 6px; color: var(--europa-acento); font-size: .79rem; font-weight: 850; text-decoration: none; }
.encabezado-seccion-europa > a svg, .encabezado-panel-europa > a svg { width: 16px; height: 16px; }
.noticias-europa :deep(.tarjeta-carrusel-liga) { height: clamp(360px, 30vw, 430px); }
.noticias-europa :deep(.contenido-tarjeta-carrusel-liga) { width: min(72%, 850px); }
.noticias-europa :deep(.contenido-tarjeta-carrusel-liga h2 a) { color: #fff; }
.noticias-europa :deep(.contenido-tarjeta-carrusel-liga h2) { font-size: clamp(2rem, 3.4vw, 3.2rem); -webkit-line-clamp: 3; }
.noticias-europa .grilla-noticias-medio { display: block; margin-top: 18px; }
.cantidad-jugadores-europa { color: var(--europa-tinta-suave); font-size: .76rem; font-weight: 700; white-space: nowrap; }
.filtros-jugadores-europa { display: flex; align-items: stretch; gap: 10px; margin-bottom: 15px; }
.buscador-jugadores-europa, .selector-liga-europa { display: flex; min-width: 0; min-height: 44px; align-items: center; gap: 9px; border: 1px solid var(--europa-borde); border-radius: 12px; background: var(--europa-superficie); padding: 0 13px; color: var(--europa-tinta-suave); }
.buscador-jugadores-europa { flex: 1 1 300px; }
.buscador-jugadores-europa > svg { width: 18px; height: 18px; flex: 0 0 auto; color: var(--europa-acento); }
.buscador-jugadores-europa input, .selector-liga-europa select { width: 100%; min-width: 0; min-height: 42px; border: 0; background: transparent; padding: 8px 0; color: var(--europa-tinta); font: inherit; font-size: .83rem; outline: none; }
.buscador-jugadores-europa input::placeholder { color: var(--europa-tinta-suave); opacity: 1; }
.selector-liga-europa { flex: 0 1 245px; }
.selector-liga-europa > span { color: var(--europa-tinta-suave); font-size: .73rem; font-weight: 750; }
.selector-liga-europa select { cursor: pointer; }
.selector-liga-europa option { background: var(--europa-superficie); color: var(--europa-tinta); }
.filtro-seguidos-europa { display: inline-flex; align-items: center; justify-content: center; gap: 7px; border: 1px solid var(--europa-borde); border-radius: 12px; background: var(--europa-superficie); padding: 9px 14px; color: var(--europa-acento); font: inherit; font-size: .8rem; font-weight: 800; cursor: pointer; }
.filtro-seguidos-europa svg { width: 17px; height: 17px; color: #d39b00; }
.filtro-seguidos-europa[aria-pressed="true"] { border-color: #ffce17; background: #fff3bf; color: #102342; }
.grilla-jugadores-europa { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 14px; }
.paneles-partidos-europa { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); align-items: stretch; gap: 18px; }
.panel-partidos-europa { min-width: 0; scroll-margin-top: 90px; border: 1px solid var(--europa-borde); border-radius: 17px; background: var(--europa-superficie); padding: 17px; box-shadow: 0 8px 22px rgb(16 48 84 / 5%); }
.encabezado-panel-europa { display: flex; align-items: center; justify-content: space-between; gap: 9px; margin-bottom: 14px; }
.encabezado-panel-europa h3 { display: flex; align-items: center; gap: 7px; margin: 0; color: var(--europa-tinta); font-size: 1.1rem; font-weight: 850; letter-spacing: -.025em; }
.encabezado-panel-europa h3 svg { width: 20px; height: 20px; flex: 0 0 auto; color: var(--europa-acento); }
.encabezado-panel-europa > span { color: var(--europa-tinta-suave); font-size: .68rem; white-space: nowrap; }
.tarjetas-partidos-europa { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 235px), 1fr)); gap: 10px; }
.tarjetas-partidos-europa :deep(.tarjeta-partido) { min-height: 158px; padding: 11px 12px 0; }
.sin-partidos-europa { display: grid; min-height: 180px; align-content: start; justify-items: start; gap: 7px; padding: 10px 2px; }
.sin-partidos-europa > svg { width: 25px; height: 25px; margin-bottom: 3px; color: var(--europa-acento); }
.sin-partidos-europa h4 { margin: 0; color: var(--europa-tinta); font-size: 1rem; font-weight: 850; }
.sin-partidos-europa p { max-width: 50ch; margin: 0; color: var(--europa-tinta-suave); font-size: .82rem; line-height: 1.5; }
.sin-partidos-europa > a { display: inline-flex; min-height: 34px; align-items: center; gap: 7px; margin-top: 5px; color: var(--europa-acento); font-size: .8rem; font-weight: 850; text-decoration: none; }
.sin-partidos-europa > a svg { width: 16px; height: 16px; }
.calendarios-clubes-europa { display: flex; flex-wrap: wrap; gap: 6px; margin: 6px 0 0; padding: 0; list-style: none; }
.calendarios-clubes-europa a { display: inline-flex; min-height: 34px; align-items: center; gap: 5px; border: 1px solid var(--europa-borde); border-radius: 8px; padding: 6px 8px; color: var(--europa-acento); font-size: .7rem; font-weight: 800; text-decoration: none; }
.calendarios-clubes-europa svg { width: 13px; height: 13px; }
.proximos-partidos-europa { display: grid; gap: 9px; margin-top: 18px; }
.proximos-partidos-europa h3 { margin: 0 0 4px; color: var(--europa-tinta); font-size: 1.2rem; }
.estado-vacio-europa { display: grid; min-height: 170px; justify-items: center; align-content: center; gap: 8px; border: 1px dashed var(--europa-borde); border-radius: 15px; padding: 25px 18px; text-align: center; }
.estado-vacio-europa > svg { width: 27px; height: 27px; color: var(--europa-acento); }
.estado-vacio-europa h3 { margin: 0; color: var(--europa-tinta); font-size: 1rem; }
.estado-vacio-europa p { margin: 0; color: var(--europa-tinta-suave); font-size: .83rem; }
.estado-vacio-europa button { display: inline-flex; min-height: 38px; align-items: center; gap: 7px; border: 0; border-radius: 9px; background: #ffda28; padding: 8px 12px; color: #102342; font: inherit; font-size: .78rem; font-weight: 800; cursor: pointer; }
.estado-vacio-europa button svg { width: 16px; height: 16px; }
.aviso-europa { margin: 12px 0; color: var(--europa-tinta-suave); font-size: .83rem; }
.texto-seo-europa { max-width: 940px; margin: 0; border-top: 1px solid var(--europa-borde); padding-top: 20px; color: var(--europa-tinta-suave); font-size: .85rem; line-height: 1.6; }
.modulo-colombianos-europa :is(a, button):focus-visible { outline: 3px solid #1689cb; outline-offset: 3px; }
.buscador-jugadores-europa:focus-within, .selector-liga-europa:focus-within { outline: 3px solid #1689cb; outline-offset: 2px; }
.solo-lectores { position: absolute; width: 1px; height: 1px; overflow: hidden; clip-path: inset(50%); white-space: nowrap; }
body.tema-publico-azul .modulo-colombianos-europa { --europa-tinta: #f2f7ff; --europa-tinta-suave: #bed0e6; --europa-acento: #91ddff; --europa-borde: #2b4564; --europa-superficie: #0d213a; --liga-superficie-secundaria: #142c48; }
body.tema-publico-azul .navegacion-europa a[aria-current] { background: #183958; color: #a4eaff; }
@media (max-width: 1050px) { .grilla-jugadores-europa { grid-template-columns: repeat(3, minmax(0, 1fr)); } .paneles-partidos-europa { grid-template-columns: 1fr; } .cabecera-europa { align-items: start; flex-direction: column; gap: 13px; } }
@media (max-width: 760px) {
  .cabecera-europa { margin-top: 18px; }
  .cabecera-europa h1 { font-size: clamp(2rem, 8vw, 2.6rem); }
  .cabecera-europa > div > p:last-child { font-size: .86rem; }
  .navegacion-europa { gap: 3px; }
  .navegacion-europa a { gap: 6px; padding-inline: 11px; font-size: .77rem; }
  .encabezado-seccion-europa { align-items: center; gap: 10px; margin-bottom: 13px; }
  .encabezado-seccion-europa h2 { gap: 7px; font-size: clamp(1.25rem, 5vw, 1.6rem); }
  .encabezado-seccion-europa h2 svg { width: 20px; height: 20px; }
  .encabezado-seccion-europa > a { font-size: .7rem; }
  .cantidad-jugadores-europa { font-size: .65rem; white-space: normal; text-align: right; }
  .noticias-europa :deep(.tarjeta-carrusel-liga) { height: 390px; }
  .noticias-europa :deep(.contenido-tarjeta-carrusel-liga) { width: 100%; padding: 22px 18px 54px; }
  .noticias-europa :deep(.contenido-tarjeta-carrusel-liga h2) { font-size: clamp(1.65rem, 7vw, 2.4rem); }
  .filtros-jugadores-europa { flex-wrap: wrap; gap: 8px; }
  .buscador-jugadores-europa { flex-basis: 100%; }
  .selector-liga-europa { flex: 1 1 170px; }
  .filtro-seguidos-europa { padding-inline: 10px; font-size: .73rem; }
  .grilla-jugadores-europa { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; }
  .panel-partidos-europa { padding: 15px 12px; }
  .encabezado-panel-europa h3 { font-size: 1rem; }
  .bloque-europa { margin-bottom: 27px; }
}
@media (max-width: 430px) { .grilla-jugadores-europa { grid-template-columns: 1fr; } .encabezado-seccion-europa h2 svg { display: none; } .encabezado-panel-europa > span { font-size: .6rem; } }
</style>
