<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { crearDocumentoAdsterra } from '~/utils/publicidad/crearDocumentoAdsterra'

const propiedades = withDefaults(defineProps<{
  formato: 'nativo' | 'leaderboard'
  contexto: string
}>(), {})

const { publicidadAutorizada } = useAnaliticaPublica()
const espacio = ref<HTMLElement | null>(null)
const visible = ref(false)
const escala = ref(1)
let observador: IntersectionObserver | null = null
let observadorAncho: ResizeObserver | null = null

const documentoAnuncio = computed(() => {
  if (!publicidadAutorizada.value || !visible.value) return ''
  return crearDocumentoAdsterra(propiedades.formato)
})

const altoMarco = computed(() => propiedades.formato === 'leaderboard' ? 90 * escala.value : 280)
const estiloMarco = computed(() => propiedades.formato === 'leaderboard'
  ? { width: '728px', height: '90px', transform: `translateX(-50%) scale(${escala.value})` }
  : { width: '100%', height: '280px' })

function actualizarEscala() {
  const anchoDisponible = espacio.value?.clientWidth || 728
  escala.value = Math.min(1, Math.max(0.42, anchoDisponible / 728))
}

function observarEspacio() {
  if (!espacio.value || !publicidadAutorizada.value) return
  actualizarEscala()
  if ('ResizeObserver' in window && !observadorAncho) {
    observadorAncho = new ResizeObserver(actualizarEscala)
    observadorAncho.observe(espacio.value)
  }
  if (!('IntersectionObserver' in window)) {
    visible.value = true
    return
  }
  observador = new IntersectionObserver(([entrada]) => {
    if (!entrada?.isIntersecting) return
    visible.value = true
    observador?.disconnect()
  }, { rootMargin: '240px 0px', threshold: 0.01 })
  observador.observe(espacio.value)
}

watch(publicidadAutorizada, async permitida => {
  if (!permitida) {
    visible.value = false
    observador?.disconnect()
    observadorAncho?.disconnect()
    observador = null
    observadorAncho = null
    return
  }
  await nextTick()
  observarEspacio()
})

onMounted(observarEspacio)

onBeforeUnmount(() => {
  observador?.disconnect()
  observadorAncho?.disconnect()
})
</script>

<template>
  <aside
    v-show="publicidadAutorizada"
    ref="espacio"
    class="espacio-adsterra"
    :class="`espacio-adsterra--${formato}`"
    :aria-label="`Publicidad de Adsterra: ${contexto}`"
  >
    <p class="espacio-adsterra__rotulo">Publicidad</p>
    <div class="espacio-adsterra__marco" :style="{ height: `${altoMarco}px` }">
      <iframe
        v-if="documentoAnuncio"
        :key="`${formato}-${publicidadAutorizada ? 'permitido' : 'bloqueado'}`"
        :srcdoc="documentoAnuncio"
        :title="`Anuncio de Adsterra en ${contexto}`"
        :style="estiloMarco"
        loading="lazy"
        referrerpolicy="strict-origin-when-cross-origin"
        sandbox="allow-scripts allow-top-navigation-by-user-activation"
      />
    </div>
  </aside>
</template>

<style scoped>
.espacio-adsterra {
  min-width: 0;
  margin: 1.25rem 0;
  overflow: hidden;
  border: 0;
  border-radius: 0;
  background: transparent;
}

.espacio-adsterra__rotulo {
  margin: 0;
  padding: .45rem .7rem;
  color: #52647a;
  background: transparent;
  font-size: .62rem;
  font-weight: 700;
  letter-spacing: .08em;
  text-align: right;
  text-transform: uppercase;
}

.espacio-adsterra__marco {
  position: relative;
  width: 100%;
  overflow: hidden;
}

.espacio-adsterra iframe {
  position: absolute;
  top: 0;
  left: 50%;
  display: block;
  border: 0;
  transform: translateX(-50%);
  transform-origin: top center;
}

.espacio-adsterra--nativo iframe {
  transform-origin: top center;
}

@media (prefers-reduced-motion: reduce) {
  .espacio-adsterra { scroll-behavior: auto; }
}
</style>
