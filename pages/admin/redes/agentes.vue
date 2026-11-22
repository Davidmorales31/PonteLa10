<script setup lang="ts">
import { ArrowLeft, KeyRound, Copy, Check, ShieldAlert, Trash2, Plus } from '@lucide/vue'
import PanelModal from '~/components/admin/ui/PanelModal.vue'

definePageMeta({ layout: 'admin', middleware: 'autenticacion-editorial', permisoEditorial: 'configuracion.gestionar' })
useSeoMeta({ title: 'Agentes de IA | Ponte la 10', robots: 'noindex, nofollow' })

interface LlaveVista { id: string, nombre: string, prefijo: string, alcances: string[], maxProgramacionesDia: number, limitePorMinuto: number, venceEn: string | null, revocadaEn: string | null, ultimoUsoEn: string | null, creadaEn: string }
const { data, refresh } = await useFetch<{ llaves: LlaveVista[] }>('/api/admin/redes/agentes')
const formularioAbierto = ref(false)
const origen = import.meta.client ? window.location.origin : 'https://www.pont3la10.com'

const opciones = [
  { id: 'leer', titulo: 'Leer', texto: 'Consultar publicaciones, previsualizar y buscar en la biblioteca.' },
  { id: 'borradores', titulo: 'Borradores', texto: 'Crear y editar borradores propios y pedir tu aprobación.' },
  { id: 'medios', titulo: 'Archivos', texto: 'Subir imágenes y vídeos temporales o importar imágenes por URL.' },
  { id: 'programar', titulo: 'Programar sin aprobación', texto: 'Delegación explícita: programa por sí sola (mínimo 10 minutos de antelación, con cuota diaria). Tú puedes cancelar.', riesgo: true }
]
const nombre = ref(''), alcances = ref<string[]>(['leer', 'borradores', 'medios']), cuota = ref(5), limite = ref(60), venceEnDias = ref<number | null>(90)
const creando = ref(false), problema = ref(''), nueva = ref<{ llave: string, nombre: string } | null>(null), copiado = ref('')

async function crear() {
  creando.value = true; problema.value = ''
  try {
    const respuesta = await $fetch<{ llave: string, nombre: string }>('/api/admin/redes/agentes', { method: 'POST',
      body: { nombre: nombre.value, alcances: alcances.value, maxProgramacionesDia: alcances.value.includes('programar') ? cuota.value : 0, limitePorMinuto: limite.value, ...(venceEnDias.value ? { venceEnDias: venceEnDias.value } : {}) } })
    nueva.value = { llave: respuesta.llave, nombre: respuesta.nombre }; nombre.value = ''; formularioAbierto.value = false
    await refresh()
  } catch (falla) { problema.value = (falla as { statusMessage?: string }).statusMessage || 'No se pudo crear la llave.' } finally { creando.value = false }
}
async function revocar(llave: LlaveVista) {
  if (!window.confirm(`¿Revocar «${llave.nombre}»? El agente que la use dejará de funcionar de inmediato.`)) return
  try { await $fetch(`/api/admin/redes/agentes/${llave.id}`, { method: 'DELETE' }); await refresh() }
  catch (falla) { problema.value = (falla as { statusMessage?: string }).statusMessage || 'No se pudo revocar.' }
}
async function copiar(texto: string, etiqueta: string) {
  try { await navigator.clipboard.writeText(texto); copiado.value = etiqueta; setTimeout(() => { copiado.value = '' }, 2000) } catch { problema.value = 'No se pudo copiar. Selecciónalo manualmente.' }
}
const fecha = (iso: string | null) => iso ? new Date(iso).toLocaleString('es-CO', { timeZone: 'America/Bogota', dateStyle: 'medium', timeStyle: 'short' }) : '—'
const estadoLlave = (llave: LlaveVista) => llave.revocadaEn ? 'Revocada' : llave.venceEn && Date.parse(llave.venceEn) < Date.now() ? 'Vencida' : 'Activa'
const ejemploCurl = computed(() => `curl -H "Authorization: Bearer ${nueva.value?.llave}" ${origen}/api/agentes/redes/v1`)
const ejemploMcp = computed(() => JSON.stringify({ mcpServers: { 'pont3la10-redes': { type: 'http', url: `${origen}/api/agentes/redes/mcp`, headers: { Authorization: `Bearer ${nueva.value?.llave}` } } } }, null, 2))
</script>

