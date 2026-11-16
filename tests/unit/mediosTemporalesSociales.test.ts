import { describe, expect, it, vi } from 'vitest'
import { configuracionMediosTemporales } from '~/server/utils/mediosTemporalesSociales'
import { enviarVideoMeta } from '~/server/utils/ejecutarVideoMetaPropia'
import { esperarVideoMeta } from '~/server/utils/publicacionMeta'
import { esquemaIniciarTemporalSocial } from '~/utils/editorial/mediosTemporales'
import { avisosPublicacionPropia, crearDocumentoVideoPropio, crearDocumentoPropio, esDocumentoVideoPropio, esquemaDocumentoPublicacionPropia,
  idsMediosDocumentoPropio, crearDiapositivaPropia } from '~/utils/editorial/publicacionesPropias'
import { readFileSync } from 'node:fs'

const idA = '11111111-1111-4111-8111-111111111111'
const idB = '22222222-2222-4222-8222-222222222222'

describe('medios temporales: configuración parametrizable', () => {
  it('usa valores prudentes por defecto y borra al publicar', () => {
    const c = configuracionMediosTemporales({})
    expect(c.borrarAlPublicar).toBe(true)
    expect(c.retencionBorradorDias).toBe(14)
    expect(c.maxImagenBytes).toBe(15 * 1024 * 1024)
    expect(c.maxVideoBytes).toBe(200 * 1024 * 1024)
  })
  it('acepta variables de entorno y limita los extremos', () => {
    const c = configuracionMediosTemporales({ SOCIAL_TEMP_BORRAR_AL_PUBLICAR: 'false', SOCIAL_TEMP_MAX_VIDEO_MB: '9999', SOCIAL_TEMP_RETENCION_BORRADOR_DIAS: '0', SOCIAL_TEMP_MAX_IMAGEN_MB: 'abc' })
    expect(c.borrarAlPublicar).toBe(false)
    expect(c.maxVideoBytes).toBe(500 * 1024 * 1024)
    expect(c.retencionBorradorDias).toBe(1)
    expect(c.maxImagenBytes).toBe(15 * 1024 * 1024)
  })
  it('solo admite tipos conocidos y rechaza campos extra', () => {
    expect(esquemaIniciarTemporalSocial.safeParse({ nombre: 'a.mov', tipoMime: 'video/quicktime', tamano: 10 }).success).toBe(true)
    expect(esquemaIniciarTemporalSocial.safeParse({ nombre: 'a.exe', tipoMime: 'application/x-msdownload', tamano: 10 }).success).toBe(false)
    expect(esquemaIniciarTemporalSocial.safeParse({ nombre: 'a.jpg', tipoMime: 'image/jpeg', tamano: 10, ruta: '../x' }).success).toBe(false)
  })
})

describe('publicaciones propias: vídeo', () => {
  it('el documento de vídeo es válido y se distingue del de imágenes', () => {
    const video = crearDocumentoVideoPropio()
    expect(esquemaDocumentoPublicacionPropia.safeParse(video).success).toBe(true)
    expect(esDocumentoVideoPropio(video)).toBe(true)
    expect(esDocumentoVideoPropio(crearDocumentoPropio())).toBe(false)
    expect(esquemaDocumentoPublicacionPropia.safeParse({ ...video, extra: 1 }).success).toBe(false)
  })
  it('lista los archivos usados y avisa lo que falta', () => {
    const video = crearDocumentoVideoPropio()
    expect(avisosPublicacionPropia(video, ['facebook'])).toEqual(expect.arrayContaining(['Falta elegir el vídeo.']))
    video.video.medioId = idA; video.textos.facebook = 'hola'
    expect(avisosPublicacionPropia(video, ['facebook'])).toEqual([])
    expect(idsMediosDocumentoPropio(video)).toEqual([idA])
    const imagenes = crearDocumentoPropio()
    imagenes.diapositivas = [crearDiapositivaPropia('una', [idA]), crearDiapositivaPropia('dos-lado', [idA, idB])]
    expect(idsMediosDocumentoPropio(imagenes).sort()).toEqual([idA, idB])
  })
})

