<script setup lang="ts">
import { ArrowRight } from '@lucide/vue'

const correo = ref('')
const mensaje = ref('')

function registrarInteresNewsletter() {
  mensaje.value = '¡Listo! Te avisaremos cuando conectemos el newsletter.'
  correo.value = ''
}
</script>

<template>
  <form class="formulario-newsletter" @submit.prevent="registrarInteresNewsletter">
    <label for="correo-newsletter">Tu correo electrónico</label>
    <div>
      <input
        id="correo-newsletter"
        v-model="correo"
        type="email"
        maxlength="180"
        placeholder="Tu correo electrónico"
        required
      >
      <button type="submit" aria-label="Suscribirme al newsletter" title="Suscribirme">
        <ArrowRight aria-hidden="true" />
      </button>
    </div>
    <p v-if="mensaje" role="status">{{ mensaje }}</p>
  </form>
</template>
