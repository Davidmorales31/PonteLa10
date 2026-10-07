<script setup lang="ts">
import { CheckCircle2, ExternalLink, FileSpreadsheet, LoaderCircle, RefreshCw, Save, Upload } from '@lucide/vue'
import {
  accionesSearchConsole,
  accionesOportunidadSearchConsole,
  claveFilaSearchConsole,
  clasificarOportunidadesSearchConsole,
  type AccionSearchConsole,
  type FilaSearchConsole,
  type TendenciaSearchConsole
} from '~/utils/editorial/searchConsole'

interface DecisionSearchConsole {
  action: AccionSearchConsole
  note: string | null
  changed_at: string
}

interface FilaConAccion extends FilaSearchConsole {
  tendencia: TendenciaSearchConsole | null
  accion: AccionSearchConsole | null
  notaAccion: string | null
  accionActualizadaEn: string | null
  historialAcciones: DecisionSearchConsole[]
}

interface RespuestaSearchConsole {
  informes: Array<{
    id: string
    fechaDesde: string
    fechaHasta: string
    importadoEn: string
    cantidadFilas: number
  }>
  periodoActual: { fechaDesde: string, fechaHasta: string, cantidadFilas: number } | null
  periodoComparacion: { fechaDesde: string, fechaHasta: string } | null
  tendenciaDisponible: boolean
  historialCargado: number
  historialTotal: number
  historialLimitado: boolean
  filas: FilaConAccion[]
}

interface FormularioAccion {
  accion: AccionSearchConsole | ''
  nota: string
}

const etiquetasAccion: Record<AccionSearchConsole, string> = {
  optimizar: 'Optimizar página',
  actualizar: 'Actualizar contenido',
  consolidar: 'Consolidar páginas',
  ignorar: 'Ignorar oportunidad',
  mejorar_titulo: 'Mejorar título',
  ampliar_respuesta: 'Ampliar respuesta',
  fusionar: 'Fusionar con otra página',
  no_actuar: 'No actuar por ahora'
}

definePageMeta({
  layout: 'admin',
  middleware: 'autenticacion-editorial',
  permisoEditorial: 'contenido.verBorradores'
})

useSeoMeta({
  title: 'Oportunidades orgánicas | Pont3la10',
  robots: 'noindex, nofollow'
})

const { tienePermiso, contextoEditorial } = useContextoEditorial()
const puedeRegistrarAcciones = computed(() =>
  tienePermiso('contenido.editarTodos') && contextoEditorial.value?.nivelAal === 'aal2'
)
const { data: datos, status, error, refresh } = await useFetch<RespuestaSearchConsole>(
  '/api/admin/search-console'
)

const fechaDesde = ref('')
const fechaHasta = ref('')
const fechaMaxima = ref('')
const archivo = ref<File | null>(null)
const filtro = ref('')
const paginaActual = ref(1)
const mensajeImportacion = ref('')
const errorImportacion = ref('')
const guardandoClave = ref('')
const mensajeAccion = ref('')
const errorAccion = ref('')
const formulariosAccion = reactive<Record<string, FormularioAccion>>({})
const tamanoPagina = 50
const oportunidades = computed(() => clasificarOportunidadesSearchConsole(
  datos.value?.filas || [],
  Boolean(datos.value?.tendenciaDisponible)
))

const filasFiltradas = computed(() => {
  const termino = filtro.value.trim().toLocaleLowerCase('es-CO')
  const filas = oportunidades.value
  if (!termino) return filas
  return filas.filter(fila =>
    fila.consulta.toLocaleLowerCase('es-CO').includes(termino)
    || fila.paginaUrl.toLocaleLowerCase('es-CO').includes(termino)
  )
})

const paginasTotales = computed(() => Math.max(1, Math.ceil(filasFiltradas.value.length / tamanoPagina)))
const filasDePagina = computed(() => {
  const inicio = (paginaActual.value - 1) * tamanoPagina
  return filasFiltradas.value.slice(inicio, inicio + tamanoPagina)
})

const resumen = computed(() => {
  const filas = filasFiltradas.value
  const clics = filas.reduce((total, fila) => total + fila.clics, 0)
  const impresiones = filas.reduce((total, fila) => total + fila.impresiones, 0)
  const sumaPosiciones = filas.reduce((total, fila) => total + fila.posicion * fila.impresiones, 0)
  return {
    clics,
    impresiones,
    ctr: impresiones > 0 ? (clics / impresiones) * 100 : 0,
    posicion: impresiones > 0 ? sumaPosiciones / impresiones : 0
  }
})

