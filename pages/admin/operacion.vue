<script setup lang="ts">
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Clock3,
  LoaderCircle,
  RefreshCw,
  Server
} from '@lucide/vue'
import type { AccionEditorialCodex } from '~/server/utils/esquemasCodexEditorial'

type TipoRecursoObjetivo = 'article' | 'hub'

interface SaludOperativa {
  consultadoEn: string | null
  worker: { estado: string, ultimaSenalEn: string | null, antiguedadSegundos: number | null }
  ingestas: {
    enCola: number
    edadColaMasAntiguaSegundos: number | null
    procesando: number
    procesamientoConLeaseVencido: number
    evidenciaLista: number
    edadEvidenciaMasAntiguaSegundos: number | null
    ultimoFalloEn: string | null
    fallidas: number
  }
  codex: {
    ultimaCorrida: { estado: string, iniciadaEn: string | null, actualizadaEn: string | null, terminadaEn: string | null } | null
    corridasFallidas: number
    corridasParciales: number
    propuestasEnRevision: number
  }
  publicacion: { programadasVencidas: number, atrasoMasAntiguoSegundos: number | null }
  cron: { estado: string, disponible: boolean, configurado: boolean | null, iniciadaEn: string | null, terminadaEn: string | null }
}
interface OportunidadEstrategica {
  id: string
  categoriaId: string
  titulo: string
  intencion: string
  recommendedAction: AccionEditorialCodex
  targetResourceId: string | null
  targetResourceType: TipoRecursoObjetivo | null
  actionReason: string
  strategicScore: number
  scores: Record<string, number>
  actualizadoEn: string
  decision: {
    eventName: string
    action: AccionEditorialCodex
    targetResourceId: string | null
    targetResourceType: TipoRecursoObjetivo | null
    reason: string
    occurredAt: string
  } | null
}

interface RecursoObjetivo {
  id: string
  titulo: string
  slug?: string
}

interface PanelOportunidades {
  oportunidades: OportunidadEstrategica[]
  articulosObjetivo: RecursoObjetivo[]
  hubsObjetivo: RecursoObjetivo[]
}

interface FormularioDecision {
  accion: AccionEditorialCodex
  targetResourceId: string
  targetResourceType: TipoRecursoObjetivo | null
  razon: string
  error: string
  confirmacion: string
  guardando: boolean
}

definePageMeta({
  layout: 'admin',
  middleware: 'autenticacion-editorial',
  permisoEditorial: 'configuracion.ver'
})

useSeoMeta({ title: 'Operación editorial | Pont3la10', robots: 'noindex, nofollow' })

const { mostrarAlerta } = useAlertasEditoriales()
const {
  data: salud,
  status,
  error,
  refresh
} = await useFetch<SaludOperativa>('/api/admin/operacion')
const { tienePermiso } = useContextoEditorial()
const { data: panelOportunidades, refresh: recargarOportunidades } = await useFetch<PanelOportunidades>('/api/admin/operacion/oportunidades')
const oportunidades = computed(() => panelOportunidades.value?.oportunidades || [])
const articulosObjetivo = computed(() => panelOportunidades.value?.articulosObjetivo || [])
const hubsObjetivo = computed(() => panelOportunidades.value?.hubsObjetivo || [])
const formulariosDecision = reactive<Record<string, FormularioDecision>>({})

const opcionesAccion: { valor: AccionEditorialCodex, etiqueta: string }[] = [
  { valor: 'create_article', etiqueta: 'Crear artículo' },
  { valor: 'update_article', etiqueta: 'Actualizar artículo existente' },
  { valor: 'update_hub', etiqueta: 'Actualizar hub' },
  { valor: 'create_data_story', etiqueta: 'Crear historia de datos' },
  { valor: 'create_game_candidate', etiqueta: 'Registrar candidato de juego' },
  { valor: 'manual_review', etiqueta: 'Revisión manual / posponer' },
  { valor: 'discard', etiqueta: 'Descartar' }
]

