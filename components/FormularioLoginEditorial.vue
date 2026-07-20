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
  UserPlus,
  UserRound
} from '@lucide/vue'
import type { ModoLoginEditorial, ResultadoOperacionAuth } from '~/types/autenticacion'

const route = useRoute()

const {
  autenticacionConfigurada,
  cargandoAuth,
  obtenerSesionActual,
  iniciarSesionCorreo,
  registrarUsuarioCorreo,
  recuperarContrasena,
  actualizarContrasena,
  iniciarSesionGoogle
} = useAutenticacionEditorial()

const correo = ref('')
const contrasena = ref('')
const nombreCompleto = ref('')
const mostrarContrasena = ref(false)
const modoActual = ref<ModoLoginEditorial>(obtenerModoInicial())
const mensajeEstado = ref<ResultadoOperacionAuth | null>(null)

const redireccionFinal = computed(() => {
  const redirigir = route.query.redirigir

  return typeof redirigir === 'string' ? redirigir : '/'
})

const tituloFormulario = computed(() => {
  const titulos: Record<ModoLoginEditorial, string> = {
    ingreso: 'Entrar a Pont3la10',
    registro: 'Crear tu cuenta',
    recuperacion: 'Recuperar contrasena',
    actualizarContrasena: 'Nueva contrasena'
  }

  return titulos[modoActual.value]
})

const detalleFormulario = computed(() => {
  const detalles: Record<ModoLoginEditorial, string> = {
    ingreso: 'Ingresa con tu correo o continua con Google.',
    registro: 'Crea tu cuenta para acceder a nuevas funciones.',
    recuperacion: 'Recibiras un correo para cambiar tu contrasena.',
    actualizarContrasena: 'Define una clave fuerte para proteger tu cuenta.'
  }

  return detalles[modoActual.value]
})

const textoBotonPrincipal = computed(() => {
  const textos: Record<ModoLoginEditorial, string> = {
    ingreso: 'Iniciar sesion',
    registro: 'Crear cuenta',
    recuperacion: 'Enviar recuperacion',
    actualizarContrasena: 'Guardar contrasena'
  }

  return cargandoAuth.value ? 'Procesando...' : textos[modoActual.value]
})

const requiereCorreo = computed(() => modoActual.value !== 'actualizarContrasena')
const requiereNombre = computed(() => modoActual.value === 'registro')
const requiereContrasena = computed(() => ['ingreso', 'registro', 'actualizarContrasena'].includes(modoActual.value))

watch(modoActual, () => {
  mensajeEstado.value = null
})

onMounted(async () => {
  if (!autenticacionConfigurada.value) {
    mensajeEstado.value = {
      correcto: false,
      titulo: 'Falta configuracion',
      detalle: 'Configura NUXT_PUBLIC_SUPABASE_URL y NUXT_PUBLIC_SUPABASE_KEY para activar el acceso.'
    }
    return
  }

  const sesion = await obtenerSesionActual()

  if (sesion && modoActual.value !== 'actualizarContrasena') {
    await navigateTo(redireccionFinal.value)
  }
})

function obtenerModoInicial(): ModoLoginEditorial {
  return route.query.modo === 'actualizarContrasena' ? 'actualizarContrasena' : 'ingreso'
}

async function enviarFormulario() {
  const resultado = await ejecutarOperacionModo()
  mensajeEstado.value = resultado

  if (resultado.correcto && modoActual.value === 'ingreso') {
    await navigateTo(redireccionFinal.value)
  }

  if (resultado.correcto && modoActual.value === 'actualizarContrasena') {
    modoActual.value = 'ingreso'
    contrasena.value = ''
  }
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

async function entrarConGoogle() {
  mensajeEstado.value = await iniciarSesionGoogle()
}
</script>

<template>
  <section class="formulario-login-editorial" aria-labelledby="titulo-login-editorial">
    <div class="encabezado-login">
      <h2 id="titulo-login-editorial">{{ tituloFormulario }}</h2>
      <p>{{ detalleFormulario }}</p>
    </div>

    <form class="auth-form auth-form-editorial" @submit.prevent="enviarFormulario">
      <label v-if="requiereNombre">
        Nombre completo
        <span class="campo-login-con-icono">
          <UserRound aria-hidden="true" />
          <input v-model="nombreCompleto" type="text" placeholder="Tu nombre" autocomplete="name">
        </span>
      </label>

      <label v-if="requiereCorreo">
        Correo
        <span class="campo-login-con-icono">
          <Mail aria-hidden="true" />
          <input v-model="correo" type="email" placeholder="tu@email.com" autocomplete="email">
        </span>
      </label>

      <label v-if="requiereContrasena">
        Contrasena
        <span class="campo-login-con-icono campo-contrasena">
          <LockKeyhole aria-hidden="true" />
          <input
            v-model="contrasena"
            :type="mostrarContrasena ? 'text' : 'password'"
            placeholder="Tu contrasena"
            :autocomplete="modoActual === 'ingreso' ? 'current-password' : 'new-password'"
          >
          <button
            class="boton-ver-contrasena"
            type="button"
            :aria-label="mostrarContrasena ? 'Ocultar contrasena' : 'Mostrar contrasena'"
            :title="mostrarContrasena ? 'Ocultar contrasena' : 'Mostrar contrasena'"
            @click="mostrarContrasena = !mostrarContrasena"
          >
            <EyeOff v-if="mostrarContrasena" aria-hidden="true" />
            <Eye v-else aria-hidden="true" />
          </button>
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
        :disabled="cargandoAuth || !autenticacionConfigurada"
      >
        <LoaderCircle v-if="cargandoAuth" class="icono-cargando" aria-hidden="true" />
        <KeyRound v-else-if="modoActual === 'actualizarContrasena'" aria-hidden="true" />
        <RotateCcw v-else-if="modoActual === 'recuperacion'" aria-hidden="true" />
        <UserPlus v-else-if="modoActual === 'registro'" aria-hidden="true" />
        <LogIn v-else aria-hidden="true" />
        <span>{{ textoBotonPrincipal }}</span>
      </button>

      <button
        v-if="modoActual === 'ingreso'"
        class="boton-google"
        type="button"
        :disabled="cargandoAuth || !autenticacionConfigurada"
        @click="entrarConGoogle"
      >
        <LogoGoogle />
        <span>Continuar con Google</span>
      </button>
    </form>

    <div class="acciones-login-secundarias">
      <button v-if="modoActual !== 'recuperacion'" type="button" @click="modoActual = 'recuperacion'">
        <RotateCcw aria-hidden="true" />
        <span>Recuperar contrasena</span>
      </button>
      <button v-if="modoActual !== 'registro'" type="button" @click="modoActual = 'registro'">
        <UserPlus aria-hidden="true" />
        <span>Registrarse</span>
      </button>
      <button v-if="modoActual !== 'ingreso'" type="button" @click="modoActual = 'ingreso'">
        <ArrowLeft aria-hidden="true" />
        <span>Volver</span>
      </button>
    </div>
  </section>
</template>
