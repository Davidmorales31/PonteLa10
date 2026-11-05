<script setup lang="ts">
import type { PartidoResultado, RespuestaResultados } from '~/types/resultados'
import { ArrowRight, CalendarDays, ChartNoAxesColumnIncreasing, CircleDot, ExternalLink, Info, Newspaper, Play, UsersRound } from '@lucide/vue'
import {
  calendarioOficialSeleccion,
  convocatoriasOficialesSeleccion,
  fechaVerificacionSeleccion,
  resultadosOficialesSeleccion
} from '~/data/seleccionColombia2026'
import {
  encontrarPartidoRegistradoSeleccion,
  contarContenidoSeleccionVerificado,
  filtrarPartidosSeleccionColombia,
  normalizarNombreEquipoSeleccion,
  obtenerPartidosRecientesPendientesSeleccion,
  obtenerFechaColombia
} from '~/utils/seleccionColombia'

const { data: respuestaResultados, refresh: refrescarResultados } = await useFetch<RespuestaResultados>(
  '/api/resultados',
  {
    key: 'hub-seleccion-colombia-resultados',
    query: { deporte: 'futbol', timeZone: 'America/Bogota' },
    default: (): RespuestaResultados => ({
      partidos: [],
      clasificacion: [],
      actualizadoEn: '',
      origen: 'base-datos'
    }),
    ignoreResponseError: true
  }
)

const ahoraIso = useState('hub-seleccion-colombia-ahora', () => new Date().toISOString())
const fechaActual = computed(() => obtenerFechaColombia(new Date(ahoraIso.value)))
const filtroCalendario = ref<'todos' | 'masculina' | 'femenina'>('todos')
const filtroConvocatoria = ref<'masculina' | 'femenina' | 'archivo'>('archivo')
const convocatoriasVisibles = computed(() => {
  if (filtroConvocatoria.value === 'archivo') {
    return convocatoriasOficialesSeleccion.filter(convocatoria => convocatoria.vigenteHasta < fechaActual.value)
  }
  return convocatoriasOficialesSeleccion.filter(convocatoria => convocatoria.id === filtroConvocatoria.value)
})
const tituloVentanaConvocatoria = (convocatoria: typeof convocatoriasOficialesSeleccion[number]) => convocatoria.id === 'masculina'
  ? 'Amistosos · Sep–Oct 2026'
  : 'Fecha FIFA · Octubre 2026'
const rivalesConvocatoria = (convocatoria: typeof convocatoriasOficialesSeleccion[number]) => {
  const rivales = new Set<string>()
  for (const partido of [...resultadosOficialesSeleccion, ...calendarioOficialSeleccion]) {
    if (!partido.seleccion.toLowerCase().includes(convocatoria.id)) continue
    if (partido.fecha < convocatoria.publicadaEn || partido.fecha > convocatoria.vigenteHasta) continue
    if (partido.local.toLowerCase() === 'colombia' && partido.visitante.toLowerCase() !== 'colombia') rivales.add(partido.visitante)
    else if (partido.visitante.toLowerCase() === 'colombia' && partido.local.toLowerCase() !== 'colombia') rivales.add(partido.local)
  }
  return [...rivales]
}
const banderaRival = (pais: string) => ({
  México: '🇲🇽',
  Paraguay: '🇵🇾',
  Perú: '🇵🇪',
  Venezuela: '🇻🇪'
}[pais] || '⚽')
const navegacionSeleccion = [
  { etiqueta: 'Calendario', ruta: '#calendario', icono: CalendarDays },
  { etiqueta: 'Convocatorias', ruta: '#convocatorias', icono: UsersRound },
  { etiqueta: 'Noticias', ruta: '#noticias', icono: Newspaper },
  { etiqueta: 'Fútbol colombiano', ruta: '/futbol-colombiano', icono: CircleDot },
  { etiqueta: 'Partidos de hoy', ruta: '#partidos-hoy', icono: Play },
  { etiqueta: 'Resultados', ruta: '#resultados-recientes', icono: ChartNoAxesColumnIncreasing }
]
const partidosSeleccionHoy = computed(() => filtrarPartidosSeleccionColombia(
  Array.isArray(respuestaResultados.value?.partidos) ? respuestaResultados.value.partidos : []
))

const partidoDeHoyOficial = computed(() => calendarioOficialSeleccion.find(partido => partido.fecha === fechaActual.value) || null)

const agendaProxima = computed(() => {
  const agendaOficial = calendarioOficialSeleccion
    .filter(partido => partido.fecha >= fechaActual.value)
    .map(partido => ({
      ...partido,
      partidoRegistrado: encontrarPartidoRegistradoSeleccion(partido, partidosSeleccionHoy.value) || null
    }))
  const partidosNuevos = partidosSeleccionHoy.value
    .filter(partido => partido.estado !== 'finalizado')
    .filter(partido => !agendaOficial.some(evento => evento.partidoRegistrado?.id === partido.id))
    .map(partido => ({
      fecha: partido.fechaIso.slice(0, 10),
      fechaIso: partido.fechaIso,
      hora: null,
      local: partido.equipoLocal.nombre,
      visitante: partido.equipoVisitante.nombre,
      seleccion: 'Selección Colombia',
      competencia: partido.competencia,
      estadio: partido.estadio,
      sede: partido.estadio || partido.ciudad || '',
      fuenteUrl: '/partidos-hoy',
      partidoRegistrado: partido
    }))

  return [...agendaOficial, ...partidosNuevos]
    .sort((primero, segundo) => primero.fecha.localeCompare(segundo.fecha))
    .slice(0, 6)
})

const calendarioVisible = computed(() => agendaProxima.value
  .filter(partido => filtroCalendario.value === 'todos' || partido.seleccion.toLocaleLowerCase('es-CO').includes(filtroCalendario.value))
  .slice(0, 4))
const resumenCalendario = computed(() => {
  const proximos = agendaProxima.value.slice(0, 4)
  const masculinos = proximos.filter(partido => partido.seleccion.toLocaleLowerCase('es-CO').includes('masculina'))
  const femeninos = proximos.filter(partido => partido.seleccion.toLocaleLowerCase('es-CO').includes('femenina'))
  const mesesFemeninos = [...new Set(femeninos.map(partido => new Intl.DateTimeFormat('es-CO', { month: 'long', timeZone: 'America/Bogota' }).format(new Date(`${partido.fecha}T12:00:00-05:00`))))]
  const periodoFemenino = mesesFemeninos.length > 1
    ? `${mesesFemeninos.slice(0, -1).join(', ')} y ${mesesFemeninos.at(-1)}`
    : mesesFemeninos[0] || ''
  return {
    total: proximos.length,
    masculinos: masculinos.length,
    femeninos: femeninos.length,
    partidosMasculinos: masculinos,
    partidosFemeninos: femeninos,
    periodoFemenino
  }
})

const resultadosRecientes = computed(() => {
  const resultadosEstaticos = resultadosOficialesSeleccion.map(partido => ({
    ...partido,
    partidoRegistrado: encontrarPartidoRegistradoSeleccion(partido, partidosSeleccionHoy.value) || null,
    marcadorPendiente: false
  }))
  const resultadosDelDia = partidosSeleccionHoy.value
    .filter(partido => partido.estado === 'finalizado')
    .map(partido => ({
      fecha: partido.fechaIso.slice(0, 10),
      fechaIso: partido.fechaIso,
      hora: null,
      local: partido.equipoLocal.nombre,
      visitante: partido.equipoVisitante.nombre,
      seleccion: 'Selección Colombia',
      competencia: partido.competencia,
      marcadorLocal: partido.marcadorLocal,
      marcadorVisitante: partido.marcadorVisitante,
      fuenteUrl: '/resultados/futbol',
      partidoRegistrado: partido,
      marcadorPendiente: false
    }))
  const resultadosConfirmados = [...resultadosDelDia, ...resultadosEstaticos]
  const clavesConfirmadas = new Set(resultadosConfirmados.map(partido => [
    partido.fecha,
    normalizarNombreEquipoSeleccion(partido.local),
    normalizarNombreEquipoSeleccion(partido.visitante)
  ].join('|')))
  const resultadosPendientes = obtenerPartidosRecientesPendientesSeleccion(fechaActual.value)
    .filter(partido => !clavesConfirmadas.has([
      partido.fecha,
      normalizarNombreEquipoSeleccion(partido.local),
      normalizarNombreEquipoSeleccion(partido.visitante)
    ].join('|')))
    .map(partido => ({
      ...partido,
      partidoRegistrado: null,
      marcadorPendiente: true
    }))
  const claves = new Set<string>()
  return [...resultadosConfirmados, ...resultadosPendientes]
    .filter(partido => {
      const clave = [partido.fecha, normalizarNombreEquipoSeleccion(partido.local), normalizarNombreEquipoSeleccion(partido.visitante)].join('|')
      if (claves.has(clave)) return false
      claves.add(clave)
      return true
    })
    .sort((primero, segundo) => segundo.fecha.localeCompare(primero.fecha))
    .slice(0, 5)
})

