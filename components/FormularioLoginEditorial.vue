<script setup lang="ts">
import {
  ArrowLeft,
  Eye,
  EyeOff,
  KeyRound,
  LoaderCircle,
  LockKeyhole,
  LogIn,
  Mail,
  RotateCcw,
  ShieldCheck,
  UserPlus,
  UserRound
} from '@lucide/vue'
import type { ModoLoginEditorial, ResultadoOperacionAuth } from '~/types/autenticacion'
import { normalizarRedireccionInterna } from '~/utils/auth/redirecciones'

const route = useRoute()

const {
  autenticacionConfigurada,
  cargandoAuth,
  obtenerSesionActual,
  iniciarSesionCorreo,
  registrarUsuarioCorreo,
  recuperarContrasena,
  actualizarContrasena,
  cerrarSesion
} = useAutenticacionEditorial()

const {
  cargandoMfa,
  errorMfa,
  obtenerEstadoSesionMfa,
  verificarSesionMfa
} = useMfaEditorial()

const correo = ref('')
const contrasena = ref('')
const nombreCompleto = ref('')
const mostrarContrasena = ref(false)
const codigoMfa = ref('')
const factorMfaId = ref<string | null>(null)
const accionMfaPendiente = ref<'ingreso' | 'actualizarContrasena' | null>(null)
const modoActual = ref<ModoLoginEditorial>(obtenerModoInicial())
const mensajeEstado = ref<ResultadoOperacionAuth | null>(null)

const redireccionFinal = computed(() => {
  return normalizarRedireccionInterna(route.query.redirigir)
})

const tituloFormulario = computed(() => {
  if (accionMfaPendiente.value) return 'Confirma que eres tú'

  const titulos: Record<ModoLoginEditorial, string> = {
    ingreso: 'Entrar a Pont3la10',
    registro: 'Crear tu cuenta',
    recuperacion: 'Recuperar contraseña',
    actualizarContrasena: 'Nueva contraseña'
  }

  return titulos[modoActual.value]
})

const detalleFormulario = computed(() => {
  if (accionMfaPendiente.value) {
    return 'Ingresa el código de seis dígitos de tu aplicación de autenticación para continuar de forma segura.'
  }

  const detalles: Record<ModoLoginEditorial, string> = {
    ingreso:
      'Ingresa con tu correo y contraseña para continuar.',
    registro: 'Crea tu cuenta para acceder a nuevas funciones.',
    recuperacion: 'Recibirás un correo para cambiar tu contraseña.',
    actualizarContrasena: 'Define una clave fuerte para proteger tu cuenta.'
  }

  return detalles[modoActual.value]
})

const textoBotonPrincipal = computed(() => {
  if (cargandoAuth.value || cargandoMfa.value) return 'Procesando...'
  if (accionMfaPendiente.value) return 'Verificar identidad'

  const textos: Record<ModoLoginEditorial, string> = {
    ingreso: 'Iniciar sesión',
    registro: 'Crear cuenta',
    recuperacion: 'Enviar recuperación',
    actualizarContrasena: 'Guardar contraseña'
  }

  return textos[modoActual.value]
})

const verificandoMfa = computed(() => accionMfaPendiente.value !== null)
const cargandoFormulario = computed(() => cargandoAuth.value || cargandoMfa.value)
const requiereCorreo = computed(() => (
  !verificandoMfa.value && modoActual.value !== 'actualizarContrasena'
))
const requiereNombre = computed(() => !verificandoMfa.value && modoActual.value === 'registro')
const requiereContrasena = computed(() => (
  !verificandoMfa.value
  && ['ingreso', 'registro', 'actualizarContrasena'].includes(modoActual.value)
))

watch(modoActual, () => {
  mensajeEstado.value = null
  codigoMfa.value = ''
  factorMfaId.value = null
  accionMfaPendiente.value = null
})

onMounted(async () => {
  if (!autenticacionConfigurada.value) {
    mensajeEstado.value = {
      correcto: false,
      titulo: 'Falta configuración',
      detalle: 'Configura NUXT_PUBLIC_SUPABASE_URL y NUXT_PUBLIC_SUPABASE_KEY para activar el acceso.'
    }
    return
  }

  const sesion = await obtenerSesionActual()

  if (modoActual.value === 'actualizarContrasena') {
    if (!sesion) {
      mensajeEstado.value = {
        correcto: false,
        titulo: 'Enlace no válido',
        detalle: 'Solicita un nuevo correo de recuperación para cambiar tu contraseña.'
      }
      return
    }

    await prepararVerificacionMfa('actualizarContrasena')
    return
  }

  if (sesion) {
    const requiereMfa = await prepararVerificacionMfa('ingreso')
    if (!requiereMfa) await navigateTo(redireccionFinal.value)
  }
})

