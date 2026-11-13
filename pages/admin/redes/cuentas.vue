<script setup lang="ts">
import { ArrowLeft, ExternalLink } from '@lucide/vue'
import { cuentasSocialesObjetivo } from '~/data/cuentasSociales'
import type { EstadoConexionSocialX } from '~/types/conexionSocialX'
import type { ConexionMeta } from '~/types/publicacionMeta'

definePageMeta({ layout: 'admin', middleware: 'autenticacion-editorial', permisoEditorial: 'contenido.verBorradores' })
useSeoMeta({ title: 'Cuentas sociales | Pont3la10', robots: 'noindex, nofollow' })
const ruta = useRoute()
const { data: conexionMeta, refresh: actualizarMeta } = await useFetch<ConexionMeta>('/api/admin/redes/oauth/meta')
const { data: conexionX, error: errorConexionX, refresh: actualizarX } = await useFetch<EstadoConexionSocialX>('/api/admin/redes/oauth/x')
const conectandoX = ref(false), problemaX = ref('')
const resultadosX: Record<string, string> = {
  conectada: 'La cuenta @Pont3la10 quedó conectada. No se publicó contenido.',
  cancelada: 'Cancelaste la autorización de X. La conexión anterior, si existía, se conserva.',
  cuenta_incorrecta: 'La cuenta autorizada no es @Pont3la10. No se guardó. Cambia a la cuenta de Pont3la10 en X y vuelve a conectar.',
  autorizacion_invalida: 'La autorización venció, ya se utilizó o pertenece a otra sesión. Inicia la conexión de nuevo.',
  conexion_fallida: 'X no pudo completar la conexión. No se guardaron credenciales nuevas; vuelve a iniciarla.',
  guardado_fallido: 'No se pudo guardar la conexión. Inicia una autorización nueva.'
}
const mensajeX = computed(() => {
  if (typeof ruta.query.resultadoX !== 'string') return ''
  if (ruta.query.resultadoX === 'conectada' && !conexionX.value?.cuenta) return 'Consultando el estado real de la conexión. Si no aparece conectada, vuelve a autorizarla.'
  return resultadosX[ruta.query.resultadoX] || ''
})
const estadoX = computed(() => errorConexionX.value ? 'No se pudo consultar la conexión'
  : conexionX.value?.cuenta ? `Conectada: @${conexionX.value.cuenta.usuario}`
    : 'Sin autorización de publicación')
async function conectarX() {
  if (conectandoX.value || !conexionX.value?.preparada || !conexionX.value.puedeConectar) return
  conectandoX.value = true; problemaX.value = ''
  try {
    const respuesta = await $fetch<{ url: string }>('/api/admin/redes/oauth/x/conectar', { method: 'POST', body: {} })
    const destino = new URL(respuesta.url)
    if (destino.origin !== 'https://x.com' || destino.pathname !== '/i/oauth2/authorize') throw new Error()
    window.location.assign(destino.toString())
  } catch (error) {
    problemaX.value = (error as { data?: { statusMessage?: string } }).data?.statusMessage || 'No se pudo iniciar la autorización de X.'
    conectandoX.value = false
  }
}
</script>

