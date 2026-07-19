<script setup lang="ts">
import { CircleUserRound } from '@lucide/vue'

const props = withDefaults(defineProps<{
  variante?: 'cabecera' | 'movil'
}>(), {
  variante: 'cabecera'
})

const { autenticacionConfigurada, usuarioActual, obtenerSesionActual } = useAutenticacionEditorial()

onMounted(async () => {
  if (autenticacionConfigurada.value) {
    await obtenerSesionActual()
  }
})
</script>

<template>
  <div class="acceso-usuario-cabecera" :class="`acceso-usuario-${props.variante}`">
    <template v-if="props.variante === 'movil'">
      <NuxtLink v-if="usuarioActual" to="/admin">Panel</NuxtLink>
      <NuxtLink v-else class="boton-icono-usuario" to="/login" aria-label="Iniciar sesion" title="Iniciar sesion">
        <CircleUserRound aria-hidden="true" />
      </NuxtLink>
    </template>

    <template v-else>
      <NuxtLink
        v-if="usuarioActual"
        class="enlace-panel-admin"
        to="/admin"
        aria-label="Abrir panel interno"
      >
        Panel interno
      </NuxtLink>
      <NuxtLink
        class="boton-icono-usuario"
        to="/login"
        aria-label="Iniciar sesion"
        title="Iniciar sesion"
      >
        <CircleUserRound aria-hidden="true" />
      </NuxtLink>
    </template>
  </div>
</template>
