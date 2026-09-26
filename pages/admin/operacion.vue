<script setup lang="ts">
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Clock3,
  LoaderCircle,
  RefreshCw,
  Server
} from '@lucide/vue'

interface SaludOperativa {
  consultadoEn: string | null
  worker: { estado: string, ultimaSenalEn: string | null, antiguedadSegundos: number | null }
  ingestas: {
    enCola: number
    edadColaMasAntiguaSegundos: number | null
    procesando: number
    procesamientoConLeaseVencido: number
    evidenciaLista: number
    edadEvidenciaMasAntiguaSegundos: number | null
    ultimoFalloEn: string | null
    fallidas: number
  }
  codex: {
    ultimaCorrida: { estado: string, iniciadaEn: string | null, actualizadaEn: string | null, terminadaEn: string | null } | null
    corridasFallidas: number
    corridasParciales: number
    propuestasEnRevision: number
  }
  publicacion: { programadasVencidas: number, atrasoMasAntiguoSegundos: number | null }
  cron: { estado: string, disponible: boolean, configurado: boolean | null, iniciadaEn: string | null, terminadaEn: string | null }
}

definePageMeta({
  layout: 'admin',
  middleware: 'autenticacion-editorial',
  permisoEditorial: 'configuracion.ver'
})

useSeoMeta({ title: 'Operación editorial | Pont3la10', robots: 'noindex, nofollow' })

const { mostrarAlerta } = useAlertasEditoriales()
const {
  data: salud,
  status,
  error,
  refresh
} = await useFetch<SaludOperativa>('/api/admin/operacion')

const alertasOperativas = computed(() => {
  if (!salud.value) return []
  const estado = salud.value
  const alertas: string[] = []
  if (estado.worker.estado !== 'activo') alertas.push(`Worker: ${estado.worker.estado}`)
  if (estado.ingestas.procesamientoConLeaseVencido > 0) alertas.push('Hay ingestas con lease vencido')
  if (estado.ingestas.fallidas > 0) alertas.push(`${estado.ingestas.fallidas} ingestas fallidas`)
  if (estado.publicacion.programadasVencidas > 0) alertas.push('Hay publicaciones programadas vencidas')
  if (estado.codex.corridasFallidas > 0) alertas.push('Hay corridas de Codex fallidas')
  if (['failed', 'extension_no_disponible', 'job_no_configurado', 'desconocido'].includes(estado.cron.estado)) {
    alertas.push(`Cron de publicación: ${etiquetaEstado(estado.cron.estado)}`)
  }
  return alertas
})

const huellaAlerta = computed(() => alertasOperativas.value.join('|'))
let ultimaHuellaNotificada = ''

function notificarIncidencias() {
  if (!import.meta.client || !huellaAlerta.value || huellaAlerta.value === ultimaHuellaNotificada) return
  ultimaHuellaNotificada = huellaAlerta.value
  mostrarAlerta({
    tipo: 'advertencia',
    titulo: 'Revisa la operación editorial',
    mensaje: alertasOperativas.value.join('. ') + '.'
  })
}

watch(huellaAlerta, notificarIncidencias, { immediate: true })
watch(error, (nuevoError) => {
  if (!nuevoError || !import.meta.client) return
  mostrarAlerta({
    tipo: 'error',
    titulo: 'Monitor no disponible',
    mensaje: 'Comprueba que la migración de salud esté aplicada y que el servidor tenga su configuración privada.'
  })
}, { immediate: true })

function etiquetaEstado(estado: string): string {
  const etiquetas: Record<string, string> = {
    activo: 'Activo', desconectado: 'Desconectado', detenido: 'Detenido',
    deteniendose: 'Deteniéndose', desconocido: 'Sin señal',
    in_progress: 'En curso', completed: 'Completada', partial: 'Parcial',
    failed: 'Fallida', succeeded: 'Correcta', sin_ejecuciones: 'Sin ejecuciones',
    extension_no_disponible: 'Extensión no disponible',
    job_no_configurado: 'Job no configurado', running: 'Ejecutándose'
  }
  return etiquetas[estado] || 'Sin señal'
}

function claseEstado(estado: string): string {
  return ['activo', 'completed', 'succeeded'].includes(estado)
    ? 'estado-salud estado-salud-ok'
    : ['partial', 'deteniendose', 'running', 'sin_ejecuciones'].includes(estado)
      ? 'estado-salud estado-salud-atencion'
      : 'estado-salud estado-salud-error'
}

