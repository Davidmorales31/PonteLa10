<script setup lang="ts">
import {
  CheckCircle2,
  KeyRound,
  LoaderCircle,
  ShieldAlert,
  ShieldCheck,
  Trash2
} from '@lucide/vue'

definePageMeta({
  layout: 'admin',
  middleware: 'autenticacion-editorial'
})

useSeoMeta({
  title: 'Seguridad editorial | Pont3la10',
  robots: 'noindex, nofollow'
})

const codigoMfa = ref('')
const route = useRoute()
const {
  contextoEditorial,
  cargarContextoEditorial
} = useContextoEditorial()
const {
  factorVerificado,
  inscripcionMfa,
  cargandoMfa,
  mensajeMfa,
  errorMfa,
  listarFactoresMfa,
  iniciarInscripcionMfa,
  confirmarInscripcionMfa,
  verificarSesionMfa,
  eliminarFactorMfa
} = useMfaEditorial()

const codigoQr = computed(() => {
  const codigo = inscripcionMfa.value?.codigoQr
  if (!codigo) return ''
  return codigo.startsWith('data:')
    ? codigo
    : `data:image/svg+xml;utf-8,${encodeURIComponent(codigo)}`
})

const sesionVerificada = computed(() => contextoEditorial.value?.nivelAal === 'aal2')
const requierePasoMfa = computed(() =>
  route.query.motivo === 'mfa' || (
    contextoEditorial.value?.requiereMfa && !sesionVerificada.value
  )
)

await listarFactoresMfa()

async function confirmarCodigo() {
  const correcto = inscripcionMfa.value
    ? await confirmarInscripcionMfa(codigoMfa.value)
    : factorVerificado.value
      ? await verificarSesionMfa(factorVerificado.value.id, codigoMfa.value)
      : false

  if (!correcto) return

  codigoMfa.value = ''
  await cargarContextoEditorial(true)

  if (route.query.motivo === 'mfa') {
    await navigateTo('/admin')
  }
}

async function retirarFactor() {
  if (!factorVerificado.value) return
  const eliminado = await eliminarFactorMfa(factorVerificado.value.id)
  if (eliminado) {
    await cargarContextoEditorial(true)
  }
}
</script>

<template>
  <div class="vista-panel-editorial vista-seguridad-panel">
    <header class="titulo-vista-panel">
      <div>
        <p class="etiqueta-panel">Protección de cuenta</p>
        <h1>Seguridad</h1>
        <p>Configura un autenticador para proteger las acciones críticas del panel.</p>
      </div>
    </header>

    <section v-if="requierePasoMfa" class="aviso-panel aviso-panel-atencion" role="status">
      <ShieldAlert aria-hidden="true" />
      <div>
        <strong>Verificación requerida</strong>
        <span>Tu rol necesita MFA antes de entrar al centro editorial o publicar.</span>
      </div>
    </section>

    <section class="configuracion-mfa-panel">
      <div class="cabecera-configuracion-mfa">
        <span class="icono-configuracion-mfa">
          <ShieldCheck v-if="factorVerificado" aria-hidden="true" />
          <KeyRound v-else aria-hidden="true" />
        </span>
        <div>
          <h2>Aplicación de autenticación</h2>
          <p>Compatible con Google Authenticator, Microsoft Authenticator, Authy y 1Password.</p>
        </div>
        <span :class="factorVerificado ? 'estado-mfa-activo' : 'estado-mfa-pendiente'">
          {{ factorVerificado ? 'Configurado' : 'Pendiente' }}
        </span>
      </div>

      <div v-if="factorVerificado && sesionVerificada" class="estado-sesion-mfa">
        <CheckCircle2 aria-hidden="true" />
        <div>
          <strong>Sesión verificada</strong>
          <span>Las acciones sensibles están habilitadas durante esta sesión.</span>
        </div>
      </div>

      <template v-else-if="factorVerificado">
        <div class="paso-mfa-panel">
          <span>1</span>
          <div>
            <strong>Abre tu aplicación</strong>
            <p>Usa el código actual del factor Pont3la10 Panel.</p>
          </div>
        </div>
        <form class="formulario-codigo-mfa" @submit.prevent="confirmarCodigo">
          <label for="codigo-mfa">Código de seis dígitos</label>
          <div>
            <input
              id="codigo-mfa"
              v-model="codigoMfa"
              inputmode="numeric"
              autocomplete="one-time-code"
              maxlength="6"
              placeholder="000000"
            >
            <button type="submit" :disabled="cargandoMfa">
              <LoaderCircle v-if="cargandoMfa" class="icono-girando" aria-hidden="true" />
              <ShieldCheck v-else aria-hidden="true" />
              <span>Verificar sesión</span>
            </button>
          </div>
        </form>
      </template>

      <template v-else-if="inscripcionMfa">
        <div class="inscripcion-mfa-panel">
          <div class="codigo-qr-mfa">
            <img :src="codigoQr" alt="Código QR para configurar el autenticador">
          </div>
          <div>
            <div class="paso-mfa-panel">
              <span>1</span>
              <div>
                <strong>Escanea el código QR</strong>
                <p>No compartas esta imagen ni el secreto de configuración.</p>
              </div>
            </div>
            <details>
              <summary>No puedo escanear el código</summary>
              <code>{{ inscripcionMfa.secreto }}</code>
            </details>
          </div>
        </div>
        <form class="formulario-codigo-mfa" @submit.prevent="confirmarCodigo">
          <label for="codigo-inscripcion-mfa">Confirma el código de seis dígitos</label>
          <div>
            <input
              id="codigo-inscripcion-mfa"
              v-model="codigoMfa"
              inputmode="numeric"
              autocomplete="one-time-code"
              maxlength="6"
              placeholder="000000"
            >
            <button type="submit" :disabled="cargandoMfa">
              <LoaderCircle v-if="cargandoMfa" class="icono-girando" aria-hidden="true" />
              <ShieldCheck v-else aria-hidden="true" />
              <span>Activar MFA</span>
            </button>
          </div>
        </form>
      </template>

      <button
        v-else
        class="accion-principal-mfa"
        type="button"
        :disabled="cargandoMfa"
        @click="iniciarInscripcionMfa"
      >
        <LoaderCircle v-if="cargandoMfa" class="icono-girando" aria-hidden="true" />
        <KeyRound v-else aria-hidden="true" />
        <span>Configurar autenticador</span>
      </button>

      <p v-if="mensajeMfa" class="mensaje-mfa mensaje-mfa-correcto" role="status">{{ mensajeMfa }}</p>
      <p v-if="errorMfa" class="mensaje-mfa mensaje-mfa-error" role="alert">{{ errorMfa }}</p>

      <button
        v-if="factorVerificado && sesionVerificada"
        class="accion-eliminar-mfa"
        type="button"
        :disabled="cargandoMfa"
        @click="retirarFactor"
      >
        <Trash2 aria-hidden="true" />
        <span>Retirar autenticador</span>
      </button>
    </section>
  </div>
</template>
