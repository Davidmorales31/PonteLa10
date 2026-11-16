<script setup lang="ts">
// La app móvil abre directo el editor: lienzo primero, sin pantallas intermedias.
definePageMeta({ layout: false, middleware: 'autenticacion-editorial', permisoEditorial: 'contenido.verBorradores' })
useSeoMeta({ robots: 'noindex, nofollow' })
await navigateTo('/admin/redes/propias/nuevo', { replace: true })
</script>

<template>
  <p>Abriendo el editor…</p>
</template>