<template>
  <section class="cuentas-sociales">
    <NuxtLink to="/admin/redes" class="volver-cuentas"><ArrowLeft :size="17" />Contenido para redes</NuxtLink>
    <h1>Cuentas de Pont3la10</h1>
    <p v-if="mensajeX" role="status" class="mensaje-conexion">{{ mensajeX }}</p>
    <p>Publica en Facebook, Instagram y X desde Vista rápida con confirmación por envío. Cada cuenta se verifica en el servidor y conserva sus credenciales privadas.</p>
    <div class="lista-cuentas">
      <article v-for="cuenta in cuentasSocialesObjetivo" :key="cuenta.id">
        <h2>{{ cuenta.nombre }}</h2><a :href="cuenta.url" target="_blank" rel="noopener noreferrer">{{ cuenta.perfil }} <ExternalLink :size="15" /></a>
        <strong>{{ cuenta.id === 'x' ? estadoX : cuenta.id === 'facebook' || cuenta.id === 'instagram' ? (conexionMeta?.[cuenta.id].preparada ? 'Cuenta verificada · publicación con confirmación' : 'No se pudo verificar la conexión') : 'Imágenes de Comunidad: publicación manual' }}</strong>
        <template v-if="cuenta.id === 'instagram' || cuenta.id === 'facebook'">
          <p>{{ conexionMeta?.[cuenta.id].aviso || 'Publica imágenes y carruseles desde Vista rápida. Si Meta rechaza una credencial caducada, el responsable debe renovarla en el servidor.' }}</p>
          <button type="button" @click="actualizarMeta()">Comprobar conexión</button>
        </template>
        <template v-else-if="cuenta.id === 'x'">
          <p>Autoriza específicamente @Pont3la10. Conectar no publica contenido ni compra créditos; cada envío desde Vista rápida requiere confirmación.</p>
          <p v-if="conexionX && !conexionX.configurado">Falta configurar Client ID, Client Secret y la clave de cifrado en el servidor.</p>
          <p v-if="conexionX && !conexionX.almacenamientoDisponible">Falta habilitar el almacenamiento privado de conexiones.</p>
          <p v-if="conexionX && !conexionX.puedeConectar">Solo un responsable con permiso de configuración y MFA puede conectar cuentas.</p>
          <button v-if="conexionX?.puedeConectar" type="button" :disabled="!conexionX.preparada || conectandoX" @click="conectarX">{{ conectandoX ? 'Abriendo X…' : conexionX.cuenta ? 'Volver a autorizar X' : 'Conectar X' }}</button>
          <button v-if="errorConexionX" type="button" @click="actualizarX()">Reintentar consulta</button>
          <p v-if="problemaX" role="alert">{{ problemaX }} <NuxtLink to="/admin/seguridad">Revisar verificación en dos pasos</NuxtLink></p>
          <p v-if="conexionX?.cuenta">El token vence el {{ new Date(conexionX.cuenta.venceEn).toLocaleString('es-CO', { timeZone: 'America/Bogota' }) }} COT. El sistema intentará renovarlo automáticamente al publicar; si X no acepta la renovación, vuelve a autorizar la cuenta.</p>
        </template>
        <p v-else>La API de YouTube no ofrece un endpoint de creación de publicaciones de Comunidad con imágenes. La imagen exportada se puede subir desde YouTube Studio; no es un video ni un Short.</p>
      </article>
    </div>
    <section class="requisitos-cuentas">
      <h2>Preparar las conexiones oficiales</h2>
      <p>El responsable debe completar el registro y el consentimiento en cada proveedor. Las claves se configurarán exclusivamente en el servidor; no se pegan en el chat ni se guardan en el navegador del panel.</p>
      <a href="https://developers.facebook.com/apps/" target="_blank" rel="noopener noreferrer">Aplicaciones de Meta <ExternalLink :size="15" /></a>
      <a href="https://console.x.com/" target="_blank" rel="noopener noreferrer">Consola de desarrolladores de X <ExternalLink :size="15" /></a>
      <p>Los envíos guardan un recibo independiente por red. Si un proveedor no confirma el resultado, el reenvío se bloquea para evitar duplicados. Instagram publica en el feed; el formato Historia debe cambiarse en el editor.</p>
    </section>
  </section>
</template>

<style scoped>
.lista-cuentas button{background:var(--navy);color:white;padding:12px 18px;border:0;border-radius:6px;cursor:pointer;font:inherit;font-weight:700}.lista-cuentas button:disabled{opacity:.5;cursor:default}.mensaje-conexion{padding:16px;background:var(--soft-blue);border-radius:8px}button:focus-visible{outline:3px solid #2376cf;outline-offset:3px}
.cuentas-sociales{max-width:1100px;margin:auto;color:var(--navy)}.volver-cuentas{display:inline-flex;align-items:center;gap:8px;font-size:13px}h1{font-size:28px;margin-top:24px}.cuentas-sociales>p,.requisitos-cuentas p{color:var(--muted);line-height:1.7}.lista-cuentas{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:20px;margin:26px 0}.lista-cuentas article{border:1px solid var(--line);padding:22px;border-radius:10px;background:white}.lista-cuentas h2{margin-top:0}.lista-cuentas a,.requisitos-cuentas a{display:flex;align-items:center;gap:8px;overflow-wrap:anywhere}.lista-cuentas strong{display:block;font-size:12px;color:#775100;margin-top:18px}.lista-cuentas p{font-size:14px;color:var(--muted);line-height:1.7}.requisitos-cuentas{padding:24px;background:var(--soft-blue);border-radius:10px}.requisitos-cuentas a{font-size:14px;margin:18px 0;font-weight:700}a:focus-visible{outline:3px solid #2376cf;outline-offset:3px}@media(max-width:650px){.lista-cuentas{grid-template-columns:minmax(0,1fr)}}
</style>
