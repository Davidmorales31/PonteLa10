<script setup lang="ts">
import { ArrowLeft, KeyRound, Copy, Check, ShieldAlert, Trash2, Plus } from '@lucide/vue'

definePageMeta({ layout: 'admin', middleware: 'autenticacion-editorial', permisoEditorial: 'configuracion.gestionar' })
useSeoMeta({ title: 'Agentes de IA | Pont3la10', robots: 'noindex, nofollow' })

interface LlaveVista { id: string, nombre: string, prefijo: string, alcances: string[], maxProgramacionesDia: number, limitePorMinuto: number, venceEn: string | null, revocadaEn: string | null, ultimoUsoEn: string | null, creadaEn: string }
const { data, refresh } = await useFetch<{ llaves: LlaveVista[] }>('/api/admin/redes/agentes')
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
    nueva.value = { llave: respuesta.llave, nombre: respuesta.nombre }; nombre.value = ''
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
    <header><NuxtLink to="/admin/redes" aria-label="Volver a Contenido para redes"><ArrowLeft :size="20" /></NuxtLink><div><h1>Agentes de IA</h1><p>Llaves para que un agente prepare publicaciones del módulo. Nunca publica solo: tú aprobarás desde tu panel (salvo que delegues programar).</p></div></header>
    <p v-if="problema" class="aviso error" role="alert">{{ problema }}</p>

    <section v-if="nueva" class="nueva" aria-live="polite">
      <h2><KeyRound :size="18" />Llave «{{ nueva.nombre }}» creada</h2>
      <p class="importante"><ShieldAlert :size="16" />Cópiala ahora: no se vuelve a mostrar. Trátala como una contraseña.</p>
      <div class="caja"><code>{{ nueva.llave }}</code><button type="button" @click="copiar(nueva.llave, 'llave')"><component :is="copiado === 'llave' ? Check : Copy" :size="16" />{{ copiado === 'llave' ? 'Copiada' : 'Copiar' }}</button></div>
      <h3>Conectar por REST</h3>
      <div class="caja"><code>{{ ejemploCurl }}</code><button type="button" @click="copiar(ejemploCurl, 'curl')"><component :is="copiado === 'curl' ? Check : Copy" :size="16" />Copiar</button></div>
      <h3>Conectar por MCP (Claude, Cursor y otros clientes)</h3>
      <div class="caja"><pre>{{ ejemploMcp }}</pre><button type="button" @click="copiar(ejemploMcp, 'mcp')"><component :is="copiado === 'mcp' ? Check : Copy" :size="16" />Copiar</button></div>
      <p class="pie"><a :href="`${origen}/api/agentes/redes/v1/openapi.json`" target="_blank" rel="noopener">OpenAPI</a> · <a :href="`${origen}/api/agentes/redes/v1/guia.md`" target="_blank" rel="noopener">Guía para agentes</a></p>
      <button type="button" class="secundario" @click="nueva = null">Ya la guardé</button>
    </section>

    <form class="formulario" @submit.prevent="crear">
      <h2><Plus :size="18" />Nueva llave</h2>
      <label>Nombre del agente<input v-model="nombre" type="text" minlength="3" maxlength="80" required placeholder="Ej. Agente de contenido nocturno"></label>
      <fieldset><legend>Permisos</legend>
        <label v-for="opcion in opciones" :key="opcion.id" class="alcance" :class="{ riesgo: opcion.riesgo }"><input v-model="alcances" type="checkbox" :value="opcion.id"><span><strong>{{ opcion.titulo }}</strong><small>{{ opcion.texto }}</small></span></label>
      </fieldset>
      <div class="numeros">
        <label v-if="alcances.includes('programar')">Programaciones por día<input v-model.number="cuota" type="number" min="1" max="50"></label>
        <label>Llamadas por minuto<input v-model.number="limite" type="number" min="5" max="600"></label>
        <label>Vence en (días)<input v-model.number="venceEnDias" type="number" min="1" max="365" placeholder="Sin vencimiento"></label>
      </div>
      <button type="submit" class="primario" :disabled="creando || nombre.trim().length < 3 || !alcances.length">{{ creando ? 'Creando…' : 'Crear llave' }}</button>
    </form>

    <section class="lista"><h2>Llaves</h2>
      <p v-if="!data?.llaves.length" class="vacio">Aún no hay llaves.</p>
      <ul><li v-for="llave in data?.llaves" :key="llave.id" :class="{ inactiva: estadoLlave(llave) !== 'Activa' }">
        <div><strong>{{ llave.nombre }}</strong> <span class="etiqueta" :class="estadoLlave(llave).toLowerCase()">{{ estadoLlave(llave) }}</span>
          <small><code>{{ llave.prefijo }}…</code> · {{ llave.alcances.join(', ') }} · {{ llave.limitePorMinuto }}/min<template v-if="llave.alcances.includes('programar')"> · {{ llave.maxProgramacionesDia }} prog./día</template></small>
          <small>Creada {{ fecha(llave.creadaEn) }} · Último uso {{ fecha(llave.ultimoUsoEn) }}<template v-if="llave.venceEn"> · Vence {{ fecha(llave.venceEn) }}</template></small></div>
        <button v-if="estadoLlave(llave) === 'Activa'" type="button" class="revocar" @click="revocar(llave)"><Trash2 :size="16" />Revocar</button>
      </li></ul>
    </section>
  </section>