watch(oportunidades, (lista) => {
  for (const oportunidad of lista) {
    if (formulariosDecision[oportunidad.id]) continue
    const decision = oportunidad.decision
    formulariosDecision[oportunidad.id] = {
      accion: decision?.action || oportunidad.recommendedAction,
      targetResourceId: decision?.targetResourceId || oportunidad.targetResourceId || '',
      targetResourceType: decision?.targetResourceType || oportunidad.targetResourceType,
      razon: decision?.reason || oportunidad.actionReason,
      error: '',
      confirmacion: '',
      guardando: false
    }
  }
}, { immediate: true })

function etiquetaAccion(accion: AccionEditorialCodex): string {
  return opcionesAccion.find(opcion => opcion.valor === accion)?.etiqueta || 'Revisar acción'
}

function cambiarAccion(oportunidad: OportunidadEstrategica, formulario: FormularioDecision) {
  if (formulario.accion === 'update_article') {
    formulario.targetResourceType = 'article'
    if (!articulosObjetivo.value.some(recurso => recurso.id === formulario.targetResourceId)) {
      formulario.targetResourceId = ''
    }
  } else if (formulario.accion === 'update_hub') {
    formulario.targetResourceType = 'hub'
    if (!hubsObjetivo.value.some(recurso => recurso.id === formulario.targetResourceId)) {
      formulario.targetResourceId = ''
    }
  } else {
    formulario.targetResourceType = null
    formulario.targetResourceId = ''
  }
  formulario.error = ''
  formulario.confirmacion = ''
}

function recursosDisponibles(accion: AccionEditorialCodex): RecursoObjetivo[] {
  if (accion === 'update_article') return articulosObjetivo.value
  if (accion === 'update_hub') return hubsObjetivo.value
  return []
}

function rutaTarget(oportunidad: OportunidadEstrategica): string | null {
  const formulario = formulariosDecision[oportunidad.id]
  if (!formulario) return null
  if (formulario.accion === 'update_article') {
    const articulo = articulosObjetivo.value.find(recurso => recurso.id === formulario.targetResourceId)
    return articulo?.slug && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(articulo.slug)
      ? `/articulos/${articulo.slug}`
      : null
  }
  if (formulario.accion === 'update_hub') {
    const hub = hubsObjetivo.value.find(recurso => recurso.id === formulario.targetResourceId)
    return hub?.slug && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(hub.slug)
      ? `/${hub.slug}`
      : null
  }
  return null
}

function etiquetaBotonPrincipal(accion: AccionEditorialCodex): string {
  if (accion === 'create_article' || accion === 'create_data_story') {
    return tienePermiso('contenido.crear') ? 'Crear borrador' : 'Confirmar acción'
  }
  if (accion === 'create_game_candidate') return 'Registrar candidato de juego'
  if (accion === 'manual_review') return 'Posponer'
  if (accion === 'discard') return 'Confirmar descarte'
  return 'Confirmar actualización'
}

