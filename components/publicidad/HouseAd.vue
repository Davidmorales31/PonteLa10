<script setup lang="ts">
const props = withDefaults(defineProps<{
  label?: string
  advertiser?: string
  image?: string
  title: string
  description: string
  cta: string
  href: string
  campaignId: string
}>(), {
  label: 'Publicidad',
  advertiser: 'Pont3la10 Labs',
  image: ''
})

const anuncio = ref<HTMLElement | null>(null)
const imagenFallida = ref('')
const mostrarImagen = computed(() => Boolean(props.image) && imagenFallida.value !== props.image)
let observador: IntersectionObserver | null = null

function registrarEvento(tipo: 'impresion' | 'click') {
  if (!import.meta.client) return
  window.dispatchEvent(new CustomEvent('pont3la10:publicidad', {
    detail: { tipo, campaignId: props.campaignId, advertiser: props.advertiser }
  }))
}

onMounted(() => {
  if (!anuncio.value || !('IntersectionObserver' in window)) {
    registrarEvento('impresion')
    return
  }

  observador = new IntersectionObserver(([entrada]) => {
    if (!entrada?.isIntersecting) return
    registrarEvento('impresion')
    observador?.disconnect()
  }, { threshold: 0.5 })
  observador.observe(anuncio.value)
})

onBeforeUnmount(() => observador?.disconnect())
</script>

<template>
  <aside ref="anuncio" class="house-ad" :class="{ 'house-ad-pieza-real': mostrarImagen }" :aria-label="`${label}: ${advertiser}`">
    <template v-if="mostrarImagen">
      <p class="house-ad-identificador">{{ label }} · {{ advertiser }}</p>
      <a :href="href" :aria-label="`${cta} (abre en otra pestaña)`" target="_blank" rel="noopener noreferrer" @click="registrarEvento('click')">
        <img :src="image" :alt="`${title} ${description}`" width="1672" height="941" loading="lazy" decoding="async" @error="imagenFallida = image">
      </a>
      <a class="contacto-anuncio" href="mailto:contact@pont3la10.com">Patrocinios y alianzas: contact@pont3la10.com ↗</a>
    </template>
    <div v-else class="house-ad-contenido">
      <p class="house-ad-identificador">{{ label }} <span aria-hidden="true">·</span> {{ advertiser }}</p>
      <h2>{{ title }}</h2>
      <p>{{ description }}</p>
      <a :href="href" target="_blank" rel="noopener noreferrer" @click="registrarEvento('click')">
        {{ cta }}
        <span aria-hidden="true">→</span>
      </a>
      <small>labs.pont3la10.com</small>
    </div>
  </aside>
</template>

<style scoped>
.house-ad.house-ad-pieza-real { display: block; min-height: 0; margin: 0; background: #071a36; border: 1px solid #294467; border-radius: 9px; align-self: start; }
.house-ad-pieza-real .house-ad-identificador { padding: 10px 14px; color: #c9d6e8; font-size: .6rem; letter-spacing: .06em; background: #183556; }
.house-ad-pieza-real > a { display: block; }
.house-ad-pieza-real img { display: block; width: 100%; height: auto; }
.house-ad-pieza-real .contacto-anuncio { padding: 10px 12px; color: #c9d6e8; font-size: .65rem; text-align: center; }
.house-ad-pieza-real a:focus-visible { outline: 3px solid #ffd800; outline-offset: -3px; }
</style>
