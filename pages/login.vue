<script setup lang="ts">
definePageMeta({
  layout: false
})

useSeoPont3la10({
  titulo: 'Iniciar sesión | Ponte la 10',
  descripcion: 'Accede a tu cuenta de Ponte la 10.',
  robots: 'noindex, nofollow'
})
</script>

<template>
  <main class="pagina-login-limpia">
    <section class="auth-page auth-page-editorial">
      <PanelLoginEditorial />
      <FormularioLoginEditorial />
    </section>
  </main>
</template>
