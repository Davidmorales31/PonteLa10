<script setup lang="ts">
const { autenticacionConfigurada, usuarioActual, obtenerSesionActual } = useAutenticacionEditorial()

if (autenticacionConfigurada.value && !usuarioActual.value) {
  await obtenerSesionActual()
}

if (!usuarioActual.value) {
  await navigateTo('/login')
}

useSeoPont3la10({
  titulo: 'Mi cuenta | Pont3la10',
  descripcion: 'Cuenta de usuario de Pont3la10.',
  rutaCanonica: '/cuenta',
  robots: 'noindex, nofollow'
})
</script>

<template>
  <section class="pagina-contenido pagina-cuenta-publica">
    <div class="cabecera-pagina">
      <p class="etiqueta-seccion">Cuenta</p>
      <h1>Mi cuenta</h1>
      <p>{{ usuarioActual?.email }}</p>
    </div>
    <div class="estado-vacio-articulos">
      <h2>Tu cuenta está activa</h2>
      <p>Las preferencias y funciones personales aparecerán aquí cuando estén disponibles.</p>
    </div>
  </section>
</template>
