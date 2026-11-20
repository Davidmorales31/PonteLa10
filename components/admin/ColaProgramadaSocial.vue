<script setup lang="ts">
import { RefreshCw } from '@lucide/vue'
import type { ColaProgramacionSocial } from '~/types/programacionSocial'

/** Pestaña «Programadas»: lotes en cola, su resultado por red y la cancelación de los que no han empezado. */
const { data: cola, refresh } = await useFetch<ColaProgramacionSocial>('/api/admin/redes/programacion/cola', { key: 'cola-programacion-social' })
const guardando = ref(false)
const cancelar = ref('')
const problema = ref('')
const fechaLegible = (fecha: string) => new Date(fecha).toLocaleString('es-CO', { timeZone: 'America/Bogota', dateStyle: 'short', timeStyle: 'short' })
const estados: Record<string, { etiqueta: string, tono: string }> = {
  queued: { etiqueta: 'Programada', tono: 'programado' },
  processing: { etiqueta: 'Enviando', tono: 'revision' },
  published: { etiqueta: 'Publicada', tono: 'publicado' },
  partial: { etiqueta: 'Envío parcial', tono: 'programado' },
  failed: { etiqueta: 'No enviada', tono: 'peligro' },
  uncertain: { etiqueta: 'Revisar resultado', tono: 'peligro' },
  cancelled: { etiqueta: 'Cancelada', tono: 'archivado' }
}

async function cancelarLote(id: string) {
  if (guardando.value || cancelar.value !== id) return
  guardando.value = true
  problema.value = ''
  try {
    await $fetch('/api/admin/redes/programacion/cancelar', { method: 'POST', body: { loteId: id, confirmar: true } })
    cancelar.value = ''
    await refresh()
  } catch {
    problema.value = 'No se pudo cancelar el lote. Actualiza y revisa sus estados.'
  } finally {
    guardando.value = false
  }
}

let reloj: ReturnType<typeof setInterval> | undefined
onMounted(() => { reloj = setInterval(() => { void refresh() }, 30_000) })
onBeforeUnmount(() => { if (reloj) clearInterval(reloj) })
</script>

<template>
  <section class="cola-social">
    <div class="barra-herramientas">
      <p :class="cola?.activo ? 'cola-activa' : 'cola-inactiva'" role="status">
        {{ cola?.activo ? 'Programador activo' : 'Programador sin conexión: no se crearán nuevos lotes.' }}
      </p>
      <button class="boton-panel espaciador" type="button" :disabled="guardando" @click="() => refresh()">
        <RefreshCw aria-hidden="true" /> Actualizar
      </button>
    </div>
    <p v-if="problema" class="aviso-panel aviso-panel--alerta" role="alert">{{ problema }}</p>

    <div v-if="!cola?.lotes.length" class="estado-vacio-compacto">
      <h2>No hay lotes programados</h2>
      <p>Marca noticias en la pestaña «Noticias» y pulsa «Programar».</p>
    </div>

    <article v-for="lote in cola?.lotes || []" :key="lote.id" class="lote-social">
      <header>
        <h3>Desde {{ fechaLegible(lote.starts_at) }} · cada {{ lote.interval_minutes }} min</h3>
        <template v-if="cola?.trabajos.some(item => item.loteId === lote.id && item.estado === 'queued')">
          <button v-if="cancelar !== lote.id" class="boton-panel boton-panel--peligro" type="button" :disabled="guardando" @click="cancelar = lote.id">
            Cancelar pendientes
          </button>
          <span v-else class="cancelar-confirmar">
            Solo se cancelan los envíos que no hayan comenzado.
            <button class="boton-panel boton-panel--peligro" type="button" :disabled="guardando" @click="cancelarLote(lote.id)">Confirmar cancelación</button>
            <button class="boton-panel" type="button" @click="cancelar = ''">Conservar lote</button>
          </span>
        </template>
      </header>
      <ul>
        <li v-for="trabajo in cola?.trabajos.filter(item => item.loteId === lote.id)" :key="trabajo.id">
          <div>
            <strong>{{ trabajo.titulo }}</strong>
            <small>{{ fechaLegible(trabajo.fecha) }}</small>
            <small v-if="trabajo.resultado?.aviso">{{ trabajo.resultado.aviso }}</small>
            <small v-for="(recibo, destino) in trabajo.resultado?.redes" :key="destino">
              {{ destino }}: {{ recibo?.estado === 'published' ? 'Publicación confirmada' : 'Revisar resultado' }}
              <a v-if="recibo?.url" :href="recibo.url" target="_blank" rel="noopener noreferrer">{{ recibo.url.endsWith('/pont3ladiez/') ? 'Abrir perfil' : 'Ver publicación' }}</a>
              <template v-if="recibo?.aviso"> · {{ recibo.aviso }}</template>
            </small>
          </div>
          <span class="chip-estado" :data-tono="(estados[trabajo.estado] || { tono: 'borrador' }).tono">{{ (estados[trabajo.estado] || { etiqueta: trabajo.estado }).etiqueta }}</span>
        </li>
      </ul>
    </article>
  </section>
</template>

<style scoped>
.cola-social { display: grid; gap: 12px; padding: 14px; }
.cola-activa, .cola-inactiva { margin: 0; font-size: 0.84rem; font-weight: 750; }
.cola-activa { color: #146c3a; }
.cola-inactiva { color: #8a5a00; }
.lote-social { border: 1px solid #dde4ee; border-radius: 10px; }
.lote-social > header { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 10px; border-bottom: 1px solid #dde4ee; background: #f8fafc; padding: 10px 14px; }
.lote-social h3 { margin: 0; font-size: 0.9rem; }
.cancelar-confirmar { display: inline-flex; flex-wrap: wrap; align-items: center; gap: 8px; color: #4d5b73; font-size: 0.8rem; }
ul { margin: 0; padding: 0; list-style: none; }
li { display: flex; align-items: flex-start; justify-content: space-between; gap: 14px; padding: 10px 14px; }
li + li { border-top: 1px solid #edf1f6; }
li div { display: grid; gap: 2px; min-width: 0; }
li strong { font-size: 0.86rem; }
li small { color: #4d5b73; font-size: 0.76rem; }
</style>