const resumenOportunidades = computed(() => ({
  alta: oportunidades.value.filter(fila => fila.prioridad === 'Alta').length,
  media: oportunidades.value.filter(fila => fila.prioridad === 'Media').length,
  canibalizacion: oportunidades.value.filter(fila => fila.paginasConsulta > 1).length,
  sinComparacion: oportunidades.value.filter(fila => fila.posibleEmergente).length
}))

const diasPeriodo = computed(() => {
  const periodo = datos.value?.periodoActual
  if (!periodo) return null
  return Math.round((Date.parse(`${periodo.fechaHasta}T00:00:00Z`)
    - Date.parse(`${periodo.fechaDesde}T00:00:00Z`)) / 86_400_000) + 1
})

const etiquetaVentanaTendencia = computed(() => {
  if (!diasPeriodo.value) return 'Tendencia'
  if (diasPeriodo.value === 7 || diasPeriodo.value === 28) return `Tendencia ${diasPeriodo.value} días`
  return `Tendencia · ${diasPeriodo.value} días importados`
})

const puedeImportar = computed(() =>
  puedeRegistrarAcciones.value
  && Boolean(archivo.value)
  && Boolean(fechaDesde.value)
  && Boolean(fechaHasta.value)
)

watch(filtro, () => { paginaActual.value = 1 })
watch(paginasTotales, (total) => {
  if (paginaActual.value > total) paginaActual.value = total
})
watch(() => datos.value?.filas, (filas) => {
  for (const fila of filas || []) {
    const clave = claveFilaSearchConsole(fila)
    formulariosAccion[clave] ||= {
      accion: fila.accion || '',
      nota: fila.notaAccion || ''
    }
  }
}, { immediate: true })

onMounted(() => {
  const hoy = fechaBogota(new Date())
  fechaMaxima.value = hoy
  const ayer = desplazarFecha(hoy, -1)
  fechaHasta.value = ayer
  fechaDesde.value = desplazarFecha(ayer, -27)
})

function fechaBogota(fecha: Date): string {
  const partes = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Bogota',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).formatToParts(fecha)
  const parte = (tipo: string) => partes.find(item => item.type === tipo)?.value || ''
  return parte('year') + '-' + parte('month') + '-' + parte('day')
}

function desplazarFecha(valor: string, dias: number): string {
  const fecha = new Date(valor + 'T00:00:00Z')
  fecha.setUTCDate(fecha.getUTCDate() + dias)
  return fecha.toISOString().slice(0, 10)
}

function seleccionarArchivo(evento: Event) {
  errorImportacion.value = ''
  mensajeImportacion.value = ''
  const entrada = evento.target as HTMLInputElement
  const seleccionado = entrada.files?.[0] || null
  if (seleccionado && seleccionado.size > 1_500_000) {
    archivo.value = null
    entrada.value = ''
    errorImportacion.value = 'El CSV debe pesar 1.5 MB o menos.'
    return
  }
  archivo.value = seleccionado
}

async function importarInforme() {
  if (!puedeImportar.value || !archivo.value) return
  errorImportacion.value = ''
  mensajeImportacion.value = ''
  try {
    const respuesta = await $fetch<{ rowCount: number }>('/api/admin/search-console/importar', {
      method: 'POST',
      body: {
        fechaDesde: fechaDesde.value,
        fechaHasta: fechaHasta.value,
        csv: await archivo.value.text()
      }
    })
    mensajeImportacion.value = 'Informe importado: ' + respuesta.rowCount.toLocaleString('es-CO') + ' filas.'
    archivo.value = null
    const inputArchivo = document.querySelector<HTMLInputElement>('#archivo-search-console')
    if (inputArchivo) inputArchivo.value = ''
    await refresh()
  } catch (error: unknown) {
    errorImportacion.value = mensajeError(error, 'No se pudo importar el CSV. Revisa las fechas y el formato.')
  }
}

function formularioDe(fila: FilaConAccion): FormularioAccion {
  const clave = claveFilaSearchConsole(fila)
  formulariosAccion[clave] ||= { accion: fila.accion || '', nota: fila.notaAccion || '' }
  return formulariosAccion[clave]
}

function actualizarAccion(fila: FilaConAccion, evento: Event) {
  formularioDe(fila).accion = (evento.target as HTMLSelectElement).value as AccionSearchConsole | ''
}

function actualizarNota(fila: FilaConAccion, evento: Event) {
  formularioDe(fila).nota = (evento.target as HTMLInputElement).value
}

