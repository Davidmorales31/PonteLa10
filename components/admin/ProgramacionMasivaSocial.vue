<script setup lang="ts">
import PanelModal from '~/components/admin/ui/PanelModal.vue'
import { fechasProgramacionSocial, inicioProgramacionColombia } from '~/utils/editorial/programacionSocial'
import type { DestinoMeta } from '~/types/publicacionMeta'
import type { ColaProgramacionSocial } from '~/types/programacionSocial'

/** Modal para programar en lote las noticias seleccionadas (Facebook e Instagram). La cola y sus resultados viven en la pestaña «Programadas». */
const props = defineProps<{ abierto: boolean, seleccion: { id: string, titulo: string }[] }>()
const emit = defineEmits<{ limpiar: [], cerrar: [] }>()

const { data: cola, refresh } = await useFetch<ColaProgramacionSocial>('/api/admin/redes/programacion/cola', { key: 'cola-programacion-social' })
const inicio = ref('')
const intervalo = ref(15)
const destinos = ref<DestinoMeta[]>(['facebook', 'instagram'])
const confirmando = ref(false)
const guardando = ref(false)
const problema = ref('')
const mensaje = ref('')
const operacion = ref('')
const inicioIso = computed(() => inicioProgramacionColombia(inicio.value))
const horarios = computed(() => inicioIso.value ? fechasProgramacionSocial(inicioIso.value, intervalo.value || 1, props.seleccion.length) : [])
const fechaLegible = (fecha: string) => new Date(fecha).toLocaleString('es-CO', { timeZone: 'America/Bogota', dateStyle: 'short', timeStyle: 'short' })

watch([inicio, intervalo, destinos, () => props.seleccion.map(item => item.id).join(',')], () => {
  confirmando.value = false
  operacion.value = ''
}, { deep: true })

watch(() => props.abierto, (abierto) => {
  if (!abierto) return
  confirmando.value = false
  problema.value = ''
  mensaje.value = ''
  void refresh()
})

async function programar() {
  if (!confirmando.value || guardando.value || !cola.value?.activo || !props.seleccion.length || !inicioIso.value || !destinos.value.length) return
  guardando.value = true
  problema.value = ''
  mensaje.value = ''
  operacion.value ||= crypto.randomUUID()
  try {
    const respuesta = await $fetch<{ cantidad: number }>('/api/admin/redes/programacion/cola', {
      method: 'POST',
      body: {
        operacionId: operacion.value,
        confirmar: true,
        articulos: props.seleccion.map(item => item.id),
        destinos: destinos.value,
        inicio: inicioIso.value,
        intervaloMinutos: intervalo.value
      }
    })
    mensaje.value = `${respuesta.cantidad} noticias programadas. No se publicarán antes de la hora inicial.`
    confirmando.value = false
    emit('limpiar')
    await refresh()
    emit('cerrar')
  } catch (error) {
    problema.value = (error as { data?: { statusMessage?: string } }).data?.statusMessage || 'No se confirmó el lote. Actualiza la cola antes de reintentar.'
  } finally {
    guardando.value = false
  }
}

onMounted(() => {
  inicio.value = new Intl.DateTimeFormat('sv-SE', { timeZone: 'America/Bogota', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false })
    .format(new Date(Date.now() + 5 * 60000)).replace(' ', 'T')
})
</script>

