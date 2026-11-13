<script setup lang="ts">
import { fechasProgramacionSocial, inicioProgramacionColombia } from '~/utils/editorial/programacionSocial'
import type { DestinoMeta } from '~/types/publicacionMeta'
import type { ColaProgramacionSocial } from '~/types/programacionSocial'
const props = defineProps<{ seleccion: { id: string, titulo: string }[] }>()
const emit = defineEmits<{ limpiar: [] }>()
const { data: cola, refresh } = await useFetch<ColaProgramacionSocial>('/api/admin/redes/programacion/cola')
const inicio = ref(''), intervalo = ref(15), destinos = ref<DestinoMeta[]>(['facebook','instagram'])
const confirmando = ref(false), guardando = ref(false), problema = ref(''), mensaje = ref(''), cancelar = ref('')
const operacion = ref('')
const inicioIso = computed(() => inicioProgramacionColombia(inicio.value))
const horarios = computed(() => inicioIso.value ? fechasProgramacionSocial(inicioIso.value, intervalo.value || 1, props.seleccion.length) : [])
const fechaLegible = (fecha: string) => new Date(fecha).toLocaleString('es-CO', { timeZone: 'America/Bogota', dateStyle: 'short', timeStyle: 'short' })
const estados: Record<string, string> = { queued: 'Programada', processing: 'Enviando', published: 'Publicada', partial: 'Envío parcial', failed: 'No enviada', uncertain: 'Revisar resultado', cancelled: 'Cancelada' }
watch([inicio, intervalo, destinos, () => props.seleccion.map(item => item.id).join(',')], () => { confirmando.value = false; operacion.value = '' }, { deep: true })
async function programar() {
  if (!confirmando.value || guardando.value || !cola.value?.activo || !props.seleccion.length || !inicioIso.value || !destinos.value.length) return
  guardando.value = true; problema.value = ''; mensaje.value = ''
  operacion.value ||= crypto.randomUUID()
  try {
    const respuesta = await $fetch<{ cantidad: number }>('/api/admin/redes/programacion/cola', { method: 'POST', body: {
      operacionId: operacion.value, confirmar: true, articulos: props.seleccion.map(item => item.id),
      destinos: destinos.value, inicio: inicioIso.value, intervaloMinutos: intervalo.value
    } })
    mensaje.value = `${respuesta.cantidad} noticias programadas. No se publicarán antes de la hora inicial.`
    confirmando.value = false; emit('limpiar'); await refresh()
  } catch (error) { problema.value = (error as { data?: { statusMessage?: string } }).data?.statusMessage || 'No se confirmó el lote. Actualiza la cola antes de reintentar.' }
  finally { guardando.value = false }
}
async function cancelarLote(id: string) {
  if (guardando.value || cancelar.value !== id) return
  guardando.value = true; problema.value = ''
  try { await $fetch('/api/admin/redes/programacion/cancelar', { method: 'POST', body: { loteId: id, confirmar: true } }); cancelar.value = ''; await refresh() }
  catch { problema.value = 'No se pudo cancelar el lote. Actualiza y revisa sus estados.' }
  finally { guardando.value = false }
}
let reloj: ReturnType<typeof setInterval> | undefined
onMounted(() => {
  inicio.value = new Intl.DateTimeFormat('sv-SE', { timeZone: 'America/Bogota', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false })
    .format(new Date(Date.now() + 5 * 60000)).replace(' ', 'T')
  reloj = setInterval(() => { void refresh() }, 30_000)
})
onBeforeUnmount(() => { if (reloj) clearInterval(reloj) })
</script>
<template>
  <section class="programacion-masiva" aria-labelledby="titulo-programacion">
    <header><div><h2 id="titulo-programacion">Programar publicaciones en lote</h2><p>{{ seleccion.length }} noticias seleccionadas · hasta 50 por lote</p></div><button type="button" :disabled="guardando" @click="refresh()">Actualizar cola</button></header>
    <p :class="cola?.activo ? 'programador-activo' : 'programador-inactivo'" role="status">{{ cola?.activo ? 'Programador activo' : 'Programador sin conexión: no se crearán nuevos lotes.' }}</p>
    <p>Las horas corresponden a Colombia. El servidor debe seguir encendido: ahora es tu PC; cuando migremos al VPS podrá ejecutarse allí. Se usará la composición guardada o predeterminada que apruebas en este lote.</p>
    <form @submit.prevent="confirmando = true">
      <fieldset :disabled="guardando"><legend>Horario y destinos</legend>
        <label>Hora inicial (Colombia)<input v-model="inicio" type="datetime-local" required></label>
        <label>Cada cuántos minutos<input v-model.number="intervalo" type="number" min="1" max="1440" required></label>
        <label><input v-model="destinos" type="checkbox" value="facebook">Facebook</label>
        <label><input v-model="destinos" type="checkbox" value="instagram">Instagram</label>
      </fieldset>
      <ol v-if="seleccion.length" class="orden-programacion"><li v-for="(item, posicion) in seleccion" :key="item.id"><strong>{{ item.titulo }}</strong><span>{{ horarios[posicion] ? fechaLegible(horarios[posicion]!) : 'Selecciona hora inicial' }}</span></li></ol>
      <p v-else>Selecciona noticias del listado. Puedes marcar de una vez las pendientes de esta página.</p>
      <p>Si cambias una noticia o su imagen después de aprobar el lote, su envío se detendrá para que la revises. Si el servidor se apaga, al volver respeta el intervalo entre noticias; los atrasos de más de 24 horas requieren programar de nuevo.</p>
      <button type="submit" :disabled="guardando || !seleccion.length || !destinos.length || !cola?.activo">Revisar programación</button>
    </form>
    <section v-if="confirmando" class="confirmar-programacion" aria-label="Confirmar programación masiva">
      <strong>¿Autorizar {{ seleccion.length }} noticias para {{ destinos.join(' e ') }}?</strong>
      <p>Desde {{ inicioIso ? fechaLegible(inicioIso) : 'la hora seleccionada' }}, una noticia cada {{ intervalo }} minutos. Cada noticia se enviará a los destinos seleccionados sin pedir otra confirmación a esa hora.</p>
      <button type="button" :disabled="guardando" @click="confirmando = false">Seguir revisando</button>
      <button type="button" :disabled="guardando" @click="programar">{{ guardando ? 'Validando y programando…' : 'Confirmar y programar lote' }}</button>
    </section>
    <p v-if="problema" role="alert">{{ problema }}</p><p v-if="mensaje" role="status">{{ mensaje }}</p>
    <details v-if="cola?.lotes.length"><summary>Ver cola y resultados ({{ cola.trabajos.length }})</summary>
      <section v-for="lote in cola.lotes" :key="lote.id" class="lote-programado">
        <h3>Desde {{ fechaLegible(lote.starts_at) }} · cada {{ lote.interval_minutes }} min</h3>
        <ul><li v-for="trabajo in cola.trabajos.filter(item => item.loteId === lote.id)" :key="trabajo.id"><span>{{ trabajo.titulo }} · {{ fechaLegible(trabajo.fecha) }}</span><strong>{{ estados[trabajo.estado] || trabajo.estado }}</strong><p v-if="trabajo.resultado?.aviso">{{ trabajo.resultado.aviso }}</p><template v-for="(recibo, destino) in trabajo.resultado?.redes" :key="destino"><span>{{ destino }}: {{ recibo?.estado === 'published' ? 'Publicación confirmada' : 'Revisar resultado' }}</span><a v-if="recibo?.url" :href="recibo.url" target="_blank" rel="noopener noreferrer">{{ recibo.url.endsWith('/pont3ladiez/') ? 'Abrir perfil' : 'Ver publicación' }}</a><p v-if="recibo?.aviso">{{ recibo.aviso }}</p></template></li></ul>
        <template v-if="cola.trabajos.some(item => item.loteId === lote.id && item.estado === 'queued')">
          <button v-if="cancelar !== lote.id" type="button" :disabled="guardando" @click="cancelar = lote.id">Cancelar pendientes de este lote</button>
          <template v-else><p>Se cancelarán solo los envíos que no hayan comenzado.</p><button type="button" :disabled="guardando" @click="cancelarLote(lote.id)">Confirmar cancelación</button><button type="button" @click="cancelar = ''">Conservar lote</button></template>
        </template>
      </section>
    </details>
  </section>
