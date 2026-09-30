<script setup lang="ts">
import type { ModuloHubEditorial } from '~/types/contenidoEditorial'

defineProps<{ modulos: ModuloHubEditorial[] }>()

const analitica = useAnaliticaPublica()

function registrarClickModulo() {
  void analitica.registrarEvento('hub_module_click')
}
</script>

<template>
  <div class="modulos-hub-publico">
    <section
      v-for="modulo in modulos"
      :key="modulo.id"
      class="modulo-hub-publico"
      :aria-labelledby="`titulo-modulo-${modulo.id}`"
    >
      <h2 :id="`titulo-modulo-${modulo.id}`">
        {{ modulo.titulo }}
      </h2>

      <div v-if="modulo.tipo === 'texto'" class="texto-modulo-hub">
        <p v-for="(parrafo, indice) in modulo.contenido.split(/\n{2,}/)" :key="`${modulo.id}-${indice}`">
          {{ parrafo }}
        </p>
      </div>

      <ul v-else-if="modulo.tipo === 'enlaces'" class="enlaces-modulo-hub">
        <li v-for="enlace in modulo.enlaces" :key="enlace.ruta">
          <NuxtLink :to="enlace.ruta" @click="registrarClickModulo">
            {{ enlace.etiqueta }}
          </NuxtLink>
        </li>
      </ul>

      <div v-else-if="modulo.tipo === 'articulos' && modulo.articulos?.length" class="articulos-modulo-hub">
        <article v-for="articulo in modulo.articulos" :key="articulo.id">
          <NuxtLink :to="`/articulos/${articulo.slug}`" @click="registrarClickModulo">
            <img
              v-if="articulo.imagen"
              :src="articulo.imagen"
              :alt="''"
              width="640"
              height="360"
              loading="lazy"
              decoding="async"
            >
            <div>
              <h3>{{ articulo.titulo }}</h3>
              <p>{{ articulo.resumen }}</p>
            </div>
          </NuxtLink>
        </article>
      </div>

      <p v-else class="estado-vacio-hub">
        No hay publicaciones disponibles en este momento.
      </p>
    </section>
  </div>
</template>
