<script setup lang="ts">
import { AlertTriangle, ExternalLink, RefreshCw, Save } from '@lucide/vue'
import type {
  CandidatoPodaContenido,
  DecisionPodaContenido,
  ResultadoPodaContenido
} from '~/utils/editorial/podaContenido'

definePageMeta({
  layout: 'admin',
  middleware: 'autenticacion-editorial',
  permisoEditorial: 'contenido.revisar'
})

useSeoMeta({ title: 'Revisión de contenido | Pont3la10', robots: 'noindex, nofollow' })

type EstadoFiltro = 'todos' | 'pendientes' | 'revisados'
type DecisionSeleccionable = DecisionPodaContenido | ''

const etiquetasDecision: Record<DecisionPodaContenido, string> = {
  actualizar: 'Actualizar',
  fusionar: 'Evaluar fusión',
  mantener: 'Mantener',
  noindex: 'Proponer noindex',
  retirar_410: 'Proponer retirada 410',
  redirect: 'Proponer redirección'
}
const etiquetasSenal: Record<CandidatoPodaContenido['senales'][number]['tipo'], string> = {
  sin_enlaces: 'Sin enlaces internos',
  posible_duplicado: 'Posible duplicado',
  impresiones_cero: 'Cero impresiones documentadas',
  antiguedad: 'Sin actualización reciente',
  seo_incompleto: 'Metadatos incompletos'
}

const { data, status, error, refresh } = await useFetch<ResultadoPodaContenido>(
  '/api/admin/seo/poda-contenido',
  {
    key: 'admin-poda-contenido',
    default: (): ResultadoPodaContenido => ({
      candidatos: [],
      totalCandidatos: 0,
      candidatosLimitados: false,
      totalArticulosAnalizados: 0,
      coberturaCompleta: false,
      limiteArticulos: 1000,
      generadoEn: '',
      searchConsole: { estado: 'no_disponible', informesAnalizados: 0, filasCeroCubrenPeriodo: false }
    })
  }
)
const textoBusqueda = ref('')
const filtroEstado = ref<EstadoFiltro>('todos')
const decisionSeleccionada = reactive<Record<string, DecisionSeleccionable>>({})
const notaPorArticulo = reactive<Record<string, string>>({})
const destinoPorArticulo = reactive<Record<string, string>>({})
const guardando = reactive<Record<string, boolean>>({})
const mensajePorArticulo = reactive<Record<string, string>>({})
const errorPorArticulo = reactive<Record<string, string>>({})
const estaActualizando = computed(() => status.value === 'pending')

watch(() => data.value?.candidatos, (candidatos) => {
  for (const candidato of candidatos || []) {
    if (!(candidato.articleId in decisionSeleccionada)) {
      decisionSeleccionada[candidato.articleId] = candidato.decision?.decision || ''
      notaPorArticulo[candidato.articleId] = candidato.decision?.nota || ''
      destinoPorArticulo[candidato.articleId] = candidato.decision?.destinoInterno || ''
    }
  }
}, { immediate: true })

const candidatosFiltrados = computed(() => (data.value?.candidatos || []).filter((candidato) => {
  const coincideBusqueda = !textoBusqueda.value.trim()
    || `${candidato.titulo} ${candidato.slug} ${candidato.senales.map(senal => senal.detalle).join(' ')}`
      .toLocaleLowerCase('es-CO')
      .includes(textoBusqueda.value.trim().toLocaleLowerCase('es-CO'))
  const tieneDecision = Boolean(candidato.decision)
  const coincideEstado = filtroEstado.value === 'todos'
    || (filtroEstado.value === 'revisados' ? tieneDecision : !tieneDecision)
  return coincideBusqueda && coincideEstado
}))

function formatearFecha(fecha: string | null): string {
  if (!fecha) return 'Fecha no disponible'
  const valor = new Date(fecha)
  if (Number.isNaN(valor.getTime())) return 'Fecha no disponible'
  return new Intl.DateTimeFormat('es-CO', { dateStyle: 'medium', timeZone: 'America/Bogota' }).format(valor)
}

function requiereNota(decision: DecisionSeleccionable): boolean {
  return ['fusionar', 'noindex', 'retirar_410', 'redirect'].includes(decision)
}

