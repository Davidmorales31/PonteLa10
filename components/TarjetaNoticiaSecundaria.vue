<script setup lang="ts">
import { CalendarDays } from '@lucide/vue'

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
  nivelTitulo?: 'h2' | 'h3' | 'h4'
  mostrarResumen?: boolean
  etiqueta?: string
}>(), { nivelTitulo: 'h3', mostrarResumen: false, etiqueta: '' })
const imagenFallida = ref(false)
const tieneImagen = computed(() => Boolean(props.articulo.imagen?.trim()) && !imagenFallida.value)
const fechaVisible = computed(() => {
  if (!props.articulo.publicadoEn) return props.articulo.publicadoHace || ''
  const fecha = new Date(props.articulo.publicadoEn)
  return Number.isNaN(fecha.getTime()) ? props.articulo.publicadoHace || '' : new Intl.DateTimeFormat('es-CO', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'America/Bogota' }).format(fecha)
})

</script>

<template>
  <article class="tarjeta-noticia-secundaria" :class="{ 'sin-imagen': !tieneImagen }">
    <NuxtLink v-if="tieneImagen" class="tarjeta-noticia-secundaria__imagen" :to="`/articulos/${encodeURIComponent(articulo.slug)}`" tabindex="-1" aria-hidden="true">
      <ImagenEditorialPublica
        :src="articulo.imagen || ''"
        :alt="articulo.titulo"
        width="800"
        height="450"
        :ancho-original="articulo.imagenAncho"
        sizes="(max-width: 760px) 100vw, (max-width: 1200px) 50vw, 400px"
        loading="lazy"
        decoding="async"
        @error="imagenFallida = true"
      />
    </NuxtLink>
    <div class="tarjeta-noticia-secundaria__contenido">
      <span class="tarjeta-noticia-secundaria__categoria">{{ etiqueta || articulo.categoria }}</span>
      <component :is="nivelTitulo" class="tarjeta-noticia-secundaria__titulo"><NuxtLink :to="`/articulos/${encodeURIComponent(articulo.slug)}`">{{ articulo.titulo }}</NuxtLink></component>
      <p v-if="mostrarResumen && (articulo.resumen || articulo.bajada)" class="tarjeta-noticia-secundaria__resumen">{{ articulo.resumen || articulo.bajada }}</p>
      <time v-if="fechaVisible" class="tarjeta-noticia-secundaria__fecha" :datetime="articulo.publicadoEn || undefined"><CalendarDays aria-hidden="true" />{{ fechaVisible }}</time>
    </div>
  </article>
</template>

<style scoped>
.tarjeta-noticia-secundaria { display: flex; min-width: 0; min-height: 0; flex-direction: column; overflow: hidden; border: 1px solid #dce4ec; border-radius: 16px; background: #fff; box-shadow: 0 4px 12px rgba(14,35,62,.08); transition: border-color 180ms ease, box-shadow 180ms ease, transform 180ms ease; }
.tarjeta-noticia-secundaria:hover { transform: translateY(-2px); border-color: #bfd1e3; box-shadow: 0 10px 22px rgba(14,35,62,.13); }
.tarjeta-noticia-secundaria__imagen { display: block; overflow: hidden; aspect-ratio: 16 / 8.2; background: #e6edf5; }
.tarjeta-noticia-secundaria__imagen img { display: block; width: 100%; height: 100%; object-fit: cover; transition: transform 300ms cubic-bezier(.2,.75,.25,1); }
.tarjeta-noticia-secundaria:hover .tarjeta-noticia-secundaria__imagen img { transform: scale(1.035); }
.tarjeta-noticia-secundaria__contenido { display: flex; flex: 1; min-width: 0; flex-direction: column; align-items: flex-start; gap: 8px; padding: 15px 17px 16px; }
.tarjeta-noticia-secundaria__categoria { max-width: 100%; overflow: hidden; border: 1px solid #c5dcf3; border-radius: 999px; background: #edf6ff; padding: 4px 9px; color: #0562a6; font-size: .68rem; font-weight: 850; line-height: 1.25; text-overflow: ellipsis; text-transform: uppercase; white-space: nowrap; }
.tarjeta-noticia-secundaria__titulo { display: -webkit-box; overflow: hidden; margin: 0; color: #0e2545; font-size: clamp(1rem,1.28vw,1.22rem); font-weight: 800; letter-spacing: -.025em; line-height: 1.22; text-wrap: balance; -webkit-box-orient: vertical; -webkit-line-clamp: 3; }
.tarjeta-noticia-secundaria__titulo a { color: inherit; text-decoration: none; }
.tarjeta-noticia-secundaria__titulo a:hover { color: #075f9e; }
.tarjeta-noticia-secundaria__resumen { display: -webkit-box; overflow: hidden; margin: 0; color: #53657b; font-size: .86rem; line-height: 1.45; -webkit-box-orient: vertical; -webkit-line-clamp: 2; }
.tarjeta-noticia-secundaria__fecha { display: inline-flex; align-items: center; gap: 8px; margin-top: auto; padding-top: 4px; color: #465b74; font-size: .86rem; line-height: 1.3; }
.tarjeta-noticia-secundaria__fecha svg { width: 18px; height: 18px; color: #33516f; }
.tarjeta-noticia-secundaria :focus-visible { outline: 3px solid #087ee4; outline-offset: 3px; }
.tarjeta-noticia-secundaria.sin-imagen { border-top: 3px solid #ffca18; }
body.tema-publico-azul .tarjeta-noticia-secundaria { border-color: #294467; background: #0d2440; }
body.tema-publico-azul .tarjeta-noticia-secundaria__titulo { color: #f2f6fb; }
body.tema-publico-azul .tarjeta-noticia-secundaria__fecha, body.tema-publico-azul .tarjeta-noticia-secundaria__resumen { color: #bdcadd; }
body.tema-publico-azul .tarjeta-noticia-secundaria__fecha svg { color: #ffd21e; }
@media(prefers-reduced-motion:reduce) { .tarjeta-noticia-secundaria, .tarjeta-noticia-secundaria__imagen img { transition: none; } .tarjeta-noticia-secundaria:hover { transform: none; } }
</style>