const configuracion = computed(() => ({
  titulo: 'Selección Colombia',
  tituloSeo: 'Selección Colombia: partidos, resultados y convocados',
  descripcion: 'Partidos, resultados recientes y convocatorias oficiales de las selecciones Colombia. Calendario y noticias con fuentes verificables.',
  etiquetaSeccion: 'SELECCIÓN COLOMBIA',
  categoria: 'colombia',
  rutaCanonica: '/seleccion-colombia',
  enlaces: [
    { etiqueta: 'Calendario', ruta: '#calendario' },
    { etiqueta: 'Convocatorias', ruta: '#convocatorias' },
    { etiqueta: 'Fútbol colombiano', ruta: '/futbol-colombiano' },
    { etiqueta: 'Partidos de hoy', ruta: '/partidos-hoy' },
    { etiqueta: 'Resultados', ruta: '/resultados/futbol' }
  ],
  entidadesVerificadas: contarContenidoSeleccionVerificado(fechaActual.value),
  datosEstructuradosAdicionales: [
    {
      '@context': 'https://schema.org',
      '@type': 'ItemList',
      name: 'Próximos partidos oficiales de la Selección Colombia',
      itemListElement: agendaProxima.value.map((partido, indice) => ({
        '@type': 'ListItem',
        position: indice + 1,
        name: partido.local + ' vs. ' + partido.visitante + ' · ' + partido.competencia,
        url: partido.partidoRegistrado ? construirUrlPartido(partido.partidoRegistrado) : partido.fuenteUrl
      }))
    },
    {
      '@context': 'https://schema.org',
      '@type': 'ItemList',
      name: 'Convocatorias oficiales de la Selección Colombia',
      itemListElement: convocatoriasOficialesSeleccion.map((convocatoria, indice) => ({
        '@type': 'ListItem',
        position: indice + 1,
        name: convocatoria.etiqueta + ' · ' + convocatoria.ventana,
        url: convocatoria.fuenteUrl
      }))
    }
  ]
}))

function fechaLegible(fecha: string): string {
  return new Intl.DateTimeFormat('es-CO', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'America/Bogota'
  }).format(new Date(fecha + 'T12:00:00-05:00'))
}

function horaEvento(partido: typeof calendarioOficialSeleccion[number]): string {
  if (partido.hora) return partido.hora
  return 'Hora por confirmar por la FCF'
}

function rutaBuscarJugador(nombre: string): string {
  return '/articulos?buscar=' + encodeURIComponent(nombre)
}

function construirUrlPartido(partido: PartidoResultado): string {
  return '/resultados/' + encodeURIComponent(partido.id)
}

function horaAgenda(partido: typeof agendaProxima.value[number]): string {
  if (!partido.hora || partido.hora.toLocaleLowerCase('es-CO').includes('por confirmar')) return 'Hora por confirmar'
  return partido.hora.replace(' (hora de Colombia)', ' (COL)')
}

function destinoPartido(partido: { partidoRegistrado?: PartidoResultado | null, fuenteUrl: string }): { ruta: string, externo: boolean } {
  if (partido.partidoRegistrado) return { ruta: construirUrlPartido(partido.partidoRegistrado), externo: false }
  return { ruta: partido.fuenteUrl, externo: !partido.fuenteUrl.startsWith('/') }
}

let temporizadorResultados: ReturnType<typeof setInterval> | undefined
onMounted(() => {
  ahoraIso.value = new Date().toISOString()
  temporizadorResultados = setInterval(() => {
    ahoraIso.value = new Date().toISOString()
    void refrescarResultados()
  }, 60_000)
})

onBeforeUnmount(() => {
  if (temporizadorResultados) clearInterval(temporizadorResultados)
})
</script>

