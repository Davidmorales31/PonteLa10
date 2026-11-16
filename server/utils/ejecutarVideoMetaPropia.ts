import { z } from 'zod'
import { consultarMeta, esperarVideoMeta, esquemaReciboMeta } from './publicacionMeta'

type Actualizar = (estado: string, extra?: { p_container_id?: string }) => Promise<void>

/**
 * Envía un vídeo a Facebook (video con file_url) o Instagram (Reel con video_url).
 * `antesDeEnviar` marca el envío como irreversible justo antes de la llamada que publica.
 */
export async function enviarVideoMeta(datos: { token: string, cuentaId: string, destino: 'facebook' | 'instagram', texto: string, urlVideo: string,
  actualizar: Actualizar, antesDeEnviar: () => Promise<void>, pausa?: (ms: number) => Promise<void> }): Promise<{ respuesta: unknown, aviso?: string }> {
  const { token, cuentaId, destino, texto, urlVideo } = datos
  if (new URL(urlVideo).protocol !== 'https:') throw new Error('URL de vídeo no segura')
  if (destino === 'instagram') {
    const contenedor = esquemaReciboMeta.parse(await consultarMeta(token, `${cuentaId}/media`, { metodo: 'POST',
      parametros: { media_type: 'REELS', video_url: urlVideo, caption: texto, share_to_feed: 'true' } }))
    await datos.actualizar('preparing', { p_container_id: contenedor.id })
    await esperarVideoMeta(token, contenedor.id, { pausa: datos.pausa })
    await datos.antesDeEnviar()
    return { respuesta: await consultarMeta(token, `${cuentaId}/media_publish`, { metodo: 'POST', parametros: { creation_id: contenedor.id } }) }
  }
  await datos.antesDeEnviar()
  const subido = esquemaReciboMeta.parse(await consultarMeta(token, `${cuentaId}/videos`, { metodo: 'POST', parametros: { file_url: urlVideo, description: texto } }))
  const pausa = datos.pausa ?? ((ms: number) => new Promise<void>(resolver => setTimeout(resolver, ms)))
  for (let intento = 0; intento < 4; intento++) {
    const estado = z.object({ status: z.object({ video_status: z.string() }) }).safeParse(await consultarMeta(token, subido.id, { parametros: { fields: 'status' } }).catch(() => null))
    if (estado.success && estado.data.status.video_status === 'ready') return { respuesta: subido }
    if (estado.success && estado.data.status.video_status === 'error') throw new Error('Facebook rechazó el vídeo')
    if (intento < 3) await pausa(15_000)
  }
  return { respuesta: subido, aviso: 'Facebook sigue procesando el vídeo; aparecerá en la página en unos minutos.' }
}
