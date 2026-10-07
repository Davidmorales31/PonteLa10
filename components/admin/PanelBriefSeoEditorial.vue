<script setup lang="ts">
import { Check, LoaderCircle, Search } from '@lucide/vue'
import type { BriefSeoArticuloEditorial, IdPlantillaEditorial } from '~/types/contenidoEditorial'
import {
  esquemaBriefSeoArticulo,
  intencionesBusquedaEditoriales
} from '~/utils/editorial/briefSeo'
import { obtenerPlantillaEditorial } from '~/utils/editorial/plantillas'

const props = defineProps<{
  articuloId: string
  plantillaId: IdPlantillaEditorial | null
  camposCompletos: string[]
  deshabilitado?: boolean
  puedeConfirmarBrief?: boolean
}>()

const etiquetasIntencion: Record<typeof intencionesBusquedaEditoriales[number], string> = {
  actualidad: 'Actualidad',
  resultado: 'Resultado',
  transmision: 'Transmisión',
  calendario: 'Calendario',
  explicacion: 'Explicación',
  perfil: 'Perfil',
  analisis: 'Análisis',
  opinion: 'Opinión'
}

const valorVacio = (): BriefSeoArticuloEditorial => ({
  consultaObjetivo: null,
  intencionBusqueda: null,
  plantillaId: null,
  camposCompletos: [],
  clusterPrincipal: null,
  ventanaFrescuraDias: null,
  origenOportunidad: null,
  diferenciadorEditorial: null,
  estadoBrief: 'sin_guardar',
  confirmadoEn: null,
  actualizadoEn: null
})

const briefGuardado = ref<BriefSeoArticuloEditorial>(valorVacio())
const formulario = reactive({
  consultaObjetivo: '' as string | null,
  intencionBusqueda: null as BriefSeoArticuloEditorial['intencionBusqueda'],
  clusterPrincipal: '' as string | null,
  ventanaFrescuraDias: null as number | null,
  origenOportunidad: '' as string | null,
  diferenciadorEditorial: '' as string | null
})
const cargando = ref(false)
const guardando = ref(false)
const error = ref('')
const mensaje = ref('')
const datosBase = ref('')

const datosActuales = computed(() => ({
  consultaObjetivo: formulario.consultaObjetivo,
  intencionBusqueda: formulario.intencionBusqueda,
  clusterPrincipal: formulario.clusterPrincipal,
  ventanaFrescuraDias: formulario.ventanaFrescuraDias,
  origenOportunidad: formulario.origenOportunidad,
  diferenciadorEditorial: formulario.diferenciadorEditorial
}))
const datosNormalizados = computed(() => ({
  consultaObjetivo: formulario.consultaObjetivo?.trim() || null,
  intencionBusqueda: formulario.intencionBusqueda || null,
  clusterPrincipal: formulario.clusterPrincipal?.trim() || null,
  ventanaFrescuraDias: formulario.ventanaFrescuraDias,
  origenOportunidad: formulario.origenOportunidad?.trim() || null,
  diferenciadorEditorial: formulario.diferenciadorEditorial?.trim() || null
}))
const hayCambios = computed(() => JSON.stringify(datosNormalizados.value) !== datosBase.value)
const puedeGuardarPropuesta = computed(() => hayCambios.value || briefGuardado.value.estadoBrief !== 'propuesto')
const puedeConfirmar = computed(() => Boolean(props.puedeConfirmarBrief)
  && (hayCambios.value || briefGuardado.value.estadoBrief !== 'confirmado'))

function mostrarFechaConfirmacion(valor: string): string {
  return new Intl.DateTimeFormat('es-CO', {
    dateStyle: 'short',
    timeStyle: 'short',
    timeZone: 'America/Bogota'
  }).format(new Date(valor))
}

watch(() => props.articuloId, cargarBrief, { immediate: true })
watch(() => props.plantillaId, (id, anterior) => {
  const plantilla = obtenerPlantillaEditorial(id)
  if (plantilla) {
    formulario.intencionBusqueda = plantilla.intencion
    formulario.ventanaFrescuraDias = plantilla.frescuraDias
  } else if (anterior !== undefined && anterior !== null) {
    formulario.intencionBusqueda = null
    formulario.ventanaFrescuraDias = null
  }
})

function cargarFormulario(brief: BriefSeoArticuloEditorial) {
  briefGuardado.value = brief
  formulario.consultaObjetivo = brief.consultaObjetivo || ''
  formulario.intencionBusqueda = brief.intencionBusqueda
  formulario.clusterPrincipal = brief.clusterPrincipal || ''
  formulario.ventanaFrescuraDias = brief.ventanaFrescuraDias
  formulario.origenOportunidad = brief.origenOportunidad || ''
  formulario.diferenciadorEditorial = brief.diferenciadorEditorial || ''
  datosBase.value = JSON.stringify(datosNormalizados.value)
}