describe('publicación de vídeo en Meta', () => {
  const respuesta = (cuerpo: unknown) => new Response(JSON.stringify(cuerpo), { status: 200 })
  it('Instagram crea un Reel, espera a que termine y recién ahí publica', async () => {
    const llamadas: string[] = []
    vi.stubGlobal('fetch', vi.fn(async (url: URL, init?: RequestInit) => {
      const ruta = new URL(url).pathname.replace('/v27.0/', '')
      llamadas.push(`${init?.method || 'GET'} ${ruta}`)
      if (ruta === '17841/media') return respuesta({ id: '555' })
      if (ruta === '555') return respuesta({ status_code: llamadas.filter(l => l.endsWith(' 555')).length > 1 ? 'FINISHED' : 'IN_PROGRESS' })
      return respuesta({ id: '777' })
    }))
    const eventos: string[] = []
    const salida = await enviarVideoMeta({ token: 't', cuentaId: '17841', destino: 'instagram', texto: 'x', urlVideo: 'https://x.supabase.co/v.mp4?token=1',
      actualizar: async estado => { eventos.push(estado) }, antesDeEnviar: async () => { eventos.push('sending') }, pausa: async () => undefined })
    expect(eventos).toEqual(['preparing', 'sending'])
    expect(llamadas.at(-1)).toBe('POST 17841/media_publish')
    expect((salida.respuesta as { id: string }).id).toBe('777')
    vi.unstubAllGlobals()
  })
  it('Instagram no publica si el vídeo falla al procesarse', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => respuesta({ status_code: 'ERROR' })))
    await expect(esperarVideoMeta('t', '555', { pausa: async () => undefined })).rejects.toMatchObject({ statusCode: 409 })
    vi.unstubAllGlobals()
  })
  it('exige HTTPS para la URL del vídeo', async () => {
    await expect(enviarVideoMeta({ token: 't', cuentaId: '1', destino: 'facebook', texto: 'x', urlVideo: 'http://inseguro/v.mp4',
      actualizar: async () => undefined, antesDeEnviar: async () => undefined })).rejects.toThrow()
  })
})

describe('contrato de las rutas y la migración de temporales', () => {
  const leer = (ruta: string) => readFileSync(new URL(`../../${ruta}`, import.meta.url), 'utf8')
  it('la subida es directa, privada y con permisos de servidor únicamente', () => {
    const migracion = leer('supabase/migrations/20261116220000_social_medios_temporales.sql')
    expect(migracion).toContain("'social-temp-uploads', 'social-temp-uploads', false")
    expect(migracion).toContain('enable row level security')
    expect(migracion).toContain('revoke all on public.social_temp_media from public, anon, authenticated, service_role')
    const iniciar = leer('server/api/admin/redes/temporales/index.post.ts')
    expect(iniciar).toContain('contextoPublicacionPropia(evento, true)')
    expect(leer('server/api/admin/redes/temporales/[id]/confirmar.post.ts')).toContain('contextoPublicacionPropia(evento, true)')
  })
  it('se borra al publicar y se barre lo caducado en cada ciclo', () => {
    expect(leer('server/api/admin/redes/propias/[id]/publicar.post.ts')).toContain('limpiarTemporalesPublicacion')
    expect(leer('server/utils/procesarPublicacionesPropias.ts')).toContain('limpiarTemporalesPublicacion')
    expect(leer('server/api/internal/redes/procesar.post.ts')).toContain('barrerTemporalesCaducados')
  })
  it('la app móvil es instalable en iPhone', () => {
    const manifiesto = JSON.parse(leer('public/manifest-redes.webmanifest'))
    expect(manifiesto.display).toBe('standalone')
    expect(manifiesto.start_url).toBe('/admin/redes/movil')
    expect(leer('pages/admin/redes/movil.vue')).toContain('apple-mobile-web-app-capable')
  })
})