<template>
  <PublicoHubEditorialPublico class="pagina-seleccion-colombia" :configuracion="configuracion">
    <template #cabecera>
      <header class="encabezado-seleccion-principal">
        <p class="etiqueta-seleccion-principal"><span aria-hidden="true" />SELECCIÓN COLOMBIA</p>
        <h1>Selección Colombia</h1>
        <p>Partidos, resultados recientes y convocatorias oficiales de las selecciones Colombia. Calendario y noticias con fuentes verificables.</p>
      </header>

      <section class="banner-seleccion-colombia" aria-label="La Tricolor">
        <picture class="imagen-banner-seleccion">
          <source media="(max-width: 760px)" srcset="/images/seleccion-colombia/banner-la-tricolor-movil.png" width="920" height="498">
          <img src="/images/seleccion-colombia/banner-la-tricolor.png" alt="La Tricolor: Selección Colombia, calendario, convocatorias, resultados y noticias oficiales." width="2172" height="636" fetchpriority="high">
        </picture>
        <div class="solo-lectores"><h2>La Tricolor</h2><p>Todo sobre la Selección Colombia: partidos, convocatorias, resultados y noticias oficiales.</p></div>
        <NuxtLink class="enlace-banner-calendario" to="#calendario" aria-label="Ver calendario de la Selección" />
      </section>

      <nav class="navegacion-seleccion" aria-label="Secciones de Selección Colombia">
        <NuxtLink v-for="(enlace, indice) in navegacionSeleccion" :key="enlace.ruta" :to="enlace.ruta" :class="{ 'seccion-seleccion-activa': indice === 0 }" :aria-current="indice === 0 ? 'location' : undefined">
          <component :is="enlace.icono" aria-hidden="true" /><span>{{ enlace.etiqueta }}</span>
        </NuxtLink>
      </nav>
    </template>

    <template #intro>
      <section id="partidos-hoy" class="bloque-seleccion">
        <div class="grilla-agenda-resultados-seleccion">
          <section class="panel-seleccion panel-agenda-seleccion" aria-labelledby="titulo-proximos-seleccion">
            <header class="encabezado-panel-mock-seleccion">
              <div><p>AGENDA DE LA TRICOLOR</p><h2 id="titulo-proximos-seleccion">Próximos partidos</h2></div>
              <NuxtLink to="#calendario">Calendario completo <ArrowRight aria-hidden="true" /></NuxtLink>
            </header>
            <div v-if="partidoDeHoyOficial" class="partido-seleccion-hoy">
              <p class="etiqueta-seccion">PARTIDO DE HOY · {{ partidoDeHoyOficial.seleccion }}</p>
              <h3>{{ partidoDeHoyOficial.local }} vs. {{ partidoDeHoyOficial.visitante }}</h3>
              <p>{{ partidoDeHoyOficial.competencia }} · {{ horaEvento(partidoDeHoyOficial) }}</p>
            </div>
            <ol v-if="agendaProxima.length" class="lista-agenda-mock-seleccion">
              <li v-for="partido in agendaProxima.slice(0, 4)" :key="partido.fecha + partido.local + partido.visitante">
                <TarjetaPartidoSeleccion :partido="{ ...partido, hora: horaAgenda(partido) }" variante="agenda" :destino="destinoPartido(partido).ruta" :destino-externo="destinoPartido(partido).externo" />
              </li>
            </ol>
            <p v-else class="estado-seleccion-vacio">La FCF aún no anuncia nuevos partidos. Esta agenda incluye fechas oficiales confirmadas.</p>
          </section>

          <section id="resultados-recientes" class="panel-seleccion panel-resultados-seleccion" aria-labelledby="titulo-resultados-seleccion">
            <header class="encabezado-panel-mock-seleccion">
              <div><p>RESULTADOS RECIENTES</p><h2 id="titulo-resultados-seleccion">Últimos partidos</h2></div>
              <NuxtLink to="/resultados/futbol">Todos los resultados <ArrowRight aria-hidden="true" /></NuxtLink>
            </header>
            <ol v-if="resultadosRecientes.length" class="lista-resultados-mock-seleccion">
              <li v-for="partido in resultadosRecientes.filter(resultado => !resultado.marcadorPendiente).slice(0, 2)" :key="partido.fecha + partido.local + partido.visitante">
                <TarjetaPartidoSeleccion :partido="partido" variante="resultado" :destino="destinoPartido(partido).ruta" :destino-externo="destinoPartido(partido).externo" />
              </li>
            </ol>
            <p v-else class="estado-seleccion-vacio">Todavía no hay resultados finales verificados.</p>
          </section>
        </div>
        <p class="nota-fuentes-seleccion">Calendario y marcadores contrastados con la Federación Colombiana de Fútbol. Las horas pendientes y los resultados sin confirmar se identifican con claridad. <a href="https://www.fcf.com.co/calendario/" target="_blank" rel="noopener noreferrer">Calendario oficial FCF</a></p>
      </section>
    </template>

    <template #contenido-adicional>
      <section id="convocatorias" class="bloque-seleccion" aria-labelledby="titulo-convocatorias-seleccion">
        <div class="franja-fcf-convocatorias" aria-label="Federación Colombiana de Fútbol">
          <span class="sello-tricolor-convocatorias" aria-hidden="true"><CircleDot /></span>
          <strong>SELECCIÓN<br>COLOMBIA</strong>
          <span class="separador-fcf-convocatorias" aria-hidden="true" />
          <span>FEDERACIÓN COLOMBIANA<br>DE FÚTBOL · FCF</span>
          <span class="bandera-fcf-convocatorias" aria-hidden="true"><i /><i /><i /></span>
        </div>

        <header class="encabezado-convocatorias">
          <div class="titular-convocatorias">
            <span aria-hidden="true" />
            <div>
              <h2 id="titulo-convocatorias-seleccion">Convocatorias oficiales</h2>
              <p>Listas publicadas por la Federación Colombiana de Fútbol.</p>
            </div>
          </div>
          <div class="filtros-convocatorias" aria-label="Filtrar convocatorias">
            <button type="button" :aria-pressed="filtroConvocatoria === 'masculina'" @click="filtroConvocatoria = 'masculina'"><UsersRound aria-hidden="true" />Masculina</button>
            <button type="button" :aria-pressed="filtroConvocatoria === 'femenina'" @click="filtroConvocatoria = 'femenina'"><UsersRound aria-hidden="true" />Femenina</button>
            <button type="button" :aria-pressed="filtroConvocatoria === 'archivo'" @click="filtroConvocatoria = 'archivo'"><CalendarDays aria-hidden="true" />Archivo</button>
          </div>
        </header>

        <div v-if="convocatoriasVisibles.length" class="grilla-convocatorias-seleccion">
          <article
            v-for="convocatoria in convocatoriasVisibles"
            :id="`convocatoria-${convocatoria.id}`"
            :key="convocatoria.id"
            class="tarjeta-convocatoria-seleccion"
            :class="`tarjeta-convocatoria-seleccion--${convocatoria.id}`"
          >
            <div class="portada-convocatoria-seleccion">
              <img
                :src="`/images/seleccion-colombia/convocatoria-${convocatoria.id}-ilustracion.webp`"
                :alt="`Ilustración editorial de la Selección ${convocatoria.id === 'masculina' ? 'masculina' : 'femenina'} de Colombia`"
                width="1800"
                height="600"
                loading="lazy"
                decoding="async"
              >
              <div class="rotulo-convocatoria-seleccion">SELECCIÓN<br>{{ convocatoria.id === 'masculina' ? 'MASCULINA' : 'FEMENINA' }}<br>DE MAYORES</div>
              <span class="estado-ventana-convocatoria"><CalendarDays aria-hidden="true" />{{ fechaActual > convocatoria.vigenteHasta ? 'Ventana finalizada' : 'Ventana activa' }}</span>
              <span class="credito-ilustracion-convocatoria">Ilustración editorial</span>
            </div>

            <div class="contenido-convocatoria-seleccion">
              <h3>{{ tituloVentanaConvocatoria(convocatoria) }}</h3>
              <div class="metadatos-convocatoria-seleccion">
                <span><UsersRound aria-hidden="true" /><strong>{{ convocatoria.cantidad }} {{ convocatoria.id === 'masculina' ? 'jugadores' : 'jugadoras' }}</strong></span>
                <span><CalendarDays aria-hidden="true" />Publicada: {{ fechaLegible(convocatoria.publicadaEn) }}</span>
                <span><CalendarDays aria-hidden="true" />Vigente hasta: {{ fechaLegible(convocatoria.vigenteHasta) }}</span>
              </div>

              <div v-if="rivalesConvocatoria(convocatoria).length" class="rivales-convocatoria-seleccion">
                <strong>Rivales</strong>
                <span class="separador-rivales-convocatoria" aria-hidden="true" />
                <ul>
                  <li v-for="rival in rivalesConvocatoria(convocatoria)" :key="rival"><span aria-hidden="true">{{ banderaRival(rival) }}</span>{{ rival }}</li>
                </ul>
              </div>

              <p v-if="convocatoria.notaActualizacion" class="actualizacion-convocatoria-seleccion"><strong>Actualización · 5 oct:</strong> {{ convocatoria.notaActualizacion.replace('La FCF informó el 5 de octubre que ', '') }}</p>

              <footer class="acciones-convocatoria-seleccion">
                <details class="lista-jugadores-seleccion">
                  <summary>Ver {{ convocatoria.cantidad }} {{ convocatoria.id === 'masculina' ? 'convocados' : 'convocadas' }} <ArrowRight aria-hidden="true" /></summary>
                  <ol>
                    <li v-for="jugador in convocatoria.jugadores" :key="jugador.nombre">
                      <NuxtLink :to="rutaBuscarJugador(jugador.nombre)">{{ jugador.nombre }}</NuxtLink>
                      <span>{{ jugador.club }}</span>
                    </li>
                  </ol>
                </details>
                <a class="fuente-convocatoria-seleccion" :href="convocatoria.actualizacionUrl || convocatoria.fuenteUrl" target="_blank" rel="noopener noreferrer">
                  <ExternalLink aria-hidden="true" />{{ convocatoria.actualizacionUrl ? 'Ver comunicado FCF' : 'Fuente oficial FCF' }}
                </a>
              </footer>
            </div>
          </article>
        </div>
        <p v-else class="estado-vacio-articulos">No hay convocatorias archivadas para mostrar.</p>

        <p class="nota-fuentes-seleccion nota-archivo-convocatorias"><Info aria-hidden="true" />Información histórica · Fuente: FCF · Verificada al {{ fechaLegible(fechaVerificacionSeleccion) }}.</p>
        <p class="nota-fuentes-seleccion">Las listas reflejan las publicaciones citadas de la FCF. No se presentan como convocatorias vigentes después de su ventana.</p>
      </section>

      <section id="calendario" class="bloque-seleccion seccion-calendario-seleccion" aria-labelledby="titulo-calendario-seleccion">
        <header class="cabecera-calendario-seleccion">
          <div class="titulo-calendario-seleccion">
            <p class="etiqueta-seccion">TEMPORADA 2026</p>
            <h2 id="titulo-calendario-seleccion">Calendario oficial de las selecciones</h2>
            <p>Próximas fechas publicadas por la Federación Colombiana de Fútbol.</p>
          </div>
          <a class="enlace-fcf-calendario" href="https://www.fcf.com.co/calendario/" target="_blank" rel="noopener noreferrer"><CalendarDays aria-hidden="true" />Abrir calendario FCF<ExternalLink aria-hidden="true" /></a>
        </header>

        <div class="disposicion-calendario-seleccion">
          <section class="panel-calendario-seleccion" aria-labelledby="titulo-partidos-calendario">
            <header class="encabezado-panel-calendario">
              <h3 id="titulo-partidos-calendario"><CalendarDays aria-hidden="true" />Calendario de partidos</h3>
              <div class="filtros-calendario-seleccion" aria-label="Filtrar partidos por selección">
                <button type="button" :aria-pressed="filtroCalendario === 'todos'" @click="filtroCalendario = 'todos'">Todos</button>
                <button type="button" :aria-pressed="filtroCalendario === 'masculina'" @click="filtroCalendario = 'masculina'"><UsersRound aria-hidden="true" />Masculina</button>
                <button type="button" :aria-pressed="filtroCalendario === 'femenina'" @click="filtroCalendario = 'femenina'"><UsersRound aria-hidden="true" />Femenina</button>
              </div>
            </header>
            <ol v-if="calendarioVisible.length" class="lista-calendario-seleccion">
              <li v-for="partido in calendarioVisible" :key="'cal-' + partido.fecha + partido.local + partido.visitante">
                <TarjetaPartidoSeleccion :partido="{ ...partido, hora: horaAgenda(partido) }" variante="agenda" :destino="destinoPartido(partido).ruta" :destino-externo="destinoPartido(partido).externo" :etiqueta-destino="destinoPartido(partido).externo ? 'Fuente oficial FCF' : 'Ver partido'" mostrar-seleccion />
              </li>
            </ol>
            <p v-else class="estado-seleccion-vacio">No hay partidos próximos para este filtro.</p>
          </section>

          <aside class="resumen-calendario-seleccion" aria-labelledby="titulo-resumen-calendario">
            <h3 id="titulo-resumen-calendario"><ChartNoAxesColumnIncreasing aria-hidden="true" />Resumen de agenda</h3>
            <div class="metricas-calendario-seleccion">
              <div><CalendarDays aria-hidden="true" /><strong>{{ resumenCalendario.total }}</strong><span>Partidos<br>totales</span></div>
              <div><UsersRound aria-hidden="true" /><strong>{{ resumenCalendario.masculinos }}</strong><span>Masculinos<br>de mayores</span></div>
              <div><UsersRound aria-hidden="true" /><strong>{{ resumenCalendario.femeninos }}</strong><span>Femeninos<br>de mayores</span></div>
            </div>
            <h4><CalendarDays aria-hidden="true" />Próximas ventanas</h4>
            <div class="ventanas-calendario-seleccion">
              <button v-if="resumenCalendario.masculinos" type="button" @click="filtroCalendario = 'masculina'">
                <span class="icono-ventana-calendario"><UsersRound aria-hidden="true" /></span><span><strong>Selección masculina de mayores</strong><small>Amistosos internacionales · {{ [...new Set(resumenCalendario.partidosMasculinos.map(partido => fechaLegible(partido.fecha).split(' ').slice(-2).join(' ')))].join(' y ') }}</small></span><ArrowRight aria-hidden="true" />
              </button>
              <button v-if="resumenCalendario.femeninos" type="button" @click="filtroCalendario = 'femenina'">
                <span class="icono-ventana-calendario icono-ventana-calendario--femenina"><UsersRound aria-hidden="true" /></span><span><strong>Selección femenina de mayores</strong><small>Amistosos internacionales · {{ resumenCalendario.periodoFemenino }}</small></span><ArrowRight aria-hidden="true" />
              </button>
            </div>
            <p class="aviso-calendario-seleccion"><Info aria-hidden="true" />El calendario puede cambiar. Confirma la hora y la sede en la fuente oficial.</p>
          </aside>
        </div>
        <p class="nota-calendario-seleccion"><Info aria-hidden="true" /><span><strong>Última revisión de esta agenda: {{ fechaLegible(fechaVerificacionSeleccion) }}.</strong> Las horas pendientes se muestran como “Hora por confirmar”; no se estiman.</span></p>
      </section>

      <section class="bloque-seleccion jugadores-relacionados-seleccion" aria-labelledby="titulo-jugadores-seleccion">
        <header class="encabezado-seleccion">
          <div>
            <p class="etiqueta-seccion">COBERTURA EDITORIAL</p>
            <h2 id="titulo-jugadores-seleccion">Jugadores convocados y noticias</h2>
          </div>
        </header>
        <p>Explora las noticias relacionadas con los futbolistas de las convocatorias oficiales. Cada nombre lleva a la búsqueda editorial; todavía no se inventan fichas de jugador cuando no hay una página pública suficiente.</p>
        <div class="chips-jugadores-seleccion">
          <NuxtLink
            v-for="jugador in convocatoriasOficialesSeleccion.flatMap(convocatoria => convocatoria.jugadores).slice(0, 16)"
            :key="jugador.nombre"
            :to="rutaBuscarJugador(jugador.nombre)"
          >{{ jugador.nombre }}</NuxtLink>
        </div>
      </section>
    </template>

    <template #noticias="{ destacada, recientes, cantidad }">
      <section id="noticias" class="noticias-seleccion" aria-labelledby="titulo-noticias-seleccion">
        <header class="encabezado-noticias-seleccion">
          <div>
            <p>Actualidad</p>
            <h2 id="titulo-noticias-seleccion"><Newspaper aria-hidden="true" />Noticias de la Selección</h2>
          </div>
          <NuxtLink to="/articulos">Ver todas <ArrowRight aria-hidden="true" /></NuxtLink>
        </header>

        <TarjetaNoticiaPrincipal
          v-if="destacada"
          class="noticia-seleccion-principal"
          :articulo="destacada"
          nivel-titulo="h3"
          etiqueta="Selección Colombia"
          prioridad-alta
        />

        <PublicidadAdsterraSlot
          v-if="cantidad >= 3"
          formato="leaderboard"
          contexto="noticias de Selección Colombia"
        />

        <div v-if="recientes.length" class="carrusel-noticias-seleccion" tabindex="0" aria-label="Más noticias de la Selección Colombia">
          <TarjetaNoticiaSecundaria
            v-for="articulo in recientes"
            :key="articulo.slug"
            :articulo="articulo"
            etiqueta="Selección Colombia"
            mostrar-resumen
          />
        </div>
        <div v-else-if="!destacada" class="estado-vacio-articulos estado-vacio-noticias-seleccion">
          <h3>Aún no hay noticias de la Selección</h3>
          <p>Cuando se publiquen artículos con esta categoría aparecerán aquí.</p>
          <NuxtLink class="boton-primario" to="/articulos">Explorar noticias</NuxtLink>
        </div>
      </section>
    </template>
  </PublicoHubEditorialPublico>
