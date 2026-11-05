<script setup lang="ts">
import type { ResumenArticuloPublico } from '~/types/contenidoEditorial'
import { ArrowRight, Pause, Play } from '@lucide/vue'

const propiedades = withDefaults(defineProps<{
  noticias: ResumenArticuloPublico[]
  etiqueta?: string
  descripcionAccesible?: string
  tituloVacio?: string
  rutaNoticias?: string
}>(), {
  etiqueta: 'Fútbol colombiano · Última hora',
  descripcionAccesible: 'Noticias destacadas del fútbol colombiano',
  tituloVacio: 'Las noticias destacadas aparecerán aquí',
  rutaNoticias: '/articulos?categoria=futbol-colombiano'
})
const indiceActivo = ref(0)
const noticiaActiva = computed(() => propiedades.noticias[indiceActivo.value])
const punteroDentro = ref(false)
const focoDentro = ref(false)
const pausadoManualmente = ref(false)
let intervaloCarrusel: ReturnType<typeof setInterval> | undefined

watch(() => propiedades.noticias.length, cantidad => {
  if (indiceActivo.value >= cantidad) indiceActivo.value = 0
})

function cambiarNoticia(indice: number) {
  if (!propiedades.noticias.length) return
  indiceActivo.value = (indice + propiedades.noticias.length) % propiedades.noticias.length
}

function gestionarSalidaFoco(evento: FocusEvent) {
  const contenedor = evento.currentTarget
  const siguienteElemento = evento.relatedTarget
  if (contenedor instanceof HTMLElement && siguienteElemento instanceof Node && contenedor.contains(siguienteElemento)) return
  focoDentro.value = false
}

onMounted(() => {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
  intervaloCarrusel = setInterval(() => {
    if (propiedades.noticias.length > 1 && !document.hidden && !pausadoManualmente.value && !punteroDentro.value && !focoDentro.value) cambiarNoticia(indiceActivo.value + 1)
  }, 5000)
})

onBeforeUnmount(() => {
  if (intervaloCarrusel) clearInterval(intervaloCarrusel)
})
</script>

<template>
  <section class="carrusel-noticias-liga" :aria-label="descripcionAccesible" aria-roledescription="carrusel">
    <article
      v-if="noticiaActiva"
      class="tarjeta-carrusel-liga"
      @mouseenter="punteroDentro = true"
      @mouseleave="punteroDentro = false"
      @focusin="focoDentro = true"
      @focusout="gestionarSalidaFoco"
    >
      <Transition name="imagen-carrusel">
        <NuxtLink
          v-if="noticiaActiva.imagen"
          :key="noticiaActiva.id"
          :to="`/articulos/${noticiaActiva.slug}`"
          class="fondo-tarjeta-carrusel-liga"
          tabindex="-1"
          aria-hidden="true"
        >
          <ImagenEditorialPublica
            :src="noticiaActiva.imagen"
            :alt="noticiaActiva.titulo"
            width="1280"
            height="720"
            :ancho-original="noticiaActiva.imagenAncho"
            sizes="(max-width: 760px) 100vw, 60vw"
            loading="eager"
            prioridad-alta
          />
        </NuxtLink>
      </Transition>
      <Transition name="contenido-carrusel" mode="out-in">
        <div :key="noticiaActiva.id" class="contenido-tarjeta-carrusel-liga">
          <p class="etiqueta-carrusel-liga">{{ etiqueta }}</p>
          <h2><NuxtLink :to="`/articulos/${noticiaActiva.slug}`">{{ noticiaActiva.titulo }}</NuxtLink></h2>
          <p class="resumen-carrusel-liga">{{ noticiaActiva.resumen }}</p>
          <NuxtLink class="accion-carrusel-liga" :to="`/articulos/${noticiaActiva.slug}`">
            Leer noticia <ArrowRight aria-hidden="true" />
          </NuxtLink>
        </div>
      </Transition>
      <nav v-if="propiedades.noticias.length > 1" class="controles-carrusel-liga" aria-label="Elegir noticia destacada">
        <button type="button" class="pausa-carrusel-liga" :aria-label="pausadoManualmente ? 'Reanudar carrusel' : 'Pausar carrusel'" :aria-pressed="pausadoManualmente" @click="pausadoManualmente = !pausadoManualmente"><Play v-if="pausadoManualmente" aria-hidden="true" /><Pause v-else aria-hidden="true" /></button>
        <button
          v-for="(noticia, indice) in propiedades.noticias"
          :key="noticia.id"
          type="button"
          class="indicador-carrusel-liga"
          :aria-label="`Mostrar noticia ${indice + 1}: ${noticia.titulo}`"
          :aria-current="indice === indiceActivo ? 'true' : undefined"
          @click="cambiarNoticia(indice)"
        />
      </nav>
    </article>
    <div v-else class="estado-vacio-carrusel-liga">
      <p class="etiqueta-carrusel-liga">{{ etiqueta }}</p>
      <h2>{{ tituloVacio }}</h2>
      <NuxtLink :to="rutaNoticias">Ver noticias <ArrowRight aria-hidden="true" /></NuxtLink>
    </div>
  </section>