function estadoSearchConsole(): string {
  switch (data.value?.searchConsole.estado) {
    case 'evidencia_disponible':
      return 'Se encontraron filas con cero impresiones explícitas y cobertura suficiente para revisarlas.'
    case 'sin_informes':
      return 'No hay informes importados. Las impresiones no se consideran cero ni se usan como señal.'
    case 'sin_evidencia_cero':
      return `Se revisaron ${data.value.searchConsole.informesAnalizados} informes, pero no hay filas explícitas con cero impresiones. La ausencia de filas no se interpreta como cero.`
    default:
      return 'Search Console no está disponible; no se infiere el rendimiento de búsqueda.'
  }
}

function mostrarError(valor: unknown): string {
  const dato = valor as { statusMessage?: string, data?: { statusMessage?: string } }
  return dato.data?.statusMessage || dato.statusMessage || 'No se pudo cargar la revisión editorial.'
}

async function guardarDecision(candidato: CandidatoPodaContenido) {
  const decision = decisionSeleccionada[candidato.articleId]
  if (!decision) {
    errorPorArticulo[candidato.articleId] = 'Selecciona una decisión para continuar.'
    return
  }
  guardando[candidato.articleId] = true
  errorPorArticulo[candidato.articleId] = ''
  mensajePorArticulo[candidato.articleId] = ''
  try {
    await $fetch('/api/admin/seo/poda-contenido', {
      method: 'POST',
      body: {
        articleId: candidato.articleId,
        decision,
        nota: notaPorArticulo[candidato.articleId] || '',
        destinoInterno: decision === 'redirect' ? destinoPorArticulo[candidato.articleId] || '' : ''
      }
    })
    mensajePorArticulo[candidato.articleId] = 'Plan guardado. No se aplicó a la URL pública.'
    await refresh()
  } catch (error) {
    errorPorArticulo[candidato.articleId] = mostrarError(error)
  } finally {
    guardando[candidato.articleId] = false
  }
}
</script>

