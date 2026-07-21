<script setup lang="ts">
import { ArrowRight } from '@lucide/vue'
import type { EspecialLanding } from '~/types/landing'
import { obtenerIconoLanding } from '~/utils/iconosLanding'

defineProps<{
  especial: EspecialLanding
}>()
</script>

<template>
  <article :class="['tarjeta-especial-landing', `sprite-especial-${especial.posicionSprite}`]">
    <div class="capa-especial-landing">
      <div class="cabecera-tarjeta-especial">
        <span><component :is="obtenerIconoLanding(especial.icono)" aria-hidden="true" /></span>
        <small v-if="especial.badge">{{ especial.badge }}</small>
      </div>
      <div>
        <h3>{{ especial.titulo }}</h3>
        <p>{{ especial.descripcion }}</p>
        <NuxtLink :to="especial.accion.ruta">
          {{ especial.accion.etiqueta }}
          <ArrowRight aria-hidden="true" />
        </NuxtLink>
      </div>
    </div>
  </article>
</template>
