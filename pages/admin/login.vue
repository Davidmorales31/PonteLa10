<script setup lang="ts">
definePageMeta({
  layout: false
})

useSeoMeta({
  title: 'Acceso interno | Ponte la 10',
  robots: 'noindex, nofollow'
})

const route = useRoute()

await navigateTo({ path: '/login', query: route.query })
</script>

<template>
  <div />
</template>