async function cargarBrief() {
  if (!props.articuloId) return
  cargando.value = true
  error.value = ''
  try {
    const brief = await $fetch<BriefSeoArticuloEditorial>(
      `/api/admin/contenidos/${encodeURIComponent(props.articuloId)}/brief-seo`
    )
    cargarFormulario(brief)
  } catch (errorPeticion: unknown) {
    error.value = obtenerMensajeError(errorPeticion)
  } finally {
    cargando.value = false
  }
}

async function guardar(estadoBrief: 'propuesto' | 'confirmado') {
  const resultado = esquemaBriefSeoArticulo.safeParse({
    ...datosActuales.value,
    plantillaId: props.plantillaId,
    camposCompletos: props.camposCompletos,
    estadoBrief
  })
  if (!resultado.success) {
    error.value = resultado.error.issues[0]?.message || 'Revisa los campos del brief.'
    return
  }

  guardando.value = true
  error.value = ''
  mensaje.value = ''
  try {
    const guardado = await $fetch<BriefSeoArticuloEditorial>(
      `/api/admin/contenidos/${encodeURIComponent(props.articuloId)}/brief-seo`,
      { method: 'PUT', body: resultado.data }
    )
    cargarFormulario(guardado)
    mensaje.value = estadoBrief === 'confirmado'
      ? 'Brief SEO confirmado por el equipo.'
      : 'Propuesta SEO guardada para revisión.'
  } catch (errorPeticion: unknown) {
    error.value = obtenerMensajeError(errorPeticion)
  } finally {
    guardando.value = false
  }
}

function obtenerMensajeError(errorPeticion: unknown): string {
  const dato = errorPeticion as { data?: { statusMessage?: string }, statusMessage?: string }
  return dato.data?.statusMessage || dato.statusMessage || 'No se pudo actualizar el brief SEO.'
}
</script>

<template>
  <section class="panel-brief-seo" aria-labelledby="titulo-brief-seo">
    <header class="cabecera-brief-seo">
      <div>
        <p class="etiqueta-panel">Enfoque de búsqueda</p>
        <h2 id="titulo-brief-seo">Brief SEO editorial</h2>
        <p>Guarda la intención y el aporte de esta pieza. No se publica este brief ni se exige una keyword para una noticia original.</p>
      </div>
      <Search aria-hidden="true" />
    </header>

    <p v-if="briefGuardado.estadoBrief === 'confirmado' && !hayCambios" class="estado-brief-seo confirmado" role="status">
      <Check aria-hidden="true" /> Confirmado por el equipo{{ briefGuardado.confirmadoEn ? ` · ${mostrarFechaConfirmacion(briefGuardado.confirmadoEn)}` : '' }}
    </p>
    <p v-else-if="briefGuardado.estadoBrief === 'propuesto'" class="estado-brief-seo propuesto">
      {{ hayCambios ? 'Hay cambios sin guardar.' : 'Propuesta pendiente de revisión humana.' }}
    </p>

    <p v-if="error" class="mensaje-error-brief-seo" role="alert">{{ error }}</p>
    <p v-else-if="mensaje" class="mensaje-exito-brief-seo" role="status">{{ mensaje }}</p>
    <p v-if="cargando" class="estado-carga-brief-seo" role="status"><LoaderCircle class="girando" aria-hidden="true" /> Cargando brief…</p>

    <div class="campos-brief-seo" :aria-busy="cargando || guardando">
      <label>
        Consulta objetivo <span>opcional</span>
        <input v-model="formulario.consultaObjetivo" type="text" maxlength="160" :disabled="deshabilitado || cargando || guardando" placeholder="Consulta observada o hipótesis editorial">
      </label>
      <label>
        Intención de búsqueda{{ plantillaId ? ' · definida por la plantilla' : '' }}
        <select v-model="formulario.intencionBusqueda" :disabled="deshabilitado || cargando || guardando || Boolean(plantillaId)">
          <option :value="null">Por definir</option>
          <option v-for="intencion in intencionesBusquedaEditoriales" :key="intencion" :value="intencion">{{ etiquetasIntencion[intencion] }}</option>
        </select>
      </label>
      <label>
        Cluster padre
        <input v-model="formulario.clusterPrincipal" type="text" maxlength="120" :disabled="deshabilitado || cargando || guardando" placeholder="Tema o grupo editorial relacionado">
      </label>
      <label>
        Ventana de frescura (días)
        <input v-model.number="formulario.ventanaFrescuraDias" type="number" min="0" max="3650" :disabled="deshabilitado || cargando || guardando" placeholder="0 = evergreen">
      </label>
      <label class="campo-ancho-brief-seo">
        Origen de la oportunidad
        <input v-model="formulario.origenOportunidad" type="text" maxlength="2048" :disabled="deshabilitado || cargando || guardando" placeholder="Tendencia, Search Console, calendario o encargo">
      </label>
      <label class="campo-ancho-brief-seo">
        Diferenciador editorial
        <textarea v-model="formulario.diferenciadorEditorial" rows="3" maxlength="500" :disabled="deshabilitado || cargando || guardando" placeholder="Qué contexto, fuente o respuesta propia aporta esta pieza" />
      </label>
    </div>

    <p class="ayuda-brief-seo">Las entidades principales y secundarias se gestionan abajo en “Entidades relacionadas”; cada propuesta requiere confirmación humana con permiso de aprobación cuando el artículo está en revisión. La consulta objetivo es opcional: una pieza original no queda bloqueada si no tiene keyword.</p>
    <div class="acciones-brief-seo">
      <button type="button" :disabled="deshabilitado || cargando || guardando || !puedeGuardarPropuesta" @click="guardar('propuesto')">
        {{ guardando ? 'Guardando…' : 'Guardar propuesta' }}
      </button>
      <button class="confirmar-brief-seo" type="button" :disabled="deshabilitado || cargando || guardando || !puedeConfirmar" @click="guardar('confirmado')">
        <Check aria-hidden="true" /> {{ guardando ? 'Guardando…' : 'Guardar y confirmar' }}
      </button>
    </div>
  </section>