</template>

<style scoped>
.agentes{max-width:820px;margin:auto;display:grid;gap:20px;color:var(--navy)}
header{display:flex;gap:14px;align-items:flex-start}header>a{display:grid;place-items:center;flex:none;width:44px;height:44px;border:1px solid var(--line);border-radius:6px;background:white;color:var(--navy)}header h1{margin:0 0 4px}header p{margin:0;color:var(--muted)}
h2{display:flex;align-items:center;gap:8px;margin:0 0 12px;font-size:17px}h3{margin:14px 0 6px;font-size:14px}
.aviso{padding:12px;border-radius:6px;background:var(--soft-yellow)}.aviso.error{background:#fde2e2}
.formulario,.lista,.nueva{padding:18px;border:1px solid var(--line);border-radius:8px;background:white}.nueva{border-color:var(--navy);box-shadow:0 0 0 2px #ffd80066}
label{display:grid;gap:6px;font-size:13px;margin-bottom:12px}input[type=text],input[type=number]{width:100%;box-sizing:border-box;padding:10px;border:1px solid var(--line);border-radius:6px;font:inherit}
fieldset{border:1px solid var(--line);border-radius:8px;padding:12px;margin:0 0 12px}legend{padding:0 6px;font-weight:700}
.alcance{display:flex;align-items:flex-start;gap:10px;margin:0 0 10px;font-size:14px}.alcance input{margin-top:3px;width:18px;height:18px}.alcance span{display:grid;gap:2px}.alcance small{color:var(--muted)}.alcance.riesgo{padding:10px;border-radius:6px;background:var(--soft-yellow)}
.numeros{display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:12px}
.primario,.secundario,.caja button,.revocar{display:inline-flex;align-items:center;gap:6px;min-height:44px;padding:0 16px;border-radius:6px;font:inherit;font-weight:700;cursor:pointer}
.primario{border:0;background:var(--navy);color:white}.primario:disabled{opacity:.5;cursor:default}.secundario,.caja button,.revocar{border:1px solid var(--line);background:white;color:var(--navy)}
.importante{display:flex;align-items:center;gap:8px;padding:10px;border-radius:6px;background:var(--soft-yellow);font-size:14px}
.caja{display:flex;gap:8px;align-items:flex-start}.caja code,.caja pre{flex:1;margin:0;padding:10px;border-radius:6px;background:#0b1220;color:#f4f7fc;font-size:12px;overflow-x:auto;white-space:pre-wrap;word-break:break-all}
.pie{font-size:13px;margin:12px 0}.lista ul{list-style:none;margin:0;padding:0;display:grid;gap:10px}.lista li{display:flex;justify-content:space-between;gap:12px;align-items:center;padding:12px;border:1px solid var(--line);border-radius:6px}.lista li.inactiva{opacity:.6}
.lista small{display:block;color:var(--muted);margin-top:4px}.etiqueta{margin-left:8px;padding:2px 8px;border-radius:999px;background:#e1f3d4;font-size:12px}.etiqueta.revocada,.etiqueta.vencida{background:#fde2e2}.vacio{color:var(--muted)}
@media(max-width:700px){.lista li{flex-direction:column;align-items:flex-start}}
</style>