<template>
  <div class="vista-panel-editorial vista-poda-contenido">
    <header class="cabecera-poda-contenido">
      <div>
        <p class="etiqueta-panel">SEO editorial · HU-ED-29</p>
        <h1>Revisión de contenido</h1>
        <p>Detecta señales verificables para decidir qué revisar. La antigüedad, por sí sola, no convierte una noticia en contenido obsoleto.</p>
      </div>
      <button class="boton-editorial-secundario" type="button" :disabled="estaActualizando" @click="refresh()">
        <RefreshCw :class="{ 'girando-poda': estaActualizando }" aria-hidden="true" />
        Actualizar análisis
      </button>
    </header>

    <p class="aviso-seguridad-poda">
      <AlertTriangle aria-hidden="true" />
      Las decisiones quedan como planes editoriales auditables: no cambian el contenido, noindex, canonicals, redirecciones, sitemap ni estado HTTP. No se elimina ni se desindexa nada automáticamente.
    </p>

    <section class="resumen-poda-contenido" aria-label="Cobertura de la revisión">
      <article><strong>{{ data?.totalArticulosAnalizados || 0 }}</strong><span>Artículos publicados analizados</span></article>
      <article><strong>{{ data?.totalCandidatos || 0 }}</strong><span>Candidatos con señales</span></article>
      <article><strong>{{ data?.candidatos.filter(candidato => candidato.decision).length || 0 }}</strong><span>Con plan editorial guardado</span></article>
    </section>

    <p class="estado-search-console-poda" role="status">{{ estadoSearchConsole() }}</p>
    <p v-if="!data?.coberturaCompleta" class="aviso-cobertura-poda" role="status">
      La evaluación llegó al límite de artículos, relaciones internas o filas de Search Console. No tomes la lista como un inventario completo.
    </p>
    <p v-if="data?.candidatosLimitados" class="aviso-cobertura-poda" role="status">
      Hay {{ data.totalCandidatos }} candidatos; se muestran los primeros {{ data.candidatos.length }}, ordenados por las señales acumuladas.
    </p>

    <section v-if="error" class="estado-error-poda" role="alert">
      <h2>No fue posible completar el análisis</h2>
      <p>{{ mostrarError(error) }}</p>
      <button class="boton-editorial-secundario" type="button" @click="refresh()">Intentar de nuevo</button>
    </section>

    <template v-else>
      <section class="controles-poda-contenido" aria-label="Filtrar candidatos">
        <label>
          Buscar por título, URL o señal
          <input v-model="textoBusqueda" type="search" autocomplete="off" placeholder="Ej. noticia, enlace, duplicado">
        </label>
        <label>
          Estado de revisión
          <select v-model="filtroEstado">
            <option value="todos">Todos</option>
            <option value="pendientes">Sin decisión guardada</option>
            <option value="revisados">Con plan guardado</option>
          </select>
        </label>
        <span>{{ candidatosFiltrados.length }} de {{ data?.candidatos.length || 0 }} en pantalla</span>
      </section>

      <div v-if="estaActualizando && !data?.generadoEn" class="cargando-poda-contenido" role="status">
        <RefreshCw class="girando-poda" aria-hidden="true" /> Analizando publicaciones y enlaces internos…
      </div>
      <p v-else-if="!candidatosFiltrados.length" class="vacio-poda-contenido">
        No hay candidatos que coincidan con el filtro. Esto no equivale a una confirmación automática de calidad o vigencia.
      </p>

      <ol v-else class="lista-candidatos-poda">
        <li v-for="candidato in candidatosFiltrados" :key="candidato.articleId" class="tarjeta-candidato-poda">
          <header class="cabecera-candidato-poda">
            <div>
              <p>Prioridad de revisión: {{ candidato.puntuacion }}</p>
              <h2>{{ candidato.titulo }}</h2>
              <a :href="candidato.ruta" target="_blank" rel="noopener noreferrer">
                {{ candidato.ruta }} <ExternalLink aria-hidden="true" />
              </a>
            </div>
            <span v-if="candidato.decision" class="insignia-plan-poda">{{ etiquetasDecision[candidato.decision.decision] }}</span>
            <span v-else class="insignia-pendiente-poda">Pendiente de decisión</span>
          </header>

          <p class="fechas-candidato-poda">
            Publicado: {{ formatearFecha(candidato.publicadoEn) }}
            <span aria-hidden="true">·</span>
            Última versión pública: {{ formatearFecha(candidato.ultimaVersionPublicadaEn) }}
            <span aria-hidden="true">·</span>
            Enlaces internos entrantes: {{ candidato.enlacesEntrantes }}
          </p>

          <ul class="senales-candidato-poda" aria-label="Señales verificadas">
            <li v-for="senal in candidato.senales" :key="senal.tipo">
              <strong>{{ etiquetasSenal[senal.tipo] }}</strong>
              <span>{{ senal.detalle }}</span>
            </li>
          </ul>

          <p v-if="candidato.articuloSimilar" class="pareja-duplicado-poda">
            Comparar con:
            <a :href="`/articulos/${candidato.articuloSimilar.slug}`" target="_blank" rel="noopener noreferrer">
              {{ candidato.articuloSimilar.titulo }} <ExternalLink aria-hidden="true" />
            </a>
          </p>

          <form class="formulario-decision-poda" @submit.prevent="guardarDecision(candidato)">
            <label>
              Plan editorial
              <select v-model="decisionSeleccionada[candidato.articleId]" required>
                <option value="" disabled>Selecciona una opción</option>
                <option v-for="(etiqueta, decision) in etiquetasDecision" :key="decision" :value="decision">{{ etiqueta }}</option>
              </select>
            </label>
            <label v-if="decisionSeleccionada[candidato.articleId] === 'redirect'">
              Ruta interna propuesta
              <input v-model="destinoPorArticulo[candidato.articleId]" type="text" maxlength="240" placeholder="/articulos/nota-destino" required>
            </label>
            <label class="campo-nota-poda">
              Justificación {{ requiereNota(decisionSeleccionada[candidato.articleId]) ? '(obligatoria)' : '(opcional)' }}
              <textarea
                v-model="notaPorArticulo[candidato.articleId]"
                maxlength="500"
                rows="2"
                :required="requiereNota(decisionSeleccionada[candidato.articleId])"
                placeholder="Registra contexto y qué debería verificar el equipo."
              />
            </label>
            <div class="acciones-decision-poda">
              <a :href="`/admin/contenidos/${candidato.articleId}`">Abrir en el editor</a>
              <button class="boton-editorial-principal" type="submit" :disabled="guardando[candidato.articleId] || !decisionSeleccionada[candidato.articleId]">
                <Save aria-hidden="true" />
                {{ guardando[candidato.articleId] ? 'Guardando…' : 'Guardar plan' }}
              </button>
            </div>
            <p v-if="errorPorArticulo[candidato.articleId]" class="mensaje-error-poda" role="alert">{{ errorPorArticulo[candidato.articleId] }}</p>
            <p v-else-if="mensajePorArticulo[candidato.articleId]" class="mensaje-exito-poda" role="status">{{ mensajePorArticulo[candidato.articleId] }}</p>
            <p v-if="candidato.decision" class="registro-decision-poda">
              Última revisión: {{ formatearFecha(candidato.decision.actualizadoEn) }}.
              <span v-if="candidato.decision.nota"> Nota: {{ candidato.decision.nota }}</span>
              <span v-if="candidato.decision.destinoInterno"> Destino propuesto: {{ candidato.decision.destinoInterno }}</span>
            </p>
          </form>
        </li>
      </ol>
    </template>
  </div>
