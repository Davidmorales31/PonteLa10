<script setup lang="ts">
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
      <NuxtLink v-else class="boton-icono-usuario" to="/admin/login" aria-label="Iniciar sesion">
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M20 21a8 8 0 0 0-16 0" />
          <circle cx="12" cy="7" r="4" />
        </svg>
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
        to="/admin/login"
        aria-label="Iniciar sesion"
        title="Iniciar sesion"
      >
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M20 21a8 8 0 0 0-16 0" />
          <circle cx="12" cy="7" r="4" />
        </svg>
      </NuxtLink>
    </template>
  </div>
</template>
