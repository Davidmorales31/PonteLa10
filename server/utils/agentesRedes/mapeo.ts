import { crearDocumentoVideoPropio, esDocumentoVideoPropio, esquemaDocumentoPublicacionPropia } from '~/utils/editorial/publicacionesPropias'
import type { DocumentoPropio, DocumentoPublicacionPropia } from '~/utils/editorial/publicacionesPropias'
import { errores } from './errores'
import type { EntradaCrearPublicacion } from './esquemas'

/** Traduce la composición pensada para agentes al documento interno que usa el editor móvil. */
export function documentoDesdeEntrada(entrada: EntradaCrearPublicacion): DocumentoPublicacionPropia {
  const textos = { facebook: entrada.descripcion.facebook, instagram: (entrada.descripcion.instagram ?? entrada.descripcion.facebook).slice(0, 2200) }
  let documento: DocumentoPublicacionPropia
  if (entrada.tipo === 'video') {
    documento = { ...crearDocumentoVideoPropio(), video: { medioId: entrada.videoMedioId }, textos }
  } else {
    documento = {
      version: 1, formato: entrada.formato, textos,
      diapositivas: entrada.diapositivas.map(diapositiva => ({
        id: crypto.randomUUID(), plantilla: diapositiva.plantilla,
        medios: diapositiva.imagenes.map(imagen => ({ medioId: imagen.medioId, encuadre: { x: imagen.x, y: imagen.y, zoom: imagen.zoom } })),
        elementos: [
          ...diapositiva.logos.map(logo => ({ id: crypto.randomUUID(), tipo: 'logo' as const, x: logo.x, y: logo.y, ancho: logo.ancho })),
          ...diapositiva.textos.map(texto => ({ id: crypto.randomUUID(), tipo: 'texto' as const, x: texto.x, y: texto.y, texto: texto.texto, tamano: texto.tamano,
            color: texto.color, banda: texto.fondo === 'banda', degradado: texto.fondo === 'degradado' }))
        ]
      }))
    }
  }
  const validado = esquemaDocumentoPublicacionPropia.safeParse(documento)
  if (!validado.success) throw errores.validacion('La composición no es válida.', validado.error.issues.map(problema => ({ ruta: problema.path.join('.'), mensaje: problema.message })))
  return validado.data
}

/** Inverso de `documentoDesdeEntrada`: lo que el agente lee es lo que puede volver a enviar. */
export function composicionDesdeDocumento(documento: DocumentoPublicacionPropia) {
  const descripcion = { facebook: documento.textos.facebook, instagram: documento.textos.instagram }
  if (esDocumentoVideoPropio(documento)) return { tipo: 'video' as const, descripcion, videoMedioId: documento.video.medioId }
  const base = documento as DocumentoPropio
  return {
    tipo: 'imagenes' as const, formato: base.formato, descripcion,
    diapositivas: base.diapositivas.map(diapositiva => ({
      plantilla: diapositiva.plantilla,
      imagenes: diapositiva.medios.map(medio => ({ medioId: medio.medioId, zoom: medio.encuadre.zoom, x: medio.encuadre.x, y: medio.encuadre.y })),
      logos: diapositiva.elementos.flatMap(elemento => elemento.tipo === 'logo' ? [{ x: elemento.x, y: elemento.y, ancho: elemento.ancho }] : []),
      textos: diapositiva.elementos.flatMap(elemento => elemento.tipo === 'texto'
        ? [{ texto: elemento.texto, x: elemento.x, y: elemento.y, tamano: elemento.tamano, color: elemento.color, fondo: elemento.degradado ? 'degradado' as const : elemento.banda ? 'banda' as const : 'ninguno' as const }] : [])
    }))
  }
}