</template>

<style scoped>
.carrusel-noticias-liga {
  min-width: 0;
}

.tarjeta-carrusel-liga,
.estado-vacio-carrusel-liga {
  box-sizing: border-box;
  position: relative;
  display: flex;
  height: clamp(410px, 30vw, 620px);
  min-height: 0;
  overflow: hidden;
  align-items: flex-end;
  border: 1px solid rgb(255 255 255 / 12%);
  border-radius: 22px;
  background: linear-gradient(115deg, #071a2d, #16405b);
  color: #fff;
  box-shadow: 0 14px 34px rgb(11 36 61 / 12%);
  isolation: isolate;
}

.fondo-tarjeta-carrusel-liga,
.fondo-tarjeta-carrusel-liga::after {
  position: absolute;
  inset: 0;
}

.fondo-tarjeta-carrusel-liga {
  z-index: 0;
}

.fondo-tarjeta-carrusel-liga::after {
  z-index: 1;
  background: linear-gradient(90deg, rgb(4 17 29 / 88%) 0%, rgb(4 17 29 / 72%) 43%, rgb(4 17 29 / 36%) 66%, transparent 100%), linear-gradient(0deg, rgb(4 17 29 / 38%), transparent 48%);
  content: '';
}

.fondo-tarjeta-carrusel-liga :deep(img) {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.contenido-tarjeta-carrusel-liga {
  position: relative;
  z-index: 2;
  box-sizing: border-box;
  width: min(70%, 780px);
  max-height: 100%;
  overflow: hidden;
  padding: clamp(24px, 3.2vw, 46px);
}

.imagen-carrusel-enter-active,
.imagen-carrusel-leave-active {
  transition: opacity .8s ease, transform 1.1s cubic-bezier(.2, .7, .2, 1);
}

.imagen-carrusel-enter-from {
  opacity: 0;
  transform: scale(1.055);
}

.imagen-carrusel-leave-to {
  opacity: 0;
  transform: scale(.99);
}

.contenido-carrusel-enter-active,
.contenido-carrusel-leave-active {
  transition: opacity .3s ease, transform .42s cubic-bezier(.2, .7, .2, 1);
}

.contenido-carrusel-enter-from {
  opacity: 0;
  transform: translateX(18px);
}

.contenido-carrusel-leave-to {
  opacity: 0;
  transform: translateX(-10px);
}

.etiqueta-carrusel-liga {
  display: inline-flex;
  margin: 0 0 16px;
  border-radius: 7px;
  background: #e6f4ff;
  color: #07528c;
  padding: 6px 9px;
  font-size: .7rem;
  font-weight: 850;
  line-height: 1.2;
}

.contenido-tarjeta-carrusel-liga h2 {
  display: -webkit-box;
  overflow: hidden;
  margin: 0;
  font-size: clamp(2.3rem, 3.2vw, 3.8rem);
  font-weight: 900;
  letter-spacing: -.04em;
  line-height: 1;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 5;
}

.contenido-tarjeta-carrusel-liga h2 a {
  color: #fff;
  text-decoration: none;
}

.resumen-carrusel-liga {
  display: -webkit-box;
  overflow: hidden;
  margin: 12px 0 16px;
  color: #edf4fa;
  font-size: .96rem;
  line-height: 1.6;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}

.accion-carrusel-liga {
  display: inline-flex;
  min-height: 48px;
  align-items: center;
  gap: 12px;
  border-radius: 12px;
  background: #ffd532;
  color: #102b45;
  padding: 0 18px;
  font-weight: 850;
  text-decoration: none;
}

.accion-carrusel-liga svg {
  width: 19px;
  height: 19px;
}

.accion-carrusel-liga svg {
  width: 19px;
  height: 19px;
}

.accion-carrusel-liga:focus-visible,
.controles-carrusel-liga button:focus-visible {
  outline: 3px solid #fff;
  outline-offset: 3px;
}

.controles-carrusel-liga {
  position: absolute;
  z-index: 3;
  right: 24px;
  bottom: 23px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.controles-carrusel-liga .indicador-carrusel-liga {
  display: grid;
  width: 24px;
  height: 28px;
  align-items: center;
  border: 0;
  padding: 0;
  background: transparent;
  cursor: pointer;
}

.indicador-carrusel-liga::after {
  width: 100%;
  height: 7px;
  border-radius: 99px;
  background: rgb(255 255 255 / 48%);
  content: '';
}

.indicador-carrusel-liga[aria-current='true']::after {
  background: #ffd532;
}

.pausa-carrusel-liga { display: grid; width: 30px; height: 30px; place-items: center; border: 1px solid rgb(255 255 255 / 48%); border-radius: 50%; background: rgb(4 17 29 / 45%); color: #fff; cursor: pointer; }
.pausa-carrusel-liga svg { width: 14px; height: 14px; }
.estado-vacio-carrusel-liga > a { display: inline-flex; align-items: center; gap: 8px; }
.estado-vacio-carrusel-liga > a svg { width: 18px; height: 18px; }

.estado-vacio-carrusel-liga {
  min-height: 300px;
  flex-direction: column;
  align-items: flex-start;
  justify-content: center;
  padding: clamp(24px, 3.2vw, 46px);
}

.estado-vacio-carrusel-liga h2 {
  max-width: 24ch;
  margin: 0 0 18px;
  font-size: clamp(1.7rem, 3.5vw, 2.7rem);
}

.estado-vacio-carrusel-liga > a {
  color: #ffe16d;
  font-weight: 800;
}

@media (prefers-reduced-motion: reduce) {
  .imagen-carrusel-enter-active,
  .imagen-carrusel-leave-active,
  .contenido-carrusel-enter-active,
  .contenido-carrusel-leave-active {
    transition-duration: .01ms;
  }
}

@media (max-width: 680px) {
  .tarjeta-carrusel-liga {
    height: 430px;
    border-radius: 17px;
  }

  .fondo-tarjeta-carrusel-liga::after {
    background: linear-gradient(0deg, rgb(4 17 29 / 94%) 0%, rgb(4 17 29 / 76%) 47%, rgb(4 17 29 / 22%) 100%);
  }

  .contenido-tarjeta-carrusel-liga {
    width: 100%;
    padding: 22px 18px 54px;
  }

  .contenido-tarjeta-carrusel-liga h2 {
    font-size: clamp(1.9rem, 8vw, 2.6rem);
    -webkit-line-clamp: 4;
  }

  .controles-carrusel-liga {
    right: 17px;
    bottom: 18px;
  }
}
</style>
