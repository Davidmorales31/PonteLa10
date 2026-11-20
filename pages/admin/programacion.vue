<script setup lang="ts">
import { ExternalLink, LoaderCircle, PencilLine, Plus, RadioTower, RotateCcw, Save } from '@lucide/vue'
import PanelModal from '~/components/admin/ui/PanelModal.vue'
import type { ProgramacionTransmisionPublica } from '~/utils/partidos/programacion'
import {
  etiquetasDistribucionProgramacion,
  etiquetasEstadoProgramacion,
  tiposDistribucionProgramacion,
  estadosProgramacion
} from '~/utils/partidos/programacion'

interface PartidoProgramable {
  slug: string
  local: string
  visitante: string
  fechaIso: string
  competencia: string
}

interface FilaProgramacion extends ProgramacionTransmisionPublica {
  updatedAt: string
}

interface RespuestaProgramacion {
  partidos: PartidoProgramable[]
  programaciones: FilaProgramacion[]
}

definePageMeta({
  layout: 'admin',
  middleware: 'autenticacion-editorial',
  permisoEditorial: 'partidos.programacion.gestionar'
})

useSeoMeta({ title: 'Programación de transmisiones | Ponte la 10', robots: 'noindex, nofollow' })

const datosFormularioIniciales = () => ({
  matchSlug: '',
  countryCode: 'CO',
  channel: '',
  platform: '',
  distributionType: 'paid_tv' as typeof tiposDistribucionProgramacion[number],
  sourceUrl: '',
  status: 'unconfirmed' as typeof estadosProgramacion[number],
  notes: ''
})

const formulario = reactive(datosFormularioIniciales())
const idEditando = ref<string | null>(null)
const guardando = ref(false)
const mensajeError = ref('')
const mensajeExito = ref('')
const { data, status, error, refresh } = await useFetch<RespuestaProgramacion>('/api/admin/programacion')
const partidos = computed(() => data.value?.partidos || [])
const programaciones = computed(() => data.value?.programaciones || [])

function nombrePartido(slug: string) {
  const partido = partidos.value.find(actual => actual.slug === slug)
  return partido ? `${partido.local} vs ${partido.visitante}` : slug
}

function fechaPartido(fechaIso: string) {
  const fecha = new Date(fechaIso)
  return Number.isFinite(fecha.getTime())
    ? new Intl.DateTimeFormat('es-CO', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'America/Bogota' }).format(fecha)
    : 'Fecha por confirmar'
}

const modalAbierto = ref(false)

function editar(programacion: FilaProgramacion) {
  modalAbierto.value = true
  idEditando.value = programacion.id
  mensajeError.value = ''
  mensajeExito.value = ''
  Object.assign(formulario, {
    matchSlug: programacion.matchSlug,
    countryCode: programacion.countryCode,
    channel: programacion.channel,
    platform: programacion.platform,
    distributionType: programacion.distributionType,
    sourceUrl: programacion.sourceUrl,
    status: programacion.status,
    notes: programacion.notes || ''
  })
}

function nuevaProgramacion() {
  idEditando.value = null
  Object.assign(formulario, datosFormularioIniciales())
  mensajeError.value = ''
  mensajeExito.value = ''
}

function abrirNueva() {
  nuevaProgramacion()
  modalAbierto.value = true
}

async function guardarProgramacion() {
  if (guardando.value) return
  guardando.value = true
  mensajeError.value = ''
  mensajeExito.value = ''
  try {
    const ruta = idEditando.value
      ? `/api/admin/programacion/${encodeURIComponent(idEditando.value)}`
      : '/api/admin/programacion'
    await $fetch(ruta, {
      method: idEditando.value ? 'PUT' : 'POST',
      body: { ...formulario, notes: formulario.notes.trim() || null }
    })
    const confirmacion = formulario.status === 'confirmed'
      ? 'Programación confirmada y auditada. La ficha pública se actualizará en breve.'
      : 'Programación guardada.'
    nuevaProgramacion()
    modalAbierto.value = false
    mensajeExito.value = confirmacion
    await refresh()
  } catch (errorPeticion: unknown) {
    const errorConDatos = errorPeticion as { data?: { statusMessage?: string }, statusMessage?: string }
    mensajeError.value = errorConDatos.data?.statusMessage || errorConDatos.statusMessage
      || 'No se pudo guardar. Confirma la sesión editorial y el segundo factor.'
  } finally {
    guardando.value = false
  }
}
</script>