function obtenerModoInicial(): ModoLoginEditorial {
  return route.query.modo === 'actualizarContrasena' ? 'actualizarContrasena' : 'ingreso'
}

async function enviarFormulario() {
  if (accionMfaPendiente.value) {
    await confirmarMfaFormulario()
    return
  }

  const resultado = await ejecutarOperacionModo()
  mensajeEstado.value = resultado

  if (resultado.correcto && modoActual.value === 'ingreso') {
    const requiereMfa = await prepararVerificacionMfa('ingreso')
    if (!requiereMfa) await navigateTo(redireccionFinal.value)
  }

  if (resultado.correcto && modoActual.value === 'actualizarContrasena') {
    await cerrarSesion()
    modoActual.value = 'ingreso'
    contrasena.value = ''
  }
}

async function prepararVerificacionMfa(
  accion: 'ingreso' | 'actualizarContrasena'
): Promise<boolean> {
  const estado = await obtenerEstadoSesionMfa()

  if (!estado) {
    mensajeEstado.value = {
      correcto: false,
      titulo: 'No pudimos verificar la sesión',
      detalle: errorMfa.value || 'Intenta nuevamente.'
    }
    return false
  }

  if (!estado.requiereVerificacion) return false

  if (!estado.factorId) {
    mensajeEstado.value = {
      correcto: false,
      titulo: 'Factor MFA no disponible',
      detalle: 'La cuenta exige verificación adicional, pero no encontramos un factor TOTP activo.'
    }
    return true
  }

  factorMfaId.value = estado.factorId
  accionMfaPendiente.value = accion
  codigoMfa.value = ''
  mensajeEstado.value = {
    correcto: true,
    titulo: 'Primer paso completado',
    detalle: 'Ahora confirma el código de tu aplicación de autenticación.'
  }
  return true
}

async function confirmarMfaFormulario() {
  if (!factorMfaId.value || !accionMfaPendiente.value) return

  const accion = accionMfaPendiente.value
  const correcto = await verificarSesionMfa(factorMfaId.value, codigoMfa.value)

  if (!correcto) {
    mensajeEstado.value = {
      correcto: false,
      titulo: 'Código no válido',
      detalle: errorMfa.value || 'Revisa el código e intenta de nuevo.'
    }
    return
  }

  await obtenerSesionActual()
  accionMfaPendiente.value = null
  factorMfaId.value = null
  codigoMfa.value = ''

  if (accion === 'ingreso') {
    await navigateTo(redireccionFinal.value)
    return
  }

  mensajeEstado.value = {
    correcto: true,
    titulo: 'Identidad verificada',
    detalle: 'Ahora define tu nueva contraseña.'
  }
}

async function cancelarVerificacionMfa() {
  await cerrarSesion()
  accionMfaPendiente.value = null
  factorMfaId.value = null
  codigoMfa.value = ''
  contrasena.value = ''
  modoActual.value = 'ingreso'
}

async function ejecutarOperacionModo(): Promise<ResultadoOperacionAuth> {
  if (modoActual.value === 'ingreso') {
    return iniciarSesionCorreo({ correo: correo.value, contrasena: contrasena.value })
  }

  if (modoActual.value === 'registro') {
    return registrarUsuarioCorreo({
      nombreCompleto: nombreCompleto.value,
      correo: correo.value,
      contrasena: contrasena.value
    })
  }

  if (modoActual.value === 'recuperacion') {
    return recuperarContrasena({ correo: correo.value })
  }

  return actualizarContrasena({ contrasena: contrasena.value })
}

</script>

