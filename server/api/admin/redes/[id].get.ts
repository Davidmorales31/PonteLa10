import { contextoPublicacionSocial } from '~/server/utils/contextoPublicacionSocial'
import { leerBorradorSocial, validarMediosSociales } from '~/server/utils/repositorioPublicacionesSociales'
import { crearDocumentoSocialPredeterminado, esquemaPropuestaSocial } from '~/utils/editorial/publicacionesSociales'
import { z } from 'zod'
import type { EditorPublicacionSocial } from '~/types/publicacionesSociales'

export default defineEventHandler(async (evento): Promise<EditorPublicacionSocial> => {
  const { cliente, articulo, urlCanonica, dominio } = await contextoPublicacionSocial(evento)
  const guardado = await leerBorradorSocial(cliente, articulo.id)
  const borrador = guardado.borrador || { documento: crearDocumentoSocialPredeterminado(articulo.titulo,
    articulo.portadaId, articulo.seo.textoSocial || articulo.resumen, urlCanonica, articulo.id),
  revision: 0, estado: 'draft' as const, actualizadoEn: null }
  if (!borrador.documento.propuestas.length && guardado.disponible) {
    const ultima = await cliente.from('social_copy_requests').select('result').eq('article_id', articulo.id)
      .eq('source_revision', articulo.versionBloqueo).eq('state', 'completed').order('created_at', { ascending: false }).limit(1).maybeSingle()
    const sugerencias = z.object({ propuestas: z.array(esquemaPropuestaSocial).length(5) }).safeParse(ultima.data?.result)
    if (sugerencias.success) borrador.documento.propuestas = sugerencias.data.propuestas
  }
  return { articulo, urlCanonica, dominio, borrador,
    medios: await validarMediosSociales(cliente, borrador.documento), almacenamientoDisponible: guardado.disponible }
})