</template>

<style scoped>
.panel-brief-seo { grid-column: 1 / -1; display: grid; gap: 16px; min-width: 0; border: 1px solid #dbe2ec; border-radius: 8px; background: #fff; padding: clamp(18px, 2.8vw, 28px); color: #13253d; }
.cabecera-brief-seo { display: flex; align-items: flex-start; justify-content: space-between; gap: 18px; }
.cabecera-brief-seo h2 { margin: 3px 0 6px; font-size: 1.2rem; }
.cabecera-brief-seo p:last-child { max-width: 760px; margin: 0; color: #586980; line-height: 1.5; }
.cabecera-brief-seo > svg { flex: 0 0 auto; width: 21px; height: 21px; color: #2476b8; }
.campos-brief-seo { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 14px; }
.campos-brief-seo label { display: grid; gap: 6px; color: #243a55; font-size: .83rem; font-weight: 750; }
.campos-brief-seo label > span { color: #718096; font-size: .74rem; font-weight: 500; }
.campos-brief-seo input, .campos-brief-seo select, .campos-brief-seo textarea { width: 100%; min-height: 42px; border: 1px solid #cbd5e1; border-radius: 6px; background: #fff; padding: 9px 11px; color: #13253d; font: inherit; font-weight: 450; }
.campos-brief-seo textarea { resize: vertical; }
.campo-ancho-brief-seo { grid-column: 1 / -1; }
.estado-brief-seo, .mensaje-error-brief-seo, .mensaje-exito-brief-seo, .estado-carga-brief-seo { display: flex; align-items: center; gap: 8px; margin: 0; border-radius: 6px; padding: 10px 12px; font-size: .82rem; }
.estado-brief-seo.confirmado, .mensaje-exito-brief-seo { background: #edf9f1; color: #13753a; }
.estado-brief-seo.propuesto, .estado-carga-brief-seo { background: #eef6fc; color: #36536f; }
.mensaje-error-brief-seo { background: #fff0f0; color: #9e2735; }
.estado-brief-seo svg, .estado-carga-brief-seo svg { flex: 0 0 16px; width: 16px; height: 16px; }
.ayuda-brief-seo { margin: 0; color: #586980; font-size: .82rem; line-height: 1.5; }
.acciones-brief-seo { display: flex; flex-wrap: wrap; gap: 9px; }
.acciones-brief-seo button { display: inline-flex; min-height: 40px; align-items: center; justify-content: center; gap: 7px; border: 1px solid #bed1e4; border-radius: 6px; background: #f3f8fc; padding: 8px 13px; color: #145996; font-size: .82rem; font-weight: 800; cursor: pointer; }
.acciones-brief-seo button.confirmar-brief-seo { border-color: #1769aa; background: #1769aa; color: #fff; }
.acciones-brief-seo button:disabled { cursor: not-allowed; opacity: .55; }
.acciones-brief-seo button:focus-visible { outline: 3px solid #6ccce7; outline-offset: 2px; }
.acciones-brief-seo svg { width: 16px; height: 16px; }
.girando { animation: rotar-brief-seo 1s linear infinite; }
@keyframes rotar-brief-seo { to { transform: rotate(360deg); } }
@media (max-width: 620px) { .campos-brief-seo { grid-template-columns: minmax(0, 1fr); } .campo-ancho-brief-seo { grid-column: auto; } .acciones-brief-seo button { flex: 1 1 100%; } }
</style>