<template>
  <section class="agentes">
    <header>
      <NuxtLink to="/admin/redes" aria-label="Volver a Redes sociales"><ArrowLeft :size="18" /></NuxtLink>
      <div><h1>Agentes de IA</h1><p>Llaves para que un agente prepare publicaciones del módulo. Nunca publica solo: tú aprobarás desde tu panel (salvo que delegues programar).</p></div>
      <button type="button" class="boton-editorial-principal" @click="formularioAbierto = true"><Plus :size="16" />Nueva llave</button>
    </header>
    <p v-if="problema" class="aviso error" role="alert">{{ problema }}</p>

    <section class="lista"><h2>Llaves</h2>
      <p v-if="!data?.llaves.length" class="vacio">Aún no hay llaves. Crea una para conectar un agente.</p>
      <ul><li v-for="llave in data?.llaves" :key="llave.id" :class="{ inactiva: estadoLlave(llave) !== 'Activa' }">
        <div><strong>{{ llave.nombre }}</strong> <span class="etiqueta" :class="estadoLlave(llave).toLowerCase()">{{ estadoLlave(llave) }}</span>
          <small><code>{{ llave.prefijo }}…</code> · {{ llave.alcances.join(', ') }} · {{ llave.limitePorMinuto }}/min<template v-if="llave.alcances.includes('programar')"> · {{ llave.maxProgramacionesDia }} prog./día</template></small>
          <small>Creada {{ fecha(llave.creadaEn) }} · Último uso {{ fecha(llave.ultimoUsoEn) }}<template v-if="llave.venceEn"> · Vence {{ fecha(llave.venceEn) }}</template></small></div>
        <button v-if="estadoLlave(llave) === 'Activa'" type="button" class="revocar" @click="revocar(llave)"><Trash2 :size="16" />Revocar</button>
      </li></ul>
    </section>

    <PanelModal :abierto="formularioAbierto" titulo="Nueva llave para un agente" descripcion="Elige qué puede hacer. Por defecto el agente solo prepara borradores y pide tu aprobación." ancho="md" :bloqueado="creando" @cerrar="formularioAbierto = false">
      <form id="formulario-llave" class="formulario" @submit.prevent="crear">
        <label>Nombre del agente<input v-model="nombre" type="text" minlength="3" maxlength="80" required placeholder="Ej. Agente de contenido nocturno"></label>
        <fieldset><legend>Permisos</legend>
          <label v-for="opcion in opciones" :key="opcion.id" class="alcance" :class="{ riesgo: opcion.riesgo }"><input v-model="alcances" type="checkbox" :value="opcion.id"><span><strong>{{ opcion.titulo }}</strong><small>{{ opcion.texto }}</small></span></label>
        </fieldset>
        <div class="numeros">
          <label v-if="alcances.includes('programar')">Programaciones por día<input v-model.number="cuota" type="number" min="1" max="200"></label>
          <label>Llamadas por minuto<input v-model.number="limite" type="number" min="5" max="600"></label>
          <label>Vence en (días)<input v-model.number="venceEnDias" type="number" min="1" max="365" placeholder="Sin vencimiento"></label>
        </div>
      </form>
      <template #pie>
        <button class="boton-panel" type="button" :disabled="creando" @click="formularioAbierto = false">Cancelar</button>
        <button class="boton-panel boton-panel--marca" type="submit" form="formulario-llave" :disabled="creando || nombre.trim().length < 3 || !alcances.length">{{ creando ? 'Creando…' : 'Crear llave' }}</button>
      </template>
    </PanelModal>

    <PanelModal :abierto="Boolean(nueva)" :titulo="`Llave «${nueva?.nombre}» creada`" descripcion="Cópiala ahora: no se vuelve a mostrar. Trátala como una contraseña." ancho="lg" bloqueado @cerrar="nueva = null">
      <div v-if="nueva" class="nueva" aria-live="polite">
        <p class="importante"><ShieldAlert :size="16" />Esta es la única vez que verás la llave completa.</p>
        <div class="caja"><code>{{ nueva.llave }}</code><button type="button" @click="copiar(nueva.llave, 'llave')"><component :is="copiado === 'llave' ? Check : Copy" :size="16" />{{ copiado === 'llave' ? 'Copiada' : 'Copiar' }}</button></div>
        <h3>Conectar por REST</h3>
        <div class="caja"><code>{{ ejemploCurl }}</code><button type="button" @click="copiar(ejemploCurl, 'curl')"><component :is="copiado === 'curl' ? Check : Copy" :size="16" />Copiar</button></div>
        <h3>Conectar por MCP (Claude, Cursor y otros clientes)</h3>
        <div class="caja"><pre>{{ ejemploMcp }}</pre><button type="button" @click="copiar(ejemploMcp, 'mcp')"><component :is="copiado === 'mcp' ? Check : Copy" :size="16" />Copiar</button></div>
        <p class="pie"><a :href="`${origen}/api/agentes/redes/v1/openapi.json`" target="_blank" rel="noopener">OpenAPI</a> · <a :href="`${origen}/api/agentes/redes/v1/guia.md`" target="_blank" rel="noopener">Guía para agentes</a></p>
      </div>
      <template #pie>
        <button type="button" class="boton-panel boton-panel--marca" @click="nueva = null"><KeyRound :size="16" />Ya la guardé</button>
      </template>
    </PanelModal>
  </section>
