<script setup lang="ts">
import { BookOpenCheck, Check, LoaderCircle } from '@lucide/vue'
import type { BriefSeoArticuloEditorial, IdPlantillaEditorial } from '~/types/contenidoEditorial'
import {
  obtenerPlantillaEditorial,
  plantillasEditoriales
} from '~/utils/editorial/plantillas'

const props = defineProps<{
  articuloId: string
  modelValue: IdPlantillaEditorial | null
  camposCompletos: string[]
  deshabilitado?: boolean
}>()

const emitir = defineEmits<{
  'update:modelValue': [valor: IdPlantillaEditorial | null]
  'update:camposCompletos': [valor: string[]]
  insertarEstructura: [secciones: string[]]
}>()

const seleccion = ref<IdPlantillaEditorial | null>(props.modelValue)
const plantillaGuardada = ref<IdPlantillaEditorial | null>(props.modelValue)
const camposCompletos = ref<string[]>([...props.camposCompletos])
const camposGuardados = ref<string[]>([...props.camposCompletos])
const cargando = ref(false)
const guardando = ref(false)
const error = ref('')
const mensaje = ref('')
const plantillaActual = computed(() => obtenerPlantillaEditorial(seleccion.value))
const hayCambios = computed(() => seleccion.value !== plantillaGuardada.value
  || serializarCampos(camposCompletos.value) !== serializarCampos(camposGuardados.value))

watch(() => props.articuloId, cargarBrief, { immediate: true })
watch(() => props.modelValue, (valor) => {
  if (valor !== plantillaGuardada.value) {
    seleccion.value = valor
    plantillaGuardada.value = valor
    camposCompletos.value = [...props.camposCompletos]
    camposGuardados.value = [...props.camposCompletos]
  }
})
watch(() => props.camposCompletos, (valor) => {
  if (!hayCambios.value) {
    camposCompletos.value = [...valor]
    camposGuardados.value = [...valor]
  }
}, { deep: true })
watch(() => seleccion.value, (valor, anterior) => {
  if (anterior !== undefined && valor !== anterior) camposCompletos.value = []
}, { flush: 'sync' })

function serializarCampos(campos: string[]): string {
  return JSON.stringify([...campos].sort())
}

async function cargarBrief() {
  if (!props.articuloId) return
  cargando.value = true
  error.value = ''
  try {
    const brief = await $fetch<BriefSeoArticuloEditorial>(
      `/api/admin/contenidos/${encodeURIComponent(props.articuloId)}/brief-seo`
    )
    seleccion.value = brief.plantillaId
    plantillaGuardada.value = brief.plantillaId
    camposCompletos.value = [...brief.camposCompletos]
    camposGuardados.value = [...brief.camposCompletos]
    emitir('update:modelValue', brief.plantillaId)
    emitir('update:camposCompletos', [...brief.camposCompletos])
  } catch (errorPeticion: unknown) {
    error.value = obtenerMensajeError(errorPeticion)
  } finally {
    cargando.value = false
  }
}

async function guardarPlantilla() {
  if (props.deshabilitado || guardando.value || cargando.value) return
  guardando.value = true
  error.value = ''
  mensaje.value = ''
  try {
    const brief = await $fetch<BriefSeoArticuloEditorial>(
      `/api/admin/contenidos/${encodeURIComponent(props.articuloId)}/brief-seo/plantilla`,
      {
        method: 'PUT',
        body: {
          plantillaId: seleccion.value,
          camposCompletos: camposCompletos.value
        }
      }
    )
    seleccion.value = brief.plantillaId
    plantillaGuardada.value = brief.plantillaId
    camposCompletos.value = [...brief.camposCompletos]
    camposGuardados.value = [...brief.camposCompletos]
    emitir('update:modelValue', brief.plantillaId)
    emitir('update:camposCompletos', [...brief.camposCompletos])
    mensaje.value = brief.plantillaId
      ? 'Plantilla guardada. Su intención y ventana de frescura quedaron asociadas al brief.'
      : 'Plantilla retirada del brief editorial.'
  } catch (errorPeticion: unknown) {
    error.value = obtenerMensajeError(errorPeticion)
  } finally {
    guardando.value = false
  }
}

function insertarEstructura() {
  if (!plantillaActual.value || hayCambios.value || props.deshabilitado) return
  emitir('insertarEstructura', plantillaActual.value.secciones)
}

