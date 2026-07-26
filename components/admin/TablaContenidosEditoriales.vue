<script setup lang="ts">
import {
  CalendarClock,
  FileText,
  UserRound
} from '@lucide/vue'
import type { ArticuloBandejaEditorial } from '~/types/contenidoEditorial'
import {
  etiquetasEstadoContenido,
  etiquetasOrigenContenido,
  etiquetasTipoContenido
} from '~/utils/editorial/contenido'

defineProps<{
  contenidos: ArticuloBandejaEditorial[]
}>()

function formatearFecha(fecha: string): string {
  return new Intl.DateTimeFormat('es-CO', {
    dateStyle: 'medium',
    timeStyle: 'short'
  })
    .format(new Date(fecha))
    .replace(/[\u00a0\u202f]/g, ' ')
}
</script>

<template>
  <div class="contenedor-tabla-contenidos">
    <table class="tabla-contenidos-editoriales">
      <thead>
        <tr>
          <th>Contenido</th>
          <th>Estado</th>
          <th>Sección</th>
          <th>Autor</th>
          <th>Actualizado</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="contenido in contenidos" :key="contenido.id">
          <td data-label="Contenido">
            <div class="identidad-contenido-bandeja">
              <span class="icono-tipo-contenido">
                <FileText aria-hidden="true" />
              </span>
              <div>
                <NuxtLink
                  class="enlace-titulo-contenido"
                  :to="`/admin/contenidos/${contenido.id}`"
                >
                  <strong>{{ contenido.titulo }}</strong>
                </NuxtLink>
                <span>
                  {{ etiquetasTipoContenido[contenido.tipo] }}
                  <i aria-hidden="true" />
                  {{ etiquetasOrigenContenido[contenido.origen] }}
                </span>
              </div>
            </div>
          </td>
          <td data-label="Estado">
            <span
              class="estado-contenido"
              :data-estado="contenido.estado"
            >
              {{ etiquetasEstadoContenido[contenido.estado] }}
            </span>
          </td>
          <td data-label="Seccion">
            <span class="dato-secundario-contenido">
              {{ contenido.categoria?.nombre || 'Sin definir' }}
            </span>
          </td>
          <td data-label="Autor">
            <span class="dato-con-icono">
              <UserRound aria-hidden="true" />
              {{ contenido.autorNombre }}
            </span>
          </td>
          <td data-label="Actualizado">
            <span class="dato-con-icono">
              <CalendarClock aria-hidden="true" />
              {{ formatearFecha(contenido.actualizadoEn) }}
            </span>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>