<template>
  <PanelModal
    :abierto="abierto"
    :titulo="`Programar ${seleccion.length} ${seleccion.length === 1 ? 'noticia' : 'noticias'}`"
    descripcion="Se publican en Facebook e Instagram, una tras otra, a la hora que elijas (hora de Colombia)."
    ancho="lg"
    :bloqueado="guardando"
    @cerrar="emit('cerrar')"
  >
    <p :class="cola?.activo ? 'programador-activo' : 'programador-inactivo'" role="status">
      {{ cola?.activo ? 'Programador activo' : 'Programador sin conexión: no se crearán nuevos lotes.' }}
    </p>

    <form id="formulario-programacion" class="programacion-formulario" @submit.prevent="confirmando = true">
      <fieldset :disabled="guardando">
        <legend class="sr-only">Horario y destinos</legend>
        <label>Hora inicial
          <input v-model="inicio" class="campo-panel" type="datetime-local" required>
        </label>
        <label>Cada cuántos minutos
          <input v-model.number="intervalo" class="campo-panel" type="number" min="1" max="1440" required>
        </label>
        <div class="programacion-destinos" role="group" aria-label="Destinos">
          <label><input v-model="destinos" type="checkbox" value="facebook"> Facebook</label>
          <label><input v-model="destinos" type="checkbox" value="instagram"> Instagram</label>
        </div>
      </fieldset>

      <ol v-if="seleccion.length" class="orden-programacion">
        <li v-for="(item, posicion) in seleccion" :key="item.id">
          <strong>{{ item.titulo }}</strong>
          <span>{{ horarios[posicion] ? fechaLegible(horarios[posicion]!) : 'Elige la hora inicial' }}</span>
        </li>
      </ol>
      <p v-else class="programacion-nota">Selecciona noticias del listado.</p>

      <details class="programacion-nota">
        <summary>Cómo funciona</summary>
        <p>En producción el programador funciona en la nube sin mantener tu PC encendido. Se usará la composición guardada o predeterminada que apruebas en este lote.</p>
        <p>Si cambias una noticia o su imagen después de aprobar el lote, su envío se detendrá para que la revises. Si el servidor se apaga, al volver respeta el intervalo entre noticias; los atrasos de más de 24 horas requieren programar de nuevo.</p>
      </details>
    </form>

    <section v-if="confirmando" class="confirmar-programacion" aria-label="Confirmar programación masiva">
      <strong>¿Autorizar {{ seleccion.length }} noticias para {{ destinos.join(' e ') }}?</strong>
      <p>Desde {{ inicioIso ? fechaLegible(inicioIso) : 'la hora seleccionada' }}, una noticia cada {{ intervalo }} minutos. Cada noticia se enviará a los destinos seleccionados sin pedir otra confirmación a esa hora.</p>
    </section>

    <p v-if="problema" class="aviso-panel aviso-panel--alerta" role="alert">{{ problema }}</p>
    <p v-if="mensaje" class="aviso-panel" role="status">{{ mensaje }}</p>

    <template #pie>
      <button class="boton-panel" type="button" :disabled="guardando" @click="confirmando ? confirmando = false : emit('cerrar')">
        {{ confirmando ? 'Seguir revisando' : 'Cancelar' }}
      </button>
      <button
        v-if="!confirmando"
        class="boton-panel boton-panel--marca"
        type="submit"
        form="formulario-programacion"
        :disabled="guardando || !seleccion.length || !destinos.length || !cola?.activo"
      >
        Revisar programación
      </button>
      <button v-else class="boton-panel boton-panel--marca" type="button" :disabled="guardando" @click="programar">
        {{ guardando ? 'Validando y programando…' : 'Confirmar y programar lote' }}
      </button>
    </template>
  </PanelModal>
</template>

<style scoped>
.programador-activo { margin: 0 0 12px; color: #146c3a; font-size: 0.84rem; font-weight: 750; }
.programador-inactivo { margin: 0 0 12px; color: #8a5a00; font-size: 0.84rem; font-weight: 750; }
.programacion-formulario { display: grid; gap: 14px; }
fieldset { display: flex; flex-wrap: wrap; align-items: end; gap: 14px; border: 0; margin: 0; padding: 0; }
fieldset label { display: grid; gap: 5px; color: #4d5b73; font-size: 0.76rem; font-weight: 750; }
.programacion-destinos { display: flex; gap: 14px; min-height: 36px; align-items: center; }
.programacion-destinos label { display: flex; align-items: center; gap: 7px; color: #0e1b33; font-size: 0.86rem; }
.orden-programacion { max-height: 230px; margin: 0; overflow: auto; border: 1px solid #dde4ee; border-radius: 10px; padding: 4px 0; list-style: none; }
.orden-programacion li { display: flex; justify-content: space-between; gap: 14px; padding: 7px 12px; font-size: 0.84rem; }
.orden-programacion li + li { border-top: 1px solid #edf1f6; }
.orden-programacion strong { overflow: hidden; font-weight: 700; text-overflow: ellipsis; white-space: nowrap; }
.orden-programacion span { flex: 0 0 auto; color: #4d5b73; font-variant-numeric: tabular-nums; }
.programacion-nota { color: #4d5b73; font-size: 0.8rem; line-height: 1.5; }
.programacion-nota summary { cursor: pointer; font-weight: 700; }
.confirmar-programacion { margin-top: 14px; border: 1px solid #e0c35a; border-radius: 10px; background: #fff8dc; padding: 12px 14px; font-size: 0.86rem; }
.confirmar-programacion p { margin: 6px 0 0; color: #5d4a00; }
.aviso-panel { margin-top: 12px; }
</style>