function obtenerMensajeError(errorPeticion: unknown): string {
  const dato = errorPeticion as { data?: { statusMessage?: string }, statusMessage?: string }
  return dato.data?.statusMessage || dato.statusMessage || 'No se pudo cargar la plantilla editorial.'
}
</script>

<template>
  <section class="panel-plantilla-editorial" aria-labelledby="titulo-plantilla-editorial">
    <header class="cabecera-plantilla-editorial">
      <div>
        <p class="etiqueta-panel">Estructura y control factual</p>
        <h2 id="titulo-plantilla-editorial">Plantilla editorial</h2>
        <p>Elige la intención que resuelve esta pieza. La plantilla nunca redacta hechos: solo propone secciones vacías y una lista de verificación.</p>
      </div>
      <BookOpenCheck aria-hidden="true" />
    </header>

    <label class="selector-plantilla-editorial" for="selector-plantilla-editorial">
      Tipo de pieza
      <select
        id="selector-plantilla-editorial"
        v-model="seleccion"
        :disabled="deshabilitado || cargando || guardando"
        aria-describedby="ayuda-plantilla-editorial"
      >
        <option :value="null">Sin plantilla</option>
        <option v-for="plantilla in plantillasEditoriales" :key="plantilla.id" :value="plantilla.id">
          {{ plantilla.nombre }}
        </option>
      </select>
    </label>
    <p id="ayuda-plantilla-editorial" class="ayuda-plantilla-editorial">
      La intención de búsqueda se guarda junto con la selección. Puedes cambiarla en el brief solo si retiras la plantilla.
    </p>

    <p v-if="cargando" class="estado-plantilla-editorial" role="status">
      <LoaderCircle class="girando" aria-hidden="true" /> Cargando la plantilla guardada…
    </p>
    <p v-if="error" class="mensaje-error-plantilla" role="alert">{{ error }}</p>
    <p v-else-if="mensaje" class="mensaje-exito-plantilla" role="status">
      <Check aria-hidden="true" /> {{ mensaje }}
    </p>

    <template v-if="plantillaActual">
      <p class="descripcion-plantilla-editorial">{{ plantillaActual.descripcion }}</p>

      <div class="detalle-plantilla-editorial">
        <section aria-labelledby="titulo-campos-minimos-plantilla">
          <h3 id="titulo-campos-minimos-plantilla">Campos que debe cubrir</h3>
          <p class="ayuda-verificacion-campos">Marca cada elemento solo después de cubrirlo en el texto con información respaldada.</p>
          <fieldset class="lista-campos-plantilla" :disabled="deshabilitado || cargando || guardando">
            <label v-for="campo in plantillaActual.camposMinimos" :key="campo">
              <input v-model="camposCompletos" type="checkbox" :value="campo">
              <span>{{ campo }}</span>
            </label>
          </fieldset>
          <p class="resumen-campos-plantilla" aria-live="polite">
            {{ camposCompletos.length }} de {{ plantillaActual.camposMinimos.length }} campos confirmados
          </p>
        </section>
        <section aria-labelledby="titulo-fuente-plantilla">
          <h3 id="titulo-fuente-plantilla">Fuente principal requerida</h3>
          <p>{{ plantillaActual.fuentePrincipal }}</p>
          <p class="nota-verificacion-plantilla">El sistema comprueba que se registre nombre y URL HTTPS; la revisión humana confirma que la fuente respalde los hechos.</p>
        </section>
      </div>

      <div class="secciones-plantilla-editorial">
        <h3>Estructura editable</h3>
        <ol>
          <li v-for="seccion in plantillaActual.secciones" :key="seccion">{{ seccion }}</li>
        </ol>
        <p>Al insertar, solo se agregan encabezados vacíos; no se genera contenido ni se completan datos ausentes.</p>
      </div>
    </template>

    <div class="acciones-plantilla-editorial">
      <button
        type="button"
        :disabled="deshabilitado || cargando || guardando || !hayCambios"
        @click="guardarPlantilla"
      >
        {{ guardando ? 'Guardando…' : seleccion ? 'Guardar plantilla' : 'Quitar plantilla' }}
      </button>
      <button
        v-if="plantillaActual"
        class="boton-estructura-plantilla"
        type="button"
        :disabled="deshabilitado || cargando || guardando || hayCambios"
        @click="insertarEstructura"
      >
        Agregar encabezados al documento
      </button>
    </div>
  </section>
</template>

