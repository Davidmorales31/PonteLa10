<script setup lang="ts">
import { parse } from 'opentype.js'
import type { Font } from 'opentype.js'
import type { MedioEditorial } from '~/types/mediaEditorial'
import { componerSvgSocial } from '~/utils/editorial/composicionSocial'
import type { DiapositivaSocial, FormatoSocial } from '~/utils/editorial/publicacionesSociales'
import { formatosSociales, rutaImagenCtaSocial } from '~/utils/editorial/publicacionesSociales'

const props = defineProps<{ diapositiva: DiapositivaSocial, formato: FormatoSocial, medio: MedioEditorial | null, dominio: string, guias?: boolean, soloLectura?: boolean }>()
const emit = defineEmits<{ mover: [x: number, y: number], error: [mensaje: string] }>()
const fuente = shallowRef<Font | null>(null)
const error = ref('')
const svg = computed(() => {
  if (!fuente.value) return ''
  try {
    return componerSvgSocial({ diapositiva: props.diapositiva, formato: props.formato, fuente: fuente.value,
      imagen: props.medio ? { url: props.medio.urlPublica, ancho: props.medio.ancho, alto: props.medio.alto } : null,
      logo: '/brand/pont3la10_logo_login_blanco.png', dominio: props.dominio, credito: props.medio?.credito,
      imagenCta: rutaImagenCtaSocial })
  } catch (problema) { return problema instanceof Error ? problema.message : 'No se pudo mostrar la pieza.' }
})
watch(svg, valor => emit('error', valor && !valor.startsWith('<svg') ? valor : ''), { immediate: true })
onMounted(async () => {
  try {
    const respuesta = await fetch('/fonts/Montserrat-Bold.ttf')
    if (!respuesta.ok) throw new Error()
    fuente.value = parse(await respuesta.arrayBuffer())
  } catch { error.value = 'No se pudo cargar la tipografía de la plantilla.'; emit('error', error.value) }
})
let arrastre: { x: number, y: number, inicioX: number, inicioY: number, elemento: HTMLElement } | null = null
function iniciar(evento: PointerEvent) {
  if (props.soloLectura || props.diapositiva.tipo === 'cta') return
  const elemento = evento.currentTarget as HTMLElement
  elemento.setPointerCapture(evento.pointerId)
  const encuadre = props.diapositiva.encuadres[props.formato]
  arrastre = { x: evento.clientX, y: evento.clientY, inicioX: encuadre.x, inicioY: encuadre.y, elemento }
}
function mover(evento: PointerEvent) {
  if (!arrastre) return
  const rectangulo = arrastre.elemento.getBoundingClientRect()
  const limitar = (valor: number) => Math.max(-100, Math.min(100, Math.round(valor)))
  const imagen = props.medio
  if (!imagen || imagen.ancho <= 0 || imagen.alto <= 0) return
  const formato = formatosSociales[props.formato]
  const escala = Math.max(formato.ancho / imagen.ancho, formato.alto / imagen.alto) * props.diapositiva.encuadres[props.formato].zoom
  const excedenteX = (imagen.ancho * escala - formato.ancho) * rectangulo.width / formato.ancho
  const excedenteY = (imagen.alto * escala - formato.alto) * rectangulo.height / formato.alto
  emit('mover', limitar(arrastre.inicioX + (excedenteX > .1 ? (evento.clientX - arrastre.x) / excedenteX * 200 : 0)),
    limitar(arrastre.inicioY + (excedenteY > .1 ? (evento.clientY - arrastre.y) / excedenteY * 200 : 0)))
}
</script>

<template>
  <div
    class="lienzo-social" :class="{ 'con-guias': guias, 'solo-lectura': soloLectura }"
    role="img" :aria-label="`Vista previa: ${diapositiva.titular.replaceAll('**', '')}.${soloLectura ? '' : ' Usa los controles de posición para ajustar la fotografía.'}`"
    @pointerdown="iniciar" @pointermove="mover" @pointerup="arrastre = null" @pointercancel="arrastre = null">
    <!-- SVG construido por nuestro compositor: texto convertido a trazados y atributos escapados. -->
    <!-- eslint-disable-next-line vue/no-v-html -->
    <div v-if="svg.startsWith('<svg')" class="svg-social" v-html="svg" />
    <p v-else role="status">{{ error || svg || 'Preparando vista previa…' }}</p>
  </div>
</template>

<style scoped>
.lienzo-social{position:relative;width:100%;overflow:hidden;touch-action:none;background:#08204a;color:white;cursor:grab;box-shadow:0 12px 35px #08204a20}
.lienzo-social:active{cursor:grabbing}.lienzo-social p{padding:60px 28px;text-align:center}.svg-social{line-height:0}.svg-social :deep(svg){display:block;width:100%;height:auto;pointer-events:none}
.lienzo-social.solo-lectura{cursor:default;touch-action:auto}
.con-guias::after{content:'';position:absolute;inset:0;pointer-events:none;background:linear-gradient(90deg,transparent 33.2%,#ffffff60 33.3%,transparent 33.5%,transparent 66.5%,#ffffff60 66.6%,transparent 66.8%),linear-gradient(0deg,transparent 33.2%,#ffffff60 33.3%,transparent 33.5%,transparent 66.5%,#ffffff60 66.6%,transparent 66.8%)}
</style>
