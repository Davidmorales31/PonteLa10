<script setup lang="ts">
import { LoaderCircle } from '@lucide/vue'

const { bloqueado, mensaje } = useBloqueoInterfaz()

watch(bloqueado, (activo) => {
  if (!import.meta.client) return
  document.body.style.overflow = activo ? 'hidden' : ''
})

onBeforeUnmount(() => {
  if (import.meta.client) document.body.style.overflow = ''
})
</script>

<template>
  <Transition name="bloqueo-global">
    <div
      v-if="bloqueado"
      class="bloqueo-interfaz-global"
      role="status"
      aria-live="assertive"
      aria-busy="true"
    >
      <div>
        <span class="marca-bloqueo-global">
          <picture>
            <source srcset="/brand/pont3la10_logo_real_blanco_transparente-180.webp 180w, /brand/pont3la10_logo_real_blanco_transparente-360.webp 360w, /brand/pont3la10_logo_real_blanco_transparente-598.webp 598w" type="image/webp" sizes="180px">
            <img src="/brand/pont3la10_logo_real_blanco_transparente.png" alt="Pont3la10" width="598" height="115" decoding="async">
          </picture>
        </span>
        <LoaderCircle aria-hidden="true" />
        <strong>{{ mensaje }}</strong>
        <small>Espera un momento</small>
      </div>
    </div>
  </Transition>
</template>
