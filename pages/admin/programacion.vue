<script setup lang="ts">
import { CalendarDays, ExternalLink, LoaderCircle, Plus, RadioTower, RotateCcw, Save } from '@lucide/vue'
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

useSeoMeta({ title: 'Programación de transmisiones | Pont3la10', robots: 'noindex, nofollow' })

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

function editar(programacion: FilaProgramacion) {
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
    mensajeExito.value = formulario.status === 'confirmed'
      ? 'Programación confirmada y auditada. La ficha pública se actualizará en breve.'
      : 'Programación guardada.'
    nuevaProgramacion()
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
  <div class="vista-panel-editorial vista-programacion-editorial">
    <header class="titulo-vista-panel">
      <div>
        <p class="etiqueta-panel">Datos confirmados, nunca supuestos</p>
        <h1>Programación de transmisiones</h1>
        <p>Registra canales por partido y país con el enlace de la fuente consultada. Solo las opciones confirmadas se muestran públicamente.</p>
      </div>
      <button class="boton-editorial-secundario" type="button" @click="nuevaProgramacion">
        <Plus aria-hidden="true" /> Nueva programación
      </button>
    </header>

    <p class="aviso-seguridad-programacion"><strong>Confirmar una emisión requiere MFA.</strong> Revisa la fuente antes de marcarla como confirmada. Cada alta o cambio queda en la auditoría editorial.</p>

    <div v-if="status === 'pending'" class="estado-vacio-panel">
      <LoaderCircle class="icono-girando" aria-hidden="true" />
      <p>Cargando fixtures y programación…</p>
    </div>
    <div v-else-if="error" class="estado-vacio-panel">
      <RotateCcw aria-hidden="true" />
      <h2>No pudimos cargar la programación</h2>
      <p>Verifica que la migración esté aplicada, que tu cuenta tenga el permiso correspondiente y que la sesión tenga MFA activo.</p>
      <button class="boton-editorial-secundario" type="button" @click="() => refresh()">Reintentar</button>
    </div>

    <div v-else class="superficie-programacion-editorial">
      <section class="lista-programaciones-editorial">
        <header>
          <div>
            <p class="etiqueta-panel">Registros</p>
            <h2>{{ programaciones.length }} opciones</h2>
          </div>
        </header>
        <ul v-if="programaciones.length" class="elementos-programacion-editorial">
          <li v-for="programacion in programaciones" :key="programacion.id">
            <div class="estado-programacion-editorial" :class="`estado-${programacion.status}`">{{ etiquetasEstadoProgramacion[programacion.status] }}</div>
            <h3>{{ nombrePartido(programacion.matchSlug) }}</h3>
            <p>{{ programacion.channel }} · {{ programacion.platform }} · {{ programacion.countryCode }}</p>
            <small>{{ fechaPartido(partidos.find(partido => partido.slug === programacion.matchSlug)?.fechaIso || '') }}</small>
            <a :href="programacion.sourceUrl" target="_blank" rel="noopener noreferrer">Abrir fuente <ExternalLink aria-hidden="true" /></a>
            <button class="boton-editorial-secundario" type="button" @click="editar(programacion)">Editar</button>
          </li>
        </ul>
        <div v-else class="estado-vacio-panel estado-vacio-programaciones">
          <RadioTower aria-hidden="true" />
          <h2>Aún no hay opciones registradas</h2>
          <p>Comienza por una programación respaldada por una fuente pública verificable.</p>
        </div>
      </section>

      <section class="formulario-programacion-editorial">
        <header>
          <CalendarDays aria-hidden="true" />
          <div>
            <p class="etiqueta-panel">Edición controlada</p>
            <h2>{{ idEditando ? 'Editar registro' : 'Añadir transmisión' }}</h2>
          </div>
        </header>
        <form class="formulario-editorial" @submit.prevent="guardarProgramacion">
          <label>
            <span>Partido del calendario</span>
            <select v-model="formulario.matchSlug" required>
              <option value="" disabled>Selecciona un partido</option>
              <option v-for="partido in partidos" :key="partido.slug" :value="partido.slug">{{ nombrePartido(partido.slug) }} · {{ fechaPartido(partido.fechaIso) }}</option>
            </select>
          </label>
          <div class="campos-programacion-dobles">
            <label>
              <span>País (ISO-3166-1 alpha-2)</span>
              <input v-model="formulario.countryCode" maxlength="2" pattern="[A-Z]{2}" autocomplete="country" required>
            </label>
            <label>
              <span>Tipo de distribución</span>
              <select v-model="formulario.distributionType" required>
                <option v-for="tipo in tiposDistribucionProgramacion" :key="tipo" :value="tipo">{{ etiquetasDistribucionProgramacion[tipo] }}</option>
              </select>
            </label>
          </div>
          <label><span>Canal o servicio</span><input v-model="formulario.channel" maxlength="120" required></label>
          <label><span>Plataforma (si aplica)</span><input v-model="formulario.platform" maxlength="120" required></label>
          <label><span>Fuente consultada (HTTPS)</span><input v-model="formulario.sourceUrl" type="url" inputmode="url" placeholder="https://…" required></label>
          <label>
            <span>Estado editorial</span>
            <select v-model="formulario.status" required>
              <option v-for="estado in estadosProgramacion" :key="estado" :value="estado">{{ etiquetasEstadoProgramacion[estado] }}</option>
            </select>
          </label>
          <label><span>Nota pública opcional</span><textarea v-model="formulario.notes" maxlength="1500" rows="3" /></label>
          <p v-if="mensajeError" class="mensaje-formulario-programacion mensaje-error-programacion" role="alert">{{ mensajeError }}</p>
          <p v-if="mensajeExito" class="mensaje-formulario-programacion mensaje-exito-programacion" role="status">{{ mensajeExito }}</p>
          <button class="boton-editorial-principal" type="submit" :disabled="guardando">
            <LoaderCircle v-if="guardando" class="icono-girando" aria-hidden="true" />
            <Save v-else aria-hidden="true" />
            {{ guardando ? 'Guardando…' : formulario.status === 'confirmed' ? 'Guardar y confirmar' : 'Guardar cambios' }}
          </button>
        </form>
      </section>
    </div>
  </div>
</template>
