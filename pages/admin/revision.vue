<script setup lang="ts">
import {
  ArrowRight,
  BadgeCheck,
  CalendarClock,
  ClipboardCheck,
  Clock3,
  Inbox
} from '@lucide/vue'
import type {
  ColaRevisionEditorial,
  ElementoColaRevisionEditorial
} from '~/types/contenidoEditorial'
import { etiquetasTipoContenido } from '~/utils/editorial/contenido'

definePageMeta({
  layout: 'admin',
  middleware: 'autenticacion-editorial',
  permisoEditorial: 'contenido.revisar'
})

useSeoMeta({
  title: 'Bandeja de revisión | Pont3la10',
  robots: 'noindex, nofollow'
})

const { data: cola, status, error, refresh } = await useFetch<ColaRevisionEditorial>(
  '/api/admin/revision'
)

const secciones = computed(() => [
  {
    id: 'revision',
    titulo: 'En revisión',
    descripcion: 'Contenidos que esperan observaciones o aprobación.',
    icono: ClipboardCheck,
    elementos: cola.value?.enRevision || []
  },
  {
    id: 'aprobados',
    titulo: 'Aprobados',
    descripcion: 'Listos para programar o publicar.',
    icono: BadgeCheck,
    elementos: cola.value?.aprobados || []
  },
  {
    id: 'programados',
    titulo: 'Programados',
    descripcion: 'Publicaciones con una fecha definida.',
    icono: CalendarClock,
    elementos: cola.value?.programados || []
  }
])

function formatearFecha(fecha: string): string {
  return new Intl.DateTimeFormat('es-CO', {
    dateStyle: 'medium',
    timeStyle: 'short'
  }).format(new Date(fecha)).replace(/[\u00a0\u202f]/g, ' ')
}

function fechaPrioritaria(item: ElementoColaRevisionEditorial): string {
  return item.programadoPara || item.actualizadoEn
}
</script>

<template>
  <div class="vista-panel-editorial vista-bandeja-revision">
    <header class="cabecera-vista-panel">
      <div>
        <p class="etiqueta-panel">Operación editorial</p>
        <h1>Bandeja de revisión</h1>
        <p>Revisa, aprueba y organiza lo que está próximo a publicarse.</p>
      </div>
    </header>

    <div v-if="status === 'pending'" class="esqueleto-cola-revision" aria-label="Cargando revisión">
      <span v-for="indice in 9" :key="indice" />
    </div>

    <section v-else-if="error" class="estado-vacio-panel">
      <Inbox aria-hidden="true" />
      <h2>No pudimos cargar la bandeja</h2>
      <p>Comprueba la conexión y vuelve a intentarlo.</p>
      <button class="boton-editorial-secundario" type="button" @click="() => refresh()">
        Reintentar
      </button>
    </section>

    <div v-else class="columnas-cola-revision">
      <section
        v-for="seccion in secciones"
        :key="seccion.id"
        class="columna-cola-revision"
        :aria-labelledby="`titulo-cola-${seccion.id}`"
      >
        <header>
          <span><component :is="seccion.icono" aria-hidden="true" /></span>
          <div>
            <h2 :id="`titulo-cola-${seccion.id}`">{{ seccion.titulo }}</h2>
            <p>{{ seccion.descripcion }}</p>
          </div>
          <strong>{{ seccion.elementos.length }}</strong>
        </header>

        <div v-if="seccion.elementos.length" class="lista-cola-revision">
          <article v-for="item in seccion.elementos" :key="item.id">
            <div class="meta-item-revision">
              <span>{{ etiquetasTipoContenido[item.tipo] }}</span>
              <span v-if="item.categoria">{{ item.categoria.nombre }}</span>
            </div>
            <h3>{{ item.titulo }}</h3>
            <p>{{ item.resumen || 'Sin resumen editorial.' }}</p>
            <div class="pie-item-revision">
              <span>
                <Clock3 aria-hidden="true" />
                {{ formatearFecha(fechaPrioritaria(item)) }}
              </span>
              <NuxtLink
                :to="`/admin/contenidos/${item.id}`"
                :aria-label="`Abrir ${item.titulo}`"
              >
                <ArrowRight aria-hidden="true" />
              </NuxtLink>
            </div>
          </article>
        </div>

        <div v-else class="cola-revision-vacia">
          <Inbox aria-hidden="true" />
          <span>Sin contenidos en esta etapa.</span>
        </div>
      </section>
    </div>
  </div>
</template>