</template>

<style scoped>
.vista-poda-contenido { display: grid; gap: 1rem; max-width: 1240px; margin-inline: auto; color: var(--texto-panel, #10243e); }
.cabecera-poda-contenido { display: flex; align-items: flex-start; justify-content: space-between; gap: 1rem; }
.cabecera-poda-contenido h1 { margin: .15rem 0 .35rem; }
.cabecera-poda-contenido p:last-child { max-width: 780px; margin: 0; color: var(--texto-secundario-panel, #64748b); line-height: 1.5; }
.cabecera-poda-contenido button { flex: 0 0 auto; }
.cabecera-poda-contenido button svg, .formulario-decision-poda button svg { width: 1rem; height: 1rem; }
.aviso-seguridad-poda, .estado-search-console-poda, .aviso-cobertura-poda { margin: 0; border: 1px solid var(--borde-panel, #dbe3ed); border-radius: .8rem; padding: .85rem 1rem; background: var(--superficie-panel, #fff); color: var(--texto-panel, #10243e); line-height: 1.5; }
.aviso-seguridad-poda, .aviso-cobertura-poda { display: flex; align-items: flex-start; gap: .6rem; border-color: #e8cb83; background: color-mix(in srgb, #fff8e8 72%, var(--superficie-panel, #fff)); color: var(--texto-panel, #10243e); font-size: .87rem; }
.aviso-seguridad-poda svg { flex: 0 0 1rem; width: 1rem; height: 1rem; margin-top: .1rem; }
.resumen-poda-contenido { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: .8rem; }
.resumen-poda-contenido article { display: grid; gap: .25rem; min-height: 5rem; align-content: center; border: 1px solid var(--borde-panel, #dbe3ed); border-radius: .8rem; padding: .9rem 1rem; background: var(--superficie-panel, #fff); }
.resumen-poda-contenido strong { font-size: 1.35rem; font-variant-numeric: tabular-nums; }
.resumen-poda-contenido span, .estado-search-console-poda { color: var(--texto-secundario-panel, #64748b); font-size: .86rem; }
.controles-poda-contenido { display: grid; grid-template-columns: minmax(15rem, 1.3fr) minmax(12rem, .8fr) auto; align-items: end; gap: .8rem; border: 1px solid var(--borde-panel, #dbe3ed); border-radius: .8rem; padding: 1rem; background: var(--superficie-panel, #fff); }
.controles-poda-contenido label, .formulario-decision-poda label { display: grid; gap: .35rem; color: var(--texto-panel, #10243e); font-size: .82rem; font-weight: 700; }
.controles-poda-contenido input, .controles-poda-contenido select, .formulario-decision-poda input, .formulario-decision-poda select, .formulario-decision-poda textarea { width: 100%; min-width: 0; border: 1px solid var(--borde-panel, #cbd5e1); border-radius: .55rem; padding: .55rem .65rem; background: var(--superficie-panel, #fff); color: var(--texto-panel, #10243e); font: inherit; font-weight: 450; }
.controles-poda-contenido input, .controles-poda-contenido select, .formulario-decision-poda input, .formulario-decision-poda select { min-height: 2.6rem; }
.controles-poda-contenido > span { color: var(--texto-secundario-panel, #64748b); font-size: .78rem; }
.lista-candidatos-poda { display: grid; gap: .9rem; margin: 0; padding: 0; list-style: none; }
.tarjeta-candidato-poda { display: grid; gap: .8rem; min-width: 0; border: 1px solid var(--borde-panel, #dbe3ed); border-radius: .9rem; padding: clamp(.9rem, 2vw, 1.2rem); background: var(--superficie-panel, #fff); }
.cabecera-candidato-poda { display: flex; align-items: flex-start; justify-content: space-between; gap: .8rem; }
.cabecera-candidato-poda > div { display: grid; gap: .3rem; min-width: 0; }
.cabecera-candidato-poda p, .fechas-candidato-poda, .pareja-duplicado-poda, .registro-decision-poda { margin: 0; color: var(--texto-secundario-panel, #64748b); font-size: .8rem; line-height: 1.5; }
.cabecera-candidato-poda p { color: #087bc6; font-weight: 750; }
.cabecera-candidato-poda h2 { margin: 0; font-size: 1.05rem; overflow-wrap: anywhere; }
.cabecera-candidato-poda a, .pareja-duplicado-poda a, .acciones-decision-poda > a { display: inline-flex; align-items: center; gap: .3rem; max-width: 100%; color: #087bc6; text-decoration: none; overflow-wrap: anywhere; }
.cabecera-candidato-poda a:hover, .pareja-duplicado-poda a:hover, .acciones-decision-poda > a:hover { text-decoration: underline; }
.cabecera-candidato-poda a svg, .pareja-duplicado-poda a svg { width: .85rem; height: .85rem; flex: 0 0 auto; }
.insignia-plan-poda, .insignia-pendiente-poda { flex: 0 0 auto; border-radius: 999px; padding: .32rem .6rem; font-size: .74rem; font-weight: 750; }
.insignia-plan-poda { background: #e7f5ec; color: #17613b; }
.insignia-pendiente-poda { background: #fff5dc; color: #77540b; }
.fechas-candidato-poda { display: flex; flex-wrap: wrap; gap: .3rem; }
.senales-candidato-poda { display: grid; gap: .45rem; margin: 0; padding: 0; list-style: none; }
.senales-candidato-poda li { display: grid; gap: .2rem; border-radius: .55rem; padding: .6rem .7rem; background: var(--superficie-secundaria-panel, #f5f7fa); color: var(--texto-secundario-panel, #64748b); font-size: .8rem; line-height: 1.45; }
.senales-candidato-poda strong { color: var(--texto-panel, #10243e); }
.formulario-decision-poda { display: grid; grid-template-columns: minmax(13rem, .75fr) minmax(14rem, 1fr); align-items: end; gap: .7rem; border-top: 1px solid var(--borde-panel, #e2e8f0); padding-top: .85rem; }
.formulario-decision-poda .campo-nota-poda { grid-column: 1 / -1; }
.formulario-decision-poda textarea { resize: vertical; }
.acciones-decision-poda { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: .7rem; grid-column: 1 / -1; }
.acciones-decision-poda > a { font-size: .82rem; font-weight: 700; }
.formulario-decision-poda button { display: inline-flex; align-items: center; justify-content: center; gap: .45rem; min-height: 2.5rem; }
.mensaje-error-poda, .mensaje-exito-poda, .registro-decision-poda { grid-column: 1 / -1; margin: 0; font-size: .8rem; line-height: 1.45; }
.mensaje-error-poda { color: #a32938; }
.mensaje-exito-poda { color: #17613b; }
.cargando-poda-contenido, .vacio-poda-contenido, .estado-error-poda { border: 1px solid var(--borde-panel, #dbe3ed); border-radius: .8rem; padding: 1rem; background: var(--superficie-panel, #fff); color: var(--texto-secundario-panel, #64748b); }
.cargando-poda-contenido { display: flex; align-items: center; gap: .5rem; }
.cargando-poda-contenido svg { width: 1rem; height: 1rem; }
.estado-error-poda h2 { margin: 0 0 .4rem; color: var(--texto-panel, #10243e); font-size: 1rem; }
.estado-error-poda p { margin: 0 0 .8rem; }
.girando-poda { animation: girar-poda .8s linear infinite; }
@keyframes girar-poda { to { transform: rotate(360deg); } }
@media (max-width: 740px) {
  .cabecera-poda-contenido { flex-direction: column; }
  .resumen-poda-contenido { grid-template-columns: 1fr; }
  .controles-poda-contenido { grid-template-columns: 1fr; }
  .formulario-decision-poda { grid-template-columns: 1fr; }
  .formulario-decision-poda .campo-nota-poda { grid-column: auto; }
  .cabecera-candidato-poda { flex-direction: column; }
  .insignia-plan-poda, .insignia-pendiente-poda { order: -1; }
}
@media (prefers-reduced-motion: reduce) {
  .girando-poda { animation: none; }
}
</style>
