<script setup lang="ts">
import AvisoAnalitica from '~/components/publico/AvisoAnalitica.vue'
</script>

<template>
  <div class="sitio-editorial">
    <CabeceraPrincipal />
    <main class="superficie-principal">
      <slot />
    </main>
    <PiePaginaPrincipal />
    <AvisoAnalitica />
  </div>
</template>
