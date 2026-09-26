export function crearLatidoWorker({ cliente, workerInstanceId, cadaMs = 60_000, avisar = console.warn }) {
  let ultimaOperacion = Promise.resolve()
  let timer
  let avisoEmitido = false
  let detener = false

  const reportar = estado => {
    ultimaOperacion = ultimaOperacion.catch(() => {}).then(async () => {
      const { error } = await cliente.rpc('report_editorial_worker_heartbeat', {
        p_worker_instance_id: workerInstanceId,
        p_state: estado
      })
      if (error) {
        const fallo = new Error('No se pudo actualizar la señal de vida del worker.')
        fallo.codigo = typeof error.code === 'string' ? error.code : 'UNKNOWN'
        throw fallo
      }
    })
    return ultimaOperacion
  }

  const intentarReportar = async estado => {
    try {
      await reportar(estado)
      avisoEmitido = false
      return true
    } catch (error) {
      if (!avisoEmitido) {
        const codigo = error?.codigo || 'UNKNOWN'
        const esFuncionSinRegistrar = ['PGRST202', '42883'].includes(codigo)
        avisar(esFuncionSinRegistrar
          ? `Heartbeat HU-ED-13 pendiente de migración o actualización del esquema PostgREST (${codigo}); el worker continuará sin monitoría.`
          : `Heartbeat HU-ED-13 no disponible por un fallo del servicio (${codigo}); el worker continuará sin monitoría.`)
        avisoEmitido = true
      }
      return false
    }
  }

  const solicitarCierre = () => {
    detener = true
    if (timer) clearInterval(timer)
    void intentarReportar('stopping')
  }

  process.once('SIGINT', solicitarCierre)
  process.once('SIGTERM', solicitarCierre)

  return {
    iniciar: async () => {
      await intentarReportar('active')
      timer = setInterval(() => { void intentarReportar('active') }, cadaMs)
    },
    detener: async () => {
      process.removeListener('SIGINT', solicitarCierre)
      process.removeListener('SIGTERM', solicitarCierre)
      if (timer) clearInterval(timer)
      await ultimaOperacion.catch(() => {})
      await intentarReportar('stopped')
    },
    debeDetenerse: () => detener
  }
}