function puedeGuardarFila(fila: FilaConAccion): boolean {
  const formulario = formularioDe(fila)
  return puedeRegistrarAcciones.value
    && Boolean(formulario.accion)
    && !(['consolidar', 'fusionar'].includes(formulario.accion) && !formulario.nota.trim())
}

async function guardarAccion(fila: FilaConAccion) {
  const clave = claveFilaSearchConsole(fila)
  const formulario = formularioDe(fila)
  if (!puedeRegistrarAcciones.value || !formulario.accion) return
  guardandoClave.value = clave
  mensajeAccion.value = ''
  errorAccion.value = ''
  try {
    await $fetch('/api/admin/search-console/acciones', {
      method: 'POST',
      body: {
        consulta: fila.consulta,
        paginaUrl: fila.paginaUrl,
        accion: formulario.accion,
        nota: formulario.nota.trim() || null
      }
    })
    mensajeAccion.value = 'Decisión guardada. No modifica ni publica la página.'
    await refresh()
  } catch (error: unknown) {
    errorAccion.value = mensajeError(error, 'No se pudo guardar la decisión editorial.')
  } finally {
    guardandoClave.value = ''
  }
}

function mensajeError(error: unknown, alternativa: string): string {
  if (typeof error === 'object' && error && 'data' in error) {
    const datosError = (error as { data?: { statusMessage?: string } }).data
    if (datosError?.statusMessage) return datosError.statusMessage
  }
  if (error instanceof Error && error.message) return error.message
  return alternativa
}

function formatearNumero(valor: number): string {
  return new Intl.NumberFormat('es-CO', { maximumFractionDigits: 0 }).format(valor)
}

function formatearDecimal(valor: number, digitos = 1): string {
  return new Intl.NumberFormat('es-CO', {
    minimumFractionDigits: digitos,
    maximumFractionDigits: digitos
  }).format(valor)
}

function formatearFecha(valor: string): string {
  const fecha = new Date(valor + 'T12:00:00-05:00')
  return new Intl.DateTimeFormat('es-CO', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'America/Bogota'
  }).format(fecha)
}

function formatearFechaHora(valor: string | undefined): string {
  if (!valor) return 'Hora de importación no disponible'
  return new Intl.DateTimeFormat('es-CO', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'America/Bogota'
  }).format(new Date(valor))
}

function formatearTendencia(tendencia: TendenciaSearchConsole | null): string {
  if (!tendencia) return 'Sin período anterior comparable'
  const clicsPorcentaje = tendencia.cambioClicsPorcentaje === null
    ? ' (sin base previa)'
    : ' (' + formatearDecimal(tendencia.cambioClicsPorcentaje) + ' %)'
  const impresionesPorcentaje = tendencia.cambioImpresionesPorcentaje === null
    ? ' (sin base previa)'
    : ' (' + formatearDecimal(tendencia.cambioImpresionesPorcentaje) + ' %)'
  const clics = (tendencia.cambioClics > 0 ? '+' : '')
    + formatearNumero(tendencia.cambioClics) + clicsPorcentaje
  const impresiones = (tendencia.cambioImpresiones > 0 ? '+' : '')
    + formatearNumero(tendencia.cambioImpresiones) + impresionesPorcentaje
  const posicion = tendencia.cambioPosicion < 0
    ? 'mejoró ' + formatearDecimal(Math.abs(tendencia.cambioPosicion))
    : tendencia.cambioPosicion > 0
      ? 'bajó ' + formatearDecimal(tendencia.cambioPosicion)
      : 'sin cambio de posición'
  return clics + ' clics · ' + impresiones + ' impresiones · ' + posicion
}

function etiquetaTendencia(fila: FilaConAccion): string {
  if (fila.tendencia) return formatearTendencia(fila.tendencia)
  return datos.value?.tendenciaDisponible
    ? 'Sin datos de esta consulta en el período anterior'
    : 'Sin período anterior comparable'
}

function textoPeriodo(inicio: string, fin: string): string {
  return formatearFecha(inicio) + ' – ' + formatearFecha(fin)
}

const columnasAccion = accionesOportunidadSearchConsole.map(valor => ({
  valor,
  etiqueta: etiquetasAccion[valor]
}))

const columnasAccionAnterior = accionesSearchConsole
  .filter((valor) => !accionesOportunidadSearchConsole.includes(valor as typeof accionesOportunidadSearchConsole[number]))
  .map(valor => ({ valor, etiqueta: etiquetasAccion[valor] }))