function formatearFecha(valor: string | null): string {
  if (!valor) return 'Sin registro'
  return new Intl.DateTimeFormat('es-CO', {
    dateStyle: 'medium', timeStyle: 'short', timeZone: 'America/Bogota'
  }).format(new Date(valor))
}

function formatearEdad(segundos: number | null): string {
  if (segundos === null) return 'Sin actividad pendiente'
  if (segundos < 60) return `${segundos} s`
  const minutos = Math.floor(segundos / 60)
  if (minutos < 60) return `${minutos} min`
  const horas = Math.floor(minutos / 60)
  if (horas < 24) return `${horas} h ${minutos % 60} min`
  return `${Math.floor(horas / 24)} d ${horas % 24} h`
}

async function recargar() {
  await refresh()
}
</script>

<template>
  <div class="vista-panel-editorial vista-operacion-editorial">
    <header class="titulo-vista-panel">
      <div>
        <p class="etiqueta-panel">HU-ED-13 · Solo lectura</p>
        <h1>Operación editorial</h1>
        <p>Worker, ingestas, corridas de Codex y publicaciones. Este panel no reintenta ni modifica contenido.</p>
      </div>
      <button class="accion-panel-secundaria" type="button" :disabled="status === 'pending'" @click="recargar">
        <LoaderCircle v-if="status === 'pending'" class="icono-girando" aria-hidden="true" />
        <RefreshCw v-else aria-hidden="true" />
        <span>Actualizar</span>
      </button>
    </header>

    <section v-if="status === 'pending' && !salud" class="estado-operacion-cargando" role="status">
      <LoaderCircle class="icono-girando" aria-hidden="true" /> Consultando estado seguro…
    </section>
    <section v-else-if="error" class="aviso-panel aviso-panel-error" role="alert">
      <AlertTriangle aria-hidden="true" />
      <div>
        <strong>No se pudo consultar la operación</strong>
        <span>Verifica que la migración HU-ED-13 esté aplicada y que el servidor tenga configurado el acceso privado.</span>
      </div>
      <button type="button" @click="recargar">Reintentar</button>
    </section>

    <template v-else-if="salud">
      <section v-if="alertasOperativas.length" class="aviso-panel aviso-panel-atencion" role="status">
        <AlertTriangle aria-hidden="true" />
        <div>
          <strong>Hay puntos que requieren atención</strong>
          <span>{{ alertasOperativas.join(' · ') }}</span>
        </div>
      </section>
      <section v-else class="aviso-panel aviso-panel-operacion-ok" role="status">
        <CheckCircle2 aria-hidden="true" />
        <div><strong>Sin incidencias detectadas</strong><span>Última consulta: {{ formatearFecha(salud.consultadoEn) }}</span></div>
      </section>

      <section class="tarjetas-salud-operativa" aria-label="Estado operativo">
        <article class="tarjeta-salud-operativa">
          <header><Server aria-hidden="true" /><h2>Worker local</h2></header>
          <span :class="claseEstado(salud.worker.estado)">{{ etiquetaEstado(salud.worker.estado) }}</span>
          <dl><div><dt>Última señal</dt><dd>{{ formatearFecha(salud.worker.ultimaSenalEn) }}</dd></div></dl>
        </article>
        <article class="tarjeta-salud-operativa">
          <header><Activity aria-hidden="true" /><h2>Ingestas</h2></header>
          <dl>
            <div><dt>En cola</dt><dd>{{ salud.ingestas.enCola }} <small>· {{ formatearEdad(salud.ingestas.edadColaMasAntiguaSegundos) }}</small></dd></div>
            <div><dt>Procesando</dt><dd>{{ salud.ingestas.procesando }}</dd></div>
            <div><dt>Lease vencido</dt><dd>{{ salud.ingestas.procesamientoConLeaseVencido }}</dd></div>
            <div><dt>Evidencia lista</dt><dd>{{ salud.ingestas.evidenciaLista }} <small>· {{ formatearEdad(salud.ingestas.edadEvidenciaMasAntiguaSegundos) }}</small></dd></div>
            <div><dt>Fallidas</dt><dd>{{ salud.ingestas.fallidas }}</dd></div>
          </dl>
          <NuxtLink to="/admin/ingestas">Abrir ingestas</NuxtLink>
        </article>
        <article class="tarjeta-salud-operativa">
          <header><Clock3 aria-hidden="true" /><h2>Codex editorial</h2></header>
          <span :class="claseEstado(salud.codex.ultimaCorrida?.estado || 'desconocido')">
            {{ etiquetaEstado(salud.codex.ultimaCorrida?.estado || 'desconocido') }}
          </span>
          <dl>
            <div><dt>Última corrida</dt><dd>{{ formatearFecha(salud.codex.ultimaCorrida?.iniciadaEn || null) }}</dd></div>
            <div><dt>Fallidas / parciales</dt><dd>{{ salud.codex.corridasFallidas }} / {{ salud.codex.corridasParciales }}</dd></div>
            <div><dt>Borradores en revisión</dt><dd>{{ salud.codex.propuestasEnRevision }}</dd></div>
          </dl>
          <NuxtLink to="/admin/revision">Abrir revisión</NuxtLink>
        </article>
        <article class="tarjeta-salud-operativa">
          <header><Clock3 aria-hidden="true" /><h2>Publicación</h2></header>
          <dl>
            <div><dt>Programadas vencidas</dt><dd>{{ salud.publicacion.programadasVencidas }}</dd></div>
            <div><dt>Mayor atraso</dt><dd>{{ formatearEdad(salud.publicacion.atrasoMasAntiguoSegundos) }}</dd></div>
            <div><dt>Cron</dt><dd><span :class="claseEstado(salud.cron.estado)">{{ etiquetaEstado(salud.cron.estado) }}</span></dd></div>
            <div><dt>Última ejecución</dt><dd>{{ formatearFecha(salud.cron.terminadaEn || salud.cron.iniciadaEn) }}</dd></div>
          </dl>
        </article>
      </section>
      <p class="nota-operacion-editorial">Las horas se muestran en America/Bogota. La consulta no revela mensajes internos del Cron, IDs de instancia ni contenido de artículos.</p>
    </template>
  </div>
