import type { Factor } from '@supabase/supabase-js'
import { normalizarMensajeAuth } from '~/utils/auth/mensajesAutenticacion'

interface InscripcionMfa {
  factorId: string
  codigoQr: string
  secreto: string
}

export function useMfaEditorial() {
  const { $clienteSupabase } = useNuxtApp()
  const factoresMfa = ref<Factor[]>([])
  const inscripcionMfa = ref<InscripcionMfa | null>(null)
  const cargandoMfa = ref(false)
  const mensajeMfa = ref<string | null>(null)
  const errorMfa = ref<string | null>(null)

  const factorVerificado = computed(() =>
    factoresMfa.value.find(factor =>
      factor.factor_type === 'totp' && factor.status === 'verified'
    ) || null
  )

  async function listarFactoresMfa() {
    if (!$clienteSupabase) {
      errorMfa.value = 'La autenticación no está configurada.'
      return
    }

    cargandoMfa.value = true
    errorMfa.value = null
    const { data, error } = await $clienteSupabase.auth.mfa.listFactors()
    cargandoMfa.value = false

    if (error) {
      errorMfa.value = normalizarMensajeAuth(error.message)
      return
    }

    factoresMfa.value = data.all
  }

  async function iniciarInscripcionMfa() {
    if (!$clienteSupabase || factorVerificado.value) {
      return
    }

    cargandoMfa.value = true
    errorMfa.value = null
    mensajeMfa.value = null

    const factoresNoVerificados = factoresMfa.value.filter(factor =>
      factor.factor_type === 'totp' && factor.status === 'unverified'
    )

    await Promise.all(factoresNoVerificados.map(factor =>
      $clienteSupabase.auth.mfa.unenroll({ factorId: factor.id })
    ))

    const { data, error } = await $clienteSupabase.auth.mfa.enroll({
      factorType: 'totp',
      friendlyName: 'Pont3la10 Panel'
    })
    cargandoMfa.value = false

    if (error) {
      errorMfa.value = normalizarMensajeAuth(error.message)
      return
    }

    inscripcionMfa.value = {
      factorId: data.id,
      codigoQr: data.totp.qr_code,
      secreto: data.totp.secret
    }
  }

  async function confirmarInscripcionMfa(codigo: string): Promise<boolean> {
    if (!$clienteSupabase || !inscripcionMfa.value) {
      return false
    }

    const token = codigo.replace(/\s/g, '')

    if (!/^\d{6}$/.test(token)) {
      errorMfa.value = 'Ingresa el código de seis dígitos.'
      return false
    }

    cargandoMfa.value = true
    errorMfa.value = null

    const { data: desafio, error: errorDesafio } = await $clienteSupabase.auth.mfa.challenge({
      factorId: inscripcionMfa.value.factorId
    })

    if (errorDesafio) {
      cargandoMfa.value = false
      errorMfa.value = normalizarMensajeAuth(errorDesafio.message)
      return false
    }

    const { error } = await $clienteSupabase.auth.mfa.verify({
      factorId: inscripcionMfa.value.factorId,
      challengeId: desafio.id,
      code: token
    })
    cargandoMfa.value = false

    if (error) {
      errorMfa.value = 'El código no es válido o ya venció.'
      return false
    }

    inscripcionMfa.value = null
    mensajeMfa.value = 'La verificación en dos pasos quedó activa.'
    await listarFactoresMfa()
    return true
  }

  async function verificarSesionMfa(factorId: string, codigo: string): Promise<boolean> {
    if (!$clienteSupabase) {
      return false
    }

    const token = codigo.replace(/\s/g, '')

    if (!/^\d{6}$/.test(token)) {
      errorMfa.value = 'Ingresa el código de seis dígitos.'
      return false
    }

    cargandoMfa.value = true
    errorMfa.value = null
    const { data: desafio, error: errorDesafio } = await $clienteSupabase.auth.mfa.challenge({
      factorId
    })

    if (errorDesafio) {
      cargandoMfa.value = false
      errorMfa.value = normalizarMensajeAuth(errorDesafio.message)
      return false
    }

    const { error } = await $clienteSupabase.auth.mfa.verify({
      factorId,
      challengeId: desafio.id,
      code: token
    })
    cargandoMfa.value = false

    if (error) {
      errorMfa.value = 'El código no es válido o ya venció.'
      return false
    }

    mensajeMfa.value = 'Sesión verificada correctamente.'
    return true
  }

  async function eliminarFactorMfa(factorId: string): Promise<boolean> {
    if (!$clienteSupabase) {
      return false
    }

    cargandoMfa.value = true
    errorMfa.value = null
    const { error } = await $clienteSupabase.auth.mfa.unenroll({ factorId })
    cargandoMfa.value = false

    if (error) {
      errorMfa.value = 'Verifica primero tu sesión para retirar este factor.'
      return false
    }

    mensajeMfa.value = 'El factor fue retirado.'
    await listarFactoresMfa()
    return true
  }

  return {
    factoresMfa,
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
  }
}