<style scoped>
.panel-plantilla-editorial { display: grid; gap: 14px; min-width: 0; border: 1px solid #dbe2ec; border-radius: 8px; background: #fff; padding: clamp(18px, 2.8vw, 28px); color: #13253d; }
.cabecera-plantilla-editorial { display: flex; align-items: flex-start; justify-content: space-between; gap: 18px; }
.cabecera-plantilla-editorial h2 { margin: 3px 0 6px; font-size: 1.2rem; }
.cabecera-plantilla-editorial p:last-child { max-width: 760px; margin: 0; color: #586980; line-height: 1.5; }
.cabecera-plantilla-editorial > svg { flex: 0 0 auto; width: 21px; height: 21px; color: #2476b8; }
.selector-plantilla-editorial { display: grid; gap: 6px; color: #243a55; font-size: .83rem; font-weight: 750; }
.selector-plantilla-editorial select { width: 100%; min-height: 42px; border: 1px solid #cbd5e1; border-radius: 6px; background: #fff; padding: 9px 11px; color: #13253d; font: inherit; font-weight: 450; }
.ayuda-plantilla-editorial, .descripcion-plantilla-editorial, .nota-verificacion-plantilla, .secciones-plantilla-editorial > p { margin: 0; color: #586980; font-size: .82rem; line-height: 1.5; }
.descripcion-plantilla-editorial { color: #263b55; font-weight: 650; }
.detalle-plantilla-editorial { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 16px; }
.detalle-plantilla-editorial section, .secciones-plantilla-editorial { min-width: 0; border: 1px solid #e1e8f0; border-radius: 7px; padding: 14px; }
.detalle-plantilla-editorial h3, .secciones-plantilla-editorial h3 { margin: 0 0 8px; color: #1b3452; font-size: .9rem; }
.detalle-plantilla-editorial p, .secciones-plantilla-editorial ol { margin: 0; color: #40566f; font-size: .82rem; line-height: 1.55; }
.lista-campos-plantilla { display: grid; gap: 8px; margin: 10px 0 8px; border: 0; padding: 0; }
.lista-campos-plantilla label { display: flex; align-items: flex-start; gap: 8px; color: #40566f; font-size: .82rem; line-height: 1.45; cursor: pointer; }
.lista-campos-plantilla input { flex: 0 0 auto; width: 16px; height: 16px; margin: 1px 0 0; accent-color: #1769aa; }
.lista-campos-plantilla:disabled label { cursor: not-allowed; opacity: .7; }
.ayuda-verificacion-campos, .resumen-campos-plantilla { margin: 0 !important; color: #586980 !important; font-size: .76rem !important; line-height: 1.45 !important; }
.resumen-campos-plantilla { font-weight: 750; }
.secciones-plantilla-editorial li + li { margin-top: 4px; }
.nota-verificacion-plantilla { margin-top: 8px !important; font-size: .76rem !important; }
.secciones-plantilla-editorial ol { margin-bottom: 8px; }
.estado-plantilla-editorial, .mensaje-error-plantilla, .mensaje-exito-plantilla { display: flex; align-items: center; gap: 8px; margin: 0; border-radius: 6px; padding: 10px 12px; font-size: .82rem; }
.estado-plantilla-editorial { background: #eef6fc; color: #36536f; }
.mensaje-error-plantilla { background: #fff0f0; color: #9e2735; }
.mensaje-exito-plantilla { background: #edf9f1; color: #13753a; }
.estado-plantilla-editorial svg, .mensaje-exito-plantilla svg { flex: 0 0 16px; width: 16px; height: 16px; }
.acciones-plantilla-editorial { display: flex; flex-wrap: wrap; gap: 9px; }
.acciones-plantilla-editorial button { display: inline-flex; min-height: 40px; align-items: center; justify-content: center; border: 1px solid #1769aa; border-radius: 6px; background: #1769aa; padding: 8px 13px; color: #fff; font-size: .82rem; font-weight: 800; cursor: pointer; }
.acciones-plantilla-editorial button.boton-estructura-plantilla { border-color: #bed1e4; background: #f3f8fc; color: #145996; }
.acciones-plantilla-editorial button:disabled { cursor: not-allowed; opacity: .55; }
.acciones-plantilla-editorial button:focus-visible, .selector-plantilla-editorial select:focus-visible { outline: 3px solid #6ccce7; outline-offset: 2px; }
.girando { animation: rotar-plantilla 1s linear infinite; }
@keyframes rotar-plantilla { to { transform: rotate(360deg); } }
@media (max-width: 620px) { .detalle-plantilla-editorial { grid-template-columns: minmax(0, 1fr); } .acciones-plantilla-editorial button { flex: 1 1 100%; } }
</style>