<template>
  <section class="formulario-login-editorial" aria-labelledby="titulo-login-editorial">
    <div class="encabezado-login">
      <p class="etiqueta-seccion">CUENTA PONT3LA10</p>
      <h2 id="titulo-login-editorial">{{ tituloFormulario }}</h2>
      <p>{{ detalleFormulario }}</p>
    </div>

    <form class="auth-form auth-form-editorial" @submit.prevent="enviarFormulario">
      <label v-if="requiereNombre">
        Nombre completo
        <span class="campo-login-con-icono" :class="{ 'campo-con-valor': nombreCompleto }">
          <UserRound aria-hidden="true" />
          <input v-model="nombreCompleto" type="text" placeholder="Tu nombre" autocomplete="name" maxlength="120">
        </span>
      </label>

      <label v-if="requiereCorreo">
        Correo
        <span class="campo-login-con-icono" :class="{ 'campo-con-valor': correo }">
          <Mail aria-hidden="true" />
          <input v-model="correo" type="email" placeholder="tu@email.com" autocomplete="email" maxlength="180">
        </span>
      </label>

      <label v-if="requiereContrasena">
        Contraseña
        <span class="campo-login-con-icono campo-contrasena" :class="{ 'campo-con-valor': contrasena }">
          <LockKeyhole aria-hidden="true" />
          <input
            v-model="contrasena"
            :type="mostrarContrasena ? 'text' : 'password'"
            placeholder="Tu contraseña"
            :autocomplete="modoActual === 'ingreso' ? 'current-password' : 'new-password'"
            maxlength="96"
          >
          <button
            class="boton-ver-contrasena"
            type="button"
            :aria-label="mostrarContrasena ? 'Ocultar contraseña' : 'Mostrar contraseña'"
            :title="mostrarContrasena ? 'Ocultar contraseña' : 'Mostrar contraseña'"
            @click="mostrarContrasena = !mostrarContrasena"
          >
            <EyeOff v-if="mostrarContrasena" aria-hidden="true" />
            <Eye v-else aria-hidden="true" />
          </button>
        </span>
      </label>

      <label v-if="verificandoMfa">
        Código de autenticación
        <span class="campo-login-con-icono" :class="{ 'campo-con-valor': codigoMfa }">
          <ShieldCheck aria-hidden="true" />
          <input
            v-model="codigoMfa"
            type="text"
            inputmode="numeric"
            pattern="[0-9]*"
            placeholder="000000"
            autocomplete="one-time-code"
            maxlength="6"
            autofocus
          >
        </span>
      </label>

      <div
        v-if="mensajeEstado"
        class="estado-login"
        :class="{ correcto: mensajeEstado.correcto }"
        role="status"
      >
        <strong>{{ mensajeEstado.titulo }}</strong>
        <span>{{ mensajeEstado.detalle }}</span>
      </div>

      <button
        class="boton-primario boton-login-principal"
        type="submit"
        :disabled="cargandoFormulario || !autenticacionConfigurada"
      >
        <LoaderCircle v-if="cargandoFormulario" class="icono-cargando" aria-hidden="true" />
        <ShieldCheck v-else-if="verificandoMfa" aria-hidden="true" />
        <KeyRound v-else-if="modoActual === 'actualizarContrasena'" aria-hidden="true" />
        <RotateCcw v-else-if="modoActual === 'recuperacion'" aria-hidden="true" />
        <UserPlus v-else-if="modoActual === 'registro'" aria-hidden="true" />
        <LogIn v-else aria-hidden="true" />
        <span>{{ textoBotonPrincipal }}</span>
      </button>

    </form>

    <div v-if="!verificandoMfa" class="acciones-login-secundarias">
      <div v-if="modoActual === 'ingreso'" class="separador-login" aria-hidden="true">
        <span />
        <small>o</small>
        <span />
      </div>
      <button
        v-if="modoActual !== 'recuperacion'"
        class="accion-login-recuperacion"
        type="button"
        @click="modoActual = 'recuperacion'"
      >
        <RotateCcw aria-hidden="true" />
        <span>¿Olvidaste tu contraseña?</span>
      </button>
      <p v-if="modoActual !== 'registro'" class="accion-login-registro">
        <span>¿No tienes cuenta?</span>
        <button type="button" @click="modoActual = 'registro'">
          <UserPlus aria-hidden="true" />
          <span>Crear cuenta</span>
        </button>
      </p>
      <button v-if="modoActual !== 'ingreso'" type="button" @click="modoActual = 'ingreso'">
        <ArrowLeft aria-hidden="true" />
        <span>Volver</span>
      </button>
    </div>

    <div v-else class="acciones-login-secundarias">
      <button type="button" :disabled="cargandoFormulario" @click="cancelarVerificacionMfa">
        <ArrowLeft aria-hidden="true" />
        <span>Cancelar y volver</span>
      </button>
    </div>
  </section>
</template>
