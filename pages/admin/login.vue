<script setup lang="ts">
definePageMeta({
  layout: false
})

const route = useRoute()

await navigateTo({ path: '/login', query: route.query })
</script>

<template>
  <div />
</template>
