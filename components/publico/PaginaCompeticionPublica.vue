<script setup lang="ts">
import BotonSeguirCompeticion from '~/components/publico/BotonSeguirCompeticion.vue'
import { ArrowLeft, ArrowRight, CalendarDays, ChartNoAxesColumnIncreasing, CircleDot, Layers3, Newspaper, Trophy, UsersRound } from '@lucide/vue'

import type { EquipoCompeticionPublica, FichaCompeticionPublica, FilaTablaCompeticionPublica, JornadaCompeticionPublica } from '~/server/utils/competicionesPublicas'
import { construirUrlAbsoluta } from '~/utils/seo'
import { construirSportsEventSeo, etiquetaEstadoSeoPartido } from '~/utils/schemaPartidoSeo'

const props = defineProps<{ slug: string, temporada?: string }>()
const configuracion = useRuntimeConfig()
const endpoint = computed(() => {
  const base = `/api/competiciones/${encodeURIComponent(props.slug)}`
  return props.temporada ? `${base}?temporada=${encodeURIComponent(props.temporada)}` : base
})
const clave = computed(() => `competicion-${props.slug}-${props.temporada || 'actual'}`)
const { data: ficha, error } = await useFetch<FichaCompeticionPublica>(endpoint, { key: clave })

if (error.value) {
  throw createError({
    statusCode: error.value.statusCode || 503,
    statusMessage: error.value.statusMessage || 'No fue posible cargar la competición.'
  })
}
useCachePublica('competicion')

if (props.temporada && ficha.value?.temporadaActual === props.temporada) {
  await navigateTo(`/competiciones/${encodeURIComponent(props.slug)}`, { redirectCode: 301, replace: true })
}

const temporadasIndexables = computed(() => ficha.value?.temporadas.filter(temporada => temporada.indexable) || [])
const partidosTemporada = computed(() => ficha.value?.temporadas.find(t => t.temporada === ficha.value?.temporada)?.partidosPublicos || 0)
const ordenEquiposDestacados = ['nacional', 'america', 'millonarios', 'junior', 'tolima', 'once caldas']
const equiposOrdenadosLiga = computed(() => [...(ficha.value?.equipos || [])].sort((a, b) => {
  const claveA = a.nombre.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('es-CO')
  const claveB = b.nombre.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('es-CO')
  const prioridadA = ordenEquiposDestacados.findIndex(nombre => claveA.includes(nombre))
  const prioridadB = ordenEquiposDestacados.findIndex(nombre => claveB.includes(nombre))
  if (prioridadA !== prioridadB) return (prioridadA < 0 ? Infinity : prioridadA) - (prioridadB < 0 ? Infinity : prioridadB)
  return a.nombre.localeCompare(b.nombre, 'es-CO')
}))
const indiceTemporadaActual = computed(() => temporadasIndexables.value.findIndex(temporada => temporada.temporada === ficha.value?.temporada))
const temporadaAnterior = computed(() => temporadasIndexables.value[indiceTemporadaActual.value + 1] || null)
const temporadaSiguiente = computed(() => indiceTemporadaActual.value > 0 ? temporadasIndexables.value[indiceTemporadaActual.value - 1] || null : null)
const temporadaLiga = computed(() => props.slug === 'liga-betplay')
const usaBannerCompeticion = computed(() => ['liga-betplay', 'torneo-betplay', 'copa-colombia'].includes(props.slug))
const configuracionBanner = computed(() => ({
  'liga-betplay': { escritorio: '/images/liga-betplay-banner-2026-ii.webp', movil: '/images/liga-betplay-banner-2026-ii-movil.webp', ancho: 2172, alto: 724, tituloBase: '2026-II' },
  'torneo-betplay': { escritorio: '/images/torneo-betplay-banner-2026-ii.webp', movil: '/images/torneo-betplay-banner-2026-ii-movil.webp', ancho: 2172, alto: 724, tituloBase: '2026-II' },
  'copa-colombia': { escritorio: '/images/copa-colombia-banner-2026.webp', movil: '/images/copa-colombia-banner-2026-movil.webp', ancho: 2172, alto: 724, tituloBase: '2026' }
}[props.slug as 'liga-betplay' | 'torneo-betplay' | 'copa-colombia'] || { escritorio: '', movil: '', ancho: 2172, alto: 724, tituloBase: '' }))
const fechaActualBogota = computed(() => fechaEnBogota(new Date().toISOString()))
const partidosHoyCompeticion = computed(() => {
  const candidatos = [
    ...(ficha.value?.partidosEnVivo || []),
    ...(ficha.value?.proximosPartidos || []),
    ...(ficha.value?.resultadosRecientes || [])
  ]
  const unicos = new Map(candidatos
    .filter(partido => fechaEnBogota(partido.fechaIso) === fechaActualBogota.value)
    .map(partido => [partido.slug, partido]))
  return [...unicos.values()].sort((a, b) => Date.parse(a.fechaIso) - Date.parse(b.fechaIso))
})
const proximosPartidosCompeticion = computed(() => (ficha.value?.proximosPartidos || [])
  .filter(partido => fechaEnBogota(partido.fechaIso) !== fechaActualBogota.value))
const jornadasOrdenadas = computed(() => [...(ficha.value?.jornadas || [])].sort((a, b) => {
  const numeroA = Number(/\d+/.exec(a.nombre)?.[0] || 0)
  const numeroB = Number(/\d+/.exec(b.nombre)?.[0] || 0)
  return numeroA && numeroB ? numeroA - numeroB : a.nombre.localeCompare(b.nombre, 'es-CO')
}))
const jornadaSeleccionadaNombre = ref('')
const jornadaSeleccionada = computed(() => jornadasOrdenadas.value.find(jornada => jornada.nombre === jornadaSeleccionadaNombre.value) || jornadasOrdenadas.value[0] || null)
const indiceJornadaSeleccionada = computed(() => jornadasOrdenadas.value.findIndex(jornada => jornada.nombre === jornadaSeleccionada.value?.nombre))
const jornadaAnterior = computed(() => jornadasOrdenadas.value[(indiceJornadaSeleccionada.value - 1 + jornadasOrdenadas.value.length) % jornadasOrdenadas.value.length] || null)
const jornadaSiguiente = computed(() => jornadasOrdenadas.value[(indiceJornadaSeleccionada.value + 1) % jornadasOrdenadas.value.length] || null)
const figurasDestacadasLiga: Array<[string, string, string]> = [
  ['aguilas', 'Andrés Ricaurte', 'aguilas-doradas-andres-ricaurte.webp'],
  ['alianza', 'Felipe Pardo', 'alianza-valledupar-felipe-pardo.webp'],
  ['america', 'Adrián Ramos', 'america-de-cali-adrian-ramos.webp'],
  ['bucaramanga', 'Fabián Sambueza', 'atletico-bucaramanga-fabian-sambueza.webp'],
  ['chico', 'Yesus Cabrera', 'boyaca-chico-yesus-cabrera.webp'],
  ['cucuta', 'Jhonatan Agudelo', 'cucuta-deportivo-jhonatan-agudelo.webp'],
  ['cali', 'Pedro Gallese', 'deportivo-cali-pedro-gallese.webp'],
  ['fortaleza', 'Sebastián Navarro', 'fortaleza-ceif-sebastian-navarro.webp'],
  ['internacional', 'Wuilker Faríñez', 'internacional-bogota-wuilker-farinez.webp'],
  ['jaguares', 'Andrés Rentería', 'jaguares-fc-andres-renteria.webp'],
  ['junior', 'Luis Muriel', 'junior-fc-luis-muriel.webp'],
  ['llaneros', 'Francisco Meza', 'llaneros-fc-francisco-meza.webp'],
  ['medellin', 'Juan Fernando Quintero', 'independiente-medellin-juan-fernando-quintero.webp'],
  ['millonarios', 'Juan Guillermo Cuadrado', 'millonarios-juan-guillermo-cuadrado.webp'],
  ['nacional', 'Franco Armani', 'atletico-nacional-franco-armani.webp'],
  ['once caldas', 'Dayro Moreno', 'once-caldas-dayro-moreno.webp'],
  ['pasto', 'Andrés Ibargüen', 'deportivo-pasto-andres-ibarguen.webp'],
  ['pereira', 'Marco Pérez', 'deportivo-pereira-marco-perez.webp'],
  ['santa fe', 'Hugo Rodallega', 'independiente-santa-fe-hugo-rodallega.webp'],
  ['tolima', 'Luis Sandoval', 'deportes-tolima-luis-sandoval.webp']
]
const enlacesNavegacionLiga = computed(() => [
  { etiqueta: 'Tabla', ruta: '#posiciones', icono: ChartNoAxesColumnIncreasing },
  { etiqueta: 'Próximos partidos', ruta: '#proximos', icono: CalendarDays },
  { etiqueta: 'Resultados', ruta: '#resultados', icono: CircleDot },
  { etiqueta: 'Jornadas', ruta: '#jornadas', icono: Layers3 },
  { etiqueta: 'Equipos', ruta: '#equipos', icono: UsersRound },
  { etiqueta: 'Noticias', ruta: '#noticias', icono: Newspaper }
])
const enlacesNavegacionCompeticion = computed(() => enlacesNavegacionLiga.value.filter(enlace => enlace.ruta !== '#posiciones' || ficha.value?.tablaDisponible || ficha.value?.competencia.tipo === 'liga'))
const fasesTabla = computed(() => {
  const grupos = new Map<string, FilaTablaCompeticionPublica[]>()
  for (const fila of ficha.value?.tabla || []) {
    const grupo = grupos.get(fila.fase) || []
    grupo.push(fila)
    grupos.set(fila.fase, grupo)
  }
  return [...grupos.entries()].map(([fase, filas]) => ({ fase, filas }))
})
const partidosMarcador = computed(() => [
  ...(ficha.value?.partidosEnVivo || []),
  ...(ficha.value?.proximosPartidos || []),
  ...(ficha.value?.resultadosRecientes || [])
].slice(0, 12))
const tituloPagina = computed(() => ficha.value
  ? `${ficha.value.competencia.nombre} ${ficha.value.temporada}: calendario, tabla y resultados | Pont3la10`
  : 'Competición colombiana | Pont3la10')
const descripcionPagina = computed(() => ficha.value
  ? `Consulta el calendario, resultados, equipos${ficha.value.tablaDisponible ? ' y tabla de posiciones' : ''} de ${ficha.value.competencia.nombre} en la temporada ${ficha.value.temporada}.`
  : 'Calendario y actualidad de las competiciones del fútbol colombiano.')
