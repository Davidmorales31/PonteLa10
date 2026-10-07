import type { SupabaseClient } from '@supabase/supabase-js'
import type { ImagenEditorialProcesada } from '~/server/utils/procesadorImagenEditorial'
import {
  generarVariantesImagenEditorial,
  rutaVarianteImagenEditorial
} from '~/server/utils/variantesImagenEditorial'

export interface ResultadoAlmacenamientoImagenEditorial {
  origenCreado: boolean
  variantesCreadas: string[]
}

function esConflictoDeObjeto(error: { message: string, statusCode?: string | number } | null): boolean {
  if (!error) return false
  return String(error.statusCode || '') === '409'
    || /already exists|duplicate/i.test(error.message)
}

async function eliminarObjetos(
  clienteSupabase: SupabaseClient,
  bucket: string,
  rutas: string[]
): Promise<void> {
  if (!rutas.length) return
  const { error } = await clienteSupabase.storage.from(bucket).remove(rutas)
  if (error) throw new Error('No se pudieron revertir los objetos de imagen editorial.')
}

export async function subirImagenEditorialOptimizada(
  clienteSupabase: SupabaseClient,
  bucket: string,
  rutaOriginal: string,
  imagen: ImagenEditorialProcesada,
  limpiarEnError = false
): Promise<ResultadoAlmacenamientoImagenEditorial> {
  const variantes = await generarVariantesImagenEditorial(imagen.contenido)
  const { error: errorOrigen } = await clienteSupabase.storage
    .from(bucket)
    .upload(rutaOriginal, imagen.contenido, {
      cacheControl: '31536000',
      contentType: imagen.tipoMime,
      upsert: false
    })

  const origenCreado = !errorOrigen
  if (errorOrigen && !esConflictoDeObjeto(errorOrigen)) {
    throw new Error('No se pudo almacenar la imagen editorial original.')
  }

  const variantesCreadas: string[] = []

  for (const variante of variantes) {
    const ruta = rutaVarianteImagenEditorial(rutaOriginal, variante.ancho)
    const { error } = await clienteSupabase.storage
      .from(bucket)
      .upload(ruta, variante.contenido, {
        cacheControl: '31536000',
        contentType: 'image/webp',
        upsert: false
      })

    if (error && !esConflictoDeObjeto(error)) {
      // Las rutas deterministas compartidas de Codex pueden estar en uso por
      // otra petición; solo se limpian si quien llama garantiza una ruta única.
      if (limpiarEnError) {
        await eliminarObjetos(clienteSupabase, bucket, [
          ...(origenCreado ? [rutaOriginal] : []),
          ...variantes.map(variante => rutaVarianteImagenEditorial(rutaOriginal, variante.ancho))
        ])
      }
      throw new Error('No se pudo almacenar una variante editorial.')
    }
    if (!error) variantesCreadas.push(ruta)
  }

  return { origenCreado, variantesCreadas }
}

export async function revertirImagenEditorialOptimizada(
  clienteSupabase: SupabaseClient,
  bucket: string,
  rutaOriginal: string,
  resultado: ResultadoAlmacenamientoImagenEditorial
): Promise<void> {
  await eliminarObjetos(clienteSupabase, bucket, [
    ...(resultado.origenCreado ? [rutaOriginal] : []),
    ...resultado.variantesCreadas
  ])
}