</template>

<style scoped>
.pagina-seleccion-colombia { padding-bottom: 44px; }
.pagina-seleccion-colombia :deep(.migas-navegacion) { display: none; }
.encabezado-seleccion-principal { display: grid; justify-items: start; gap: 3px; margin: 0 0 18px; color: #102342; }
.etiqueta-seleccion-principal { display: flex; align-items: center; gap: 12px; margin: 0; color: #075ba9; font-size: .88rem; font-weight: 850; }
.etiqueta-seleccion-principal > span { width: 6px; height: 19px; border-radius: 5px; background: #ffca08; }
.encabezado-seleccion-principal h1 { margin: 0; color: #0b1c3b; font-size: clamp(2.25rem, 3.1vw, 3.15rem); font-weight: 900; letter-spacing: -.045em; line-height: 1.04; }
.encabezado-seleccion-principal > p:last-child { max-width: 720px; margin: 0; color: #405778; font-size: .98rem; line-height: 1.38; }
.banner-seleccion-colombia { position: relative; aspect-ratio: 2172 / 498; isolation: isolate; overflow: visible; margin-top: min(6.32vw, 78px); border-radius: 24px; box-shadow: 0 12px 28px rgb(11 32 58 / 12%); }
.imagen-banner-seleccion { position: absolute; z-index: 1; inset: 0 0 auto; display: block; width: 100%; height: auto; transform: translateY(-21.54%); }
.imagen-banner-seleccion img { display: block; width: 100%; height: auto; border-radius: 24px; }
.enlace-banner-calendario { position: absolute; z-index: 2; top: 72%; left: 3%; width: 30%; height: 19%; border-radius: 999px; }
.enlace-banner-calendario:focus-visible { outline: 3px solid #0877c8; outline-offset: 3px; }
.navegacion-seleccion a:focus-visible { outline: 3px solid #0e7fca; outline-offset: 3px; }
.navegacion-seleccion { display: flex; min-height: 61px; align-items: stretch; gap: 12px; overflow-x: auto; border-bottom: 1px solid #cbd8e8; margin: 8px 0 18px; padding: 4px 0 6px; scrollbar-width: thin; }
.navegacion-seleccion a { display: inline-flex; min-height: 42px; flex: 0 0 auto; align-items: center; gap: 10px; border-radius: 999px; padding: 8px 17px; color: #102342; font-size: .91rem; text-decoration: none; white-space: nowrap; }
.navegacion-seleccion a svg { width: 20px; height: 20px; color: #173a68; }
.navegacion-seleccion a:hover { background: #e8f0fb; }
.navegacion-seleccion a.seccion-seleccion-activa { background: #e4efff; color: #0758a4; font-weight: 850; }
.navegacion-seleccion a.seccion-seleccion-activa svg { color: #0967c0; }
.bloque-seleccion { margin: 18px auto 36px; }
.grilla-agenda-resultados-seleccion { display: grid; grid-template-columns: minmax(0, 1.24fr) minmax(0, .96fr); align-items: stretch; gap: 24px; }
.panel-seleccion { min-width: 0; border: 1px solid #dce5ef; border-radius: 18px; background: #fff; padding: 20px 22px; box-shadow: 0 8px 22px rgb(16 48 84 / 5%); }
.encabezado-panel-mock-seleccion { display: flex; align-items: center; justify-content: space-between; gap: 14px; margin-bottom: 13px; }
.encabezado-panel-mock-seleccion > div > p { margin: 0; color: #095ea9; font-size: .72rem; font-weight: 900; letter-spacing: .045em; }
.encabezado-panel-mock-seleccion h2 { margin: 1px 0 0; color: #0b1c3b; font-size: clamp(1.45rem, 2vw, 2rem); font-weight: 900; letter-spacing: -.035em; line-height: 1.12; }
.encabezado-panel-mock-seleccion > a { display: inline-flex; align-items: center; gap: 5px; color: #075ba9; font-size: .82rem; font-weight: 850; text-decoration: none; white-space: nowrap; }
.encabezado-panel-mock-seleccion > a svg { width: 16px; height: 16px; }
.lista-agenda-mock-seleccion, .lista-resultados-mock-seleccion, .lista-calendario-seleccion { display: grid; gap: 8px; margin: 0; padding: 0; list-style: none; }
.lista-agenda-mock-seleccion > li, .lista-resultados-mock-seleccion > li { min-width: 0; }
.panel-resultados-seleccion .lista-resultados-mock-seleccion { gap: 12px; margin-top: 24px; }
.partido-seleccion-hoy { margin: 10px 0 14px; border-left: 4px solid #ffd21c; border-radius: 10px; background: #f2f6fb; padding: 12px 16px; }
.partido-seleccion-hoy .etiqueta-seccion { margin: 0; color: #075ba9; font-size: .72rem; font-weight: 850; }
.partido-seleccion-hoy h3 { margin: 5px 0; color: #112442; font-size: 1.05rem; }
.partido-seleccion-hoy > p:last-child { margin: 0; color: #526783; font-size: .82rem; }
.nota-fuentes-seleccion { margin: 13px 2px 0; color: #50627b; font-size: .82rem; line-height: 1.5; }
.nota-fuentes-seleccion a { margin-left: 5px; color: #075ba9; font-weight: 800; }
.estado-seleccion-vacio { color: #566b85; font-size: .9rem; }
.franja-fcf-convocatorias { position: relative; display: flex; min-height: 82px; align-items: center; gap: 17px; overflow: hidden; border-radius: 15px; background: #061a34; padding: 14px 20px; color: #fff; }
.sello-tricolor-convocatorias { display: grid; width: 50px; height: 50px; flex: 0 0 50px; place-items: center; border: 2px solid #ffd21e; border-radius: 50%; color: #ffd21e; }
.sello-tricolor-convocatorias svg { width: 31px; height: 31px; }
.franja-fcf-convocatorias > strong { font-size: .92rem; line-height: 1.15; letter-spacing: .04em; }
.separador-fcf-convocatorias { width: 1px; height: 42px; background: rgb(255 255 255 / 55%); }
.franja-fcf-convocatorias > span:nth-of-type(2) { color: #d7e3f3; font-size: .75rem; font-weight: 700; letter-spacing: .1em; line-height: 1.5; }
.bandera-fcf-convocatorias { display: flex; width: 27%; height: 54px; flex-direction: column; margin-left: auto; transform: skewX(-22deg) translateX(18px); }
.bandera-fcf-convocatorias i:nth-child(1) { height: 50%; background: #fcd116; }
.bandera-fcf-convocatorias i:nth-child(2), .bandera-fcf-convocatorias i:nth-child(3) { height: 25%; background: #003893; }
.bandera-fcf-convocatorias i:nth-child(3) { background: #ce1126; }
.encabezado-convocatorias { display: flex; align-items: center; justify-content: space-between; gap: 24px; margin: 25px 0 18px; }
.titular-convocatorias { display: flex; align-items: flex-start; gap: 16px; }
.titular-convocatorias > span { width: 9px; height: 58px; flex: 0 0 9px; border-radius: 5px; background: #ffd21e; }
.titular-convocatorias h2 { margin: 0; color: #0b1c3b; font-size: clamp(1.8rem, 3vw, 2.65rem); font-weight: 900; letter-spacing: -.045em; line-height: 1.08; }
.titular-convocatorias p { margin: 4px 0 0; color: #405778; font-size: 1rem; }
.filtros-convocatorias { display: inline-flex; flex: 0 0 auto; align-items: center; gap: 3px; border: 1px solid #cbd8e8; border-radius: 999px; background: #fff; padding: 4px; box-shadow: 0 3px 12px rgb(12 33 62 / 7%); }
.filtros-convocatorias button { display: inline-flex; min-height: 42px; align-items: center; justify-content: center; gap: 8px; border: 0; border-radius: 999px; background: transparent; padding: 8px 14px; color: #102342; font: inherit; font-size: .84rem; font-weight: 750; cursor: pointer; }
.filtros-convocatorias button + button { border-left: 1px solid #d5deeb; border-radius: 0; }
.filtros-convocatorias button[aria-pressed="true"] { border-radius: 999px; background: #061a34; color: #fff; }
.filtros-convocatorias button svg { width: 17px; height: 17px; }
.filtros-convocatorias button[aria-pressed="true"] svg { color: #ffd21e; }
.filtros-convocatorias button:focus-visible, .lista-jugadores-seleccion summary:focus-visible, .fuente-convocatoria-seleccion:focus-visible { outline: 3px solid #0877c8; outline-offset: 3px; }
.grilla-convocatorias-seleccion { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); align-items: start; gap: 20px; }
.tarjeta-convocatoria-seleccion { min-width: 0; overflow: hidden; border: 1px solid #dce5ef; border-bottom: 4px solid #ffd21e; border-radius: 17px; background: #fff; box-shadow: 0 10px 26px rgb(14 35 62 / 9%); }
.portada-convocatoria-seleccion { position: relative; display: flex; aspect-ratio: 3.25 / 1; align-items: flex-start; overflow: hidden; background: #071a34; color: #fff; }
.portada-convocatoria-seleccion::after { position: absolute; inset: 0; background: linear-gradient(90deg, rgb(2 15 33 / 78%) 0%, rgb(2 15 33 / 40%) 38%, transparent 78%), linear-gradient(0deg, rgb(2 15 33 / 22%), transparent 45%); content: ''; }
.portada-convocatoria-seleccion > img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; object-position: center; }
.rotulo-convocatoria-seleccion { position: absolute; z-index: 1; top: 18%; left: 5%; border-bottom: 4px solid #ffd21e; padding-bottom: 8px; color: #fff; font-size: clamp(.7rem, 1vw, .92rem); font-weight: 800; letter-spacing: .2em; line-height: 1.55; }
.estado-ventana-convocatoria { position: absolute; z-index: 1; top: 11%; right: 3%; display: inline-flex; align-items: center; gap: 8px; border: 1px solid rgb(255 255 255 / 28%); border-radius: 999px; background: rgb(218 228 241 / 24%); padding: 8px 12px; color: #fff; font-size: .78rem; font-weight: 750; backdrop-filter: blur(8px); }
.estado-ventana-convocatoria svg { width: 17px; height: 17px; }
.credito-ilustracion-convocatoria { position: absolute; z-index: 1; right: 12px; bottom: 10px; color: rgb(255 255 255 / 78%); font-size: .65rem; text-shadow: 0 1px 3px #00152d; }
.contenido-convocatoria-seleccion { padding: 17px 20px 18px; }
.contenido-convocatoria-seleccion > h3 { margin: 0 0 10px; color: #0b1c3b; font-size: clamp(1.24rem, 1.8vw, 1.7rem); font-weight: 900; letter-spacing: -.035em; line-height: 1.15; }
.metadatos-convocatoria-seleccion { display: flex; flex-wrap: wrap; align-items: center; gap: 8px 0; color: #243b5c; font-size: .81rem; }
.metadatos-convocatoria-seleccion > span { display: inline-flex; min-height: 26px; align-items: center; gap: 7px; padding: 0 11px; }
.metadatos-convocatoria-seleccion > span:first-child { padding-left: 0; }
.metadatos-convocatoria-seleccion > span + span { border-left: 1px solid #cbd6e4; }
.metadatos-convocatoria-seleccion svg { width: 18px; height: 18px; flex: 0 0 auto; color: #102342; }
.rivales-convocatoria-seleccion { display: flex; min-height: 56px; align-items: center; gap: 14px; margin-top: 14px; border-radius: 12px; background: #f0f4f8; padding: 9px 14px; color: #102342; }
.rivales-convocatoria-seleccion > strong { flex: 0 0 auto; font-size: .9rem; }
.separador-rivales-convocatoria { width: 1px; height: 30px; flex: 0 0 1px; background: #c5d0df; }
.rivales-convocatoria-seleccion ul { display: flex; flex-wrap: wrap; align-items: center; gap: 9px 15px; margin: 0; padding: 0; list-style: none; }
.rivales-convocatoria-seleccion li { display: inline-flex; align-items: center; gap: 7px; color: #203654; font-size: .83rem; font-weight: 700; }
.rivales-convocatoria-seleccion li > span { font-size: 1.1rem; }
.actualizacion-convocatoria-seleccion { margin: 12px 0 0; border-radius: 10px; background: #fff0bd; padding: 10px 12px; color: #172d4a; font-size: .8rem; line-height: 1.4; }
.acciones-convocatoria-seleccion { display: flex; align-items: center; gap: 14px; margin-top: 16px; }
.lista-jugadores-seleccion { min-width: 0; flex: 1 1 auto; }
.lista-jugadores-seleccion summary { display: inline-flex; min-height: 43px; align-items: center; justify-content: center; gap: 10px; border-radius: 11px; background: #ffca08; padding: 9px 16px; color: #061a34; font-size: .88rem; font-weight: 900; cursor: pointer; list-style: none; }
.lista-jugadores-seleccion summary::-webkit-details-marker { display: none; }
.lista-jugadores-seleccion summary svg { width: 18px; height: 18px; transition: transform .18s ease; }
.lista-jugadores-seleccion[open] summary svg { transform: rotate(90deg); }
.lista-jugadores-seleccion ol { display: grid; max-height: 270px; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px 18px; overflow: auto; margin: 14px 0 2px; padding-left: 22px; color: #102342; }
.lista-jugadores-seleccion li { min-width: 0; padding: 2px 0; }
.lista-jugadores-seleccion li a { color: #145996; font-size: .82rem; font-weight: 800; }
.lista-jugadores-seleccion li span { display: block; color: #64758a; font-size: .73rem; }
.fuente-convocatoria-seleccion { display: inline-flex; min-height: 38px; flex: 0 0 auto; align-items: center; gap: 7px; border-left: 1px solid #cbd6e4; padding-left: 14px; color: #075ba9; font-size: .84rem; font-weight: 800; text-decoration: none; }
.fuente-convocatoria-seleccion svg { width: 18px; height: 18px; }
.nota-archivo-convocatorias { display: flex; align-items: center; gap: 9px; margin-top: 20px; color: #102342; }
.nota-archivo-convocatorias svg { width: 19px; height: 19px; flex: 0 0 auto; }
.seccion-calendario-seleccion { scroll-margin-top: 92px; }
.cabecera-calendario-seleccion { display: flex; align-items: end; justify-content: space-between; gap: 20px; margin: 0 0 20px; border-left: 7px solid #ffca08; padding: 4px 0 4px 17px; }
.titulo-calendario-seleccion .etiqueta-seccion { margin: 0 0 2px; color: #075ba9; font-size: .78rem; font-weight: 900; letter-spacing: .04em; }
.titulo-calendario-seleccion h2 { margin: 0; color: #0b1c3b; font-size: clamp(1.7rem, 3vw, 2.45rem); font-weight: 900; letter-spacing: -.045em; line-height: 1.08; }
.titulo-calendario-seleccion > p:last-child { margin: 5px 0 0; color: #405778; font-size: .94rem; }
.enlace-fcf-calendario { display: inline-flex; min-height: 46px; flex: 0 0 auto; align-items: center; gap: 9px; border: 1px solid #d5dfeb; border-radius: 999px; background: #fff; padding: 8px 15px; color: #075ba9; font-size: .83rem; font-weight: 850; text-decoration: none; box-shadow: 0 3px 10px rgb(12 33 62 / 6%); }
.enlace-fcf-calendario svg { width: 17px; height: 17px; }
.disposicion-calendario-seleccion { display: grid; grid-template-columns: minmax(0, 1.72fr) minmax(300px, .84fr); align-items: stretch; gap: 14px; }
.panel-calendario-seleccion, .resumen-calendario-seleccion { min-width: 0; border: 1px solid #dce5ef; border-radius: 19px; background: #fff; padding: 18px; box-shadow: 0 10px 26px rgb(16 48 84 / 6%); }
.encabezado-panel-calendario { display: flex; align-items: center; justify-content: space-between; gap: 12px; border-bottom: 1px solid #e0e7f0; padding-bottom: 14px; }
.encabezado-panel-calendario h3, .resumen-calendario-seleccion > h3 { display: flex; align-items: center; gap: 10px; margin: 0; color: #0b1c3b; font-size: clamp(1.2rem, 2vw, 1.55rem); font-weight: 900; letter-spacing: -.035em; }
.encabezado-panel-calendario h3 svg, .resumen-calendario-seleccion > h3 svg { width: 23px; height: 23px; flex: 0 0 auto; color: #075ba9; }
.filtros-calendario-seleccion { display: inline-flex; flex: 0 0 auto; align-items: center; gap: 4px; border-radius: 999px; background: #f0f3f8; padding: 4px; }
.filtros-calendario-seleccion button { display: inline-flex; min-height: 35px; align-items: center; justify-content: center; gap: 5px; border: 0; border-radius: 999px; background: transparent; padding: 6px 11px; color: #233c5f; font: inherit; font-size: .75rem; font-weight: 800; cursor: pointer; }
.filtros-calendario-seleccion button svg { width: 15px; height: 15px; }
.filtros-calendario-seleccion button[aria-pressed="true"] { background: #08264d; color: #fff; box-shadow: 0 2px 5px rgb(8 38 77 / 17%); }
.filtros-calendario-seleccion button:focus-visible, .ventanas-calendario-seleccion button:focus-visible, .enlace-fcf-calendario:focus-visible { outline: 3px solid #0877c8; outline-offset: 3px; }
.lista-calendario-seleccion { gap: 8px; padding-top: 12px; }
.lista-calendario-seleccion > li { min-width: 0; }
.lista-calendario-seleccion :deep(.tarjeta-partido-seleccion) { min-height: 78px; grid-template-columns: 50px minmax(0, 1fr) minmax(132px, .55fr) 16px; gap: 10px; border-radius: 13px; }
.lista-calendario-seleccion :deep(.equipos-partido-seleccion) { gap: 8px; }
.lista-calendario-seleccion :deep(.equipo-partido-seleccion) { font-size: .84rem; }
.lista-calendario-seleccion :deep(.meta-partido-seleccion) { font-size: .75rem; }
.resumen-calendario-seleccion > h3 { margin-bottom: 14px; font-size: 1.32rem; }
.metricas-calendario-seleccion { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 8px; }
.metricas-calendario-seleccion > div { display: grid; min-height: 111px; align-content: center; justify-items: center; gap: 2px; border-radius: 13px; background: #fff5d4; padding: 9px 4px; text-align: center; }
.metricas-calendario-seleccion > div:nth-child(2) { background: #e7f1ff; }
.metricas-calendario-seleccion > div:nth-child(3) { background: #f2eaff; }
.metricas-calendario-seleccion > div svg { width: 19px; height: 19px; color: #956d00; }
.metricas-calendario-seleccion > div:nth-child(2) svg { color: #0758b6; }
.metricas-calendario-seleccion > div:nth-child(3) svg { color: #7128ae; }
.metricas-calendario-seleccion strong { color: #102342; font-size: 1.45rem; font-weight: 900; line-height: 1.05; }
.metricas-calendario-seleccion span { color: #203755; font-size: .72rem; line-height: 1.2; }
.resumen-calendario-seleccion > h4 { display: flex; align-items: center; gap: 8px; margin: 15px 0 9px; border-top: 1px solid #dce5ef; padding-top: 13px; color: #102342; font-size: 1rem; font-weight: 900; }
.resumen-calendario-seleccion > h4 svg { width: 20px; height: 20px; }
.ventanas-calendario-seleccion { display: grid; gap: 6px; }
.ventanas-calendario-seleccion button { display: grid; min-width: 0; grid-template-columns: 39px minmax(0, 1fr) 16px; align-items: center; gap: 8px; border: 1px solid #dfe7f1; border-radius: 12px; background: #fff; padding: 8px; color: #102342; text-align: left; cursor: pointer; }
.ventanas-calendario-seleccion button > span:nth-child(2) { display: grid; min-width: 0; gap: 2px; }
.ventanas-calendario-seleccion button strong { font-size: .74rem; line-height: 1.2; }
.ventanas-calendario-seleccion button small { overflow: hidden; color: #536782; font-size: .67rem; line-height: 1.2; text-overflow: ellipsis; }
.ventanas-calendario-seleccion button > svg { width: 16px; height: 16px; }
.icono-ventana-calendario { display: grid; width: 36px; height: 36px; place-items: center; border-radius: 10px; background: #e9f2ff; color: #0758b6; }
.icono-ventana-calendario--femenina { background: #f1eaff; color: #7128ae; }
.icono-ventana-calendario svg { width: 19px; height: 19px; }
.aviso-calendario-seleccion { display: flex; align-items: flex-start; gap: 8px; margin: 12px 0 0; border-radius: 11px; background: #fff4d2; padding: 10px; color: #493b18; font-size: .72rem; line-height: 1.4; }
.aviso-calendario-seleccion svg, .nota-calendario-seleccion svg { width: 18px; height: 18px; flex: 0 0 auto; }
.nota-calendario-seleccion { display: flex; align-items: center; gap: 9px; margin: 14px 3px 0; color: #435a78; font-size: .79rem; line-height: 1.4; }
.nota-calendario-seleccion svg { color: #24466d; }
.nota-calendario-seleccion strong { color: #102342; }
.chips-jugadores-seleccion { display: flex; flex-wrap: wrap; gap: 9px; margin-top: 14px; }
.chips-jugadores-seleccion a { display: inline-flex; align-items: center; min-height: 38px; padding: 7px 12px; border: 1px solid rgba(116, 190, 234, .3); border-radius: 999px; font-weight: 750; }
.noticias-seleccion { display: grid; gap: 20px; margin: 36px 0 20px; }
.encabezado-noticias-seleccion { display: flex; align-items: end; justify-content: space-between; gap: 18px; }
.encabezado-noticias-seleccion > div > p { margin: 0 0 3px; color: #075ba9; font-size: .82rem; font-weight: 850; }
.encabezado-noticias-seleccion h2 { display: flex; align-items: center; gap: 10px; margin: 0; color: #0b1c3b; font-size: clamp(1.5rem, 2.6vw, 2.15rem); font-weight: 900; letter-spacing: -.035em; }
.encabezado-noticias-seleccion h2 svg { width: 25px; height: 25px; color: #0877c8; }
.encabezado-noticias-seleccion > a { display: inline-flex; align-items: center; gap: 7px; color: #075ba9; font-size: .9rem; font-weight: 850; text-decoration: none; white-space: nowrap; }
.encabezado-noticias-seleccion > a svg { width: 17px; height: 17px; }
.noticias-seleccion :deep(.noticia-seleccion-principal) { height: clamp(300px, 31vw, 390px); min-height: 0; }
.noticias-seleccion :deep(.noticia-seleccion-principal .tarjeta-noticia-principal__contenido) { max-width: 860px; }
.noticias-seleccion :deep(.noticia-seleccion-principal .tarjeta-noticia-principal__titulo),
.noticias-seleccion :deep(.noticia-seleccion-principal .tarjeta-noticia-principal__titulo a) { color: #fff; }
.carrusel-noticias-seleccion { display: grid; grid-auto-columns: minmax(320px, 34%); grid-auto-flow: column; gap: 14px; overflow-x: auto; overscroll-behavior-inline: contain; padding: 2px 2px 12px; scroll-padding-inline: 2px; scroll-snap-type: inline mandatory; scrollbar-color: #9eb6d0 transparent; scrollbar-width: thin; }
.carrusel-noticias-seleccion:focus-visible { border-radius: 12px; outline: 3px solid #0877c8; outline-offset: 3px; }
.carrusel-noticias-seleccion :deep(.tarjeta-noticia-secundaria) { min-height: 174px; flex-direction: row; scroll-snap-align: start; }
.carrusel-noticias-seleccion :deep(.tarjeta-noticia-secundaria__imagen) { min-height: 174px; flex: 0 0 36%; aspect-ratio: auto; }
.carrusel-noticias-seleccion :deep(.tarjeta-noticia-secundaria__contenido) { justify-content: center; gap: 7px; padding: 13px 14px; }
.carrusel-noticias-seleccion :deep(.tarjeta-noticia-secundaria__titulo) { font-size: clamp(.92rem, 1.1vw, 1.06rem); }
.carrusel-noticias-seleccion :deep(.tarjeta-noticia-secundaria__resumen) { font-size: .79rem; }
.carrusel-noticias-seleccion :deep(.tarjeta-noticia-secundaria__fecha) { font-size: .76rem; }
.estado-vacio-noticias-seleccion { border-radius: 16px; padding: 24px; }
body.tema-publico-azul .encabezado-seleccion-principal h1, body.tema-publico-azul .encabezado-panel-mock-seleccion h2 { color: #f2f7ff; }
body.tema-publico-azul .encabezado-seleccion-principal > p:last-child { color: #c2d2e8; }
body.tema-publico-azul .tarjeta-convocatoria-seleccion .contenido-convocatoria-seleccion > h3 { color: #0b1c3b; }
body.tema-publico-azul .metadatos-convocatoria-seleccion, body.tema-publico-azul .rivales-convocatoria-seleccion li { color: #243b5c; }
body.tema-publico-azul .fuente-convocatoria-seleccion, body.tema-publico-azul .lista-jugadores-seleccion li a { color: #075ba9; }
body.tema-publico-azul .nota-archivo-convocatorias { color: #d5e0ef; }
body.tema-publico-azul .panel-seleccion { border-color: #2b4564; background: #0d213a; }
body.tema-publico-azul .encabezado-panel-mock-seleccion > a, body.tema-publico-azul .nota-fuentes-seleccion a { color: #91ddff; }
body.tema-publico-azul .nota-fuentes-seleccion { color: #c2d2e8; }
body.tema-publico-azul .partido-seleccion-hoy { background: #142c48; }
body.tema-publico-azul .partido-seleccion-hoy h3 { color: #f2f7ff; }
body.tema-publico-azul .partido-seleccion-hoy > p:last-child { color: #c2d2e8; }
body.tema-publico-azul .bloque-seleccion, body.tema-publico-azul .bloque-seleccion :is(h2, h3) { color: #edf4ff; }
body.tema-publico-azul .bloque-seleccion a { color: #91ddff; }
body.tema-publico-azul .encabezado-noticias-seleccion h2 { color: #f2f7ff; }
body.tema-publico-azul .encabezado-noticias-seleccion > div > p, body.tema-publico-azul .encabezado-noticias-seleccion > a { color: #91ddff; }
body.tema-publico-blanco .bloque-seleccion, body.tema-publico-blanco .bloque-seleccion :is(h2, h3) { color: #10294a; }
body.tema-publico-blanco .panel-seleccion { background: #fff; }
body.tema-publico-azul .panel-calendario-seleccion, body.tema-publico-azul .resumen-calendario-seleccion { border-color: #2b4564; background: #0d213a; }
body.tema-publico-azul .titulo-calendario-seleccion h2, body.tema-publico-azul .encabezado-panel-calendario h3, body.tema-publico-azul .resumen-calendario-seleccion > h3, body.tema-publico-azul .resumen-calendario-seleccion > h4 { color: #f2f7ff; }
body.tema-publico-azul .titulo-calendario-seleccion > p:last-child, body.tema-publico-azul .nota-calendario-seleccion { color: #c2d2e8; }
body.tema-publico-azul .nota-calendario-seleccion strong { color: #f2f7ff; }
body.tema-publico-azul .enlace-fcf-calendario { border-color: #304b6b; background: #142c48; }
body.tema-publico-azul .metricas-calendario-seleccion strong, body.tema-publico-azul .ventanas-calendario-seleccion button { color: #102342; }
body.tema-publico-azul .resumen-calendario-seleccion > h4 { border-color: #304b6b; }
body.tema-publico-blanco .acciones-convocatoria-seleccion a, body.tema-publico-blanco .lista-jugadores-seleccion summary { color: #145996; }
@media (max-width: 1050px) {
  .grilla-agenda-resultados-seleccion { grid-template-columns: 1fr; gap: 16px; }
  .disposicion-calendario-seleccion { grid-template-columns: 1fr; }
  .panel-resultados-seleccion .lista-resultados-mock-seleccion { margin-top: 12px; }
  .carrusel-noticias-seleccion { grid-auto-columns: minmax(300px, 48%); }
}
@media (max-width: 760px) {
  .encabezado-seleccion-principal { margin-bottom: 13px; }
  .encabezado-seleccion-principal h1 { font-size: clamp(2rem, 9vw, 2.7rem); }
  .encabezado-seleccion-principal > p:last-child { font-size: .88rem; }
  .banner-seleccion-colombia { aspect-ratio: 920 / 498; margin-top: 0; border-radius: 18px; }
  .imagen-banner-seleccion { transform: none; }
  .imagen-banner-seleccion img { border-radius: 18px; }
  .enlace-banner-calendario { top: 72%; left: 8%; width: 72%; height: 19%; }
  .navegacion-seleccion { gap: 5px; margin-block: 8px 14px; }
  .navegacion-seleccion a { gap: 7px; padding-inline: 12px; font-size: .82rem; }
  .navegacion-seleccion a svg { width: 18px; height: 18px; }
  .grilla-convocatorias-seleccion { grid-template-columns: 1fr; }
  .encabezado-convocatorias { align-items: stretch; flex-direction: column; gap: 14px; margin-top: 19px; }
  .titular-convocatorias h2 { font-size: clamp(1.55rem, 7vw, 2rem); }
  .titular-convocatorias p { font-size: .88rem; }
  .filtros-convocatorias { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); }
  .filtros-convocatorias button { gap: 5px; padding-inline: 7px; font-size: .75rem; }
  .franja-fcf-convocatorias { min-height: 68px; gap: 10px; padding: 10px 12px; }
  .sello-tricolor-convocatorias { width: 40px; height: 40px; flex-basis: 40px; }
  .sello-tricolor-convocatorias svg { width: 25px; height: 25px; }
  .franja-fcf-convocatorias > strong { font-size: .73rem; }
  .franja-fcf-convocatorias > span:nth-of-type(2) { font-size: .58rem; letter-spacing: .06em; }
  .bandera-fcf-convocatorias { width: 15%; height: 38px; }
  .portada-convocatoria-seleccion { aspect-ratio: 2.4 / 1; }
  .rotulo-convocatoria-seleccion { left: 4%; font-size: .67rem; }
  .estado-ventana-convocatoria { top: 8%; right: 2%; gap: 5px; padding: 6px 8px; font-size: .66rem; }
  .contenido-convocatoria-seleccion { padding: 15px 13px; }
  .contenido-convocatoria-seleccion > h3 { font-size: 1.25rem; }
  .metadatos-convocatoria-seleccion { gap: 5px; font-size: .75rem; }
  .metadatos-convocatoria-seleccion > span { min-height: 24px; padding-inline: 6px; }
  .metadatos-convocatoria-seleccion > span:first-child { padding-left: 0; }
  .metadatos-convocatoria-seleccion svg { width: 15px; height: 15px; }
  .rivales-convocatoria-seleccion { align-items: flex-start; gap: 9px; padding: 10px; }
  .rivales-convocatoria-seleccion ul { gap: 8px; }
  .rivales-convocatoria-seleccion li { font-size: .75rem; }
  .acciones-convocatoria-seleccion { align-items: flex-start; flex-wrap: wrap; gap: 10px; }
  .lista-jugadores-seleccion summary { min-height: 40px; padding-inline: 11px; font-size: .77rem; }
  .fuente-convocatoria-seleccion { min-height: 34px; padding-left: 9px; font-size: .75rem; }
  .encabezado-panel-mock-seleccion { align-items: flex-start; }
  .encabezado-panel-mock-seleccion > a { font-size: .74rem; }
  .panel-seleccion { padding: 16px 12px; }
  .noticias-seleccion { gap: 14px; margin-top: 28px; }
  .noticias-seleccion :deep(.noticia-seleccion-principal) { height: clamp(300px, 82vw, 360px); }
  .carrusel-noticias-seleccion { grid-auto-columns: minmax(280px, 84%); gap: 10px; }
  .carrusel-noticias-seleccion :deep(.tarjeta-noticia-secundaria) { min-height: 156px; }
  .carrusel-noticias-seleccion :deep(.tarjeta-noticia-secundaria__imagen) { min-height: 156px; flex-basis: 35%; }
  .carrusel-noticias-seleccion :deep(.tarjeta-noticia-secundaria__contenido) { gap: 6px; padding: 10px; }
  .encabezado-noticias-seleccion { align-items: center; }
  .encabezado-noticias-seleccion > a { font-size: .78rem; }
  .cabecera-calendario-seleccion { align-items: flex-start; flex-direction: column; gap: 13px; margin-bottom: 14px; padding-left: 12px; }
  .titulo-calendario-seleccion h2 { font-size: clamp(1.55rem, 7vw, 2rem); }
  .titulo-calendario-seleccion > p:last-child { font-size: .84rem; }
  .enlace-fcf-calendario { min-height: 40px; }
  .panel-calendario-seleccion, .resumen-calendario-seleccion { border-radius: 15px; padding: 13px 11px; }
  .encabezado-panel-calendario { align-items: flex-start; flex-direction: column; gap: 10px; padding-bottom: 11px; }
  .encabezado-panel-calendario h3 { font-size: 1.18rem; }
  .filtros-calendario-seleccion { width: 100%; }
  .filtros-calendario-seleccion button { flex: 1 1 0; padding-inline: 6px; font-size: .7rem; }
  .lista-calendario-seleccion :deep(.tarjeta-partido-seleccion) { grid-template-columns: 42px minmax(0, 1fr) 15px; gap: 8px; padding-right: 8px; }
  .lista-calendario-seleccion :deep(.meta-partido-seleccion) { grid-column: 2; grid-row: 2; display: grid; border: 0; padding: 0; }
  .lista-calendario-seleccion :deep(.flecha-partido-seleccion) { grid-column: 3; grid-row: 1 / span 2; }
  .lista-calendario-seleccion :deep(.equipo-partido-seleccion) { font-size: .76rem; }
  .lista-calendario-seleccion :deep(.etiqueta-seleccion-partido), .lista-calendario-seleccion :deep(.etiqueta-competencia-partido) { font-size: .61rem; }
  .metricas-calendario-seleccion { gap: 5px; }
  .metricas-calendario-seleccion > div { min-height: 97px; }
  .metricas-calendario-seleccion span { font-size: .66rem; }
  .nota-calendario-seleccion { align-items: flex-start; font-size: .74rem; }
  .lista-jugadores-seleccion ol { grid-template-columns: 1fr; }
}
@media (max-width: 460px) {
  .encabezado-panel-mock-seleccion h2 { font-size: 1.35rem; }
  .encabezado-panel-mock-seleccion > a { max-width: 95px; white-space: normal; }
  .carrusel-noticias-seleccion { grid-auto-columns: minmax(270px, 90%); }
}
</style>