const datosEstructurados = computed(() => {
  if (!ficha.value?.indexable) return undefined
  const ruta = rutaCanonica.value
  const url = construirUrlAbsoluta(String(configuracion.public.siteUrl), ruta)
  const partidos = partidosMarcador.value
  const listaPartidos = partidos.map((partido, indice) => ({
    '@type': 'ListItem',
    position: indice + 1,
    name: `${partido.local} vs ${partido.visitante}`,
    url: construirUrlAbsoluta(String(configuracion.public.siteUrl), `/partidos/${partido.slug}`)
  }))
  const listaEquipos = (ficha.value.equipos || []).map((equipo, indice) => ({
    '@type': 'ListItem',
    position: indice + 1,
    name: equipo.nombre,
    ...(rutaEquipo(equipo) ? { url: construirUrlAbsoluta(String(configuracion.public.siteUrl), rutaEquipo(equipo)!) } : {})
  }))
  const schemaPartidos = partidos.map(partido => construirSportsEventSeo({
    local: partido.local,
    visitante: partido.visitante,
    fechaIso: partido.fechaIso,
    verificadoEn: partido.verificadoEn,
    estado: partido.estado,
    golesLocal: partido.golesLocal,
    golesVisitante: partido.golesVisitante,
    estadio: partido.estadio,
    ciudad: partido.ciudad,
    urlCanonica: construirUrlAbsoluta(String(configuracion.public.siteUrl), `/partidos/${partido.slug}`),
    descripcion: `${ficha.value!.competencia.nombre}, temporada ${ficha.value!.temporada}.`
  })).filter((schema): schema is Record<string, unknown> => schema !== null)

  return [
    {
      '@context': 'https://schema.org',
      '@type': 'CollectionPage',
      name: `${ficha.value.competencia.nombre} ${ficha.value.temporada}`,
      description: descripcionPagina.value,
      inLanguage: 'es-CO',
      url,
      mainEntity: { '@type': 'ItemList', itemListElement: listaPartidos }
    },
    ...(listaEquipos.length ? [{ '@context': 'https://schema.org', '@type': 'ItemList', name: `Equipos de ${ficha.value.competencia.nombre}`, itemListElement: listaEquipos }] : []),
    ...schemaPartidos,
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Inicio', item: construirUrlAbsoluta(String(configuracion.public.siteUrl), '/') },
        { '@type': 'ListItem', position: 2, name: 'Liga colombiana', item: construirUrlAbsoluta(String(configuracion.public.siteUrl), '/liga-colombiana') },
        { '@type': 'ListItem', position: 3, name: ficha.value.competencia.nombre, item: construirUrlAbsoluta(String(configuracion.public.siteUrl), `/competiciones/${ficha.value.competencia.slug}`) },
        ...(ficha.value.temporada === ficha.value.temporadaActual ? [] : [{
          '@type': 'ListItem', position: 4, name: `Temporada ${ficha.value.temporada}`, item: url
        }])
      ]
    }
  ]
})
const rutaCanonica = computed(() => props.temporada
  ? `/competiciones/${encodeURIComponent(props.slug)}/${encodeURIComponent(props.temporada)}`
  : `/competiciones/${encodeURIComponent(props.slug)}`)

useSeoPont3la10(() => ({
  titulo: tituloPagina.value,
  descripcion: descripcionPagina.value,
  rutaCanonica: rutaCanonica.value,
  seccion: 'Fútbol colombiano',
  robots: ficha.value?.indexable ? undefined : 'noindex, follow',
  datosEstructurados: datosEstructurados.value
}))

function rutaEquipo(equipo: EquipoCompeticionPublica): string | null {
  return equipo.slug ? `/equipos/${encodeURIComponent(equipo.slug)}` : null
}

function fechaPartido(fecha: string, hora = true): string {
  if (!Number.isFinite(Date.parse(fecha))) return 'Fecha por confirmar'
  return new Intl.DateTimeFormat('es-CO', {
    dateStyle: 'medium', ...(hora ? { timeStyle: 'short' as const } : {}), timeZone: 'America/Bogota'
  }).format(new Date(fecha))
}

function fechaEnBogota(fecha: string): string {
  if (!Number.isFinite(Date.parse(fecha))) return ''
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Bogota', year: 'numeric', month: '2-digit', day: '2-digit'
  }).format(new Date(fecha))
}

function elegirJornada(nombre: string): void {
  jornadaSeleccionadaNombre.value = nombre
}

function moverJornada(desplazamiento: number): void {
  const cantidad = jornadasOrdenadas.value.length
  if (cantidad < 2 || indiceJornadaSeleccionada.value < 0) return
  const nuevoIndice = (indiceJornadaSeleccionada.value + desplazamiento + cantidad) % cantidad
  jornadaSeleccionadaNombre.value = jornadasOrdenadas.value[nuevoIndice]?.nombre || ''
}

function cambiarTemporadaJornadas(evento: Event): void {
  const temporada = (evento.target as HTMLSelectElement).value
  const ruta = temporadasIndexables.value.find(opcion => opcion.temporada === temporada)?.ruta
  if (ruta) void navigateTo(ruta)
}

function rangoFechasJornada(jornada: JornadaCompeticionPublica | null): string {
  const fechas = (jornada?.partidos || [])
    .map(partido => Date.parse(partido.fechaIso))
    .filter(Number.isFinite)
    .sort((a, b) => a - b)
  if (!fechas.length) return 'Fechas por confirmar'
  const formato = (valor: number) => new Intl.DateTimeFormat('es-CO', {
    day: 'numeric', month: 'long', timeZone: 'America/Bogota'
  }).format(new Date(valor))
  const desde = formato(fechas[0]!)
  const hasta = formato(fechas[fechas.length - 1]!)
  return desde === hasta ? desde : `${desde} – ${hasta}`
}

function estadoJornada(jornada: JornadaCompeticionPublica | null): string {
  const estados = (jornada?.partidos || []).map(partido => etiquetaEstado(partido.estado))
  if (estados.some(estado => estado === 'EN VIVO')) return 'En curso'
  if (estados.length && estados.every(estado => estado === 'FINALIZADO')) return 'Finalizada'
  return 'Programada'
}

function etiquetaEstado(estado: string | null): string {
  return etiquetaEstadoSeoPartido(estado)
}

function iniciales(nombre: string): string {
  return nombre.split(/\s+/).filter(Boolean).slice(0, 2).map(palabra => palabra[0]).join('').toLocaleUpperCase('es-CO')
}

function datosFiguraDestacadaEquipo(nombre: string): { nombre: string, imagen: string | null } {
  const clave = nombre.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('es-CO')
  const figura = figurasDestacadasLiga.find(([parte]) => clave.includes(parte))
  return figura
    ? { nombre: figura[1], imagen: `/images/jugadores-liga/${figura[2]}` }
    : { nombre: 'Figura del club', imagen: null }
}

function fechaActualizacion(fecha: string | null): string {
  return fecha ? fechaPartido(fecha) : 'Sin registro de actualización'
}
</script>