async function guardarDecision(
  oportunidad: OportunidadEstrategica,
  accion: AccionEditorialCodex = formulariosDecision[oportunidad.id].accion
) {
  const formulario = formulariosDecision[oportunidad.id]
  formulario.accion = accion
  cambiarAccion(oportunidad, formulario)
  if (formulario.razon.trim().length < 20) {
    formulario.error = 'Explica la decisión con al menos 20 caracteres.'
    return
  }
  const accionAnterior = oportunidad.decision?.action || oportunidad.recommendedAction
  const targetAnterior = oportunidad.decision?.targetResourceId || oportunidad.targetResourceId
  const tipoAnterior = oportunidad.decision?.targetResourceType || oportunidad.targetResourceType
  const motivoAnterior = oportunidad.decision?.reason || oportunidad.actionReason
  const cambiaLaDecision = accion !== accionAnterior
    || formulario.targetResourceId !== (targetAnterior || '')
    || formulario.targetResourceType !== tipoAnterior
  if (cambiaLaDecision && formulario.razon.trim() === motivoAnterior.trim()) {
    formulario.error = 'Explica por qué cambias la acción o el recurso recomendado.'
    return
  }
  if (['update_article', 'update_hub'].includes(accion) && !formulario.targetResourceId) {
    formulario.error = accion === 'update_hub' && hubsObjetivo.value.length === 0
      ? 'Aún no existe un catálogo de hubs disponible para elegir un destino válido.'
      : 'Elige un recurso publicado que exista.'
    return
  }

  formulario.error = ''
  formulario.confirmacion = ''
  formulario.guardando = true
  let registrada = false
  try {
    await $fetch(`/api/admin/operacion/oportunidades/${oportunidad.id}/decision`, {
      method: 'PUT',
      body: {
        action: accion,
        targetResourceId: formulario.targetResourceId || null,
        targetResourceType: formulario.targetResourceType,
        reason: formulario.razon.trim()
      }
    })
    registrada = true
    formulario.confirmacion = 'Decisión registrada; no se modificó el estado editorial del contenido.'
  } catch (errorPeticion: unknown) {
    const errorConDatos = errorPeticion as { data?: { statusMessage?: string }, statusMessage?: string }
    formulario.error = errorConDatos.data?.statusMessage
      || errorConDatos.statusMessage
      || 'No se pudo registrar la decisión. Revisa el estado y vuelve a intentar.'
  } finally {
    formulario.guardando = false
  }

  if (!registrada) return
  try {
    await recargarOportunidades()
  } catch {
    formulario.confirmacion = 'Decisión registrada; la lista no pudo actualizarse. Usa Actualizar para verla.'
  }

  if ((accion === 'create_article' || accion === 'create_data_story')
    && tienePermiso('contenido.crear')) {
    await navigateTo({
      path: '/admin/contenidos',
      query: {
        crearDesdeOportunidad: '1',
        tituloOportunidad: oportunidad.titulo,
        intencionOportunidad: oportunidad.intencion,
        categoriaOportunidad: oportunidad.categoriaId
      }
    })
  }
}

const alertasOperativas = computed(() => {
  if (!salud.value) return []
  const estado = salud.value
  const alertas: string[] = []
  if (estado.worker.estado !== 'activo') alertas.push(`Worker: ${estado.worker.estado}`)
  if (estado.ingestas.procesamientoConLeaseVencido > 0) alertas.push('Hay ingestas con lease vencido')
  if (estado.ingestas.fallidas > 0) alertas.push(`${estado.ingestas.fallidas} ingestas fallidas`)
  if (estado.publicacion.programadasVencidas > 0) alertas.push('Hay publicaciones programadas vencidas')
  if (estado.codex.corridasFallidas > 0) alertas.push('Hay corridas de Codex fallidas')
  if (['failed', 'extension_no_disponible', 'job_no_configurado', 'desconocido'].includes(estado.cron.estado)) {
    alertas.push(`Cron de publicación: ${etiquetaEstado(estado.cron.estado)}`)
  }
  return alertas
})

const huellaAlerta = computed(() => alertasOperativas.value.join('|'))
let ultimaHuellaNotificada = ''

function notificarIncidencias() {
  if (!import.meta.client || !huellaAlerta.value || huellaAlerta.value === ultimaHuellaNotificada) return
  ultimaHuellaNotificada = huellaAlerta.value
  mostrarAlerta({
    tipo: 'advertencia',
    titulo: 'Revisa la operación editorial',
    mensaje: alertasOperativas.value.join('. ') + '.'
  })
}

watch(huellaAlerta, notificarIncidencias, { immediate: true })
watch(error, (nuevoError) => {
  if (!nuevoError || !import.meta.client) return
  mostrarAlerta({
    tipo: 'error',
    titulo: 'Monitor no disponible',
    mensaje: 'Comprueba que la migración de salud esté aplicada y que el servidor tenga su configuración privada.'
  })
}, { immediate: true })

function etiquetaEstado(estado: string): string {
  const etiquetas: Record<string, string> = {
    activo: 'Activo', desconectado: 'Desconectado', detenido: 'Detenido',
    deteniendose: 'Deteniéndose', desconocido: 'Sin señal',
    in_progress: 'En curso', completed: 'Completada', partial: 'Parcial',
    failed: 'Fallida', succeeded: 'Correcta', sin_ejecuciones: 'Sin ejecuciones',
    extension_no_disponible: 'Extensión no disponible',
    job_no_configurado: 'Job no configurado', running: 'Ejecutándose'
  }
  return etiquetas[estado] || 'Sin señal'
}

