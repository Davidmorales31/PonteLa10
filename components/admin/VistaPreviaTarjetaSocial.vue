<script setup lang="ts">
import { AlertTriangle, CheckCircle2, ImageOff } from '@lucide/vue'
import type { MedioEditorial } from '~/types/mediaEditorial'
import {
  construirTituloMetaConMarca,
  evaluarTarjetaSocial,
  limiteDescripcionMeta,
  normalizarTextoMeta
} from '~/utils/seo'

type RedVistaPrevia = 'facebook' | 'x' | 'whatsapp'

const props = defineProps<{
  titulo: string
  descripcion: string
  slug: string
  portada: MedioEditorial | null
}>()

const redActiva = ref<RedVistaPrevia>('facebook')
const redes: Array<{ id: RedVistaPrevia, etiqueta: string }> = [
  { id: 'facebook', etiqueta: 'Facebook' },
  { id: 'x', etiqueta: 'X' },
  { id: 'whatsapp', etiqueta: 'WhatsApp' }
]

const tituloTarjeta = computed(() => construirTituloMetaConMarca(props.titulo))
const descripcionTarjeta = computed(() => normalizarTextoMeta(
  props.descripcion,
  limiteDescripcionMeta
))
const rutaTarjeta = computed(() => `pont3la10.com/articulos/${props.slug || 'noticia'}`)
const comprobaciones = computed(() => evaluarTarjetaSocial({
  titulo: tituloTarjeta.value,
  descripcion: descripcionTarjeta.value,
  tieneImagen: Boolean(props.portada),
  textoAlternativo: props.portada?.esDecorativa
    ? ''
    : props.portada?.textoAlternativo,
  anchoImagen: props.portada?.ancho,
  altoImagen: props.portada?.alto
}))
const observaciones = computed(() => comprobaciones.value.filter(
  comprobacion => comprobacion.estado !== 'correcto'
))
const tieneErrores = computed(() => comprobaciones.value.some(
  comprobacion => comprobacion.estado === 'error'
))
const tieneAdvertencias = computed(() => comprobaciones.value.some(
  comprobacion => comprobacion.estado === 'advertencia'
))
const estadoTarjeta = computed(() => {
  if (tieneErrores.value) {
    return { etiqueta: 'Incompleta', clase: 'estado-tarjeta-error' }
  }
  if (tieneAdvertencias.value) {
    return { etiqueta: 'Por mejorar', clase: 'estado-tarjeta-advertencia' }
  }
  return { etiqueta: 'Lista', clase: 'estado-tarjeta-lista' }
})
</script>

<template>
  <section class="control-tarjeta-social">
    <header>
      <div>
        <span>Tarjeta al compartir</span>
        <h3>Vista previa social</h3>
      </div>
      <strong :class="estadoTarjeta.clase">
        <AlertTriangle v-if="tieneErrores || tieneAdvertencias" aria-hidden="true" />
        <CheckCircle2 v-else aria-hidden="true" />
        {{ estadoTarjeta.etiqueta }}
      </strong>
    </header>

    <div class="selector-red-tarjeta" role="tablist" aria-label="Red social de la vista previa">
      <button
        v-for="red in redes"
        :key="red.id"
        type="button"
        role="tab"
        :aria-selected="redActiva === red.id"
        :class="{ activo: redActiva === red.id }"
        @click="redActiva = red.id"
      >
        <IconoRedSocial :red="red.id" />
        {{ red.etiqueta }}
      </button>
    </div>

    <div class="tarjeta-social-editor" :class="`tarjeta-social-${redActiva}`">
      <div class="imagen-tarjeta-social">
        <img
          v-if="portada"
          :src="portada.urlPublica"
          :alt="portada.esDecorativa ? '' : portada.textoAlternativo"
          width="1200"
          height="630"
        >
        <div v-else class="imagen-tarjeta-vacia">
          <ImageOff aria-hidden="true" />
          <span>Sin portada</span>
        </div>
      </div>
      <div class="contenido-tarjeta-social">
        <span>{{ rutaTarjeta }}</span>
        <strong>{{ tituloTarjeta }}</strong>
        <p>{{ descripcionTarjeta || 'Agrega una descripción SEO para presentar la noticia.' }}</p>
      </div>
    </div>

    <ul v-if="observaciones.length" class="observaciones-tarjeta-social">
      <li v-for="observacion in observaciones" :key="observacion.id">
        <AlertTriangle aria-hidden="true" />
        <span>{{ observacion.mensaje }}</span>
      </li>
    </ul>
    <p v-else class="tarjeta-social-correcta">
      <CheckCircle2 aria-hidden="true" />
      La tarjeta cumple las recomendaciones editoriales.
    </p>
  </section>
</template>
