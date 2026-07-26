<script setup lang="ts">
import { Clock3, ExternalLink } from '@lucide/vue'
import type {
  BloqueEditorEditorial,
  DatosEditorArticulo
} from '~/types/contenidoEditorial'
import {
  convertirBloquesADocumento,
  estimarMinutosLectura
} from '~/utils/editorial/documento'
import { etiquetasTipoContenido } from '~/utils/editorial/contenido'

const props = defineProps<{
  datos: DatosEditorArticulo
  bloques: BloqueEditorEditorial[]
  nombreCategoria: string
}>()

const minutosLectura = computed(() => estimarMinutosLectura(
  convertirBloquesADocumento(props.bloques)
))

function elementosLista(texto: string): string[] {
  return texto
    .split('\n')
    .map(elemento => elemento.trim())
    .filter(Boolean)
}
</script>

<template>
  <article class="vista-previa-articulo">
    <header class="cabecera-previa-articulo">
      <p>
        <span>{{ nombreCategoria || 'Pont3la10' }}</span>
        <span>{{ etiquetasTipoContenido[datos.tipo] }}</span>
      </p>
      <h1>{{ datos.titulo || 'Título de la historia' }}</h1>
      <p class="resumen-previa">
        {{ datos.resumen || 'El resumen aparecerá aquí cuando lo escribas.' }}
      </p>
      <div class="metadatos-previa">
        <span>Equipo Pont3la10</span>
        <span><Clock3 aria-hidden="true" /> {{ minutosLectura }} min de lectura</span>
      </div>
    </header>

    <div class="cuerpo-previa-articulo">
      <template v-for="bloque in bloques" :key="bloque.id">
        <h2 v-if="bloque.tipo === 'encabezado2'">
          {{ bloque.texto || 'Encabezado de sección' }}
        </h2>
        <h3 v-else-if="bloque.tipo === 'encabezado3'">
          {{ bloque.texto || 'Encabezado secundario' }}
        </h3>
        <blockquote v-else-if="bloque.tipo === 'cita'">
          {{ bloque.texto || 'La cita aparecerá aquí.' }}
        </blockquote>
        <ul v-else-if="bloque.tipo === 'lista'">
          <li v-for="elemento in elementosLista(bloque.texto)" :key="elemento">
            {{ elemento }}
          </li>
        </ul>
        <ol v-else-if="bloque.tipo === 'listaNumerada'">
          <li v-for="elemento in elementosLista(bloque.texto)" :key="elemento">
            {{ elemento }}
          </li>
        </ol>
        <p v-else>
          {{ bloque.texto || 'Continúa escribiendo para ver el contenido.' }}
        </p>
      </template>
    </div>

    <footer
      v-if="datos.fuente.url || datos.fuente.nombre || datos.fuente.creditos"
      class="fuente-previa-articulo"
    >
      <strong>Fuente y créditos</strong>
      <p v-if="datos.fuente.nombre || datos.fuente.autor">
        {{ [datos.fuente.nombre, datos.fuente.autor].filter(Boolean).join(' · ') }}
      </p>
      <p v-if="datos.fuente.creditos">{{ datos.fuente.creditos }}</p>
      <a
        v-if="datos.fuente.url"
        :href="datos.fuente.url"
        target="_blank"
        rel="noopener noreferrer nofollow"
      >
        Consultar fuente
        <ExternalLink aria-hidden="true" />
      </a>
    </footer>
  </article>
</template>
