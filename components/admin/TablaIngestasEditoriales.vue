<script setup lang="ts">
import {
  Ban,
  AtSign,
  Camera,
  CircleAlert,
  Eye,
  ExternalLink,
  FileCheck2,
  FilePenLine,
  Globe2,
  Languages,
  LoaderCircle,
  MessageCircle,
  Music2,
  Play,
  RotateCcw,
  Trash2,
  TimerReset,
} from '@lucide/vue'
import type {
  IngestaEditorial,
  PlataformaIngestaEditorial
} from '~/types/ingestaEditorial'
import {
  etiquetasEstadoIngesta,
  etiquetasPlataformaIngesta
} from '~/utils/editorial/ingestas'

defineProps<{
  ingestas: IngestaEditorial[]
  puedeGestionar: boolean
  puedeEliminar: boolean
  puedeRedactar: boolean
  cancelandoId: string
}>()

const emit = defineEmits<{
  cancelar: [ingesta: IngestaEditorial]
  reencolar: [ingesta: IngestaEditorial]
  eliminar: [ingesta: IngestaEditorial]
  reintentarBorrador: [ingesta: IngestaEditorial]
}>()

const formatoFecha = new Intl.DateTimeFormat('es-CO', {
  dateStyle: 'medium',
  timeStyle: 'short'
})

const iconosPlataforma: Record<PlataformaIngestaEditorial, typeof Globe2> = {
  web: Globe2,
  youtube: Play,
  tiktok: Music2,
  instagram: Camera,
  x: AtSign,
  facebook: MessageCircle
}

function puedeCancelar(ingesta: IngestaEditorial): boolean {
  return ['pending', 'queued'].includes(ingesta.estado)
}

function puedeReencolar(ingesta: IngestaEditorial): boolean {
  return ingesta.estado === 'failed' && ingesta.recuperable
}

</script>