</script>

<template>
  <div class="vista-panel-editorial vista-search-console">
    <header class="titulo-vista-panel">
      <div>
        <p class="etiqueta-panel">HU-GRO-04 · oportunidades orgánicas</p>
        <h1>Oportunidades orgánicas</h1>
        <p>Prioriza páginas que ya reciben impresiones y registra decisiones editoriales sin crear contenido automáticamente.</p>
      </div>
      <button class="accion-panel-secundaria" type="button" :disabled="status === 'pending'" @click="refresh()">
        <LoaderCircle v-if="status === 'pending'" class="icono-girando" aria-hidden="true" />
        <RefreshCw v-else aria-hidden="true" />
        <span>Actualizar</span>
      </button>
    </header>

    <section class="aviso-panel aviso-panel-informativo">
      <FileSpreadsheet aria-hidden="true" />
      <div>
        <strong>Datos de una exportación de Search Console</strong>
        <span>Este panel no inventa métricas ni se conecta a una propiedad inexistente. Exporta un reporte que incluya consultas y páginas; las métricas se guardan de forma privada.</span>
        <a href="https://search.google.com/search-console" target="_blank" rel="noopener noreferrer">
          Abrir Search Console <ExternalLink aria-hidden="true" />
        </a>
      </div>
    </section>

    <section class="bloque-search-console" aria-labelledby="titulo-importar-gsc">
      <div class="cabecera-bloque-search-console">
        <div>
          <p class="etiqueta-panel">Importación privada</p>
          <h2 id="titulo-importar-gsc">Cargar rendimiento del sitio</h2>
        </div>
        <span class="estado-permiso-search-console">
          {{ puedeRegistrarAcciones ? 'MFA verificado' : 'Solo lectura · MFA requerido para importar' }}
        </span>
      </div>
      <p>El CSV debe incluir, en la misma fila, Consulta/Query y Página/Page, además de clics, impresiones y posición. Los informes de consultas y páginas por separado no se pueden cruzar con seguridad. El rango debe coincidir con las fechas elegidas; los datos recientes pueden tardar en consolidarse en Google.</p>

      <form class="formulario-importacion-search-console" @submit.prevent="importarInforme">
        <label>
          <span>Desde</span>
          <input v-model="fechaDesde" type="date" required :max="fechaHasta || undefined">
        </label>
        <label>
          <span>Hasta</span>
          <input v-model="fechaHasta" type="date" required :min="fechaDesde || undefined" :max="fechaMaxima || undefined">
        </label>
        <label class="campo-archivo-search-console">
          <span>Archivo CSV · máximo 1.5 MB y 5.000 filas</span>
          <input
            id="archivo-search-console"
            type="file"
            accept=".csv,text/csv"
            :disabled="!puedeRegistrarAcciones"
            @change="seleccionarArchivo"
          >
        </label>
        <button class="boton-editorial-principal" type="submit" :disabled="!puedeImportar || status === 'pending'">
          <LoaderCircle v-if="status === 'pending'" class="icono-girando" aria-hidden="true" />
          <Upload v-else aria-hidden="true" />
          <span>Importar CSV</span>
        </button>
      </form>

      <p v-if="archivo" class="archivo-seleccionado-search-console" role="status">
        Archivo listo: {{ archivo.name }} · {{ formatearNumero(archivo.size) }} bytes
      </p>
      <p v-if="mensajeImportacion" class="aviso-panel aviso-panel-operacion-ok" role="status">
        <CheckCircle2 aria-hidden="true" /><span>{{ mensajeImportacion }}</span>
      </p>
      <p v-if="errorImportacion" class="aviso-panel aviso-panel-error" role="alert">{{ errorImportacion }}</p>
    </section>

    <section v-if="error" class="aviso-panel aviso-panel-error" role="alert">
      <div>
        <strong>No se pudieron cargar los informes</strong>
        <span>Revisa que estén aplicadas las migraciones HU-ED-21/HU-GRO-04 y que tu cuenta tenga permiso para ver borradores.</span>
      </div>
    </section>

    <section v-else-if="status === 'pending' && !datos" class="estado-search-console" role="status">
      <LoaderCircle class="icono-girando" aria-hidden="true" /> Cargando informes privados…
    </section>

    <template v-else-if="datos?.periodoActual">
      <section class="resumen-search-console" aria-label="Resumen del período">
        <article><span>Impresiones</span><strong>{{ formatearNumero(resumen.impresiones) }}</strong></article>
        <article><span>Clics</span><strong>{{ formatearNumero(resumen.clics) }}</strong></article>
        <article><span>CTR agregado</span><strong>{{ formatearDecimal(resumen.ctr) }} %</strong></article>
        <article><span>Posición ponderada</span><strong>{{ formatearDecimal(resumen.posicion, 2) }}</strong></article>
      </section>

      <section class="resumen-oportunidades-search-console" aria-label="Señales de oportunidad">
        <article><span>Prioridad alta</span><strong>{{ formatearNumero(resumenOportunidades.alta) }}</strong></article>
        <article><span>Prioridad media</span><strong>{{ formatearNumero(resumenOportunidades.media) }}</strong></article>
        <article><span>Consultas en varias páginas</span><strong>{{ formatearNumero(resumenOportunidades.canibalizacion) }}</strong></article>
        <article><span>Posibles emergentes por ausencia</span><strong>{{ formatearNumero(resumenOportunidades.sinComparacion) }}</strong></article>
      </section>

      <section class="bloque-search-console">
        <div class="cabecera-bloque-search-console resultados-search-console">
          <div>
            <p class="etiqueta-panel">Reporte más reciente · {{ etiquetaVentanaTendencia.replace('Tendencia', '').trim() }}</p>
            <h2>{{ textoPeriodo(datos.periodoActual.fechaDesde, datos.periodoActual.fechaHasta) }}</h2>
            <p>
              {{ datos.periodoActual.cantidadFilas.toLocaleString('es-CO') }} consultas/páginas
              · importado {{ formatearFechaHora(datos.informes[0]?.importadoEn) }}
              <template v-if="datos.periodoComparacion">
                · comparación {{ textoPeriodo(datos.periodoComparacion.fechaDesde, datos.periodoComparacion.fechaHasta) }}
              </template>
              <template v-else>· importa el período anterior equivalente para activar tendencias</template>
            </p>
          </div>
          <label class="filtro-search-console">
            <span>Buscar consulta o URL</span>
            <input v-model="filtro" type="search" placeholder="Ej. Liga BetPlay">
          </label>
        </div>

        <p v-if="mensajeAccion" class="aviso-panel aviso-panel-operacion-ok" role="status">
          <CheckCircle2 aria-hidden="true" /><span>{{ mensajeAccion }}</span>
        </p>
        <p v-if="errorAccion" class="aviso-panel aviso-panel-error" role="alert">{{ errorAccion }}</p>
        <p v-if="datos.historialLimitado" class="aviso-panel aviso-panel-informativo" role="status">
          <span>Se cargaron las últimas {{ formatearNumero(datos.historialCargado) }} de {{ formatearNumero(datos.historialTotal) }} decisiones. Las anteriores siguen conservadas; esta vista muestra hasta 5.000 por carga.</span>
        </p>

        <div class="tabla-search-console" role="region" aria-label="Consultas orgánicas importadas" tabindex="0">
          <table>
            <thead>
              <tr>
                <th scope="col">Consulta y página</th>
                <th scope="col">Cluster</th>
                <th scope="col">Entidad de la URL</th>
                <th scope="col">Prioridad y señal</th>
                <th scope="col">Recomendación</th>
                <th scope="col">Impresiones</th>
                <th scope="col">Clics</th>
                <th scope="col">CTR</th>
                <th scope="col">Posición</th>
                <th scope="col">Tendencia</th>
                <th scope="col">Acción editorial</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="fila in filasDePagina" :key="claveFilaSearchConsole(fila)">
                <td class="celda-consulta-search-console">
                  <strong>{{ fila.consulta }}</strong>
                  <a :href="fila.paginaUrl" target="_blank" rel="noopener noreferrer">
                    {{ fila.paginaUrl.replace(/^https?:\/\/(www\.)?pont3la10\.com/, '') || '/' }}
                    <ExternalLink aria-hidden="true" />
                  </a>
                </td>
                <td>{{ fila.cluster }}</td>
                <td>{{ fila.entidad }}</td>
                <td class="celda-prioridad-search-console">
                  <span :class="`insignia-prioridad-search-console prioridad-${fila.prioridad.toLocaleLowerCase('es-CO')}`">
                    {{ fila.prioridad }}
                  </span>
                  <small v-for="motivo in fila.motivos" :key="motivo">{{ motivo }}</small>
                </td>
                <td class="celda-recomendacion-search-console">{{ fila.recomendacion }}</td>
                <td>{{ formatearNumero(fila.impresiones) }}</td>
                <td>{{ formatearNumero(fila.clics) }}</td>
                <td>{{ formatearDecimal(fila.ctr) }} %</td>
                <td>{{ formatearDecimal(fila.posicion, 2) }}</td>
                <td class="celda-tendencia-search-console" :title="etiquetaTendencia(fila)">
                  <strong>{{ etiquetaVentanaTendencia }}</strong>
                  {{ etiquetaTendencia(fila) }}
                </td>
                <td class="celda-accion-search-console">
                  <label>
                    <span class="solo-lectores-pantalla">Acción editorial para {{ fila.consulta }}</span>
                    <select
                      :value="formularioDe(fila).accion"
                      :disabled="!puedeRegistrarAcciones"
                      @change="actualizarAccion(fila, $event)"
                    >
                      <option value="">Elegir acción</option>
                      <option v-for="accion in columnasAccion" :key="accion.valor" :value="accion.valor">
                        {{ accion.etiqueta }}
                      </option>
                      <optgroup v-if="columnasAccionAnterior.length" label="Decisiones de ED-21 anteriores">
                        <option v-for="accion in columnasAccionAnterior" :key="accion.valor" :value="accion.valor">
                          {{ accion.etiqueta }}
                        </option>
                      </optgroup>
                    </select>
                  </label>
                  <label>
                    <span class="solo-lectores-pantalla">Nota editorial para {{ fila.consulta }}</span>
                    <input
                      :value="formularioDe(fila).nota"
                      type="text"
                      maxlength="500"
                      :placeholder="['consolidar', 'fusionar'].includes(formularioDe(fila).accion) ? 'URL de la página destino' : 'Nota opcional'"
                      :disabled="!puedeRegistrarAcciones"
                      @input="actualizarNota(fila, $event)"
                    >
                  </label>
                  <button
                    class="accion-panel-secundaria boton-guardar-search-console"
                    type="button"
                    :disabled="!puedeGuardarFila(fila) || guardandoClave === claveFilaSearchConsole(fila)"
                    @click="guardarAccion(fila)"
                  >
                    <LoaderCircle v-if="guardandoClave === claveFilaSearchConsole(fila)" class="icono-girando" aria-hidden="true" />
                    <Save v-else aria-hidden="true" />
                    <span>Guardar</span>
                  </button>
                  <small v-if="fila.accion">Guardada: {{ etiquetasAccion[fila.accion] }}</small>
                  <details v-if="fila.historialAcciones.length" class="historial-search-console">
                    <summary>Historial ({{ fila.historialAcciones.length }})</summary>
                    <ol>
                      <li v-for="(decision, indice) in fila.historialAcciones" :key="`${decision.changed_at}-${indice}`">
                        <strong>{{ etiquetasAccion[decision.action] }}</strong>
                        <time :datetime="decision.changed_at">{{ formatearFechaHora(decision.changed_at) }}</time>
                        <span v-if="decision.note">{{ decision.note }}</span>
                      </li>
                    </ol>
                  </details>
                </td>
              </tr>
              <tr v-if="!filasDePagina.length">
                <td colspan="11" class="sin-filas-search-console">
                  {{ filtro ? 'No hay resultados para esta búsqueda.' : 'El informe no contiene consultas para mostrar.' }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <footer class="pie-tabla-search-console">
          <span>{{ filasFiltradas.length.toLocaleString('es-CO') }} resultados</span>
          <div>
            <button type="button" class="accion-panel-secundaria" :disabled="paginaActual <= 1" @click="paginaActual--">Anterior</button>
            <span>Página {{ paginaActual }} de {{ paginasTotales }}</span>
            <button type="button" class="accion-panel-secundaria" :disabled="paginaActual >= paginasTotales" @click="paginaActual++">Siguiente</button>
          </div>
        </footer>
      </section>

      <p class="nota-search-console">
        Cluster y entidad se derivan de la ruta de la página. Las señales de CTR alto/bajo se comparan con la distribución del mismo informe; “sin fila comparable” puede deberse a que Search Console exportó solo sus consultas principales y no confirma por sí sola que la consulta sea nueva. La asociación siempre conserva la URL existente.
      </p>
    </template>

    <section v-else-if="!error" class="estado-search-console estado-vacio-search-console">
      <FileSpreadsheet aria-hidden="true" />
      <div>
        <h2>Aún no hay informes importados</h2>
        <p>Exporta desde Search Console un CSV de rendimiento con consultas y páginas, y cárgalo arriba. No se muestra información de ejemplo.</p>
      </div>
    </section>

    <p class="nota-search-console">
      Las acciones quedan como recomendaciones privadas del equipo. No cambian artículos ni títulos automáticamente y nunca publican contenido.
    </p>
  </div>
</template>

<style scoped>
.vista-search-console { display: grid; gap: 1.1rem; }
.vista-search-console > .titulo-vista-panel { display: flex; align-items: flex-start; justify-content: space-between; gap: 1rem; }
.vista-search-console h1 { margin: .15rem 0 .35rem; }
.vista-search-console h2 { margin: 0; color: var(--texto-panel, #10243e); font-size: 1.12rem; }
.aviso-panel-informativo { border-color: #8cc8ef; background: var(--superficie-panel, #f0f8ff); }
.aviso-panel-informativo > svg { flex: 0 0 auto; color: #087bc6; }
.aviso-panel-informativo > div { display: grid; gap: .35rem; }
.aviso-panel-informativo a { display: inline-flex; align-items: center; gap: .35rem; width: fit-content; color: #087bc6; font-weight: 700; }
.aviso-panel-informativo a svg, .celda-consulta-search-console a svg { width: .9rem; height: .9rem; }
.bloque-search-console { display: grid; gap: .9rem; min-width: 0; padding: 1.15rem; border: 1px solid var(--borde-panel, #cbd5e1); border-radius: 1rem; background: var(--superficie-panel, #fff); }
.bloque-search-console > p { margin: 0; color: var(--texto-secundario-panel, #64748b); }
.cabecera-bloque-search-console { display: flex; align-items: flex-start; justify-content: space-between; gap: 1rem; }
.cabecera-bloque-search-console > div { display: grid; gap: .35rem; }
.cabecera-bloque-search-console p { margin: 0; color: var(--texto-secundario-panel, #64748b); }
.estado-permiso-search-console { flex: 0 0 auto; border-radius: 999px; padding: .35rem .7rem; color: #12532f; background: #e3f6eb; font-size: .78rem; font-weight: 700; }
.formulario-importacion-search-console { display: grid; grid-template-columns: repeat(2, minmax(9rem, 1fr)) auto; align-items: end; gap: .8rem; }
.formulario-importacion-search-console label, .filtro-search-console { display: grid; gap: .35rem; color: var(--texto-panel, #10243e); font-size: .85rem; font-weight: 650; }
.formulario-importacion-search-console input, .filtro-search-console input, .celda-accion-search-console input, .celda-accion-search-console select { min-width: 0; min-height: 2.55rem; border: 1px solid var(--borde-panel, #cbd5e1); border-radius: .55rem; padding: .45rem .6rem; color: var(--texto-panel, #10243e); background: var(--superficie-panel, #fff); }
.formulario-importacion-search-console .campo-archivo-search-console { grid-column: 1 / 3; }
.formulario-importacion-search-console .boton-editorial-principal { min-height: 2.6rem; }
.archivo-seleccionado-search-console { color: var(--texto-secundario-panel, #64748b); font-size: .85rem; }
.resumen-search-console { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: .8rem; }
.resumen-search-console article { display: grid; gap: .3rem; padding: 1rem; border: 1px solid var(--borde-panel, #cbd5e1); border-radius: .85rem; background: var(--superficie-panel, #fff); }
.resumen-oportunidades-search-console { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: .8rem; }
.resumen-oportunidades-search-console article { display: grid; gap: .3rem; padding: .85rem 1rem; border: 1px solid var(--borde-panel, #cbd5e1); border-radius: .85rem; background: var(--superficie-panel, #fff); }
.resumen-oportunidades-search-console span { color: var(--texto-secundario-panel, #64748b); font-size: .82rem; }
.resumen-oportunidades-search-console strong { color: var(--texto-panel, #10243e); font-size: 1.2rem; font-variant-numeric: tabular-nums; }
.resumen-search-console span { color: var(--texto-secundario-panel, #64748b); font-size: .85rem; }
.resumen-search-console strong { color: var(--texto-panel, #10243e); font-size: 1.35rem; font-variant-numeric: tabular-nums; }
.resultados-search-console { align-items: end; }
.filtro-search-console { min-width: min(20rem, 42%); }
.tabla-search-console { width: 100%; overflow: auto; border: 1px solid var(--borde-panel, #dbe3ed); border-radius: .75rem; }
.tabla-search-console table { width: 100%; min-width: 1450px; border-collapse: collapse; color: var(--texto-panel, #10243e); font-size: .86rem; }
.tabla-search-console th, .tabla-search-console td { padding: .75rem; border-bottom: 1px solid var(--borde-panel, #e2e8f0); text-align: left; vertical-align: top; }
.tabla-search-console th { position: sticky; top: 0; z-index: 1; background: var(--superficie-panel, #f6f8fb); white-space: nowrap; }
.tabla-search-console td:not(.celda-consulta-search-console):not(.celda-tendencia-search-console):not(.celda-accion-search-console) { font-variant-numeric: tabular-nums; white-space: nowrap; }
.celda-consulta-search-console { min-width: 14rem; max-width: 22rem; }
.celda-consulta-search-console strong { display: block; overflow-wrap: anywhere; }
.celda-consulta-search-console a { display: inline-flex; align-items: center; gap: .25rem; max-width: 100%; margin-top: .25rem; overflow-wrap: anywhere; color: #087bc6; font-size: .8rem; }
.celda-prioridad-search-console { display: grid; min-width: 13rem; gap: .35rem; }
.celda-prioridad-search-console small { color: var(--texto-secundario-panel, #64748b); line-height: 1.35; }
.insignia-prioridad-search-console { width: fit-content; border-radius: 999px; padding: .2rem .55rem; font-size: .73rem; font-weight: 750; }
.prioridad-alta { color: #8b1e1e; background: #fee2e2; }
.prioridad-media { color: #854d0e; background: #fef3c7; }
.prioridad-baja { color: #166534; background: #dcfce7; }
.celda-recomendacion-search-console { min-width: 15rem; max-width: 22rem; white-space: normal; }
.celda-tendencia-search-console { min-width: 13rem; max-width: 19rem; color: var(--texto-secundario-panel, #64748b); font-size: .82rem; }
.celda-tendencia-search-console strong { display: block; color: var(--texto-panel, #10243e); font-size: .74rem; }
.celda-accion-search-console { display: grid; min-width: 18rem; gap: .4rem; }
.celda-accion-search-console label { display: grid; }
.celda-accion-search-console small { color: var(--texto-secundario-panel, #64748b); }
.historial-search-console { margin-top: .15rem; color: var(--texto-secundario-panel, #64748b); font-size: .78rem; }
.historial-search-console summary { width: fit-content; cursor: pointer; color: #087bc6; font-weight: 700; }
.historial-search-console ol { display: grid; gap: .45rem; margin: .5rem 0 0; padding-left: 1rem; }
.historial-search-console li { display: grid; gap: .1rem; }
.historial-search-console time { font-size: .72rem; }
.boton-guardar-search-console { justify-content: center; min-height: 2.25rem; }
.sin-filas-search-console { padding: 1.5rem !important; text-align: center !important; color: var(--texto-secundario-panel, #64748b); }
.pie-tabla-search-console { display: flex; align-items: center; justify-content: space-between; gap: .8rem; color: var(--texto-secundario-panel, #64748b); font-size: .85rem; }
.pie-tabla-search-console > div { display: flex; align-items: center; gap: .55rem; }
.pie-tabla-search-console button { min-height: 2.2rem; padding: .35rem .6rem; }
.estado-search-console { display: flex; align-items: center; gap: .7rem; padding: 1.25rem; border: 1px solid var(--borde-panel, #cbd5e1); border-radius: 1rem; background: var(--superficie-panel, #fff); color: var(--texto-secundario-panel, #64748b); }
.estado-vacio-search-console { align-items: flex-start; }
.estado-vacio-search-console > svg { flex: 0 0 auto; color: #087bc6; }
.estado-vacio-search-console h2 { margin-bottom: .35rem; }
.estado-vacio-search-console p { margin: 0; color: var(--texto-secundario-panel, #64748b); }
.nota-search-console { margin: 0; color: var(--texto-secundario-panel, #64748b); font-size: .85rem; }
.vista-search-console .aviso-panel { margin: 0; }
@media (max-width: 740px) {
  .vista-search-console > .titulo-vista-panel, .cabecera-bloque-search-console { flex-direction: column; align-items: stretch; }
  .formulario-importacion-search-console { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .formulario-importacion-search-console .campo-archivo-search-console { grid-column: 1 / -1; }
  .formulario-importacion-search-console .boton-editorial-principal { grid-column: 1 / -1; justify-content: center; }
  .resumen-search-console, .resumen-oportunidades-search-console { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .filtro-search-console { min-width: 0; width: 100%; }
  .pie-tabla-search-console { align-items: flex-start; flex-direction: column; }
  .pie-tabla-search-console > div { flex-wrap: wrap; }
}
</style>
