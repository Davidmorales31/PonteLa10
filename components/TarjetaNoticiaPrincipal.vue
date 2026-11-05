<script setup lang="ts">
import { ArrowRight, CalendarDays } from '@lucide/vue'

interface NoticiaTarjeta {
  slug: string
  titulo: string
  categoria: string
  imagen?: string | null
  imagenAncho?: number
  bajada?: string | null
  resumen?: string | null
  publicadoEn?: string | null
  publicadoHace?: string | null
}

const props = withDefaults(defineProps<{
  articulo: NoticiaTarjeta
  nivelTitulo?: 'h1' | 'h2' | 'h3'
  prioridadAlta?: boolean
  etiqueta?: string
}>(), { nivelTitulo: 'h2', prioridadAlta: false, etiqueta: '' })
const imagenFallida = ref(false)
const tieneImagen = computed(() => Boolean(props.articulo.imagen?.trim()) && !imagenFallida.value)
const fechaVisible = computed(() => {
  if (!props.articulo.publicadoEn) return props.articulo.publicadoHace || ''
  const fecha = new Date(props.articulo.publicadoEn)
  return Number.isNaN(fecha.getTime()) ? props.articulo.publicadoHace || '' : new Intl.DateTimeFormat('es-CO', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'America/Bogota' }).format(fecha)
})
</script>

<template>
  <article class="tarjeta-noticia-principal" :class="{ 'sin-imagen': !tieneImagen }">
    <NuxtLink
      v-if="tieneImagen"
      class="tarjeta-noticia-principal__imagen"
      :to="`/articulos/${encodeURIComponent(articulo.slug)}`"
      tabindex="-1"
      aria-hidden="true"
    >
      <ImagenEditorialPublica
        :src="articulo.imagen || ''"
        :alt="articulo.titulo"
        width="1280"
        height="720"
        :ancho-original="articulo.imagenAncho"
        sizes="(max-width: 760px) 100vw, 55vw"
        :loading="prioridadAlta ? 'eager' : 'lazy'"
        :prioridad-alta="prioridadAlta"
        @error="imagenFallida = true"
      />
    </NuxtLink>
    <div class="tarjeta-noticia-principal__contenido">
      <span class="tarjeta-noticia-principal__categoria">{{ etiqueta || articulo.categoria }}</span>
      <component :is="nivelTitulo" class="tarjeta-noticia-principal__titulo">
        <NuxtLink :to="`/articulos/${encodeURIComponent(articulo.slug)}`">{{ articulo.titulo }}</NuxtLink>
      </component>
      <p v-if="articulo.resumen || articulo.bajada" class="tarjeta-noticia-principal__resumen">{{ articulo.resumen || articulo.bajada }}</p>
      <div class="tarjeta-noticia-principal__pie">
        <time v-if="fechaVisible" :datetime="articulo.publicadoEn || undefined"><CalendarDays aria-hidden="true" />{{ fechaVisible }}</time>
        <NuxtLink :to="`/articulos/${encodeURIComponent(articulo.slug)}`">Leer más <ArrowRight aria-hidden="true" /></NuxtLink>
      </div>
    </div>
  </article>
</template>

<style scoped>
.tarjeta-noticia-principal { position: relative; isolation: isolate; display: flex; min-width: 0; min-height: 420px; flex-direction: column; justify-content: flex-end; overflow: hidden; border: 1px solid #d8e1eb; border-radius: 20px; background: #0b203a; box-shadow: 0 12px 32px rgba(9, 31, 58, .12); }
.tarjeta-noticia-principal__imagen { position: absolute; z-index: -2; inset: 0; display: block; overflow: hidden; background: linear-gradient(135deg,#173b65,#07172b); }
.tarjeta-noticia-principal__imagen::after { position: absolute; inset: 0; background: linear-gradient(180deg,rgba(4,17,33,0) 20%,rgba(4,17,33,.28) 48%,#081c33 100%); content: ''; }
.tarjeta-noticia-principal__imagen img { display: block; width: 100%; height: 100%; object-fit: cover; transition: transform 350ms cubic-bezier(.2,.75,.25,1); }
.tarjeta-noticia-principal:hover .tarjeta-noticia-principal__imagen img { transform: scale(1.025); }
.tarjeta-noticia-principal__contenido { display: grid; gap: 12px; padding: clamp(22px,3vw,36px); color: #fff; }
.tarjeta-noticia-principal__categoria { width: fit-content; max-width: 100%; overflow: hidden; border: 1px solid rgba(255,255,255,.18); border-radius: 999px; background: #087ee4; padding: 6px 12px; color: #fff; font-size: .74rem; font-weight: 800; line-height: 1.2; text-overflow: ellipsis; text-transform: uppercase; white-space: nowrap; }
.tarjeta-noticia-principal__titulo { margin: 0; color: inherit; font-size: clamp(1.7rem,3.1vw,3.3rem); font-weight: 850; letter-spacing: -.04em; line-height: 1.04; text-wrap: balance; }
.tarjeta-noticia-principal__titulo a { color: inherit; text-decoration: none; }
.tarjeta-noticia-principal__titulo a:hover { text-decoration: underline; text-decoration-color: #ffd21e; text-underline-offset: 5px; }
.tarjeta-noticia-principal__resumen { display: -webkit-box; overflow: hidden; margin: 0; color: #e0e8f2; font-size: clamp(.94rem,1.2vw,1.12rem); line-height: 1.48; -webkit-box-orient: vertical; -webkit-line-clamp: 3; }
.tarjeta-noticia-principal__pie { display: flex; align-items: center; gap: 18px; margin-top: 2px; color: #f4f7fb; }
.tarjeta-noticia-principal__pie :is(time, a) { display: inline-flex; align-items: center; gap: 9px; color: inherit; font-size: .92rem; font-weight: 650; text-decoration: none; }
.tarjeta-noticia-principal__pie a { border-left: 1px solid rgba(255,255,255,.55); padding-left: 18px; }
.tarjeta-noticia-principal__pie svg { width: 19px; height: 19px; color: #ffd21e; }
.tarjeta-noticia-principal.sin-imagen { border-bottom: 5px solid #ffd21e; background: linear-gradient(145deg,#12375d,#07172b); }
.tarjeta-noticia-principal :focus-visible { outline: 3px solid #ffd21e; outline-offset: 4px; }
@media(max-width:760px) { .tarjeta-noticia-principal { min-height: 360px; border-radius: 16px; } .tarjeta-noticia-principal__contenido { padding: 22px; } .tarjeta-noticia-principal__titulo { font-size: clamp(1.65rem,7vw,2.5rem); } }
@media(prefers-reduced-motion:reduce) { .tarjeta-noticia-principal__imagen img { transition: none; } }
</style>
