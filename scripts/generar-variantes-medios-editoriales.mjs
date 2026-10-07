import { createClient } from '@supabase/supabase-js'
import sharp from 'sharp'

const bucket = 'editorial-media'
const anchosCandidatos = [320, 640, 960, 1280, 1920]
const esAplicacion = process.argv.includes('--apply')
const argumentosDesconocidos = process.argv.slice(2).filter(argumento => !['--apply', '--dry-run'].includes(argumento))

if (argumentosDesconocidos.length || (esAplicacion && process.argv.includes('--dry-run'))) {
  console.error('Uso: node scripts/generar-variantes-medios-editoriales.mjs [--dry-run | --apply]')
  process.exit(2)
}

const urlSupabase = process.env.NUXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
const claveServicio = process.env.NUXT_SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY

if (!urlSupabase || !claveServicio) {
  console.error('Faltan las variables privadas requeridas para conectar con Storage.')
  process.exit(2)
}

let urlProyecto
try {
  urlProyecto = new URL(urlSupabase)
} catch {
  console.error('La configuración de Supabase no tiene un formato válido.')
  process.exit(2)
}

if (urlProyecto.protocol !== 'https:') {
  console.error('La URL de Supabase debe usar HTTPS para este backfill.')
  process.exit(2)
}

const cliente = createClient(urlProyecto.origin, claveServicio, {
  auth: { autoRefreshToken: false, persistSession: false },
  global: {
    fetch: (entrada, opciones = {}) => fetch(entrada, {
      ...opciones,
      signal: opciones.signal ?? AbortSignal.timeout(30_000)
    })
  }
})

async function listarMediosEditoriales() {
  const filas = []
  const tamanoPagina = 500

  for (let desde = 0; ; desde += tamanoPagina) {
    const { data, error } = await cliente
      .from('media_files')
      .select('path, width')
      .eq('bucket', bucket)
      .order('path', { ascending: true })
      .range(desde, desde + tamanoPagina - 1)

    if (error || !data) throw new Error('No se pudo consultar el inventario de portadas.')
    filas.push(...data)
    if (data.length < tamanoPagina) return filas
  }
}

function rutaVariante(rutaOriginal, ancho) {
  if (!/^.+\.webp$/i.test(rutaOriginal)) throw new Error('Ruta editorial inválida.')
  return rutaOriginal.replace(/\.webp$/i, `-${ancho}.webp`)
}

function esConflictoDeObjeto(error) {
  return String(error?.statusCode || '') === '409'
    || /already exists|asset already exists|duplicate/i.test(String(error?.message || ''))
}

const resumen = {
  modo: esAplicacion ? 'apply' : 'dry-run',
  originales: 0,
  variantesCalculadas: 0,
  variantesNuevas: 0,
  variantesExistentes: 0,
  bytesVariantesCalculadas: 0,
  bytesVariantesNuevas: 0,
  fallosDeRuta: 0,
  fallosDeDescarga: 0,
  fallosDeProcesamiento: 0,
  fallosDeDimensiones: 0,
  fallos: 0
}

try {
  const medios = await listarMediosEditoriales()
  resumen.originales = medios.length

  async function procesarMedio(medio) {
    if (typeof medio.path !== 'string'
      || !/^[-A-Za-z0-9_./]+\.webp$/i.test(medio.path)
      || medio.path.split('/').some(segmento => !segmento || segmento === '.' || segmento === '..')) {
      resumen.fallosDeRuta += 1
      throw new Error('Ruta editorial inválida.')
    }
    if (!Number.isSafeInteger(medio.width) || medio.width < 1 || medio.width > 2500) {
      resumen.fallosDeDimensiones += 1
      throw new Error('Ancho de origen ausente o fuera del límite editorial.')
    }

    let descarga
    try {
      descarga = await cliente.storage.from(bucket).download(medio.path)
    } catch {
      resumen.fallosDeDescarga += 1
      throw new Error('No se pudo descargar un original editorial.')
    }
    if (descarga.error || !descarga.data) {
      resumen.fallosDeDescarga += 1
      throw new Error('No se pudo descargar un original editorial.')
    }

    try {
      const contenido = Buffer.from(await descarga.data.arrayBuffer())
      const metadatos = await sharp(contenido, {
        failOn: 'error',
        limitInputPixels: 40_000_000,
        animated: false
      }).metadata()
      if (!metadatos.width || !metadatos.height) throw new Error('Dimensiones de origen inválidas.')
      if (metadatos.width !== medio.width) {
        resumen.fallosDeDimensiones += 1
        throw new Error('El ancho del archivo no coincide con la biblioteca.')
      }

      const anchos = anchosCandidatos.filter(ancho => ancho < metadatos.width)
      for (const ancho of anchos) {
        const variante = await sharp(contenido, {
          failOn: 'error',
          limitInputPixels: 40_000_000,
          animated: false
        })
          .rotate()
          .resize({ width: ancho, fit: 'inside', withoutEnlargement: true })
          .webp({ quality: 78, effort: 4, smartSubsample: true })
          .toBuffer({ resolveWithObject: true })

        resumen.variantesCalculadas += 1
        resumen.bytesVariantesCalculadas += variante.data.byteLength

        if (!esAplicacion) continue

        const { error: errorSubida } = await cliente.storage
          .from(bucket)
          .upload(rutaVariante(medio.path, variante.info.width), variante.data, {
            cacheControl: '31536000',
            contentType: 'image/webp',
            upsert: false
          })

        if (errorSubida && esConflictoDeObjeto(errorSubida)) {
          resumen.variantesExistentes += 1
          continue
        }
        if (errorSubida) throw new Error('No se pudo almacenar una variante editorial.')

        resumen.variantesNuevas += 1
        resumen.bytesVariantesNuevas += variante.data.byteLength
      }
    } catch {
      resumen.fallosDeProcesamiento += 1
      throw new Error('No se pudo procesar un original editorial.')
    }
  }

  let indiceSiguiente = 0
  let completados = 0
  const concurrencia = esAplicacion ? 2 : 3
  await Promise.all(Array.from({ length: concurrencia }, async () => {
    while (indiceSiguiente < medios.length) {
      const medio = medios[indiceSiguiente++]
      try {
        await procesarMedio(medio)
      } catch {
        resumen.fallos += 1
      }
      completados += 1
      if (completados % 25 === 0 || completados === medios.length) {
        console.log(JSON.stringify({ avance: completados, total: medios.length }))
      }
    }
  }))

  console.log(JSON.stringify(resumen))
  if (resumen.fallos) process.exitCode = 1
} catch {
  console.error('No se pudo completar el inventario del backfill de imágenes.')
  process.exitCode = 1
}
