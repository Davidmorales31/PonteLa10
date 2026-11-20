<script setup lang="ts">
import { ExternalLink, PencilLine, Trash2 } from '@lucide/vue'
import type { ArticuloBandejaEditorial } from '~/types/contenidoEditorial'
import {
  etiquetasEstadoContenido,
  etiquetasOrigenContenido,
  etiquetasTipoContenido
} from '~/utils/editorial/contenido'

defineProps<{
  contenidos: ArticuloBandejaEditorial[]
  puedeEliminar?: boolean
}>()

const emit = defineEmits<{
  eliminar: [contenido: ArticuloBandejaEditorial]
}>()

const formato = new Intl.DateTimeFormat('es-CO', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })

function formatearFecha(fecha: string): string {
  return formato.format(new Date(fecha)).replace(/[\u00a0\u202f]/g, ' ')
}
</script>

<template>
  <table class="tabla-densa tabla-apilable tabla-contenidos">
    <thead>
      <tr>
        <th scope="col">Contenido</th>
        <th scope="col">Estado</th>
        <th scope="col">Sección</th>
        <th scope="col">Autor</th>
        <th scope="col">Actualizado</th>
        <th scope="col"><span class="sr-only">Acciones</span></th>
      </tr>
    </thead>
    <tbody>
      <tr v-for="contenido in contenidos" :key="contenido.id">
        <td class="celda-titulo">
          <div class="fila-titulo-contenido">
            <NuxtLink :to="`/admin/contenidos/${contenido.id}`">{{ contenido.titulo }}</NuxtLink>
            <small>{{ etiquetasTipoContenido[contenido.tipo] }} · {{ etiquetasOrigenContenido[contenido.origen] }}</small>
          </div>
        </td>
        <td>
          <span class="chip-estado" :data-estado="contenido.estado">{{ etiquetasEstadoContenido[contenido.estado] }}</span>
        </td>
        <td class="celda-secundaria">{{ contenido.categoria?.nombre || 'Sin definir' }}</td>
        <td class="celda-secundaria">{{ contenido.autorNombre }}</td>
        <td class="celda-secundaria">{{ formatearFecha(contenido.actualizadoEn) }}</td>
        <td>
          <div class="acciones-fila">
            <NuxtLink
              :to="`/admin/contenidos/${contenido.id}`"
              title="Abrir en el editor"
              :aria-label="`Abrir ${contenido.titulo}`"
            >
              <PencilLine aria-hidden="true" />
            </NuxtLink>
            <a
              v-if="contenido.estado === 'published'"
              :href="`/articulos/${contenido.slug}`"
              target="_blank"
              rel="noopener"
              title="Ver en el sitio"
              :aria-label="`Ver ${contenido.titulo} en el sitio`"
            >
              <ExternalLink aria-hidden="true" />
            </a>
            <button
              v-if="puedeEliminar"
              class="peligro"
              type="button"
              title="Eliminar contenido"
              :aria-label="`Eliminar ${contenido.titulo}`"
              @click="emit('eliminar', contenido)"
            >
              <Trash2 aria-hidden="true" />
            </button>
          </div>
        </td>
      </tr>
    </tbody>
  </table>
</template>
