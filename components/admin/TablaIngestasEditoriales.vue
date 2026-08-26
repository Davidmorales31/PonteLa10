<script setup lang="ts">
import {
  Ban,
  AtSign,
  Camera,
  CircleAlert,
  ExternalLink,
  FileCheck2,
  Globe2,
  LoaderCircle,
  MessageCircle,
  Music2,
  Play,
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
  cancelandoId: string
}>()

const emit = defineEmits<{
  cancelar: [ingesta: IngestaEditorial]
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
              <FileCheck2 v-else-if="ingesta.estado === 'draft_created'" aria-hidden="true" />
              <CircleAlert v-else-if="ingesta.estado === 'failed'" aria-hidden="true" />
              <Ban v-else-if="ingesta.estado === 'cancelled'" aria-hidden="true" />
              <TimerReset v-else aria-hidden="true" />
              {{ etiquetasEstadoIngesta[ingesta.estado] }}
            </span>
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
            <NuxtLink
              v-if="ingesta.articuloId"
              class="boton-icono-editorial"
              :to="`/admin/contenidos/${ingesta.articuloId}`"
              title="Abrir borrador"
              aria-label="Abrir borrador creado"
            >
              <FileCheck2 aria-hidden="true" />
            </NuxtLink>
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
