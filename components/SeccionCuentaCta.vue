<script setup lang="ts">
import type { CuentaCtaLanding } from '~/types/landing'
import { obtenerIconoLanding } from '~/utils/iconosLanding'

defineProps<{
  datos: CuentaCtaLanding
}>()
</script>

<template>
  <section class="cuenta-cta-landing" aria-labelledby="titulo-cuenta-cta">
    <h2 id="titulo-cuenta-cta">
      <template v-for="(segmento, indice) in datos.titulo" :key="`${segmento.texto}-${indice}`">
        <mark v-if="segmento.destacado">{{ segmento.texto }}</mark>
        <template v-else>{{ segmento.texto }}</template>
      </template>
    </h2>
    <ul>
      <li v-for="beneficio in datos.beneficios" :key="beneficio.texto">
        <component :is="obtenerIconoLanding(beneficio.icono)" aria-hidden="true" />
        <span>{{ beneficio.texto }}</span>
      </li>
    </ul>
    <div class="acciones-cuenta-cta">
      <BotonBase :accion="datos.accionPrincipal" icono="usuario" />
      <p>¿Ya tienes cuenta? <NuxtLink :to="datos.accionSecundaria.ruta">{{ datos.accionSecundaria.etiqueta }}</NuxtLink></p>
    </div>
  </section>
</template>