</template>
<style scoped>
.programacion-masiva{border:1px solid #d9e3ef;border-radius:12px;padding:22px;margin:24px 0;background:#f6f9fd;color:var(--navy)}header{display:flex;align-items:center;justify-content:space-between;gap:16px}h2{font-size:20px;margin:0}p{font-size:13px;line-height:1.65;color:#526174}fieldset{border:0;padding:0;display:flex;gap:18px;align-items:end;flex-wrap:wrap}legend{font-size:13px;font-weight:700;margin:12px 0}label{font-size:13px;display:flex;gap:8px;align-items:center;flex-wrap:wrap}label:has(input[type=datetime-local]),label:has(input[type=number]){display:grid}input{min-height:42px;border:1px solid #bdcce0;border-radius:6px;padding:8px;box-sizing:border-box;font:inherit}button{min-height:44px;padding:10px 14px;border:1px solid #bdcce0;border-radius:6px;background:white;color:#123d79;cursor:pointer;font:inherit;font-size:13px;font-weight:700}form>button,.confirmar-programacion button:last-child{background:#123d79;color:white}button:disabled{opacity:.5;cursor:default}.orden-programacion{max-height:260px;overflow:auto;padding-left:22px}.orden-programacion li{padding:8px;font-size:13px}.orden-programacion span{display:block;color:#526174;margin-top:4px}.confirmar-programacion{border:1px solid #d8bd5b;background:#fff9df;padding:16px;border-radius:8px;margin-top:16px}.confirmar-programacion button{margin:4px}.programador-activo{color:#14643b;font-weight:700}.programador-inactivo{color:#805200;font-weight:700}summary{cursor:pointer;font-weight:700;padding:18px 0}.lote-programado{border-top:1px solid #d9e3ef;padding:14px 0}.lote-programado h3{font-size:14px}.lote-programado li{font-size:12px;margin:12px 0;display:grid;gap:5px}.lote-programado strong{color:#123d79}button:focus-visible,input:focus-visible,summary:focus-visible{outline:3px solid #2376cf;outline-offset:3px}@media(max-width:600px){.programacion-masiva{padding:14px}header{align-items:start;flex-direction:column}fieldset{align-items:stretch;flex-direction:column}input[type=datetime-local],input[type=number]{width:100%;min-width:0}button{max-width:100%}}
</style>
