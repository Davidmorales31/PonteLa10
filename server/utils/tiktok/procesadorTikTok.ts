import { spawn } from 'node:child_process'
import {
  esquemaResultadoPythonTikTok,
  type ResultadoPythonTikTok,
  versionContratoEvidenciaIngesta
} from '~/utils/editorial/evidenciaIngesta'

interface EventoPythonBase {
  versionContrato: number
  tipo: 'progreso' | 'resultado' | 'error'
  ingestaId: string
  intentoId: string
  secuencia: number
}

function ejecutarPythonConEntrada(
  python: string,
  script: string,
  entrada: string
): Promise<string> {
  return new Promise((resolve, reject) => {
    const proceso = spawn(python, [script], {
      stdio: ['pipe', 'pipe', 'pipe'],
      windowsHide: true
    })
    let stdout = ''
    let stderr = ''
    const temporizador = setTimeout(() => {
      proceso.kill()
      reject(new Error('El transcriptor superó el tiempo máximo permitido.'))
    }, 10 * 60 * 1000)

    proceso.stdout.setEncoding('utf8')
    proceso.stderr.setEncoding('utf8')
    proceso.stdout.on('data', (fragmento: string) => {
      stdout += fragmento
      if (stdout.length > 4 * 1024 * 1024) {
        proceso.kill()
        reject(new Error('El transcriptor superó el límite de salida permitido.'))
      }
    })
    proceso.stderr.on('data', (fragmento: string) => {
      stderr = (stderr + fragmento).slice(-64 * 1024)
    })
    proceso.on('error', (error) => {
      clearTimeout(temporizador)
      reject(error)
    })
    proceso.on('close', (codigo) => {
      clearTimeout(temporizador)
      if (codigo === 0) {
        resolve(stdout)
        return
      }
      reject(new Error(stderr.trim() || 'El transcriptor terminó con error.'))
    })
    proceso.stdin.end(entrada)
  })
}

interface EventoResultadoPython extends EventoPythonBase {
  tipo: 'resultado'
  resultado: unknown
}

interface EventoErrorPython extends EventoPythonBase {
  tipo: 'error'
  error?: { codigo?: string, mensaje?: string }
}

export interface EntradaProcesamientoTikTok {
  ingestaId: string
  intentoId: string
  urlFuente: string
}

function leerEventoTerminal(stdout: string, ingestaId: string, intentoId: string) {
  const lineas = stdout
    .split(/\r?\n/)
    .map(linea => linea.trim())
    .filter(Boolean)

  if (!lineas.length) {
    throw new Error('El transcriptor no devolvió eventos.')
  }

  let secuenciaAnterior = 0
  let terminal: EventoResultadoPython | EventoErrorPython | null = null

  for (const linea of lineas) {
    const evento = JSON.parse(linea) as EventoPythonBase

    if (
      evento.versionContrato !== versionContratoEvidenciaIngesta
      || evento.ingestaId !== ingestaId
      || evento.intentoId !== intentoId
      || !Number.isInteger(evento.secuencia)
      || evento.secuencia <= secuenciaAnterior
    ) {
      throw new Error('El transcriptor devolvió un contrato inválido.')
    }

    secuenciaAnterior = evento.secuencia

    if (evento.tipo === 'resultado' || evento.tipo === 'error') {
      if (terminal) {
        throw new Error('El transcriptor devolvió más de un evento terminal.')
      }
      terminal = evento as EventoResultadoPython | EventoErrorPython
    } else if (terminal) {
      throw new Error('El transcriptor emitió progreso después del terminal.')
    }
  }

  if (!terminal) {
    throw new Error('El transcriptor no devolvió un resultado terminal.')
  }

  return terminal
}

export async function procesarTikTok(
  entrada: EntradaProcesamientoTikTok
): Promise<ResultadoPythonTikTok> {
  const configuracion = useRuntimeConfig()
  const python = String(configuracion.tiktokPythonPath || 'python')
  const script = String(configuracion.tiktokWorkerPath || 'workers/transcribir_tiktok.py')
  const modelo = String(configuracion.tiktokWhisperModel || 'base')
  const documentoEntrada = JSON.stringify({
    versionContrato: versionContratoEvidenciaIngesta,
    operacion: 'transcribirTikTok',
    ingestaId: entrada.ingestaId,
    intentoId: entrada.intentoId,
    urlFuente: entrada.urlFuente,
    modelo,
    dispositivo: 'cpu',
    precision: 'int8',
    limites: {
      descargaMaximaBytes: 52428800,
      temporalMaximoBytes: 209715200,
      tiempoTotalSegundos: 600,
      tiempoRedSegundos: 30,
      redireccionesMaximas: 5
    }
  })
  const stdout = await ejecutarPythonConEntrada(python, script, documentoEntrada)
  const terminal = leerEventoTerminal(stdout, entrada.ingestaId, entrada.intentoId)

  if (terminal.tipo === 'error') {
    throw new Error(terminal.error?.mensaje || terminal.error?.codigo || 'No se pudo transcribir el TikTok.')
  }

  return esquemaResultadoPythonTikTok.parse(terminal.resultado)
}
