<script setup lang="ts">
import { Check, Link2, Share2 } from '@lucide/vue'
import {
  crearUrlCompartirArticulo,
  type RedCompartirArticulo
} from '~/utils/editorial/distribucion'

const props = defineProps<{
  titulo: string
  url: string
  texto?: string
  etiqueta?: string
  variante?: 'superior' | 'inferior'
}>()

const enlaceCopiado = ref(false)
const puedeCompartirNativo = ref(false)
const mensajeCompartir = ref('')

onMounted(() => {
  puedeCompartirNativo.value = typeof navigator.share === 'function'
})

function abrirRed(red: RedCompartirArticulo) {
  const ventana = window.open(
    crearUrlCompartirArticulo(red, props.url, props.texto || props.titulo),
    '_blank',
    'noopener,noreferrer,width=720,height=640'
  )
  ventana?.focus()
}

async function compartirNativo() {
  if (!navigator.share) return
  mensajeCompartir.value = ''
  try {
    await navigator.share({
      title: props.titulo,
      text: props.texto || props.titulo,
      url: props.url
    })
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') return
    mensajeCompartir.value = 'No fue posible abrir el menú para compartir.'
  }
}

async function copiarEnlace() {
  mensajeCompartir.value = ''
  try {
    await navigator.clipboard.writeText(props.url)
    enlaceCopiado.value = true
    window.setTimeout(() => { enlaceCopiado.value = false }, 2200)
  } catch {
    mensajeCompartir.value = 'No fue posible copiar el enlace en este navegador.'
  }
}
</script>

<template>
  <aside
    class="barra-compartir-articulo"
    :class="`barra-compartir-${variante || 'superior'}`"
    :aria-label="`Compartir ${etiqueta || 'esta publicación'}`"
  >
    <strong>{{ variante === 'inferior' ? 'Comparte esta historia' : 'Compartir' }}</strong>
    <div>
      <button
        v-if="puedeCompartirNativo"
        type="button"
        title="Compartir"
        aria-label="Compartir desde tu dispositivo"
        @click="compartirNativo"
      >
        <Share2 aria-hidden="true" />
      </button>
      <button
        type="button"
        title="Compartir en WhatsApp"
        aria-label="Compartir en WhatsApp"
        @click="abrirRed('whatsapp')"
      >
        <IconoRedSocial red="whatsapp" />
      </button>
      <button
        type="button"
        title="Compartir en X"
        aria-label="Compartir en X"
        @click="abrirRed('x')"
      >
        <IconoRedSocial red="x" />
      </button>
      <button
        type="button"
        title="Compartir en Facebook"
        aria-label="Compartir en Facebook"
        @click="abrirRed('facebook')"
      >
        <IconoRedSocial red="facebook" />
      </button>
      <button
        type="button"
        :title="enlaceCopiado ? 'Enlace copiado' : 'Copiar enlace'"
        :aria-label="enlaceCopiado ? 'Enlace copiado' : 'Copiar enlace'"
        @click="copiarEnlace"
      >
        <Check v-if="enlaceCopiado" aria-hidden="true" />
        <Link2 v-else aria-hidden="true" />
      </button>
    </div>
    <span class="sr-only" aria-live="polite">
      {{ enlaceCopiado ? 'Enlace copiado al portapapeles.' : mensajeCompartir }}
    </span>
  </aside>
</template>
