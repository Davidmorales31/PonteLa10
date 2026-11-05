<script setup lang="ts">
import { ArrowLeft, ArrowRight } from '@lucide/vue'
import type { ResumenArticuloPublico } from '~/types/contenidoEditorial'

withDefaults(defineProps<{
  noticias: ResumenArticuloPublico[]
  etiqueta?: string
  descripcionAccesible?: string
}>(), { etiqueta: '', descripcionAccesible: 'Más noticias' })
const carril = ref<HTMLElement | null>(null)
const puedeRetroceder = ref(false)
const puedeAvanzar = ref(false)
let observador: ResizeObserver | undefined

function actualizarDesplazamiento() {
  if (!carril.value) return
  puedeRetroceder.value = carril.value.scrollLeft > 2
  puedeAvanzar.value = carril.value.scrollLeft + carril.value.clientWidth < carril.value.scrollWidth - 2
}

function desplazar(direccion: number) {
  if (!carril.value) return
  carril.value.scrollBy({ left: direccion * carril.value.clientWidth * .8, behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' })
}

onMounted(() => {
  actualizarDesplazamiento()
  observador = new ResizeObserver(actualizarDesplazamiento)
  if (carril.value) observador.observe(carril.value)
})
onUpdated(actualizarDesplazamiento)
onBeforeUnmount(() => observador?.disconnect())
</script>

<template>
  <div class="carrusel-noticias-secundarias">
    <div class="controles-noticias-secundarias">
      <p>{{ descripcionAccesible }}</p>
      <div>
        <button type="button" aria-label="Ver noticias anteriores" :disabled="!puedeRetroceder" @click="desplazar(-1)"><ArrowLeft aria-hidden="true" /></button>
        <button type="button" aria-label="Ver más noticias" :disabled="!puedeAvanzar" @click="desplazar(1)"><ArrowRight aria-hidden="true" /></button>
      </div>
    </div>
    <div ref="carril" class="carril-noticias-secundarias" tabindex="0" role="region" :aria-label="descripcionAccesible" @scroll.passive="actualizarDesplazamiento">
      <TarjetaNoticiaSecundaria v-for="noticia in noticias" :key="noticia.slug" :articulo="noticia" :etiqueta="etiqueta" mostrar-resumen />
    </div>
  </div>
</template>

<style scoped>
.carrusel-noticias-secundarias { min-width: 0; }
.controles-noticias-secundarias { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 10px; }
.controles-noticias-secundarias > p { margin: 0; color: var(--europa-tinta-suave, #405778); font-size: .82rem; font-weight: 750; }
.controles-noticias-secundarias > div { display: flex; gap: 6px; }
.controles-noticias-secundarias button { display: grid; width: 34px; height: 34px; place-items: center; border: 1px solid var(--europa-borde, #dce5ef); border-radius: 50%; background: var(--europa-superficie, #fff); color: var(--europa-acento, #075ba9); cursor: pointer; }
.controles-noticias-secundarias button:disabled { opacity: .4; cursor: default; }
.controles-noticias-secundarias svg { width: 17px; height: 17px; }
.carril-noticias-secundarias { display: grid; grid-auto-columns: minmax(320px, 38%); grid-auto-flow: column; gap: 14px; overflow-x: auto; overscroll-behavior-inline: contain; padding: 3px 2px 12px; scroll-padding-inline: 2px; scroll-snap-type: inline mandatory; scrollbar-color: #9eb6d0 transparent; scrollbar-width: thin; }
.carril-noticias-secundarias :deep(.tarjeta-noticia-secundaria) { min-height: 180px; flex-direction: row; scroll-snap-align: start; }
.carril-noticias-secundarias :deep(.tarjeta-noticia-secundaria__imagen) { min-height: 180px; flex: 0 0 36%; aspect-ratio: auto; }
.carril-noticias-secundarias :deep(.tarjeta-noticia-secundaria__contenido) { justify-content: center; gap: 7px; padding: 13px; }
.carril-noticias-secundarias :deep(.tarjeta-noticia-secundaria__titulo) { font-size: 1rem; }
.carril-noticias-secundarias :deep(.tarjeta-noticia-secundaria__categoria) { font-size: .59rem; }
.carril-noticias-secundarias :deep(.tarjeta-noticia-secundaria__resumen) { font-size: .78rem; }
.carril-noticias-secundarias :deep(.tarjeta-noticia-secundaria__fecha) { font-size: .74rem; }
.carril-noticias-secundarias:focus-visible, .controles-noticias-secundarias button:focus-visible { outline: 3px solid #1689cb; outline-offset: 2px; border-radius: 12px; }
@media (max-width: 1000px) { .carril-noticias-secundarias { grid-auto-columns: minmax(300px, 49%); } }
@media (max-width: 600px) { .carril-noticias-secundarias { grid-auto-columns: minmax(270px, 88%); gap: 10px; } .carril-noticias-secundarias :deep(.tarjeta-noticia-secundaria), .carril-noticias-secundarias :deep(.tarjeta-noticia-secundaria__imagen) { min-height: 166px; } }
</style>
