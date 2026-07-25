<script setup lang="ts">
import { ArrowLeft, Home, ShieldX } from '@lucide/vue'

useSeoPont3la10({
  titulo: 'Acceso restringido | Pont3la10',
  descripcion: 'Esta sección requiere permisos editoriales.',
  robots: 'noindex, nofollow'
})
</script>

<template>
  <section class="pagina-acceso-denegado">
    <ShieldX aria-hidden="true" />
    <p class="etiqueta-seccion">Acceso restringido</p>
    <h1>Esta zona pertenece al equipo editorial.</h1>
    <p>
      Tu cuenta puede seguir navegando por Pont3la10. El panel solo está disponible para
      integrantes con un rol activo.
    </p>
    <div>
      <NuxtLink class="boton-primario" to="/">
        <Home aria-hidden="true" />
        <span>Volver al inicio</span>
      </NuxtLink>
      <NuxtLink class="boton-secundario" to="/login">
        <ArrowLeft aria-hidden="true" />
        <span>Cambiar de cuenta</span>
      </NuxtLink>
    </div>
  </section>
</template>