<template>
  <main v-if="ficha" class="pagina-contenido pagina-publica-medio modulo-futbol-colombia pagina-competicion-publica" :class="{ 'pagina-competicion-publica--liga': usaBannerCompeticion }">
    <MigasNavegacion :elementos="[{ etiqueta: 'Inicio', ruta: '/' }, { etiqueta: 'Liga colombiana', ruta: '/liga-colombiana' }, { etiqueta: ficha.competencia.nombre }, ...(ficha.temporada !== ficha.temporadaActual ? [{ etiqueta: ficha.temporada }] : [])]" />

    <header class="cabecera-pagina cabecera-noticias-medio cabecera-liga-colombia cabecera-competicion" :class="{ 'cabecera-competicion--liga': usaBannerCompeticion, 'cabecera-competicion--general': usaBannerCompeticion && !temporadaLiga }">
      <div v-if="configuracionBanner.escritorio" class="banner-liga-betplay" :class="{ 'banner-liga-betplay--general': !temporadaLiga, 'banner-liga-betplay--iconos': props.slug === 'torneo-betplay' || props.slug === 'copa-colombia' }">
        <picture>
          <source media="(max-width: 760px)" :srcset="configuracionBanner.movil" width="1080" height="724">
          <img :src="configuracionBanner.escritorio" :alt="`${ficha.competencia.nombre} ${ficha.temporada}. Accesos a tabla, próximos partidos, resultados, jornadas, equipos, noticias y seguimiento de la competición.`" :width="configuracionBanner.ancho" :height="configuracionBanner.alto" fetchpriority="high">
        </picture>
        <div v-if="temporadaLiga && ficha.temporada !== configuracionBanner.tituloBase" class="texto-temporada-banner-liga">
          <p>FÚTBOL COLOMBIANO · TEMPORADA {{ ficha.temporada }}</p>
          <h1>{{ ficha.competencia.nombre }} {{ ficha.temporada }}</h1>
          <span>Calendario, resultados, equipos y tabla de posiciones con información pública confirmada.</span>
        </div>
        <h1 v-else class="solo-lectores">{{ ficha.competencia.nombre }} {{ ficha.temporada }}</h1>
        <nav class="controles-banner-liga" :class="{ 'controles-banner-liga--visibles': !temporadaLiga }" :aria-label="`Ir a secciones de ${ficha.competencia.nombre}`">
          <a v-for="enlace in enlacesNavegacionCompeticion" :key="enlace.ruta" :href="enlace.ruta" :aria-label="'Ir a ' + enlace.etiqueta" :aria-current="enlace.ruta === '#posiciones' ? 'location' : undefined">
            <template v-if="!temporadaLiga"><component :is="enlace.icono" aria-hidden="true" /><span v-if="props.slug !== 'torneo-betplay' && props.slug !== 'copa-colombia'">{{ enlace.etiqueta }}</span></template>
          </a>
        </nav>
        <div class="seguimiento-banner-liga" :class="{ 'seguimiento-banner-liga--visible': !temporadaLiga }" :aria-label="`Seguir ${ficha.competencia.nombre}`">
          <BotonSeguirCompeticion :slug="ficha.competencia.slug" :nombre="ficha.competencia.nombre" />
        </div>
      </div>
      <template v-else>
        <div class="contenido-cabecera-competicion">
          <div class="texto-cabecera-competicion">
            <p class="etiqueta-seccion">FÚTBOL COLOMBIANO · TEMPORADA {{ ficha.temporada }}</p>
            <h1>{{ ficha.competencia.nombre }} {{ ficha.temporada }}</h1>
            <p>Calendario, resultados, equipos y{{ ficha.tablaDisponible ? ' tabla de posiciones' : ' fases del torneo' }} con información pública confirmada.</p>
          </div>
        </div>
        <nav v-if="!configuracionBanner.escritorio" class="navegacion-liga-colombia" aria-label="Secciones de la competición">
          <a v-for="enlace in enlacesNavegacionCompeticion" :key="enlace.ruta" :href="enlace.ruta" :aria-current="enlace.ruta === '#posiciones' ? 'location' : undefined">
            <component :is="enlace.icono" aria-hidden="true" />{{ enlace.etiqueta }}
          </a>
        </nav>
        <a v-if="ficha.partidosEnVivo.length" class="acceso-partidos-en-vivo" href="#hoy"><CircleDot aria-hidden="true" /> {{ ficha.partidosEnVivo.length }} {{ ficha.partidosEnVivo.length === 1 ? 'partido en vivo' : 'partidos en vivo' }}</a>
        <div v-if="!temporadaLiga && !configuracionBanner.escritorio" class="acciones-seguimiento-competicion">
          <BotonSeguirCompeticion :slug="ficha.competencia.slug" :nombre="ficha.competencia.nombre" />
          <span>Guarda el torneo en este dispositivo para volver rápido desde la portada.</span>
        </div>
      </template>
    </header>

    <div class="fila-temporada-resumen" :class="{ 'fila-temporada-resumen--liga': usaBannerCompeticion }">
      <section class="selector-temporadas panel-competicion" aria-labelledby="titulo-temporadas">
        <div class="titulo-temporadas-con-icono">
          <span class="icono-temporadas" aria-hidden="true"><CalendarDays /></span>
          <div><p class="etiqueta-seccion">ARCHIVO OFICIAL</p><h2 id="titulo-temporadas">Temporadas</h2></div>
        </div>
        <div class="selector-temporadas-enlaces">
          <nav aria-label="Temporadas disponibles">
            <NuxtLink
              v-for="opcionTemporada in temporadasIndexables"
              :key="opcionTemporada.temporada"
              :to="opcionTemporada.ruta"
              :aria-current="opcionTemporada.temporada === ficha.temporada ? 'page' : undefined"
            >
              {{ opcionTemporada.temporada }}<span v-if="opcionTemporada.esActual">  · Actual</span>
            </NuxtLink>
          </nav>
          <nav class="navegacion-temporada-adjunta" aria-label="Temporadas anterior y siguiente">
            <NuxtLink v-if="temporadaAnterior" :to="temporadaAnterior.ruta"><ArrowLeft aria-hidden="true" /> Temporada anterior · {{ temporadaAnterior.temporada }}</NuxtLink>
            <NuxtLink v-if="temporadaSiguiente" :to="temporadaSiguiente.ruta">Temporada siguiente · {{ temporadaSiguiente.temporada }} <ArrowRight aria-hidden="true" /></NuxtLink>
          </nav>
        </div>
        <p v-if="!temporadasIndexables.length">El archivo de temporadas se habilita cuando hay calendarios y resultados verificables.</p>
      </section>

      <div class="resumen-competicion" aria-label="Resumen de la temporada">
        <div><span class="icono-resumen icono-resumen--equipos"><UsersRound aria-hidden="true" /></span><strong>{{ ficha.equipos.length }}</strong><span>Equipos</span></div>
        <div><span class="icono-resumen icono-resumen--jornadas"><Layers3 aria-hidden="true" /></span><strong>{{ ficha.jornadas.length }}</strong><span>Jornadas</span></div>
        <div><span class="icono-resumen icono-resumen--partidos"><CircleDot aria-hidden="true" /></span><strong>{{ partidosTemporada }}</strong><span>Partidos</span></div>
      </div>
    </div>

    <section v-if="ficha.tablaDisponible" id="posiciones" class="bloque-liga-colombia panel-competicion">
      <header class="encabezado-seccion-competicion">
        <div><p class="etiqueta-seccion">{{ ficha.temporada }}</p><h2>Tabla de posiciones</h2></div>
        <span v-if="ficha.snapshotTabla" class="sello-verificado">Tabla final · snapshot inmutable</span>
        <span v-else class="sello-verificado">Datos públicos confirmados</span>
      </header>
      <p v-if="ficha.snapshotTabla" class="nota-snapshot-tabla">
        Cierre de la fase regular: {{ fechaActualizacion(ficha.snapshotTabla.finalizadaEn) }} · Verificada: {{ fechaActualizacion(ficha.snapshotTabla.verificadaEn) }} ·
        <span>Fuentes: </span>
        <a v-for="(fuente, indice) in ficha.snapshotTabla.fuentes" :key="fuente" :href="fuente" target="_blank" rel="noopener noreferrer">{{ indice ? 'fuente ' + (indice + 1) : 'fuente principal' }}</a>
      </p>
      <div v-for="fase in fasesTabla" :key="fase.fase" class="fase-tabla-liga">
        <h3>{{ fase.fase }}</h3>
        <div class="tabla-liga-scroll">
          <table>
            <caption>{{ ficha.competencia.nombre }} · {{ fase.fase }} · temporada {{ ficha.temporada }}</caption>
            <thead><tr><th scope="col">Pos.</th><th scope="col">Equipo</th><th scope="col">PJ</th><th scope="col">G</th><th scope="col">E</th><th scope="col">P</th><th scope="col">DG</th><th scope="col">Pts</th></tr></thead>
            <tbody>
              <tr v-for="fila in fase.filas" :key="`${fila.temporada}-${fila.fase}-${fila.posicion}-${fila.competencia}`">
                <td>{{ fila.posicion }}</td>
                <td>
                  <NuxtLink v-if="fila.equipoSlug" :to="`/equipos/${encodeURIComponent(fila.equipoSlug)}`" class="equipo-tabla-liga">
                    <EscudoEquipoPublico v-if="fila.equipoEscudo" :src="fila.equipoEscudo" :alt="`Escudo de ${fila.equipoNombre}`" :width="32" :height="32" sizes="32px" loading="lazy" /><span v-else class="escudo-fallback" aria-hidden="true">{{ iniciales(fila.equipoNombre) }}</span><strong>{{ fila.equipoNombre }}</strong>
                  </NuxtLink>
                  <span v-else class="equipo-tabla-liga equipo-tabla-sin-ficha">
                    <EscudoEquipoPublico v-if="fila.equipoEscudo" :src="fila.equipoEscudo" :alt="`Escudo de ${fila.equipoNombre}`" :width="32" :height="32" sizes="32px" loading="lazy" /><span v-else class="escudo-fallback" aria-hidden="true">{{ iniciales(fila.equipoNombre) }}</span><strong>{{ fila.equipoNombre }}</strong>
                  </span>
                </td>
                <td>{{ fila.jugados }}</td><td>{{ fila.ganados }}</td><td>{{ fila.empatados }}</td><td>{{ fila.perdidos }}</td><td>{{ fila.diferencia }}</td><td><strong>{{ fila.puntos }}</strong></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </section>
    <section v-else-if="ficha.competencia.tipo === 'liga'" id="posiciones" class="bloque-liga-colombia panel-competicion estado-sin-tabla">
      <p class="etiqueta-seccion">TABLA DE POSICIONES</p>
      <h2>{{ ficha.temporada === ficha.temporadaActual ? 'Clasificación pendiente de confirmación' : 'Tabla final histórica pendiente de verificación' }}</h2>
      <p v-if="ficha.temporada === ficha.temporadaActual">No mostramos una tabla parcial como si fuera oficial. Consulta el calendario y los resultados mientras se publica una clasificación completa y confirmada para {{ ficha.temporada }}.</p>
      <p v-else>No mostramos la tabla actual como si fuera un resultado histórico. Aún no hay un snapshot final, completo y verificado guardado para {{ ficha.temporada }}.</p>
      <NuxtLink to="/liga-colombiana">Volver al hub de Liga colombiana <span aria-hidden="true">→</span></NuxtLink>
    </section>

    <section id="hoy" class="bloque-liga-colombia panel-competicion">
      <header class="encabezado-seccion-competicion"><div><p class="etiqueta-seccion">ENCUENTROS DE HOY</p><h2>Partidos de hoy</h2></div><span>{{ partidosHoyCompeticion.length }} encuentros</span></header>
      <div v-if="partidosHoyCompeticion.length" class="lista-partidos-competicion grilla-tarjetas-partidos-competicion">
        <TarjetaPartido
          v-for="partido in partidosHoyCompeticion"
          :key="partido.slug"
          :partido="partido"
          :competencia="ficha.competencia.nombre"
          :fecha="fechaPartido(partido.fechaIso)"
          :estado="etiquetaEstado(partido.estado)"
        />
      </div>
      <p v-else class="estado-competicion-vacio">No hay partidos confirmados para hoy en esta competición.</p>
    </section>

    <section id="proximos" class="bloque-liga-colombia panel-competicion">
      <header class="encabezado-seccion-competicion"><div><p class="etiqueta-seccion">AGENDA</p><h2>Próximos partidos</h2></div><span>{{ proximosPartidosCompeticion.length }} encuentros</span></header>
      <ul v-if="proximosPartidosCompeticion.length" class="lista-partidos-competicion lista-proximos-partidos-competicion"><li v-for="partido in proximosPartidosCompeticion" :key="partido.slug">
        <PartidoFila
          :partido="partido"
          :competencia="ficha.competencia.nombre"
          :fecha="fechaPartido(partido.fechaIso)"
          :estado="etiquetaEstado(partido.estado)"
        />
      </li></ul>
      <p v-else class="estado-competicion-vacio">No hay próximos partidos confirmados en el calendario público de esta temporada.</p>
    </section>

    <section id="resultados" class="bloque-liga-colombia panel-competicion">
      <header class="encabezado-seccion-competicion"><div><p class="etiqueta-seccion">MARCADORES CONFIRMADOS</p><h2>Resultados recientes</h2></div><span>{{ ficha.resultadosRecientes.length }} encuentros</span></header>
      <div v-if="ficha.resultadosRecientes.length" class="lista-partidos-competicion grilla-tarjetas-partidos-competicion">
        <TarjetaPartido
          v-for="partido in ficha.resultadosRecientes"
          :key="partido.slug"
          :partido="partido"
          :competencia="ficha.competencia.nombre"
          :fecha="fechaPartido(partido.fechaIso)"
          :estado="etiquetaEstado(partido.estado)"
        />
      </div>
      <p v-else class="estado-competicion-vacio">Todavía no hay resultados finales confirmados para mostrar.</p>
    </section>

    <PublicidadAdsterraSlot
      v-if="ficha.temporada === ficha.temporadaActual"
      formato="leaderboard"
      :contexto="`${ficha.competencia.nombre} · temporada actual`"
    />

    <section id="jornadas" class="bloque-liga-colombia jornadas-betplay" aria-labelledby="titulo-jornadas-betplay">
      <header class="encabezado-jornadas-betplay">
        <div class="identidad-jornadas-betplay">
          <p class="etiqueta-seccion">{{ ficha.competencia.nombre }} · FÚTBOL COLOMBIANO</p>
          <div class="titulo-descripcion-jornadas">
            <h2 id="titulo-jornadas-betplay">Jornadas</h2>
            <span>Calendario, resultados y detalles de cada jornada del futbol colombóano.</span>
          </div>
        </div>
        <label class="selector-jornada-temporada">
          <Trophy aria-hidden="true" />
          <span class="solo-lectores">Temporada</span>
          <select :value="ficha.temporada" :disabled="temporadasIndexables.length < 2" @change="cambiarTemporadaJornadas">
            <option v-for="opcionTemporada in temporadasIndexables" :key="opcionTemporada.temporada" :value="opcionTemporada.temporada">Temporada {{ opcionTemporada.temporada }}</option>
          </select>
        </label>
      </header>

      <div v-if="jornadasOrdenadas.length" class="explorador-jornadas-betplay">
        <div class="columna-jornada-activa">
          <nav class="navegador-jornadas-betplay" aria-label="Cambiar de jornada">
            <button type="button" class="jornada-adyacente" @click="moverJornada(-1)">
              <ArrowLeft aria-hidden="true" /><span>{{ jornadaAnterior?.nombre }}</span>
            </button>
            <span class="jornada-actual-seleccionada" aria-current="step">
              <strong>{{ jornadaSeleccionada?.nombre }}</strong>
              <small>Jornada {{ indiceJornadaSeleccionada + 1 }} de {{ jornadasOrdenadas.length }}</small>
            </span>
            <button type="button" class="jornada-adyacente jornada-adyacente--siguiente" @click="moverJornada(1)">
              <span>{{ jornadaSiguiente?.nombre }}</span><ArrowRight aria-hidden="true" />
            </button>
          </nav>

          <article v-if="jornadaSeleccionada" class="panel-jornada-activa">
            <header class="cabecera-jornada-activa">
              <div class="titulo-estado-jornada">
                <h3>{{ jornadaSeleccionada.nombre }}</h3>
                <span class="estado-jornada-activa" :class="`estado-jornada-activa--${estadoJornada(jornadaSeleccionada).toLocaleLowerCase('es-CO').replace(/\s+/g, '-')}`">{{ estadoJornada(jornadaSeleccionada) }}</span>
              </div>
              <div class="datos-jornada-activa">
                <span><CalendarDays aria-hidden="true" />{{ rangoFechasJornada(jornadaSeleccionada) }}</span>
                <span><CircleDot aria-hidden="true" />{{ jornadaSeleccionada.partidos.length }} partidos</span>
              </div>
            </header>
            <ul class="filas-partidos-jornada-betplay">
              <li v-for="partido in jornadaSeleccionada.partidos" :key="partido.slug">
                <PartidoFila
                  :partido="partido"
                  :competencia="ficha.competencia.nombre"
                  :fecha="fechaPartido(partido.fechaIso)"
                  :estado="etiquetaEstado(partido.estado)"
                  variante="jornada"
                />
              </li>
            </ul>
            <NuxtLink v-if="jornadaSeleccionada.ruta" class="enlace-ficha-jornada" :to="jornadaSeleccionada.ruta">
              Ver todos los detalles de {{ jornadaSeleccionada.nombre }} <ArrowRight aria-hidden="true" />
            </NuxtLink>
          </article>
        </div>

        <aside class="panel-indice-jornadas" aria-labelledby="titulo-indice-jornadas">
          <header><CalendarDays aria-hidden="true" /><h3 id="titulo-indice-jornadas">Todas las jornadas</h3></header>
          <ul>
            <li v-for="jornada in jornadasOrdenadas" :key="jornada.nombre">
              <button
                type="button"
                class="indice-jornada-boton"
                :class="{ 'jornada-indice-activa': jornada.nombre === jornadaSeleccionada?.nombre }"
                :aria-pressed="jornada.nombre === jornadaSeleccionada?.nombre"
                @click="elegirJornada(jornada.nombre)"
              >
                <span class="icono-jornada-indice"><CircleDot v-if="jornada.nombre === jornadaSeleccionada?.nombre" aria-hidden="true" /><CalendarDays v-else aria-hidden="true" /></span>
                <span class="texto-jornada-indice"><strong>{{ jornada.nombre }}</strong><small>{{ rangoFechasJornada(jornada) }}</small></span>
                <span class="estado-jornada-indice">{{ estadoJornada(jornada) }}</span>
                <ArrowRight class="flecha-jornada-indice" aria-hidden="true" />
              </button>
            </li>
          </ul>
        </aside>
      </div>
      <p v-else class="estado-competicion-vacio">El calendario oficial de jornadas aún no está disponible.</p>
    </section>

    <section id="equipos" class="bloque-liga-colombia panel-competicion bloque-equipos-liga" aria-labelledby="titulo-equipos-liga">
      <header class="encabezado-seccion-competicion encabezado-equipos-liga">
        <div class="titulo-equipos-liga"><span class="marca-titulo-equipos" aria-hidden="true"><Trophy /></span><div><p class="etiqueta-seccion">CLUBES PARTICIPANTES · {{ ficha.temporada }}</p><h2 id="titulo-equipos-liga">Equipos de {{ ficha.competencia.nombre }}</h2></div></div>
        <a class="ver-equipos-liga" href="#lista-equipos-liga">Ver todos los equipos <ArrowRight aria-hidden="true" /></a>
      </header>
      <ul id="lista-equipos-liga" class="grilla-equipos-competicion" tabindex="0" :aria-label="`Equipos participantes en ${ficha.competencia.nombre}; desliza para ver más`">
        <li v-for="equipo in equiposOrdenadosLiga" :key="equipo.nombre">
          <TarjetaEquipoLiga :equipo="equipo" :jugador-destacado="temporadaLiga ? datosFiguraDestacadaEquipo(equipo.nombre).nombre : ''" :foto-jugador="temporadaLiga ? datosFiguraDestacadaEquipo(equipo.nombre).imagen : null" :mostrar-figura="temporadaLiga" />
        </li>
      </ul>
    </section>

    <section id="noticias" class="bloque-liga-colombia panel-competicion">
      <header class="encabezado-seccion-competicion"><div><p class="etiqueta-seccion">ACTUALIDAD</p><h2>Noticias de {{ ficha.competencia.nombre }}</h2></div></header>
      <div v-if="ficha.noticias.length" class="grilla-noticias-competicion">
        <TarjetaNoticiaSecundaria v-for="noticia in ficha.noticias" :key="noticia.slug" :articulo="noticia" mostrar-resumen />
      </div>
      <p v-else class="estado-competicion-vacio">Aún no hay noticias publicadas relacionadas con {{ ficha.competencia.nombre }}.</p>
    </section>

    <p class="nota-fuente-competicion">Calendario, marcadores y clasificación basados en información pública de DIMAYOR.</p>
  </main>