</template>

<style scoped>
.vista-operacion-editorial { display: grid; gap: 1.25rem; }
.vista-operacion-editorial > .titulo-vista-panel { display: flex; align-items: flex-start; justify-content: space-between; gap: 1rem; }
.vista-operacion-editorial h1 { margin: .15rem 0 .35rem; }
.vista-operacion-editorial .titulo-vista-panel p:last-child { max-width: 58rem; }
.estado-operacion-cargando { display: flex; align-items: center; gap: .7rem; padding: 1.25rem; border: 1px solid var(--borde-panel, #cbd5e1); border-radius: 1rem; }
.tarjetas-salud-operativa { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 1rem; }
.tarjeta-salud-operativa { display: grid; align-content: start; gap: .9rem; padding: 1.1rem; border: 1px solid var(--borde-panel, #cbd5e1); border-radius: 1rem; background: var(--superficie-panel, #fff); }
.tarjeta-salud-operativa header { display: flex; align-items: center; gap: .65rem; color: var(--texto-panel, #10243e); }
.tarjeta-salud-operativa header svg { width: 1.2rem; height: 1.2rem; color: #0784dc; }
.tarjeta-salud-operativa h2 { margin: 0; font-size: 1.05rem; }
.tarjeta-salud-operativa dl { display: grid; gap: .55rem; margin: 0; }
.tarjeta-salud-operativa dl > div { display: flex; justify-content: space-between; align-items: baseline; gap: .7rem; border-bottom: 1px solid var(--borde-panel, #e2e8f0); padding-bottom: .4rem; }
.tarjeta-salud-operativa dt { color: var(--texto-secundario-panel, #64748b); }
.tarjeta-salud-operativa dd { margin: 0; text-align: right; color: var(--texto-panel, #10243e); font-weight: 650; }
.tarjeta-salud-operativa dd small { font-weight: 400; color: var(--texto-secundario-panel, #64748b); }
.tarjeta-salud-operativa > a { color: #087bc6; text-decoration: none; font-weight: 650; }
.estado-salud { display: inline-flex; width: fit-content; align-items: center; border-radius: 999px; padding: .3rem .65rem; font-size: .8rem; font-weight: 700; }
.estado-salud-ok { color: #08713f; background: #e3f6eb; }
.estado-salud-atencion { color: #8a4b00; background: #fff1cc; }
.estado-salud-error { color: #a32121; background: #fee7e7; }
.aviso-panel-operacion-ok { border-color: #9edbb8; background: #edfff4; }
.aviso-panel-operacion-ok > svg { color: #078447; }
.nota-operacion-editorial { margin: 0; color: var(--texto-secundario-panel, #64748b); font-size: .85rem; }
@media (max-width: 740px) {
  .vista-operacion-editorial > .titulo-vista-panel { flex-direction: column; }
  .tarjetas-salud-operativa { grid-template-columns: minmax(0, 1fr); }
}
</style>