function claseEstado(estado: string): string {
  return ['activo', 'completed', 'succeeded'].includes(estado)
    ? 'estado-salud estado-salud-ok'
    : ['partial', 'deteniendose', 'running', 'sin_ejecuciones'].includes(estado)
      ? 'estado-salud estado-salud-atencion'
      : 'estado-salud estado-salud-error'
}

function formatearFecha(valor: string | null): string {
  if (!valor) return 'Sin registro'
  return new Intl.DateTimeFormat('es-CO', {
    dateStyle: 'medium', timeStyle: 'short', timeZone: 'America/Bogota'
  }).format(new Date(valor))
}

function formatearEdad(segundos: number | null): string {
  if (segundos === null) return 'Sin actividad pendiente'
  if (segundos < 60) return `${segundos} s`
  const minutos = Math.floor(segundos / 60)
  if (minutos < 60) return `${minutos} min`
  const horas = Math.floor(minutos / 60)
  if (horas < 24) return `${horas} h ${minutos % 60} min`
  return `${Math.floor(horas / 24)} d ${horas % 24} h`
}

async function recargar() {
  await Promise.all([refresh(), recargarOportunidades()])
}
</script>

<template>
  <div class="vista-panel-editorial vista-operacion-editorial">
    <header class="titulo-vista-panel">
      <div>
        <p class="etiqueta-panel">HU-ED-13 · Operación y decisiones</p>
        <h1>Operación editorial</h1>
        <p>Worker, ingestas, corridas de Codex y recomendaciones. Las decisiones quedan auditadas; nunca aprueban ni publican contenido.</p>
      </div>
      <button class="accion-panel-secundaria" type="button" :disabled="status === 'pending'" @click="recargar">
        <LoaderCircle v-if="status === 'pending'" class="icono-girando" aria-hidden="true" />
        <RefreshCw v-else aria-hidden="true" />
        <span>Actualizar</span>
      </button>
    </header>

    <section v-if="status === 'pending' && !salud" class="estado-operacion-cargando" role="status">
      <LoaderCircle class="icono-girando" aria-hidden="true" /> Consultando estado seguro…
    </section>
    <section v-else-if="error" class="aviso-panel aviso-panel-error" role="alert">
      <AlertTriangle aria-hidden="true" />
      <div>
        <strong>No se pudo consultar la operación</strong>
        <span>Verifica que la migración HU-ED-13 esté aplicada y que el servidor tenga configurado el acceso privado.</span>
      </div>
      <button type="button" @click="recargar">Reintentar</button>
    </section>

    <template v-else-if="salud">
      <section v-if="alertasOperativas.length" class="aviso-panel aviso-panel-atencion" role="status">
        <AlertTriangle aria-hidden="true" />
        <div>
          <strong>Hay puntos que requieren atención</strong>
          <span>{{ alertasOperativas.join(' · ') }}</span>
        </div>
      </section>
      <section v-else class="aviso-panel aviso-panel-operacion-ok" role="status">
        <CheckCircle2 aria-hidden="true" />
        <div><strong>Sin incidencias detectadas</strong><span>Última consulta: {{ formatearFecha(salud.consultadoEn) }}</span></div>
      </section>

      <section class="tarjetas-salud-operativa" aria-label="Estado operativo">
        <article class="tarjeta-salud-operativa">
          <header><Server aria-hidden="true" /><h2>Worker local</h2></header>
          <span :class="claseEstado(salud.worker.estado)">{{ etiquetaEstado(salud.worker.estado) }}</span>
          <dl><div><dt>Última señal</dt><dd>{{ formatearFecha(salud.worker.ultimaSenalEn) }}</dd></div></dl>
        </article>
        <article class="tarjeta-salud-operativa">
          <header><Activity aria-hidden="true" /><h2>Ingestas</h2></header>
          <dl>
            <div><dt>En cola</dt><dd>{{ salud.ingestas.enCola }} <small>· {{ formatearEdad(salud.ingestas.edadColaMasAntiguaSegundos) }}</small></dd></div>
            <div><dt>Procesando</dt><dd>{{ salud.ingestas.procesando }}</dd></div>
            <div><dt>Lease vencido</dt><dd>{{ salud.ingestas.procesamientoConLeaseVencido }}</dd></div>
            <div><dt>Evidencia lista</dt><dd>{{ salud.ingestas.evidenciaLista }} <small>· {{ formatearEdad(salud.ingestas.edadEvidenciaMasAntiguaSegundos) }}</small></dd></div>
            <div><dt>Fallidas</dt><dd>{{ salud.ingestas.fallidas }}</dd></div>
          </dl>
          <NuxtLink to="/admin/ingestas">Abrir ingestas</NuxtLink>
        </article>
        <article class="tarjeta-salud-operativa">
          <header><Clock3 aria-hidden="true" /><h2>Codex editorial</h2></header>
          <span :class="claseEstado(salud.codex.ultimaCorrida?.estado || 'desconocido')">
            {{ etiquetaEstado(salud.codex.ultimaCorrida?.estado || 'desconocido') }}
          </span>
          <dl>
            <div><dt>Última corrida</dt><dd>{{ formatearFecha(salud.codex.ultimaCorrida?.iniciadaEn || null) }}</dd></div>
            <div><dt>Fallidas / parciales</dt><dd>{{ salud.codex.corridasFallidas }} / {{ salud.codex.corridasParciales }}</dd></div>
            <div><dt>Borradores en revisión</dt><dd>{{ salud.codex.propuestasEnRevision }}</dd></div>
          </dl>
          <NuxtLink to="/admin/revision">Abrir revisión</NuxtLink>
        </article>
        <article class="tarjeta-salud-operativa">
          <header><Clock3 aria-hidden="true" /><h2>Publicación</h2></header>
          <dl>
            <div><dt>Programadas vencidas</dt><dd>{{ salud.publicacion.programadasVencidas }}</dd></div>
            <div><dt>Mayor atraso</dt><dd>{{ formatearEdad(salud.publicacion.atrasoMasAntiguoSegundos) }}</dd></div>
            <div><dt>Cron</dt><dd><span :class="claseEstado(salud.cron.estado)">{{ etiquetaEstado(salud.cron.estado) }}</span></dd></div>
            <div><dt>Última ejecución</dt><dd>{{ formatearFecha(salud.cron.terminadaEn || salud.cron.iniciadaEn) }}</dd></div>
          </dl>
        </article>
      </section>
      <section class="tarjeta-salud-operativa oportunidades-estrategicas" aria-labelledby="titulo-oportunidades">
        <header><Activity aria-hidden="true" /><h2 id="titulo-oportunidades">Oportunidades estratégicas</h2></header>
        <p>Ordenadas por Strategic Opportunity Score; confirmar una acción no aprueba ni publica contenido.</p>
        <p v-if="!oportunidades.length" class="estado-oportunidades-vacio">Todavía no hay recomendaciones editoriales registradas.</p>
        <ol v-else>
          <li v-for="oportunidad in oportunidades" :key="oportunidad.id" class="oportunidad-editorial">
            <div class="resumen-oportunidad">
              <div>
                <strong>{{ oportunidad.titulo }}</strong>
                <span>{{ oportunidad.intencion }} · {{ oportunidad.strategicScore }}/100</span>
                <small>Demanda {{ oportunidad.scores.searchDemand }} · vida útil {{ oportunidad.scores.lifespan }} · competencia {{ oportunidad.scores.competitionOpportunity }}</small>
              </div>
              <span v-if="oportunidad.decision" class="estado-accion-tomada" role="status">
                Acción tomada: {{ etiquetaAccion(oportunidad.decision.action) }}
              </span>
              <span v-else class="estado-accion-pendiente">Pendiente de decisión humana</span>
            </div>

            <p class="razon-recomendada"><strong>Recomendación:</strong> {{ etiquetaAccion(oportunidad.recommendedAction) }}. {{ oportunidad.actionReason }}</p>

            <fieldset v-if="tienePermiso('contenido.revisar') && formulariosDecision[oportunidad.id]" :disabled="formulariosDecision[oportunidad.id].guardando">
              <legend>Decisión editorial</legend>
              <label>
                <span>Acción final</span>
                <select v-model="formulariosDecision[oportunidad.id].accion" @change="cambiarAccion(oportunidad, formulariosDecision[oportunidad.id])">
                  <option
                    v-for="opcion in opcionesAccion"
                    :key="opcion.valor"
                    :value="opcion.valor"
                    :disabled="opcion.valor === 'update_hub' && hubsObjetivo.length === 0"
                  >
                    {{ opcion.etiqueta }}{{ opcion.valor === 'update_hub' && hubsObjetivo.length === 0 ? ' · catálogo aún no disponible' : '' }}
                  </option>
                </select>
              </label>

              <label v-if="['update_article', 'update_hub'].includes(formulariosDecision[oportunidad.id].accion)">
                <span>Recurso objetivo existente</span>
                <select
                  v-model="formulariosDecision[oportunidad.id].targetResourceId"
                  @change="formulariosDecision[oportunidad.id].error = ''; formulariosDecision[oportunidad.id].confirmacion = ''"
                >
                  <option value="">Selecciona un destino válido</option>
                  <option v-for="recurso in recursosDisponibles(formulariosDecision[oportunidad.id].accion)" :key="recurso.id" :value="recurso.id">
                    {{ recurso.titulo }}
                  </option>
                </select>
                <small v-if="formulariosDecision[oportunidad.id].accion === 'update_hub' && !hubsObjetivo.length">No hay hubs publicados en el catálogo disponible.</small>
              </label>

              <label>
                <span>Razón de la decisión</span>
                <textarea
                  v-model="formulariosDecision[oportunidad.id].razon"
                  rows="3"
                  minlength="20"
                  maxlength="600"
                  required
                  @input="formulariosDecision[oportunidad.id].error = ''; formulariosDecision[oportunidad.id].confirmacion = ''"
                />
                <small>De 20 a 600 caracteres. El descarte conserva esta explicación junto con el puntaje.</small>
              </label>

              <p v-if="formulariosDecision[oportunidad.id].error" class="error-decision-oportunidad" role="alert">
                {{ formulariosDecision[oportunidad.id].error }}
              </p>
              <p v-if="formulariosDecision[oportunidad.id].confirmacion" class="confirmacion-decision-oportunidad" role="status">
                {{ formulariosDecision[oportunidad.id].confirmacion }}
              </p>
              <div class="acciones-oportunidad">
                <NuxtLink v-if="rutaTarget(oportunidad)" :to="rutaTarget(oportunidad)!" target="_blank" rel="noopener noreferrer">
                  Abrir target
                </NuxtLink>
                <button type="button" class="boton-editorial-principal" @click="guardarDecision(oportunidad)">
                  {{ etiquetaBotonPrincipal(formulariosDecision[oportunidad.id].accion) }}
                </button>
                <button type="button" class="boton-editorial-secundario" @click="guardarDecision(oportunidad, 'discard')">
                  Descartar
                </button>
                <button type="button" class="boton-editorial-secundario" @click="guardarDecision(oportunidad, 'manual_review')">
                  Posponer
                </button>
              </div>
            </fieldset>
            <p v-else-if="!tienePermiso('contenido.revisar')" class="nota-solo-lectura">Tu cuenta puede consultar la recomendación, pero no registrar una decisión.</p>
          </li>
        </ol>
      </section>
      <p class="nota-operacion-editorial">Las horas se muestran en America/Bogota. La consulta no revela mensajes internos del Cron, IDs de instancia ni contenido de artículos.</p>
    </template>
  </div>