</template>

<style scoped>
.agentes{display:grid;gap:14px;color:var(--navy)}
header{display:flex;gap:12px;align-items:center}header>a{display:grid;place-items:center;flex:none;width:36px;height:36px;border:1px solid var(--line);border-radius:7px;background:white;color:var(--navy)}header>div{flex:1}header h1{margin:0 0 2px;font-size:1.35rem}header p{margin:0;color:var(--muted);font-size:.84rem}
h2{margin:0 0 10px;font-size:1rem}h3{margin:14px 0 6px;font-size:.86rem}
.aviso{margin:0;padding:10px 14px;border-radius:8px;background:var(--soft-yellow)}.aviso.error{background:#fde2e2}
.lista{padding:16px;border:1px solid var(--line);border-radius:10px;background:white}
.formulario label,.numeros label{display:grid;gap:5px;font-size:.78rem;font-weight:700;margin-bottom:12px}input[type=text],input[type=number]{width:100%;box-sizing:border-box;min-height:36px;padding:0 10px;border:1px solid var(--line);border-radius:7px;font:inherit}
fieldset{border:1px solid var(--line);border-radius:8px;padding:12px;margin:0 0 12px}legend{padding:0 6px;font-weight:700;font-size:.8rem}
.alcance{display:flex !important;align-items:flex-start;gap:10px;margin:0 0 10px;font-size:.86rem !important;font-weight:600 !important}.alcance input{margin-top:3px;width:17px;height:17px}.alcance span{display:grid;gap:2px}.alcance small{color:var(--muted);font-weight:500}.alcance.riesgo{padding:10px;border-radius:7px;background:var(--soft-yellow)}
.numeros{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:12px}
.caja button,.revocar{display:inline-flex;align-items:center;gap:6px;min-height:36px;padding:0 12px;border:1px solid var(--line);border-radius:7px;background:white;color:var(--navy);font:inherit;font-size:.82rem;font-weight:700;cursor:pointer}
.importante{display:flex;align-items:center;gap:8px;margin:0 0 12px;padding:10px;border-radius:7px;background:var(--soft-yellow);font-size:.84rem}
.caja{display:flex;gap:8px;align-items:flex-start}.caja code,.caja pre{flex:1;margin:0;padding:10px;border-radius:7px;background:#0b1220;color:#f4f7fc;font-size:.75rem;overflow-x:auto;white-space:pre-wrap;word-break:break-all}
.pie{font-size:.8rem;margin:12px 0 0}.lista ul{list-style:none;margin:0;padding:0;display:grid;gap:8px}.lista li{display:flex;justify-content:space-between;gap:12px;align-items:center;padding:10px 12px;border:1px solid var(--line);border-radius:8px}.lista li.inactiva{opacity:.6}
.lista small{display:block;color:var(--muted);margin-top:3px;font-size:.74rem}.etiqueta{margin-left:8px;padding:2px 8px;border-radius:999px;background:#e1f3d4;font-size:.72rem;font-weight:700}.etiqueta.revocada,.etiqueta.vencida{background:#fde2e2}.vacio{margin:0;color:var(--muted);font-size:.86rem}
@media(max-width:700px){.lista li{flex-direction:column;align-items:flex-start}header{flex-wrap:wrap}}
</style>