<template>
  <div class="pagina-ajustada vista-programacion-editorial">
    <header class="titulo-vista-panel">
      <div>
        <h1>Programación de transmisiones</h1>
        <p>Canales por partido y país con el enlace de la fuente consultada. Solo las opciones confirmadas se muestran públicamente.</p>
      </div>
      <button class="boton-editorial-principal" type="button" @click="abrirNueva">
        <Plus aria-hidden="true" /> Nueva programación
      </button>
    </header>

    <p class="aviso-panel aviso-panel--alerta"><strong>Confirmar una emisión requiere MFA.</strong> Revisa la fuente antes de marcarla como confirmada; cada alta o cambio queda en la auditoría editorial.</p>
    <p v-if="mensajeExito && !modalAbierto" class="aviso-panel" role="status">{{ mensajeExito }}</p>

    <section class="zona-desplazable" aria-live="polite" aria-label="Programaciones registradas">
      <div v-if="status === 'pending'" class="estado-vacio-compacto">
        <LoaderCircle class="icono-girando" aria-hidden="true" />
        <p>Cargando fixtures y programación…</p>
      </div>
      <div v-else-if="error" class="estado-vacio-compacto">
        <RotateCcw aria-hidden="true" />
        <h2>No pudimos cargar la programación</h2>
        <p>Verifica que la migración esté aplicada, que tu cuenta tenga el permiso correspondiente y que la sesión tenga MFA activo.</p>
        <button class="boton-panel" type="button" @click="() => refresh()">Reintentar</button>
      </div>
      <div v-else-if="!programaciones.length" class="estado-vacio-compacto">
        <RadioTower aria-hidden="true" />
        <h2>Aún no hay opciones registradas</h2>
        <p>Comienza por una programación respaldada por una fuente pública verificable.</p>
      </div>
      <table v-else class="tabla-densa tabla-apilable">
        <thead>
          <tr>
            <th scope="col">Partido</th>
            <th scope="col">Transmisión</th>
            <th scope="col">Estado</th>
            <th scope="col"><span class="sr-only">Acciones</span></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="programacion in programaciones" :key="programacion.id">
            <td>
              <div class="fila-titulo-contenido">
                <strong>{{ nombrePartido(programacion.matchSlug) }}</strong>
                <small>{{ fechaPartido(partidos.find(partido => partido.slug === programacion.matchSlug)?.fechaIso || '') }}</small>
              </div>
            </td>
            <td class="celda-secundaria">{{ programacion.channel }} · {{ programacion.platform }} · {{ programacion.countryCode }}</td>
            <td>
              <span class="chip-estado" :data-tono="programacion.status === 'confirmed' ? 'publicado' : programacion.status === 'cancelled' ? 'peligro' : 'programado'">{{ etiquetasEstadoProgramacion[programacion.status] }}</span>
            </td>
            <td>
              <div class="acciones-fila">
                <a :href="programacion.sourceUrl" target="_blank" rel="noopener noreferrer" title="Abrir fuente" aria-label="Abrir fuente"><ExternalLink aria-hidden="true" /></a>
                <button type="button" title="Editar" :aria-label="`Editar ${nombrePartido(programacion.matchSlug)}`" @click="editar(programacion)"><PencilLine aria-hidden="true" /></button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </section>

    <PanelModal
      :abierto="modalAbierto"
      :titulo="idEditando ? 'Editar registro' : 'Añadir transmisión'"
      descripcion="Datos confirmados, nunca supuestos: cita la fuente consultada."
      ancho="md"
      :bloqueado="guardando"
      @cerrar="modalAbierto = false"
    >
      <form id="formulario-programacion-partido" class="formulario-modal-programacion" @submit.prevent="guardarProgramacion">
        <label>
          <span>Partido del calendario</span>
          <select v-model="formulario.matchSlug" class="campo-panel" required>
            <option value="" disabled>Selecciona un partido</option>
            <option v-for="partido in partidos" :key="partido.slug" :value="partido.slug">{{ nombrePartido(partido.slug) }} · {{ fechaPartido(partido.fechaIso) }}</option>
          </select>
        </label>
        <div class="campos-modal-dobles">
          <label>
            <span>País (ISO-3166-1 alpha-2)</span>
            <input v-model="formulario.countryCode" class="campo-panel" maxlength="2" pattern="[A-Z]{2}" autocomplete="country" required>
          </label>
          <label>
            <span>Tipo de distribución</span>
            <select v-model="formulario.distributionType" class="campo-panel" required>
              <option v-for="tipo in tiposDistribucionProgramacion" :key="tipo" :value="tipo">{{ etiquetasDistribucionProgramacion[tipo] }}</option>
            </select>
          </label>
        </div>
        <div class="campos-modal-dobles">
          <label><span>Canal o servicio</span><input v-model="formulario.channel" class="campo-panel" maxlength="120" required></label>
          <label><span>Plataforma (si aplica)</span><input v-model="formulario.platform" class="campo-panel" maxlength="120" required></label>
        </div>
        <label><span>Fuente consultada (HTTPS)</span><input v-model="formulario.sourceUrl" class="campo-panel" type="url" inputmode="url" placeholder="https://…" required></label>
        <label>
          <span>Estado editorial</span>
          <select v-model="formulario.status" class="campo-panel" required>
            <option v-for="estado in estadosProgramacion" :key="estado" :value="estado">{{ etiquetasEstadoProgramacion[estado] }}</option>
          </select>
        </label>
        <label><span>Nota pública opcional</span><textarea v-model="formulario.notes" class="campo-panel campo-area" maxlength="1500" rows="3" /></label>
        <p v-if="mensajeError" class="aviso-panel aviso-panel--alerta" role="alert">{{ mensajeError }}</p>
      </form>
      <template #pie>
        <button class="boton-panel" type="button" :disabled="guardando" @click="modalAbierto = false">Cancelar</button>
        <button class="boton-panel boton-panel--marca" type="submit" form="formulario-programacion-partido" :disabled="guardando">
          <LoaderCircle v-if="guardando" class="icono-girando" aria-hidden="true" />
          <Save v-else aria-hidden="true" />
          {{ guardando ? 'Guardando…' : formulario.status === 'confirmed' ? 'Guardar y confirmar' : 'Guardar cambios' }}
        </button>
      </template>
    </PanelModal>
  </div>
</template>

<style scoped>
.formulario-modal-programacion { display: grid; gap: 12px; }
.formulario-modal-programacion label { display: grid; gap: 5px; color: #4d5b73; font-size: 0.76rem; font-weight: 750; }
.campos-modal-dobles { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 12px; }
.campo-area { height: auto; min-height: 72px; padding: 8px 10px; resize: vertical; }
</style>