</template>

<style scoped>
.vista-operacion-editorial { display: grid; gap: 1.25rem; }
.vista-operacion-editorial > .titulo-vista-panel { display: flex; align-items: flex-start; justify-content: space-between; gap: 1rem; }
.vista-operacion-editorial h1 { margin: .15rem 0 .35rem; }
.vista-operacion-editorial .titulo-vista-panel p:last-child { max-width: 58rem; }
.estado-operacion-cargando { display: flex; align-items: center; gap: .7rem; padding: 1.25rem; border: 1px solid var(--borde-panel, #cbd5e1); border-radius: 1rem; }
.tarjetas-salud-operativa { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 1rem; }
.tarjeta-salud-operativa { display: grid; align-content: start; gap: .9rem; padding: 1.1rem; border: 1px solid var(--borde-panel, #cbd5e1); border-radius: 1rem; background: var(--superficie-panel, #fff); }
.tarjeta-salud-operativa header { display: flex; align-items: center; gap: .65rem; color: var(--texto-panel, #10243e); }
.oportunidades-estrategicas ol { display: grid; gap: .75rem; margin: 0; padding: 0; list-style: none; }
.oportunidades-estrategicas li { display: grid; gap: .8rem; padding: 1rem 0; border-top: 1px solid var(--borde-panel, #e2e8f0); }
.resumen-oportunidad { display: flex; align-items: flex-start; justify-content: space-between; gap: .8rem; }
.resumen-oportunidad > div { display: grid; gap: .2rem; }
.razon-recomendada, .estado-oportunidades-vacio, .nota-solo-lectura { margin: 0; color: var(--texto-secundario-panel, #64748b); }
.oportunidad-editorial fieldset { display: grid; gap: .75rem; min-width: 0; margin: 0; padding: .85rem; border: 1px solid var(--borde-panel, #cbd5e1); border-radius: .75rem; }
.oportunidad-editorial legend { padding: 0 .35rem; font-weight: 700; }
.oportunidad-editorial fieldset label { display: grid; gap: .35rem; }
.oportunidad-editorial fieldset label > span { font-weight: 650; }
.oportunidad-editorial fieldset select, .oportunidad-editorial fieldset textarea { width: 100%; border: 1px solid var(--borde-panel, #94a3b8); border-radius: .5rem; padding: .6rem .7rem; color: var(--texto-panel, #10243e); background: var(--superficie-panel, #fff); font: inherit; }
.oportunidad-editorial fieldset textarea { resize: vertical; }
.oportunidad-editorial fieldset small { color: var(--texto-secundario-panel, #64748b); }
.acciones-oportunidad { display: flex; flex-wrap: wrap; align-items: center; gap: .55rem; }
.acciones-oportunidad a { color: #087bc6; font-weight: 650; }
.acciones-oportunidad button { min-height: 2.5rem; }
.estado-accion-tomada, .estado-accion-pendiente { display: inline-flex; width: fit-content; border-radius: 999px; padding: .3rem .65rem; font-size: .8rem; font-weight: 700; }
.estado-accion-tomada { color: #08713f; background: #e3f6eb; }
.estado-accion-pendiente { color: #8a4b00; background: #fff1cc; }
.error-decision-oportunidad { margin: 0; color: #a32121; }
.confirmacion-decision-oportunidad { margin: 0; color: #08713f; }
.oportunidades-estrategicas small { color: var(--texto-secundario-panel, #64748b); }
.tarjeta-salud-operativa header svg { width: 1.2rem; height: 1.2rem; color: #0784dc; }
.tarjeta-salud-operativa h2 { margin: 0; font-size: 1.05rem; }
.tarjeta-salud-operativa dl { display: grid; gap: .55rem; margin: 0; }
.tarjeta-salud-operativa dl > div { display: flex; justify-content: space-between; align-items: baseline; gap: .7rem; border-bottom: 1px solid var(--borde-panel, #e2e8f0); padding-bottom: .4rem; }
.tarjeta-salud-operativa dt { color: var(--texto-secundario-panel, #64748b); }
.tarjeta-salud-operativa dd { margin: 0; text-align: right; color: var(--texto-panel, #10243e); font-weight: 650; }
.tarjeta-salud-operativa dd small { font-weight: 400; color: var(--texto-secundario-panel, #64748b); }
.tarjeta-salud-operativa > a { color: #087bc6; text-decoration: none; font-weight: 650; }
.estado-salud { display: inline-flex; width: fit-content; align-items: center; border-radius: 999px; padding: .3rem .65rem; font-size: .8rem; font-weight: 700; }
.estado-salud-ok { color: #08713f; background: #e3f6eb; }
.estado-salud-atencion { color: #8a4b00; background: #fff1cc; }
.estado-salud-error { color: #a32121; background: #fee7e7; }
.aviso-panel-operacion-ok { border-color: #9edbb8; background: #edfff4; }
.aviso-panel-operacion-ok > svg { color: #078447; }
.nota-operacion-editorial { margin: 0; color: var(--texto-secundario-panel, #64748b); font-size: .85rem; }
@media (max-width: 740px) {
  .vista-operacion-editorial > .titulo-vista-panel { flex-direction: column; }
  .tarjetas-salud-operativa { grid-template-columns: minmax(0, 1fr); }
}
</style>