<template>
  <div class="contenedor-tabla-ingestas">
    <table class="tabla-ingestas-editoriales">
      <thead>
        <tr>
          <th>Fuente</th>
          <th>Estado</th>
          <th>Reglas</th>
          <th>Registro</th>
          <th><span class="solo-lectores-pantalla">Acciones</span></th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="ingesta in ingestas" :key="ingesta.id">
          <td data-label="Fuente">
            <div class="identidad-fuente-ingesta">
              <span class="icono-plataforma-ingesta">
                <component :is="iconosPlataforma[ingesta.plataforma]" aria-hidden="true" />
              </span>
              <div>
                <strong>{{ ingesta.tituloSugerido || ingesta.hostFuente }}</strong>
                <a
                  :href="ingesta.urlNormalizada"
                  target="_blank"
                  rel="noopener noreferrer"
                  :title="`Abrir fuente en ${etiquetasPlataformaIngesta[ingesta.plataforma]}`"
                >
                  {{ ingesta.hostFuente }}
                  <ExternalLink aria-hidden="true" />
                </a>
              </div>
            </div>
          </td>
          <td data-label="Estado">
            <span class="estado-ingesta" :data-estado="ingesta.estado">
              <LoaderCircle
                v-if="ingesta.estado === 'processing'"
                class="icono-girando"
                aria-hidden="true"
              />
              <FileCheck2
                v-else-if="['draft_created', 'evidence_ready'].includes(ingesta.estado)"
                aria-hidden="true"
              />
              <CircleAlert v-else-if="ingesta.estado === 'failed'" aria-hidden="true" />
              <Ban v-else-if="ingesta.estado === 'cancelled'" aria-hidden="true" />
              <TimerReset v-else aria-hidden="true" />
              {{ etiquetasEstadoIngesta[ingesta.estado] }}
            </span>
            <div v-if="ingesta.estado === 'processing'" class="progreso-ingesta" :aria-label="`Progreso: ${ingesta.progresoPorcentaje}%`">
              <div><span>{{ ingesta.etapaProcesamiento || 'Procesando' }}</span><strong>{{ ingesta.progresoPorcentaje }}%</strong></div>
              <span><i :style="{ width: `${ingesta.progresoPorcentaje}%` }" /></span>
            </div>
            <small v-else-if="ingesta.estado === 'evidence_ready'" class="detalle-error-ingesta">
              Original {{ ingesta.idiomaFuente?.toUpperCase() || 'por revisar' }} · versión {{ ingesta.versionResultado }}
            </small>
            <small v-if="ingesta.mensajeError" class="detalle-error-ingesta">
              {{ ingesta.mensajeError }}
            </small>
          </td>
          <td data-label="Reglas">
            <div class="resumen-reglas-ingesta">
              <span>{{ ingesta.reglas.tipoContenido === 'auto' ? 'Tipo automático' : ingesta.reglas.tipoContenido }}</span>
              <span v-if="ingesta.reglas.exigirCreditos">Créditos</span>
              <span v-if="ingesta.reglas.generarSeo">SEO</span>
              <span v-if="ingesta.reglas.conservarVideo">Video</span>
              <span v-if="ingesta.idiomaFuente">
                <Languages aria-hidden="true" />
                {{ ingesta.idiomaFuente.toUpperCase() }}
              </span>
            </div>
          </td>
          <td data-label="Registro">
            <div class="registro-ingesta">
              <strong>{{ ingesta.solicitanteNombre }}</strong>
              <time :datetime="ingesta.creadoEn">
                {{ formatoFecha.format(new Date(ingesta.creadoEn)) }}
              </time>
            </div>
          </td>
          <td data-label="Acciones">
            <button
              v-if="puedeEliminar"
              class="boton-icono-editorial boton-icono-editorial--peligro"
              type="button"
              title="Eliminar ingesta"
              aria-label="Eliminar ingesta"
              @click="emit('eliminar', ingesta)"
            >
              <Trash2 aria-hidden="true" />
            </button>
            <button
              v-if="puedeGestionar && puedeReencolar(ingesta)"
              class="boton-icono-editorial"
              type="button"
              title="Reencolar evidencia"
              aria-label="Reencolar evidencia"
              @click="emit('reencolar', ingesta)"
            >
              <RotateCcw aria-hidden="true" />
            </button>
            <NuxtLink
              v-if="ingesta.articuloId"
              class="boton-icono-editorial"
              :to="`/admin/contenidos/${ingesta.articuloId}`"
              title="Abrir borrador"
              aria-label="Abrir borrador creado"
            >
              <FileCheck2 aria-hidden="true" />
            </NuxtLink>
            <NuxtLink
              v-if="ingesta.articuloId"
              class="boton-icono-editorial"
              :to="`/admin/contenidos/${ingesta.articuloId}?paso=revision`"
              title="Ver contenido y revisión"
              aria-label="Ver contenido creado en revisión"
            >
              <Eye aria-hidden="true" />
            </NuxtLink>
            <button
              v-else-if="puedeRedactar && ingesta.estado === 'evidence_ready'"
              class="boton-icono-editorial"
              type="button"
              title="Reintentar borrador"
              aria-label="Reintentar borrador con la evidencia disponible"
              :disabled="cancelandoId === ingesta.id"
              @click="emit('reintentarBorrador', ingesta)"
            >
              <LoaderCircle v-if="cancelandoId === ingesta.id" class="icono-girando" aria-hidden="true" />
              <FilePenLine v-else aria-hidden="true" />
            </button>
            <button
              v-else-if="puedeGestionar && puedeCancelar(ingesta)"
              class="boton-icono-editorial boton-cancelar-ingesta"
              type="button"
              title="Cancelar solicitud"
              aria-label="Cancelar solicitud"
              :disabled="cancelandoId === ingesta.id"
              @click="emit('cancelar', ingesta)"
            >
              <LoaderCircle
                v-if="cancelandoId === ingesta.id"
                class="icono-girando"
                aria-hidden="true"
              />
              <Ban v-else aria-hidden="true" />
            </button>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>
