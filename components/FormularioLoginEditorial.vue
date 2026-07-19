<script setup lang="ts">
import type { ModoLoginEditorial, ResultadoOperacionAuth } from '~/types/autenticacion'

const route = useRoute()

const {
  autenticacionConfigurada,
  cargandoAuth,
  obtenerSesionActual,
  iniciarSesionCorreo,
  registrarUsuarioCorreo,
  enviarEnlaceMagico,
  recuperarContrasena,
  actualizarContrasena,
  iniciarSesionGoogle
} = useAutenticacionEditorial()

const modosPrincipales: Array<{ modo: ModoLoginEditorial, etiqueta: string }> = [
  { modo: 'ingreso', etiqueta: 'Entrar' },
  { modo: 'registro', etiqueta: 'Crear acceso' },
  { modo: 'enlace', etiqueta: 'Email link' }
]

const correo = ref('')
const contrasena = ref('')
const nombreCompleto = ref('')
const mostrarContrasena = ref(false)
const modoActual = ref<ModoLoginEditorial>(obtenerModoInicial())
const mensajeEstado = ref<ResultadoOperacionAuth | null>(null)

const redireccionFinal = computed(() => {
  const redirigir = route.query.redirigir

  return typeof redirigir === 'string' ? redirigir : '/admin'
})

const tituloFormulario = computed(() => {
  const titulos: Record<ModoLoginEditorial, string> = {
    ingreso: 'Entrar al panel',
    registro: 'Crear acceso editorial',
    enlace: 'Entrar con correo',
    recuperacion: 'Recuperar contrasena',
    actualizarContrasena: 'Nueva contrasena'
  }

  return titulos[modoActual.value]
})

const detalleFormulario = computed(() => {
  const detalles: Record<ModoLoginEditorial, string> = {
    ingreso: 'Correo del equipo, Google o enlace seguro.',
    registro: 'La cuenta queda pendiente de permisos internos antes de editar contenido.',
    enlace: 'Te enviaremos un enlace temporal para entrar sin contrasena.',
    recuperacion: 'Recibiras un correo para iniciar el cambio de contrasena.',
    actualizarContrasena: 'Define una clave fuerte para proteger tu acceso editorial.'
  }

  return detalles[modoActual.value]
})

const textoBotonPrincipal = computed(() => {
  const textos: Record<ModoLoginEditorial, string> = {
    ingreso: 'Iniciar sesion',
    registro: 'Crear cuenta',
    enlace: 'Enviar enlace',
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

  if (modoActual.value === 'enlace') {
    return enviarEnlaceMagico({ correo: correo.value })
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
      <p class="etiqueta-seccion">Acceso interno</p>
      <h2 id="titulo-login-editorial">{{ tituloFormulario }}</h2>
      <p>{{ detalleFormulario }}</p>
    </div>

    <div class="selector-login" role="tablist" aria-label="Metodos de acceso">
      <button
        v-for="opcion in modosPrincipales"
        :key="opcion.modo"
        type="button"
        :class="{ activo: modoActual === opcion.modo }"
        @click="modoActual = opcion.modo"
      >
        {{ opcion.etiqueta }}
      </button>
    </div>

    <form class="auth-form auth-form-editorial" @submit.prevent="enviarFormulario">
      <label v-if="requiereNombre">
        Nombre completo
        <input v-model="nombreCompleto" type="text" placeholder="David Morales" autocomplete="name">
      </label>

      <label v-if="requiereCorreo">
        Correo
        <input v-model="correo" type="email" placeholder="editor@pont3la10.com" autocomplete="email">
      </label>

      <label v-if="requiereContrasena">
        Contrasena
        <span class="campo-contrasena">
          <input
            v-model="contrasena"
            :type="mostrarContrasena ? 'text' : 'password'"
            placeholder="Minimo 10 caracteres"
            :autocomplete="modoActual === 'ingreso' ? 'current-password' : 'new-password'"
          >
          <button type="button" @click="mostrarContrasena = !mostrarContrasena">
            {{ mostrarContrasena ? 'Ocultar' : 'Ver' }}
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

      <button class="boton-primario boton-login-principal" type="submit" :disabled="cargandoAuth || !autenticacionConfigurada">
        {{ textoBotonPrincipal }}
      </button>

      <button
        v-if="modoActual === 'ingreso'"
        class="boton-google"
        type="button"
        :disabled="cargandoAuth || !autenticacionConfigurada"
        @click="entrarConGoogle"
      >
        <span>G</span>
        Continuar con Google
      </button>
    </form>

    <div class="acciones-login-secundarias">
      <button v-if="modoActual !== 'recuperacion'" type="button" @click="modoActual = 'recuperacion'">
        Olvide mi contrasena
      </button>
      <button v-if="modoActual !== 'ingreso'" type="button" @click="modoActual = 'ingreso'">
        Volver al inicio
      </button>
    </div>
  </section>
</template>
