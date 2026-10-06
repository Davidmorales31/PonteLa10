<script setup lang="ts">
import type { PartidoSeoPublico } from '~/server/utils/partidosSeoPublicos'

const ruta = useRoute()
const slug = String(ruta.params.slug || '')
const { data, error } = await useFetch<{ partido: PartidoSeoPublico }>(
  `/api/partidos-seo/${encodeURIComponent(slug)}`
)

if (error.value || !data.value?.partido) {
  const statusCode = Number(error.value?.statusCode || error.value?.status || 503)
  throw createError({ statusCode, statusMessage: statusCode === 404 ? 'No encontramos ese partido.' : 'No se pudo resolver el partido.' })
}

await navigateTo(`/partidos/${data.value.partido.slug}`, { redirectCode: 301, replace: true })
</script>

<template>
  <div aria-live="polite">Abriendo la ficha del partido…</div>
</template>
