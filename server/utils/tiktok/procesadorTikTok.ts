import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import type { MetadatosTikTok } from './clienteTikTok'
import { obtenerMetadatosTikTok } from './clienteTikTok'

const ejecutarArchivo = promisify(execFile)

export interface ResultadoProcesamientoTikTok {
  metadatos: MetadatosTikTok
  videoId: string
  duracion: number | null
  tituloFuente: string
  autorFuente: string
  transcripcion: Array<{ inicio: number, fin: number, texto: string }>
  idioma: string
  modelo: string
}

export async function procesarTikTok(urlFuente: string): Promise<ResultadoProcesamientoTikTok> {
  const metadatos = await obtenerMetadatosTikTok(urlFuente)
  const configuracion = useRuntimeConfig()
  const python = String(configuracion.tiktokPythonPath || 'python')
  const script = String(configuracion.tiktokWorkerPath || 'workers/transcribir_tiktok.py')
  const modelo = String(configuracion.tiktokWhisperModel || 'base')
  const { stdout } = await ejecutarArchivo(python, [script, urlFuente, '--modelo', modelo], {
    timeout: 10 * 60 * 1000,
    maxBuffer: 4 * 1024 * 1024
  })
  const resultado = JSON.parse(stdout) as Omit<ResultadoProcesamientoTikTok, 'metadatos'>

  if (!resultado.transcripcion?.length) {
    throw new Error('El video no produjo una transcripción utilizable.')
  }

  return { metadatos, ...resultado }
}