</template>

<style scoped>
.pagina-competicion-publica { max-width: none; margin-inline: auto; }
.cabecera-competicion { position: relative; align-content: end; min-height: 210px; margin-bottom: 22px; overflow: hidden; border-radius: 12px; background: linear-gradient(125deg, #0b2341, #103c62 58%, #0b2341); padding: 28px; }
.cabecera-competicion h1, .cabecera-competicion p:not(.etiqueta-seccion) { color: #fff; }
.cabecera-competicion .etiqueta-seccion { color: #ffd343; }
.cabecera-competicion .navegacion-liga-colombia { display: flex; flex-wrap: wrap; gap: 9px; margin-top: 18px; }
.cabecera-competicion .navegacion-liga-colombia a { padding: 8px 13px; border: 1px solid rgb(255 255 255 / 28%); border-radius: 999px; color: #fff; text-decoration: none; }
.cabecera-competicion .navegacion-liga-colombia a:hover, .cabecera-competicion .navegacion-liga-colombia a:focus-visible { outline: 2px solid #78dcf4; outline-offset: 2px; }
.acciones-seguimiento-competicion { display: flex; flex-wrap: wrap; align-items: center; gap: 10px 14px; margin-top: 16px; }
.acciones-seguimiento-competicion > span { color: #d2e2f5; font-size: .78rem; }
.acciones-seguimiento-competicion :deep(.boton-seguimiento-competicion:not([aria-pressed="true"])) { border-color: #78dcf4; background: #103c62; color: #fff; }
.acciones-seguimiento-competicion :deep(.boton-seguimiento-competicion[aria-pressed="true"]) { border-color: #78dcf4; background: #17476b; color: #fff; }
.panel-competicion { padding: clamp(18px, 3vw, 28px); color: #13243a; background: #fff; border: 1px solid #dce4ed; border-radius: 16px; box-shadow: 0 10px 30px rgb(16 36 61 / 5%); }
.selector-temporadas { display: grid; grid-template-columns: minmax(0, auto) 1fr; align-items: center; gap: 10px 24px; }
.selector-temporadas h2, .panel-competicion h2 { margin: 2px 0 0; color: #10233d; font-size: clamp(1.25rem, 2.4vw, 1.7rem); }
.selector-temporadas nav { display: flex; flex-wrap: wrap; gap: 9px; }
.selector-temporadas-enlaces { display: grid; gap: 9px; }
.selector-temporadas .navegacion-temporada-adjunta a { padding-block: 6px; font-size: .86rem; }
.selector-temporadas nav a { padding: 8px 13px; color: #145e99; border: 1px solid #d5e1ed; border-radius: 999px; text-decoration: none; }
.selector-temporadas nav a[aria-current="page"] { color: #fff; border-color: #145e99; background: #145e99; }
.selector-temporadas small { grid-column: 1 / -1; color: #65758a; }
.resumen-competicion { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 14px; margin: 18px 0 22px; }
.aviso-frescura-competicion { margin: 0 0 18px; border-left: 3px solid #d59a00; border-radius: 7px; background: #fff6db; padding: 11px 14px; color: #744b00; font-size: .9rem; line-height: 1.55; }
.resumen-competicion > div { display: grid; gap: 3px; padding: 16px 18px; border: 1px solid #dce4ed; border-radius: 14px; background: #f3f7fb; }
.resumen-competicion strong { color: #0d4d7e; font-size: 1.55rem; }
.resumen-competicion span, .encabezado-seccion-competicion > span, .sello-verificado, .estado-competicion-vacio, .nota-fuente-competicion { color: #586980; font-size: .88rem; }
.bloque-liga-colombia.panel-competicion { margin-top: 22px; }
.encabezado-seccion-competicion { display: flex; align-items: center; justify-content: space-between; gap: 16px; margin-bottom: 17px; }
.encabezado-seccion-competicion h2 { margin-top: 3px; }
.sello-verificado { padding: 6px 10px; border-radius: 999px; background: #e7f5ed; color: #17613b; font-weight: 700; }
.nota-snapshot-tabla { margin: -5px 0 16px; color: #586980; font-size: .84rem; line-height: 1.6; }
.nota-snapshot-tabla a { margin-left: 5px; color: #145e99; }
#posiciones .encabezado-seccion-competicion { margin-bottom: 10px; }
#posiciones .fase-tabla-liga h3 { margin-bottom: 4px; }
#posiciones .tabla-liga-scroll caption { padding-bottom: 2px; line-height: 1.3; }
.fase-tabla-liga + .fase-tabla-liga { margin-top: 20px; }
.fase-tabla-liga h3 { margin: 0 0 8px; color: #173b60; }
.tabla-liga-scroll { overflow-x: auto; }
.tabla-liga-scroll table { width: 100%; border-collapse: collapse; font-size: .86rem; }
.tabla-liga-scroll caption { padding: 0 0 10px; color: #586980; text-align: left; }
.tabla-liga-scroll th, .tabla-liga-scroll td { padding: 10px 8px; border-bottom: 1px solid #e2e8f0; text-align: right; white-space: nowrap; }
.tabla-liga-scroll th:first-child, .tabla-liga-scroll td:first-child { width: 58px; }
.tabla-liga-scroll th:nth-child(2), .tabla-liga-scroll td:nth-child(2) { text-align: left; }
.equipo-tabla-liga { display: inline-flex; align-items: center; gap: 9px; color: #145e99; text-decoration: none; }
.equipo-tabla-sin-ficha { color: inherit; }
.equipo-tabla-liga:hover, .equipo-tabla-liga:focus-visible, .enlace-competicion:hover { text-decoration: underline; }
.lista-partidos-competicion { display: grid; gap: 10px; margin: 0; padding: 0; list-style: none; }
.lista-partidos-competicion > li { min-width: 0; }
.grilla-tarjetas-partidos-competicion { grid-template-columns: repeat(3, minmax(0, 1fr)); }
.lista-proximos-partidos-competicion { gap: 8px; }
@media (max-width: 1050px) { .grilla-tarjetas-partidos-competicion { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
@media (max-width: 680px) { .grilla-tarjetas-partidos-competicion { grid-template-columns: minmax(0, 1fr); } }
.lista-jornadas-competicion { display: grid; gap: 9px; }
.lista-jornadas-competicion details { border: 1px solid #dce4ed; border-radius: 12px; }
.lista-jornadas-competicion summary { display: flex; justify-content: space-between; gap: 12px; padding: 14px 16px; cursor: pointer; }
.lista-jornadas-competicion summary span, .partido-jornada-compacto time { color: #65758a; font-size: .86rem; }
.partido-jornada-compacto { display: grid; grid-template-columns: minmax(130px, .6fr) minmax(0, 1.6fr) auto; align-items: center; gap: 14px; padding: 12px 16px; border-top: 1px solid #e5eaf0; }
.partido-jornada-compacto p { display: flex; justify-content: center; gap: 10px; margin: 0; text-align: center; }
.partido-jornada-compacto p span { color: #0d5c96; font-weight: 900; white-space: nowrap; }
.partido-jornada-compacto > a, .enlace-competicion { color: #145e99; font-weight: 700; white-space: nowrap; }
.grilla-equipos-competicion { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 10px; margin: 0; padding: 0; list-style: none; }
.grilla-equipos-competicion li > a, .equipo-sin-ficha { display: flex; align-items: center; gap: 10px; min-height: 68px; padding: 10px; border: 1px solid #e1e8ef; border-radius: 12px; color: #17304d; text-decoration: none; }
.grilla-equipos-competicion li > a strong, .equipo-sin-ficha strong { flex: 1; }
.grilla-equipos-competicion img { width: 42px; height: 42px; object-fit: contain; }
.escudo-fallback { display: inline-grid; width: 36px; height: 36px; flex: 0 0 36px; place-items: center; border-radius: 50%; background: #17466b; color: #fff; font-size: .72rem; font-weight: 800; }
.grilla-noticias-competicion { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 14px; }
.grilla-noticias-competicion article { overflow: hidden; padding: 16px; border: 1px solid #e0e7ef; border-radius: 13px; }
.grilla-noticias-competicion h3 { margin: 8px 0; line-height: 1.35; }
.grilla-noticias-competicion h3 a { color: #142b48; text-decoration: none; }
.grilla-noticias-competicion article > p:not(.etiqueta-seccion) { color: #53657a; line-height: 1.55; }
.imagen-noticia-competicion { display: block; aspect-ratio: 16 / 8; margin: -16px -16px 14px; overflow: hidden; }
.imagen-noticia-competicion img { width: 100%; height: 100%; object-fit: cover; }
.nota-fuente-competicion { margin: 18px 4px; line-height: 1.6; }
.estado-sin-tabla a { color: #145e99; font-weight: 700; }
:global(body.tema-publico-azul) .panel-competicion { color: #e5efff; border-color: #294563; background: #102842; box-shadow: 0 12px 32px rgb(0 0 0 / 18%); }
:global(body.tema-publico-azul) .panel-competicion h2,
:global(body.tema-publico-azul) .fase-tabla-liga h3,
:global(body.tema-publico-azul) .grilla-noticias-competicion h3 a { color: #f1f6ff; }
:global(body.tema-publico-azul) .selector-temporadas small,
:global(body.tema-publico-azul) .nota-snapshot-tabla,
:global(body.tema-publico-azul) .resumen-competicion span,
:global(body.tema-publico-azul) .encabezado-seccion-competicion > span,
:global(body.tema-publico-azul) .estado-competicion-vacio,
:global(body.tema-publico-azul) .nota-fuente-competicion,
:global(body.tema-publico-azul) .tabla-liga-scroll caption,
:global(body.tema-publico-azul) .partido-jornada-compacto time { color: #b4c9df; }
:global(body.tema-publico-azul) .resumen-competicion > div { border-color: #294563; background: #132f4d; }
:global(body.tema-publico-azul) .aviso-frescura-competicion { border-color: #eab338; background: #382d15; color: #ffe2a6; }
:global(body.tema-publico-azul) .resumen-competicion strong,
:global(body.tema-publico-azul) .partido-jornada-compacto p span { color: #8ce8ff; }
:global(body.tema-publico-azul) .selector-temporadas nav a,
:global(body.tema-publico-azul) .nota-snapshot-tabla a,
:global(body.tema-publico-azul) .equipo-tabla-liga,
:global(body.tema-publico-azul) .partido-jornada-compacto > a,
:global(body.tema-publico-azul) .enlace-competicion,
:global(body.tema-publico-azul) .estado-sin-tabla a { color: #9aeaff; }
:global(body.tema-publico-azul) .selector-temporadas nav a[aria-current="page"] { color: #0b2440; background: #8ce8ff; }
:global(body.tema-publico-azul) .tabla-liga-scroll th,
:global(body.tema-publico-azul) .tabla-liga-scroll td,
:global(body.tema-publico-azul) .lista-jornadas-competicion details,
:global(body.tema-publico-azul) .partido-jornada-compacto,
:global(body.tema-publico-azul) .grilla-equipos-competicion li > a,
:global(body.tema-publico-azul) .equipo-sin-ficha,
:global(body.tema-publico-azul) .grilla-noticias-competicion article { border-color: #294563; }
:global(body.tema-publico-azul) .grilla-equipos-competicion li > a,
:global(body.tema-publico-azul) .equipo-sin-ficha,
:global(body.tema-publico-azul) .grilla-noticias-competicion article { color: #e5efff; background: #132f4d; }
:global(body.tema-publico-azul) .grilla-noticias-competicion article > p:not(.etiqueta-seccion) { color: #c1d1e2; }
:global(body.tema-publico-azul) .sello-verificado { color: #a6f0c1; background: #16472e; }
:global(body.tema-publico-azul) .selector-temporadas nav a[aria-current="page"] { color: #0b2440; }
.panel-competicion .etiqueta-seccion { margin: 0; color: #1769a6; font-size: .75rem; font-weight: 800; letter-spacing: .09em; }
:global(body.tema-publico-azul) .panel-competicion .etiqueta-seccion { color: #79dff7; }
.solo-lectores { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0, 0, 0, 0); white-space: nowrap; border: 0; }
@media (max-width: 860px) { .grilla-equipos-competicion { grid-template-columns: repeat(2, minmax(0, 1fr)); } .grilla-noticias-competicion { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
@media (max-width: 600px) { .selector-temporadas { grid-template-columns: minmax(0, 1fr); } .selector-temporadas small { grid-column: 1; } .resumen-competicion { grid-template-columns: 1fr; } .resumen-competicion > div { grid-template-columns: auto 1fr; align-items: center; } .grilla-equipos-competicion, .grilla-noticias-competicion { grid-template-columns: minmax(0, 1fr); } .partido-jornada-compacto { grid-template-columns: minmax(0, 1fr) auto; gap: 7px 12px; } .partido-jornada-compacto p { grid-column: 1 / -1; grid-row: 2; justify-content: flex-start; flex-wrap: wrap; } .partido-jornada-compacto > a { grid-column: 2; grid-row: 1; } }

.pagina-competicion-publica--liga { padding-top: 22px; }
.pagina-competicion-publica--liga > :deep(.migas-navegacion) { width: fit-content; max-width: 100%; margin-bottom: 24px; }
.cabecera-competicion--liga { display: flex !important; flex-direction: column; width: 100%; max-width: none !important; min-height: 334px; align-content: initial; justify-content: flex-end; align-items: stretch; gap: 0; margin: 0 0 20px !important; overflow: hidden; border: 0 !important; border-radius: 24px; background-color: #041c36; background-image: linear-gradient(125deg, #0b2341, #103c62 58%, #0b2341); padding: 0; box-shadow: 0 18px 42px rgb(5 32 61 / 16%); }
.banner-liga-betplay { position: relative; width: 100%; overflow: hidden; border-radius: inherit; aspect-ratio: 3 / 1; background: #031a35; }
.banner-liga-betplay picture, .banner-liga-betplay img { display: block; width: 100%; height: 100%; }
.banner-liga-betplay img { object-fit: cover; }
.banner-liga-betplay--general img { object-fit: contain; }
.texto-temporada-banner-liga { position: absolute; z-index: 1; top: 11%; left: 2.7%; display: flex; width: 50%; height: 45%; flex-direction: column; justify-content: center; background: linear-gradient(90deg, #031a35 0%, #031a35 86%, rgb(3 26 53 / 0%) 100%); padding-right: 8%; color: #fff; }
.texto-temporada-banner-liga > p { margin: 0 0 4px; color: #ffca00; font-size: clamp(.72rem, 1.2vw, 1.08rem); font-weight: 850; letter-spacing: .025em; }
.texto-temporada-banner-liga h1 { margin: 0; color: #fff; font-size: clamp(2.4rem, 4.25vw, 4.2rem); font-weight: 950; letter-spacing: -.045em; line-height: 1.02; text-wrap: balance; }
.texto-temporada-banner-liga > span { max-width: 660px; margin-top: 8px; color: #f3f7fc; font-size: clamp(.85rem, 1.35vw, 1.15rem); line-height: 1.25; }
.controles-banner-liga { position: absolute; inset: 0; }
.controles-banner-liga a { position: absolute; top: 59.5%; height: 9%; display: block; border: 0; border-radius: 999px; background: transparent; }
.controles-banner-liga a:nth-child(1) { left: 2.7%; width: 5.9%; }
.controles-banner-liga a:nth-child(2) { left: 9%; width: 10%; }
.controles-banner-liga a:nth-child(3) { left: 19.2%; width: 7.5%; }
.controles-banner-liga a:nth-child(4) { left: 27%; width: 7%; }
.controles-banner-liga a:nth-child(5) { left: 34.7%; width: 7%; }
.controles-banner-liga a:nth-child(6) { left: 42%; width: 7%; }
.controles-banner-liga a:hover { background: rgb(255 203 0 / 16%); }
.controles-banner-liga a:focus-visible { outline: 3px solid #ffcc00; outline-offset: 2px; background: rgb(255 203 0 / 15%); }
.seguimiento-banner-liga { position: absolute; top: 72.8%; left: 2.7%; width: 20%; height: 11%; }
.seguimiento-banner-liga :deep(.control-seguimiento-competicion), .seguimiento-banner-liga :deep(.boton-seguimiento-competicion) { width: 100%; height: 100%; }
.seguimiento-banner-liga :deep(.boton-seguimiento-competicion) { border: 0; background: transparent; color: transparent; padding: 0; font-size: 0; }
.seguimiento-banner-liga :deep(.boton-seguimiento-competicion > span) { color: transparent; }
.seguimiento-banner-liga :deep(.boton-seguimiento-competicion:focus-visible) { border: 3px solid #fff; border-radius: 999px; background: rgb(255 200 0 / 85%); outline: 3px solid #0a2750; }
.seguimiento-banner-liga :deep(.boton-seguimiento-competicion[aria-pressed="true"]) { border: 2px solid #fff; background: #0953ad; color: #fff; font-size: .95rem; }
.seguimiento-banner-liga :deep(.boton-seguimiento-competicion[aria-pressed="true"] > span) { color: #ffda48; }
.controles-banner-liga--visibles { inset: auto auto 15% 2.7%; display: flex; flex-wrap: wrap; gap: 7px; width: min(70%, 860px); height: auto; }
.controles-banner-liga--visibles a { position: static; display: inline-flex; width: auto; height: 36px; align-items: center; gap: 6px; border: 1px solid rgb(255 255 255 / 70%); background: rgb(5 28 55 / 82%); padding: 7px 11px; color: #fff; font-size: .78rem; font-weight: 750; text-decoration: none; backdrop-filter: blur(8px); }
.controles-banner-liga--visibles a svg { width: 16px; height: 16px; color: #ffd000; }
.banner-liga-betplay--iconos .controles-banner-liga--visibles a { width: 38px; justify-content: center; padding-inline: 0; }
.controles-banner-liga--visibles a:hover, .controles-banner-liga--visibles a:focus-visible { border-color: #ffd000; background: #0b3b70; outline: 2px solid #ffd000; outline-offset: 2px; }
.seguimiento-banner-liga--visible { top: auto; bottom: 3.5%; left: 2.7%; width: auto; height: auto; }
.seguimiento-banner-liga--visible :deep(.control-seguimiento-competicion), .seguimiento-banner-liga--visible :deep(.boton-seguimiento-competicion) { width: auto; height: auto; }
.seguimiento-banner-liga--visible :deep(.boton-seguimiento-competicion) { min-height: 36px; border: 1px solid #ffd000; background: #ffd000; padding: 7px 13px; color: #092344; font-size: .8rem; }
.seguimiento-banner-liga--visible :deep(.boton-seguimiento-competicion > span) { color: inherit; }
.seguimiento-banner-liga--visible :deep(.boton-seguimiento-competicion[aria-pressed="true"]) { border-color: #fff; background: #0b4d88; color: #fff; font-size: .8rem; }
.seguimiento-banner-liga--visible :deep(.boton-seguimiento-competicion[aria-pressed="true"] > span) { color: #ffd000; }
.banner-liga-betplay--iconos .seguimiento-banner-liga--visible :deep(.boton-seguimiento-competicion) { width: 38px; min-width: 38px; padding-inline: 0; font-size: 0; }
.banner-liga-betplay--iconos .seguimiento-banner-liga--visible :deep(.boton-seguimiento-competicion > span) { color: inherit; font-size: 1rem; }
.banner-liga-betplay--iconos .seguimiento-banner-liga--visible :deep(.boton-seguimiento-competicion[aria-pressed="true"]) { font-size: 0; }
.banner-liga-betplay--iconos .seguimiento-banner-liga--visible :deep(.boton-seguimiento-competicion[aria-pressed="true"] > span) { color: #ffd000; }
.contenido-cabecera-competicion { display: flex; width: 100%; flex: 1 1 auto; align-items: center; gap: 26px; }
.logo-competicion-hero { width: 126px; height: 160px; flex: 0 0 auto; border: 1px solid rgb(255 255 255 / 82%); border-radius: 17px; background: #fff; padding: 7px; object-fit: contain; box-shadow: 0 10px 30px rgb(0 0 0 / 17%); }
.texto-cabecera-competicion { max-width: min(760px, 63%); }
.texto-cabecera-competicion { width: min(760px, calc(100% - 152px)); flex: 1 1 auto; min-width: 0; max-width: 760px; }
.texto-cabecera-competicion .etiqueta-seccion { margin: 0 0 5px; color: #ffd21c; font-size: clamp(.85rem, 1.2vw, 1.03rem); font-weight: 850; letter-spacing: .025em; }
.texto-cabecera-competicion h1 { max-width: 760px; margin: 0; color: #fff; font-size: clamp(2.7rem, 5vw, 4.25rem); font-weight: 950; letter-spacing: -.045em; line-height: .99; text-wrap: balance; }
.texto-cabecera-competicion > p:last-child { max-width: 650px; margin: 12px 0 0; color: #f3f7fc !important; font-size: clamp(1rem, 1.45vw, 1.25rem); line-height: 1.4; }
.cabecera-competicion--liga .navegacion-liga-colombia { position: relative; z-index: 2; display: flex; flex-wrap: wrap; gap: 9px; margin: auto 0 0; padding-top: 24px; }
.cabecera-competicion--liga .navegacion-liga-colombia a { display: inline-flex; min-height: 42px; align-items: center; gap: 8px; border: 1px solid rgb(255 255 255 / 54%); border-radius: 999px; background: rgb(4 25 48 / 54%); padding: 8px 15px; color: #fff; font-size: .92rem; font-weight: 650; text-decoration: none; backdrop-filter: blur(8px); transition: background .18s ease, border-color .18s ease, color .18s ease; }
.cabecera-competicion--liga .navegacion-liga-colombia a svg { width: 18px; height: 18px; }
.cabecera-competicion--liga .navegacion-liga-colombia a[aria-current="location"] { border-color: #fff; background: #fff; color: #0a3263; font-weight: 800; }
.cabecera-competicion--liga .navegacion-liga-colombia a:hover, .cabecera-competicion--liga .navegacion-liga-colombia a:focus-visible { border-color: #ffd21c; background: #ffd21c; color: #092442; outline: 2px solid #fff; outline-offset: 2px; }
.acceso-partidos-en-vivo { position: absolute; top: 19px; right: 22px; display: inline-flex; align-items: center; gap: 7px; border-radius: 999px; background: #ba1536; padding: 8px 12px; color: #fff; font-size: .78rem; font-weight: 850; text-decoration: none; }
.acceso-partidos-en-vivo svg { width: 16px; height: 16px; }
.fila-temporada-resumen--liga { display: grid; grid-template-columns: minmax(0, 2.5fr) repeat(3, minmax(0, .78fr)); gap: 14px; margin: 0 0 34px; }
.fila-temporada-resumen--liga .selector-temporadas { min-width: 0; display: grid; grid-template-columns: auto minmax(0, 1fr) auto; align-items: center; gap: 12px 18px; padding: 20px 24px; }
.titulo-temporadas-con-icono { display: flex; align-items: center; gap: 14px; }
.icono-temporadas { display: grid; width: 54px; height: 54px; flex: 0 0 auto; place-items: center; border-radius: 15px; background: #e9f2ff; color: #0752b2; }
.icono-temporadas svg { width: 29px; height: 29px; }
.fila-temporada-resumen--liga .selector-temporadas h2 { font-size: clamp(1.35rem, 2vw, 1.75rem); }
.fila-temporada-resumen--liga .selector-temporadas .etiqueta-seccion { font-size: .63rem; }
.fila-temporada-resumen--liga .selector-temporadas-enlaces { min-width: 0; display: flex; flex-wrap: wrap; align-items: center; gap: 10px; }
.fila-temporada-resumen--liga .selector-temporadas-enlaces nav { min-width: 0; flex-wrap: wrap; overflow: visible; }
.fila-temporada-resumen--liga .selector-temporadas-enlaces > nav:first-child a { flex: 0 0 auto; padding: 8px 13px; font-weight: 750; }
.fila-temporada-resumen--liga .selector-temporadas-enlaces .navegacion-temporada-adjunta { flex: 0 1 auto; border-left: 1px solid #b9cce0; padding-left: 11px; }
.fila-temporada-resumen--liga .navegacion-temporada-adjunta a { display: inline-flex; align-items: center; gap: 5px; white-space: normal; }
.navegacion-temporada-adjunta svg { width: 16px; height: 16px; }
.fila-temporada-resumen--liga .resumen-competicion { grid-column: span 1; min-width: 0; grid-template-columns: 56px minmax(0, 1fr); align-content: center; align-items: center; column-gap: 12px; row-gap: 0; margin: 0; border: 1px solid #dce6f2; border-radius: 18px; background: #fff; padding: 18px 20px; box-shadow: 0 10px 26px rgb(22 55 91 / 8%); }
.fila-temporada-resumen--liga .resumen-competicion > div { display: grid; grid-column: 1 / -1; grid-template-columns: 56px minmax(0, 1fr); align-items: center; gap: 0 12px; border: 0; background: transparent; padding: 0; }
.fila-temporada-resumen--liga .resumen-competicion > div + div { display: none; }
.fila-temporada-resumen--liga .resumen-competicion::before { position: absolute; }
.fila-temporada-resumen--liga .resumen-competicion > div::after { display: none; }
.fila-temporada-resumen--liga .resumen-competicion > div:first-child { position: relative; }
.fila-temporada-resumen--liga .resumen-competicion { display: contents; }
.fila-temporada-resumen--liga .resumen-competicion > div { min-height: 110px; grid-column: auto; border: 1px solid #dce6f2; border-radius: 18px; background: #fff; padding: 16px 18px; box-shadow: 0 10px 26px rgb(22 55 91 / 8%); }
.fila-temporada-resumen--liga .resumen-competicion > div + div { display: grid; }
.fila-temporada-resumen--liga .resumen-competicion > div strong { grid-column: 2; align-self: end; color: #102a55; font-size: 1.7rem; line-height: 1; }
.fila-temporada-resumen--liga .resumen-competicion > div > span:last-child { grid-column: 2; align-self: start; color: #35506f; font-size: .87rem; }
.icono-resumen { display: grid; width: 56px; height: 56px; grid-row: 1 / span 2; place-items: center; border-radius: 17px; }
.icono-resumen svg { width: 28px; height: 28px; }
.icono-resumen--equipos { background: #e9f2ff; color: #1760c4; }
.icono-resumen--jornadas { background: #e3f8f2; color: #0b9c69; }
.icono-resumen--partidos { background: #fff6d9; color: #e5a900; }
.bloque-equipos-liga { margin-top: 0 !important; padding: 0 4px 8px; border: 0; background: transparent; box-shadow: none; }
.encabezado-equipos-liga { margin-bottom: 18px; }
.titulo-equipos-liga { display: flex; align-items: center; gap: 14px; }
.marca-titulo-equipos { display: grid; width: 12px; height: 40px; flex: 0 0 12px; place-items: center; border-radius: 999px; background: #ffca00; color: #fff; }
.marca-titulo-equipos svg { width: 17px; height: 17px; }
.titulo-equipos-liga h2 { font-size: clamp(1.55rem, 2.2vw, 2rem) !important; letter-spacing: -.025em; }
.ver-equipos-liga { display: inline-flex; align-items: center; gap: 7px; color: #06499f; font-size: .96rem; font-weight: 850; text-decoration: none; }
.ver-equipos-liga:hover, .ver-equipos-liga:focus-visible { text-decoration: underline; }
.ver-equipos-liga svg { width: 18px; height: 18px; }
.grilla-equipos-competicion { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 14px; margin: 0; padding: 0 2px 14px; list-style: none; }
.grilla-equipos-competicion li { min-width: 0; }
.grilla-equipos-competicion li > a, .grilla-equipos-competicion li > article { min-height: 0; }
.grilla-noticias-competicion article { padding: 0 0 14px; }
.grilla-noticias-competicion article > :not(.imagen-noticia-competicion) { margin-inline: 14px; }
.grilla-noticias-competicion .imagen-noticia-competicion { margin: 0 0 12px; }
:global(body.tema-publico-azul) .fila-temporada-resumen--liga .resumen-competicion > div { border-color: #294563; background: #102842; }
:global(body.tema-publico-azul) .fila-temporada-resumen--liga .resumen-competicion > div strong { color: #f1f6ff; }
:global(body.tema-publico-azul) .fila-temporada-resumen--liga .resumen-competicion > div > span:last-child { color: #c1d1e2; }
:global(body.tema-publico-azul) .icono-temporadas { background: #183c62; color: #91ddff; }
:global(body.tema-publico-azul) .ver-equipos-liga { color: #91ddff; }
:global(body.tema-publico-azul) .bloque-equipos-liga .titulo-equipos-liga h2 { color: #f1f6ff; }
@media (max-width: 1250px) {
  .fila-temporada-resumen--liga { grid-template-columns: repeat(3, minmax(0, 1fr)); }
  .fila-temporada-resumen--liga .selector-temporadas { grid-column: 1 / -1; }
  .grilla-equipos-competicion { grid-template-columns: repeat(3, minmax(0, 1fr)); }
}
@media (max-width: 760px) {
  .pagina-contenido.pagina-publica-medio.pagina-competicion-publica--liga { padding-top: 16px; }
  .banner-liga-betplay { aspect-ratio: 1080 / 724; }
  .texto-temporada-banner-liga { top: 10%; left: 2.7%; width: 95%; height: 47%; background: linear-gradient(90deg, #031a35 0%, rgb(3 26 53 / 98%) 76%, rgb(3 26 53 / 0%) 100%); padding-right: 8%; }
  .texto-temporada-banner-liga > p { max-width: 88%; font-size: .72rem; }
  .texto-temporada-banner-liga h1 { max-width: 88%; font-size: clamp(2rem, 8vw, 3.35rem); }
  .texto-temporada-banner-liga > span { max-width: 88%; font-size: clamp(.74rem, 3vw, .92rem); }
  .controles-banner-liga a { top: 59.5%; height: 9%; }
  .controles-banner-liga a:nth-child(1) { left: 5.65%; width: 11.6%; }
  .controles-banner-liga a:nth-child(2) { left: 18.05%; width: 19.9%; }
  .controles-banner-liga a:nth-child(3) { left: 38.7%; width: 15.3%; }
  .controles-banner-liga a:nth-child(4) { left: 54.6%; width: 13.9%; }
  .controles-banner-liga a:nth-child(5) { left: 69.2%; width: 13.9%; }
  .controles-banner-liga a:nth-child(6) { left: 83.7%; width: 14.1%; }
  .seguimiento-banner-liga { top: 73.2%; left: 5.55%; width: 39.4%; height: 10.5%; }
  .seguimiento-banner-liga :deep(.boton-seguimiento-competicion[aria-pressed="true"]) { font-size: .72rem; }
  .banner-liga-betplay--general img { object-fit: cover; object-position: left center; }
  .banner-liga-betplay--general { display: flex; aspect-ratio: auto; flex-direction: column; }
  .banner-liga-betplay--general picture { height: auto; aspect-ratio: 1080 / 724; }
  .controles-banner-liga--visibles { position: static; inset: auto; width: 100%; justify-content: flex-start; gap: 5px; background: #061a36; padding: 8px 10px 4px; }
  .controles-banner-liga--visibles a { height: 31px; gap: 4px; padding: 5px 7px; font-size: .67rem; }
  .controles-banner-liga--visibles a svg { width: 14px; height: 14px; }
  .banner-liga-betplay--iconos .controles-banner-liga--visibles a { width: 32px; height: 31px; padding: 0; }
  .seguimiento-banner-liga--visible { position: static; width: 100%; background: #061a36; padding: 4px 10px 10px; }
  .seguimiento-banner-liga--visible :deep(.boton-seguimiento-competicion) { min-height: 31px; padding: 5px 10px; font-size: .72rem; }
  .seguimiento-banner-liga--visible :deep(.boton-seguimiento-competicion[aria-pressed="true"]) { font-size: .72rem; }
  .banner-liga-betplay--iconos .seguimiento-banner-liga--visible :deep(.boton-seguimiento-competicion) { width: 32px; min-width: 32px; font-size: 0; }
  .banner-liga-betplay--iconos .seguimiento-banner-liga--visible :deep(.boton-seguimiento-competicion[aria-pressed="true"]) { font-size: 0; }
  .cabecera-competicion--liga { min-height: 410px; justify-content: flex-end; background-position: 58% center; padding: 20px 18px 18px; }
  .cabecera-competicion--general { min-height: 0; padding: 0; }
  .contenido-cabecera-competicion { align-items: flex-start; gap: 14px; }
  .logo-competicion-hero { width: 76px; height: 100px; border-radius: 12px; }
  .texto-cabecera-competicion { max-width: 68%; padding-top: 4px; }
  .texto-cabecera-competicion h1 { font-size: clamp(2rem, 8vw, 3.2rem); }
  .texto-cabecera-competicion > p:last-child { font-size: .92rem; }
  .cabecera-competicion--liga .navegacion-liga-colombia { gap: 7px; padding-top: 22px; }
  .cabecera-competicion--liga .navegacion-liga-colombia a { min-height: 38px; gap: 6px; padding: 7px 10px; font-size: .79rem; }
  .cabecera-competicion--liga .navegacion-liga-colombia a svg { width: 16px; height: 16px; }
  .fila-temporada-resumen--liga { grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 8px; }
  .fila-temporada-resumen--liga .selector-temporadas { grid-column: 1 / -1; grid-template-columns: minmax(0, 1fr); padding: 16px; }
  .fila-temporada-resumen--liga .selector-temporadas-enlaces { display: grid; }
  .fila-temporada-resumen--liga .selector-temporadas-enlaces .navegacion-temporada-adjunta { border: 0; padding: 0; }
  .fila-temporada-resumen--liga .resumen-competicion > div { min-height: 112px; grid-template-columns: minmax(0, 1fr); justify-items: center; gap: 4px; padding: 11px 6px; text-align: center; }
  .fila-temporada-resumen--liga .resumen-competicion > div strong, .fila-temporada-resumen--liga .resumen-competicion > div > span:last-child { grid-column: 1; }
  .icono-resumen { width: 42px; height: 42px; grid-row: auto; border-radius: 13px; }
  .icono-resumen svg { width: 23px; height: 23px; }
  .fila-temporada-resumen--liga .resumen-competicion > div strong { font-size: 1.4rem; }
  .fila-temporada-resumen--liga .resumen-competicion > div > span:last-child { font-size: .72rem; }
  .grilla-equipos-competicion { grid-template-columns: repeat(2, minmax(0, 1fr)); }
}
@media (max-width: 440px) {
  .cabecera-competicion--liga { min-height: 440px; background-position: 61% center; }
  .cabecera-competicion--general { min-height: 0; }
  .contenido-cabecera-competicion { display: block; }
  .logo-competicion-hero { width: 66px; height: 84px; float: left; margin: 0 11px 5px 0; }
  .texto-cabecera-competicion { max-width: 100%; }
  .acceso-partidos-en-vivo { top: auto; right: 12px; bottom: 91px; }
  .ver-equipos-liga { font-size: .8rem; }
  .encabezado-equipos-liga { align-items: flex-end; }
  .grilla-equipos-competicion { grid-template-columns: minmax(0, 1fr); }
}

/* Calendario de jornadas BetPlay */
.jornadas-betplay { padding: 0 0 28px !important; border: 0 !important; background: transparent !important; box-shadow: none !important; }
.encabezado-jornadas-betplay { display: flex; align-items: center; justify-content: space-between; gap: 22px; margin-bottom: 24px; }
.identidad-jornadas-betplay { min-width: 0; }
.identidad-jornadas-betplay > .etiqueta-seccion { margin: 0 0 2px; color: #075ca5; font-size: .78rem; font-weight: 850; letter-spacing: .07em; }
.titulo-descripcion-jornadas { display: flex; align-items: center; gap: 28px; }
.titulo-descripcion-jornadas h2 { margin: 0; color: #0c1d38; font-size: clamp(2.2rem, 4vw, 3.1rem); font-style: italic; font-weight: 900; letter-spacing: -.045em; line-height: 1; }
.titulo-descripcion-jornadas > span { max-width: 350px; border-left: 1px solid #c8d4e1; padding-left: 24px; color: #4b617e; font-size: 1rem; font-weight: 600; line-height: 1.35; }
.selector-jornada-temporada { display: flex; min-height: 52px; align-items: center; gap: 12px; border: 1px solid #d8e2ed; border-radius: 999px; background: #fff; padding: 0 16px; color: #10294b; box-shadow: 0 3px 10px rgb(18 44 72 / 8%); }
.selector-jornada-temporada > svg { width: 22px; height: 22px; flex: 0 0 auto; }
.selector-jornada-temporada select { max-width: 225px; border: 0; outline: 0; background: transparent; color: inherit; font: inherit; font-weight: 800; }
.explorador-jornadas-betplay { display: grid; grid-template-columns: minmax(0, 1.92fr) minmax(320px, .82fr); align-items: start; gap: 22px; }
.columna-jornada-activa { min-width: 0; }
.navegador-jornadas-betplay { display: grid; grid-template-columns: minmax(0, 1fr) minmax(220px, 1.05fr) minmax(0, 1fr); align-items: center; gap: 0; margin: 0 auto 20px; overflow: hidden; border: 1px solid #dbe4ee; border-radius: 999px; background: #fff; box-shadow: 0 3px 9px rgb(20 48 77 / 8%); }
.navegador-jornadas-betplay button { display: flex; min-width: 0; height: 48px; align-items: center; gap: 8px; border: 0; background: transparent; color: #17345a; cursor: pointer; font: inherit; font-weight: 800; padding: 0 18px; }
.navegador-jornadas-betplay button:hover { color: #0875be; }
.navegador-jornadas-betplay button:focus-visible, .indice-jornada-boton:focus-visible, .selector-jornada-temporada select:focus-visible { outline: 3px solid #128bd0; outline-offset: 2px; }
.navegador-jornadas-betplay button svg { width: 19px; height: 19px; flex: 0 0 auto; }
.jornada-adyacente span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.jornada-adyacente--siguiente { justify-content: flex-end; }
.jornada-actual-seleccionada { display: grid; min-height: 48px; align-content: center; justify-items: center; border-bottom: 4px solid #ffd000; border-radius: 999px; background: #0a376e; color: #fff; text-align: center; }
.jornada-actual-seleccionada strong { font-size: 1rem; }
.jornada-actual-seleccionada small { color: #d6e8ff; font-size: .72rem; font-weight: 700; }
.panel-jornada-activa { overflow: hidden; border: 1px solid #d8e2ed; border-radius: 17px; background: #fff; box-shadow: 0 12px 30px rgb(18 44 72 / 9%); }
.cabecera-jornada-activa { display: flex; min-height: 74px; align-items: center; justify-content: space-between; gap: 20px; background: linear-gradient(105deg, #082b57, #06336a 64%, #08244b); padding: 12px 24px; color: #fff; }
.titulo-estado-jornada { display: flex; min-width: 0; align-items: center; gap: 16px; }
.titulo-estado-jornada h3 { margin: 0; color: #fff; font-size: clamp(1.35rem, 2.3vw, 2rem); font-weight: 900; letter-spacing: -.025em; }
.estado-jornada-activa { border-radius: 999px; background: #ffd000; padding: 7px 14px; color: #102342; font-size: .78rem; font-weight: 900; white-space: nowrap; }
.datos-jornada-activa { display: flex; align-items: center; gap: 20px; }
.datos-jornada-activa span { display: inline-flex; align-items: center; gap: 8px; color: #f3f7ff; font-size: .9rem; font-weight: 750; white-space: nowrap; }
.datos-jornada-activa span + span { border-left: 1px solid rgb(255 255 255 / 35%); padding-left: 18px; }
.datos-jornada-activa svg { width: 21px; height: 21px; }
.filas-partidos-jornada-betplay { margin: 0; padding: 7px 18px; list-style: none; }
.filas-partidos-jornada-betplay li { min-width: 0; border-bottom: 1px solid #e4eaf1; }
.filas-partidos-jornada-betplay li:last-child { border-bottom: 0; }
.filas-partidos-jornada-betplay :deep(.fila-partido--jornada) { border-radius: 0; }
.enlace-ficha-jornada { display: inline-flex; align-items: center; gap: 8px; margin: 0 20px 16px; color: #07589f; font-size: .86rem; font-weight: 800; text-decoration: none; }
.enlace-ficha-jornada:hover { text-decoration: underline; text-underline-offset: 3px; }
.enlace-ficha-jornada svg { width: 17px; height: 17px; }
.panel-indice-jornadas { overflow: hidden; border: 1px solid #d8e2ed; border-radius: 17px; background: #f8fafd; box-shadow: 0 10px 26px rgb(18 44 72 / 8%); }
.panel-indice-jornadas > header { display: flex; min-height: 62px; align-items: center; gap: 12px; background: #092d5c; padding: 12px 20px; color: #fff; }
.panel-indice-jornadas > header svg { width: 23px; height: 23px; }
.panel-indice-jornadas > header h3 { margin: 0; color: #fff; font-size: 1.2rem; font-weight: 850; }
.panel-indice-jornadas > ul { display: grid; max-height: 735px; gap: 7px; overflow-y: auto; margin: 0; padding: 10px; list-style: none; scrollbar-color: #afc2d7 transparent; scrollbar-width: thin; }
.panel-indice-jornadas li { min-width: 0; }
.indice-jornada-boton { display: grid; width: 100%; min-height: 62px; grid-template-columns: 34px minmax(0, 1fr) auto 18px; align-items: center; gap: 9px; border: 1px solid #dfe7f0; border-radius: 14px; background: #fff; color: #102342; cursor: pointer; padding: 8px 11px; text-align: left; transition: background-color .16s ease, border-color .16s ease; }
.indice-jornada-boton:hover { border-color: #b9cce0; background: #f5f8fc; }
.indice-jornada-boton.jornada-indice-activa { border-color: #ffe27a; background: #fff6d6; }
.icono-jornada-indice { display: grid; width: 30px; height: 30px; place-items: center; border-radius: 50%; background: #edf3f9; color: #4a627e; }
.jornada-indice-activa .icono-jornada-indice { background: #10964f; color: #fff; }
.icono-jornada-indice svg, .flecha-jornada-indice { width: 18px; height: 18px; }
.texto-jornada-indice { display: grid; min-width: 0; gap: 1px; }
.texto-jornada-indice strong { font-size: .9rem; line-height: 1.15; }
.texto-jornada-indice small { overflow: hidden; color: #506783; font-size: .78rem; text-overflow: ellipsis; white-space: nowrap; }
.estado-jornada-indice { border-radius: 999px; background: #e9eff5; padding: 5px 8px; color: #334b68; font-size: .65rem; font-weight: 850; white-space: nowrap; }
.jornada-indice-activa .estado-jornada-indice { background: #ffd000; color: #14223b; }
.flecha-jornada-indice { color: #233b58; }
:global(body.tema-publico-azul) .titulo-descripcion-jornadas h2 { color: #f1f6ff; }
:global(body.tema-publico-azul) .identidad-jornadas-betplay > .etiqueta-seccion { color: #79dff7; }
:global(body.tema-publico-azul) .titulo-descripcion-jornadas > span { border-color: #355271; color: #c1d1e2; }
:global(body.tema-publico-azul) .selector-jornada-temporada,
:global(body.tema-publico-azul) .navegador-jornadas-betplay,
:global(body.tema-publico-azul) .panel-jornada-activa { border-color: #294563; background-color: #102842; color: #e5efff; }
:global(body.tema-publico-azul) .navegador-jornadas-betplay button { color: #e5efff; }
:global(body.tema-publico-azul) .panel-indice-jornadas { border-color: #294563; background: #102842; }
:global(body.tema-publico-azul) .panel-indice-jornadas > ul { background: #102842; }
:global(body.tema-publico-azul) .indice-jornada-boton { border-color: #294563; background: #132f4d; color: #e5efff; }
:global(body.tema-publico-azul) .indice-jornada-boton:hover { background: #1a3a5c; }
:global(body.tema-publico-azul) .indice-jornada-boton.jornada-indice-activa { border-color: #d4ad26; background: #3b331a; }
:global(body.tema-publico-azul) .texto-jornada-indice small { color: #c1d1e2; }
:global(body.tema-publico-azul) .estado-jornada-indice { background: #294563; color: #e5efff; }
:global(body.tema-publico-azul) .jornada-indice-activa .estado-jornada-indice { background: #ffd000; color: #14223b; }
:global(body.tema-publico-azul) .flecha-jornada-indice { color: #e5efff; }
:global(body.tema-publico-azul) .filas-partidos-jornada-betplay li { border-color: #294563; }
:global(body.tema-publico-azul) .filas-partidos-jornada-betplay :deep(.fila-partido--jornada .accion-fila-partido) { background: #203b59; }
:global(body.tema-publico-azul) .filas-partidos-jornada-betplay :deep(.estado-fila-jornada) { color: #e5efff; }
@media (max-width: 1080px) {
  .explorador-jornadas-betplay { grid-template-columns: minmax(0, 1fr); }
  .panel-indice-jornadas > ul { max-height: 340px; grid-template-columns: repeat(2, minmax(0, 1fr)); align-content: start; }
}
@media (max-width: 680px) {
  .encabezado-jornadas-betplay { align-items: stretch; flex-direction: column; gap: 14px; }
  .titulo-descripcion-jornadas { align-items: flex-start; flex-direction: column; gap: 8px; }
  .titulo-descripcion-jornadas > span { border-left: 0; padding-left: 0; }
  .selector-jornada-temporada { align-self: flex-start; }
  .navegador-jornadas-betplay { grid-template-columns: 44px minmax(120px, 1fr) 44px; }
  .navegador-jornadas-betplay .jornada-adyacente { justify-content: center; padding: 0; }
  .navegador-jornadas-betplay .jornada-adyacente span { display: none; }
  .jornada-actual-seleccionada { border-radius: 14px; }
  .cabecera-jornada-activa { align-items: flex-start; flex-direction: column; gap: 10px; padding: 14px 16px; }
  .datos-jornada-activa { flex-wrap: wrap; gap: 8px 12px; }
  .datos-jornada-activa span { font-size: .78rem; }
  .datos-jornada-activa span + span { border: 0; padding-left: 0; }
  .filas-partidos-jornada-betplay { padding-inline: 8px; }
  .panel-indice-jornadas > ul { grid-template-columns: minmax(0, 1fr); max-height: 390px; }
  .indice-jornada-boton { grid-template-columns: 32px minmax(0, 1fr) auto 16px; }
}
@media (prefers-reduced-motion: reduce) { .indice-jornada-boton { transition: none; } }
</style>
