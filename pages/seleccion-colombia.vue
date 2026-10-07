<script setup lang="ts">
import type { PartidoResultado, RespuestaResultados } from '~/types/resultados'
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
const partidosSeleccionHoy = computed(() => filtrarPartidosSeleccionColombia(
  Array.isArray(respuestaResultados.value?.partidos) ? respuestaResultados.value.partidos : []
))

const partidoDeHoyOficial = computed(() => calendarioOficialSeleccion.find(partido => partido.fecha === fechaActual.value) || null)
const partidoDeHoyRegistrado = computed(() => partidoDeHoyOficial.value
  ? encontrarPartidoRegistradoSeleccion(partidoDeHoyOficial.value, partidosSeleccionHoy.value) || null
  : null)

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

const resultadosRecientes = computed(() => {
  const resultadosEstaticos = resultadosOficialesSeleccion.map(partido => ({
    ...partido,
    partidoRegistrado: encontrarPartidoRegistradoSeleccion(partido, partidosSeleccionHoy.value) || null
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
      partidoRegistrado: partido
    }))
  const claves = new Set<string>()
  return [...resultadosDelDia, ...resultadosEstaticos]
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

function estadoEvento(partido: typeof calendarioOficialSeleccion[number], registrado: PartidoResultado | null): string {
  if (registrado) {
    if (registrado.estado === 'en-vivo') return 'En vivo'
    if (registrado.estado === 'finalizado') return 'Finalizado'
    return 'Programado'
  }
  if (partido.fecha > fechaActual.value) return 'Próximo'
  if (partido.fecha < fechaActual.value) return 'Fecha disputada'
  if (partido.fechaIso && Date.parse(partido.fechaIso) <= Date.parse(ahoraIso.value)) {
    return 'Marcador pendiente de confirmación'
  }
  return 'Hoy'
}

function marcadorPartido(partido: Pick<PartidoResultado, 'marcadorLocal' | 'marcadorVisitante'> | null | undefined): string {
  if (!partido || partido.marcadorLocal === undefined || partido.marcadorVisitante === undefined) return ''
  return String(partido.marcadorLocal) + ' – ' + String(partido.marcadorVisitante)
}

function rutaBuscarJugador(nombre: string): string {
  return '/articulos?buscar=' + encodeURIComponent(nombre)
}

function construirUrlPartido(partido: PartidoResultado): string {
  return '/resultados/' + encodeURIComponent(partido.id)
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
  <PublicoHubEditorialPublico :configuracion="configuracion">
    <template #intro>
      <section class="bloque-seleccion" aria-labelledby="titulo-jornada-seleccion">
        <header class="encabezado-seleccion">
          <div>
            <p class="etiqueta-seccion">AGENDA VERIFICADA · ACTUALIZADA {{ fechaVerificacionSeleccion }}</p>
            <h2 id="titulo-jornada-seleccion">Partidos y resultados de Colombia</h2>
          </div>
          <NuxtLink to="/resultados/futbol">Todos los resultados <span aria-hidden="true">→</span></NuxtLink>
        </header>

        <div v-if="partidoDeHoyOficial" class="partido-seleccion-hoy">
          <div>
            <p class="etiqueta-seccion">PARTIDO DE HOY · {{ partidoDeHoyOficial.seleccion }}</p>
            <h3>{{ partidoDeHoyOficial.local }} <span aria-hidden="true">vs.</span> {{ partidoDeHoyOficial.visitante }}</h3>
            <p>{{ partidoDeHoyOficial.competencia }} · {{ partidoDeHoyOficial.sede }}</p>
            <p>{{ horaEvento(partidoDeHoyOficial) }}</p>
          </div>
          <div class="estado-partido-seleccion">
            <strong>{{ estadoEvento(partidoDeHoyOficial, partidoDeHoyRegistrado) }}</strong>
            <span v-if="marcadorPartido(partidoDeHoyRegistrado)">{{ marcadorPartido(partidoDeHoyRegistrado) }}</span>
            <p v-else>El marcador se muestra cuando una fuente deportiva pública lo confirma.</p>
            <NuxtLink v-if="partidoDeHoyRegistrado" :to="construirUrlPartido(partidoDeHoyRegistrado)">Ver ficha del partido</NuxtLink>
            <a v-else :href="partidoDeHoyOficial.fuenteUrl" target="_blank" rel="noopener noreferrer">Consultar calendario oficial de la FCF</a>
          </div>
        </div>

        <div class="grilla-jornada-seleccion">
          <section class="panel-seleccion" aria-labelledby="titulo-proximos-seleccion">
            <div class="encabezado-panel-seleccion">
              <p class="etiqueta-seccion">AGENDA</p>
              <h3 id="titulo-proximos-seleccion">Próximos partidos</h3>
            </div>
            <ol v-if="agendaProxima.length" class="lista-agenda-seleccion">
              <li v-for="partido in agendaProxima" :key="partido.fecha + partido.local + partido.visitante">
                <div class="fecha-agenda-seleccion">
                  <strong>{{ fechaLegible(partido.fecha) }}</strong>
                  <span>{{ partido.hora || (partido.fechaIso ? horaEvento(partido) : 'Hora por confirmar por la FCF') }}</span>
                </div>
                <div class="partido-agenda-seleccion">
                  <span>{{ partido.local }} <span aria-hidden="true">vs.</span> {{ partido.visitante }}</span>
                  <small>{{ partido.seleccion }} · {{ partido.competencia }}</small>
                  <small v-if="partido.sede">{{ partido.estadio ? partido.estadio + ' · ' : '' }}{{ partido.sede }}</small>
                </div>
                <div class="accion-agenda-seleccion">
                  <span>{{ estadoEvento(partido, partido.partidoRegistrado) }}</span>
                  <NuxtLink v-if="partido.partidoRegistrado" :to="construirUrlPartido(partido.partidoRegistrado)">Ficha del partido</NuxtLink>
                  <a v-else :href="partido.fuenteUrl" target="_blank" rel="noopener noreferrer">Fuente FCF</a>
                </div>
              </li>
            </ol>
            <p v-else class="estado-seleccion-vacio">La FCF aún no anuncia nuevos partidos. Esta agenda se limita a fechas oficiales publicadas.</p>
          </section>

          <section class="panel-seleccion" aria-labelledby="titulo-resultados-seleccion">
            <div class="encabezado-panel-seleccion">
              <p class="etiqueta-seccion">MARCADORES CONFIRMADOS</p>
              <h3 id="titulo-resultados-seleccion">Resultados recientes</h3>
            </div>
            <ol v-if="resultadosRecientes.length" class="lista-resultados-seleccion">
              <li v-for="partido in resultadosRecientes" :key="partido.fecha + partido.local + partido.visitante">
                <div>
                  <strong>{{ partido.local }}</strong>
                  <span aria-label="marcador">{{ marcadorPartido(partido.partidoRegistrado) || marcadorPartido(partido) || 'Marcador pendiente de confirmación' }}</span>
                  <strong>{{ partido.visitante }}</strong>
                </div>
                <small>{{ fechaLegible(partido.fecha) }} · {{ partido.competencia }}</small>
                <NuxtLink v-if="partido.partidoRegistrado" :to="construirUrlPartido(partido.partidoRegistrado)">Ver ficha</NuxtLink>
                <a v-else :href="partido.fuenteUrl" target="_blank" rel="noopener noreferrer">Crónica oficial FCF</a>
              </li>
            </ol>
            <p v-else class="estado-seleccion-vacio">Todavía no tenemos resultados confirmados para mostrar.</p>
          </section>
        </div>

        <p class="nota-fuentes-seleccion">
          El calendario y las convocatorias se contrastan con la Federación Colombiana de Fútbol. Si la hora no ha sido publicada, se indica “por confirmar”; los marcadores aparecen solo cuando están verificados.
          <a href="https://www.fcf.com.co/calendario/" target="_blank" rel="noopener noreferrer">Calendario oficial FCF</a>
        </p>
      </section>
    </template>

    <template #contenido-adicional>
      <section id="convocatorias" class="bloque-seleccion" aria-labelledby="titulo-convocatorias-seleccion">
        <header class="encabezado-seleccion">
          <div>
            <p class="etiqueta-seccion">FUENTE PRIMARIA</p>
            <h2 id="titulo-convocatorias-seleccion">Convocatorias oficiales</h2>
          </div>
          <span>Verificadas al {{ fechaVerificacionSeleccion }}</span>
        </header>

        <div class="grilla-convocatorias-seleccion">
          <article v-for="convocatoria in convocatoriasOficialesSeleccion" :key="convocatoria.id" class="panel-seleccion convocatoria-seleccion">
            <p class="etiqueta-seccion">{{ convocatoria.etiqueta }}</p>
            <h3>{{ convocatoria.ventana }}</h3>
            <p>{{ convocatoria.cantidad }} futbolistas · Publicada el {{ fechaLegible(convocatoria.publicadaEn) }}</p>
            <p v-if="fechaActual > convocatoria.vigenteHasta" class="nota-ciclo-seleccion">Esta ventana ya terminó; la lista se conserva como la convocatoria oficial de ese ciclo, no como una nueva citación.</p>
            <p v-if="convocatoria.notaActualizacion" class="nota-ciclo-seleccion">{{ convocatoria.notaActualizacion }}</p>
            <div class="acciones-convocatoria-seleccion">
              <a :href="convocatoria.fuenteUrl" target="_blank" rel="noopener noreferrer">Ver lista oficial FCF</a>
              <a v-if="convocatoria.actualizacionUrl" :href="convocatoria.actualizacionUrl" target="_blank" rel="noopener noreferrer">Ver actualización</a>
            </div>
            <details class="lista-jugadores-seleccion">
              <summary>Ver los {{ convocatoria.cantidad }} convocados</summary>
              <ol>
                <li v-for="jugador in convocatoria.jugadores" :key="jugador.nombre">
                  <NuxtLink :to="rutaBuscarJugador(jugador.nombre)">{{ jugador.nombre }}</NuxtLink>
                  <span>{{ jugador.club }}</span>
                </li>
              </ol>
            </details>
          </article>
        </div>
        <p class="nota-fuentes-seleccion">Las listas reflejan las publicaciones citadas de la FCF. No se presentan como convocatoria vigente después de su ventana y se enlaza la corrección oficial cuando existe.</p>
      </section>

      <section id="calendario" class="bloque-seleccion" aria-labelledby="titulo-calendario-seleccion">
        <header class="encabezado-seleccion">
          <div>
            <p class="etiqueta-seccion">TEMPORADA 2026</p>
            <h2 id="titulo-calendario-seleccion">Calendario oficial de las selecciones</h2>
          </div>
          <a href="https://www.fcf.com.co/calendario/" target="_blank" rel="noopener noreferrer">Abrir calendario de la FCF</a>
        </header>
        <p class="texto-calendario-seleccion">Próximas fechas publicadas para las selecciones mayores masculina y femenina. Las horas que la Federación no ha confirmado se dejan pendientes, sin estimaciones.</p>
        <ol v-if="agendaProxima.length" class="lista-calendario-completa">
          <li v-for="partido in agendaProxima" :key="'cal-' + partido.fecha + partido.local + partido.visitante">
            <time :datetime="partido.fecha">{{ fechaLegible(partido.fecha) }}</time>
            <div><strong>{{ partido.local }} vs. {{ partido.visitante }}</strong><span>{{ partido.seleccion }} · {{ partido.competencia }}</span></div>
            <span>{{ partido.hora || 'Hora por confirmar' }}</span>
            <NuxtLink v-if="partido.partidoRegistrado" :to="construirUrlPartido(partido.partidoRegistrado)">Ficha del partido</NuxtLink>
            <a v-else :href="partido.fuenteUrl" target="_blank" rel="noopener noreferrer">Fuente oficial</a>
          </li>
        </ol>
        <p class="nota-fuentes-seleccion">Última revisión de esta agenda: {{ fechaVerificacionSeleccion }}. El calendario puede cambiar; confirma siempre la hora y la sede en la fuente oficial.</p>
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
  </PublicoHubEditorialPublico>
</template>

<style scoped>
.bloque-seleccion { margin: 28px auto 36px; max-width: 1180px; }
.encabezado-seleccion { display: flex; align-items: end; justify-content: space-between; gap: 16px; margin-bottom: 16px; }
.encabezado-seleccion h2 { margin: 4px 0 0; }
.encabezado-seleccion > a, .encabezado-seleccion > span { font-weight: 800; }
.partido-seleccion-hoy, .panel-seleccion { border: 1px solid rgba(116, 190, 234, .28); border-radius: 18px; padding: 20px; }
.partido-seleccion-hoy { display: grid; grid-template-columns: minmax(0, 1fr) minmax(220px, .65fr); gap: 20px; align-items: center; margin-bottom: 18px; background: linear-gradient(120deg, rgba(0, 70, 133, .52), rgba(11, 27, 53, .92)); }
.partido-seleccion-hoy h3 { margin: 8px 0; font-size: clamp(1.35rem, 3vw, 2rem); }
.estado-partido-seleccion { display: grid; gap: 8px; align-content: center; }
.estado-partido-seleccion strong { font-size: 1.05rem; color: #f2c94c; }
.estado-partido-seleccion p, .nota-fuentes-seleccion, .texto-calendario-seleccion { margin: 0; }
.grilla-jornada-seleccion, .grilla-convocatorias-seleccion { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 18px; }
.encabezado-panel-seleccion { margin-bottom: 12px; }
.encabezado-panel-seleccion h3 { margin: 4px 0 0; }
.lista-agenda-seleccion, .lista-resultados-seleccion, .lista-calendario-completa { display: grid; gap: 12px; list-style: none; margin: 0; padding: 0; }
.lista-agenda-seleccion > li, .lista-resultados-seleccion > li, .lista-calendario-completa > li { display: grid; grid-template-columns: minmax(120px, .8fr) minmax(160px, 1.2fr) auto; align-items: center; gap: 12px; padding: 12px 0; border-top: 1px solid rgba(116, 190, 234, .18); }
.fecha-agenda-seleccion, .partido-agenda-seleccion, .accion-agenda-seleccion { display: grid; gap: 4px; }
.fecha-agenda-seleccion span, .partido-agenda-seleccion small, .accion-agenda-seleccion span, .lista-calendario-completa li span { opacity: .78; }
.partido-agenda-seleccion > span { font-weight: 850; }
.accion-agenda-seleccion a, .lista-resultados-seleccion a { font-weight: 800; }
.lista-resultados-seleccion > li > div { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
.lista-resultados-seleccion > li > div span { font-weight: 900; color: #e0b929; }
.lista-resultados-seleccion > li > small { opacity: .75; }
.nota-fuentes-seleccion { margin-top: 14px; font-size: .92rem; opacity: .86; }
.nota-fuentes-seleccion a { margin-left: 8px; font-weight: 800; }
.estado-seleccion-vacio { opacity: .8; }
.convocatoria-seleccion h3 { margin: 6px 0 10px; }
.convocatoria-seleccion > p { margin: 8px 0; }
.nota-ciclo-seleccion { padding: 10px 12px; border-radius: 10px; background: rgba(232, 177, 38, .12); }
.acciones-convocatoria-seleccion { display: flex; flex-wrap: wrap; gap: 14px; margin: 12px 0; }
.acciones-convocatoria-seleccion a, .lista-jugadores-seleccion summary { color: #67d7f5; font-weight: 850; cursor: pointer; }
.lista-jugadores-seleccion { margin-top: 10px; }
.lista-jugadores-seleccion ol { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px 18px; padding-left: 20px; }
.lista-jugadores-seleccion li { padding: 2px 0; }
.lista-jugadores-seleccion li span { display: block; font-size: .86rem; opacity: .72; }
.lista-calendario-completa { margin-top: 16px; }
.lista-calendario-completa > li { grid-template-columns: minmax(170px, 1fr) minmax(180px, 1.5fr) minmax(130px, 1fr) auto; }
.lista-calendario-completa li time { font-weight: 800; }
.lista-calendario-completa li div { display: grid; gap: 4px; }
.lista-calendario-completa li a { font-weight: 800; }
.chips-jugadores-seleccion { display: flex; flex-wrap: wrap; gap: 9px; margin-top: 14px; }
.chips-jugadores-seleccion a { display: inline-flex; align-items: center; min-height: 38px; padding: 7px 12px; border: 1px solid rgba(116, 190, 234, .3); border-radius: 999px; font-weight: 750; }
body.tema-publico-azul .bloque-seleccion, body.tema-publico-azul .bloque-seleccion :is(h2, h3) { color: #edf4ff; }
body.tema-publico-azul .panel-seleccion { background: #0b1d35; }
body.tema-publico-azul .bloque-seleccion a { color: #75dcf4; }
body.tema-publico-blanco .bloque-seleccion, body.tema-publico-blanco .bloque-seleccion :is(h2, h3) { color: #10294a; }
body.tema-publico-blanco .panel-seleccion { background: #fff; box-shadow: 0 12px 32px rgba(20, 44, 76, .07); }
body.tema-publico-blanco .partido-seleccion-hoy { color: #eff7ff; }
body.tema-publico-blanco .bloque-seleccion a { color: #145996; }
body.tema-publico-blanco .acciones-convocatoria-seleccion a, body.tema-publico-blanco .lista-jugadores-seleccion summary { color: #145996; }
@media (max-width: 760px) {
  .bloque-seleccion { margin: 22px auto 28px; }
  .encabezado-seleccion { align-items: start; flex-direction: column; }
  .partido-seleccion-hoy, .grilla-jornada-seleccion, .grilla-convocatorias-seleccion { grid-template-columns: 1fr; }
  .lista-agenda-seleccion > li, .lista-calendario-completa > li { grid-template-columns: 1fr; align-items: start; gap: 8px; }
  .lista-resultados-seleccion > li { grid-template-columns: 1fr; }
  .lista-jugadores-seleccion ol { grid-template-columns: 1fr; }
}
</style>
