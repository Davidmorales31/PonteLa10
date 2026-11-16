import { z } from 'zod'

/** Publicaciones propias: piezas de redes sin noticia asociada (imágenes subidas por el responsable). */
export const formatosPropios = {
  cuadrado: { nombre: 'Feed cuadrado', ancho: 1080, alto: 1080 },
  vertical: { nombre: 'Feed vertical', ancho: 1080, alto: 1350 },
  web: { nombre: 'Horizontal (Facebook)', ancho: 1200, alto: 628 }
} as const
export type FormatoPropio = keyof typeof formatosPropios

type Celda = readonly [x: number, y: number, ancho: number, alto: number]
/** Celdas en fracciones del lienzo. El número de celdas es el número de imágenes. */
export const plantillasPropias = {
  una: { nombre: '1 imagen', celdas: [[0, 0, 1, 1]] as readonly Celda[] },
  'dos-lado': { nombre: '2 imágenes lado a lado', celdas: [[0, 0, .5, 1], [.5, 0, .5, 1]] as readonly Celda[] },
  'dos-pila': { nombre: '2 imágenes apiladas', celdas: [[0, 0, 1, .5], [0, .5, 1, .5]] as readonly Celda[] },
  'tres-izquierda': { nombre: '3: una grande + dos', celdas: [[0, 0, .6, 1], [.6, 0, .4, .5], [.6, .5, .4, .5]] as readonly Celda[] },
  'tres-arriba': { nombre: '3: grande arriba + dos', celdas: [[0, 0, 1, .6], [0, .6, .5, .4], [.5, .6, .5, .4]] as readonly Celda[] },
  cuatro: { nombre: '4 imágenes en cuadrícula', celdas: [[0, 0, .5, .5], [.5, 0, .5, .5], [0, .5, .5, .5], [.5, .5, .5, .5]] as readonly Celda[] }
} as const
export type PlantillaPropia = keyof typeof plantillasPropias
export const idsPlantillasPropias = Object.keys(plantillasPropias) as [PlantillaPropia, ...PlantillaPropia[]]

export const coloresTextoPropio = { blanco: '#ffffff', amarillo: '#ffd800', azul: '#08204a' } as const
export const maximoElementosPorDiapositiva = 8
export const maximoDiapositivasPropias = 10

const porcentaje = z.number().min(0).max(100)
export const esquemaEncuadrePropio = z.object({
  x: z.number().min(-100).max(100), y: z.number().min(-100).max(100), zoom: z.number().min(1).max(3)
}).strict()
export const esquemaElementoPropio = z.discriminatedUnion('tipo', [
  z.object({ id: z.string().uuid(), tipo: z.literal('logo'), x: porcentaje, y: porcentaje, ancho: z.number().min(8).max(80) }).strict(),
  z.object({ id: z.string().uuid(), tipo: z.literal('texto'), x: porcentaje, y: porcentaje,
    texto: z.string().trim().min(1).max(220), tamano: z.number().min(24).max(140),
    color: z.enum(['blanco', 'amarillo', 'azul']), banda: z.boolean(), degradado: z.boolean().optional() }).strict()
])
export const esquemaDiapositivaPropia = z.object({
  id: z.string().uuid(), plantilla: z.enum(idsPlantillasPropias),
  medios: z.array(z.object({ medioId: z.string().uuid().nullable(), encuadre: esquemaEncuadrePropio }).strict()).min(1).max(4),
  elementos: z.array(esquemaElementoPropio).max(maximoElementosPorDiapositiva)
}).strict().superRefine((valor, contexto) => {
  if (valor.medios.length !== plantillasPropias[valor.plantilla].celdas.length) {
    contexto.addIssue({ code: 'custom', path: ['medios'], message: 'La plantilla elegida necesita otra cantidad de imágenes.' })
  }
})
export const esquemaDocumentoPropio = z.object({
  version: z.literal(1), tipo: z.literal('imagenes').optional(), formato: z.enum(['cuadrado', 'vertical', 'web']),
  textos: z.object({ facebook: z.string().max(5000), instagram: z.string().max(2200) }).strict(),
  diapositivas: z.array(esquemaDiapositivaPropia).min(1).max(maximoDiapositivasPropias)
}).strict().superRefine((valor, contexto) => {
  if (new Set(valor.diapositivas.map(actual => actual.id)).size !== valor.diapositivas.length) {
    contexto.addIssue({ code: 'custom', path: ['diapositivas'], message: 'Las diapositivas deben tener identidades distintas.' })
  }
})
export const esquemaDocumentoVideoPropio = z.object({
  version: z.literal(1), tipo: z.literal('video'), video: z.object({ medioId: z.string().uuid().nullable() }).strict(),
  textos: z.object({ facebook: z.string().max(5000), instagram: z.string().max(2200) }).strict()
}).strict()
export const esquemaDocumentoPublicacionPropia = z.union([esquemaDocumentoPropio, esquemaDocumentoVideoPropio])
export type DocumentoPropio = z.infer<typeof esquemaDocumentoPropio>
export type DocumentoVideoPropio = z.infer<typeof esquemaDocumentoVideoPropio>
export type DocumentoPublicacionPropia = DocumentoPropio | DocumentoVideoPropio
export function esDocumentoVideoPropio(documento: DocumentoPublicacionPropia): documento is DocumentoVideoPropio {
  return documento.tipo === 'video'
}
/** Identificadores de archivos (biblioteca o temporales) que usa una publicación. */
export function idsMediosDocumentoPropio(documento: DocumentoPublicacionPropia): string[] {
  const ids = esDocumentoVideoPropio(documento) ? [documento.video.medioId]
    : documento.diapositivas.flatMap(diapositiva => diapositiva.medios.map(medio => medio.medioId))
  return [...new Set(ids.filter((id): id is string => !!id))]
}
export type DiapositivaPropia = z.infer<typeof esquemaDiapositivaPropia>
export type ElementoPropio = z.infer<typeof esquemaElementoPropio>

export const esquemaGuardarPublicacionPropia = z.object({
  titulo: z.string().trim().min(3).max(120), documento: esquemaDocumentoPublicacionPropia,
  destinos: z.array(z.enum(['facebook', 'instagram'])).min(1).max(2),
  revision: z.number().int().positive()
}).strict()
export const esquemaProgramarPublicacionPropia = z.object({
  fecha: z.string().datetime({ offset: true }), revision: z.number().int().positive(), confirmar: z.literal(true)
}).strict()
export const esquemaPublicarPublicacionPropia = z.object({
  destino: z.enum(['facebook', 'instagram']), revision: z.number().int().positive(), confirmar: z.literal(true)
}).strict()

export function crearEncuadrePropio() { return { x: 0, y: 0, zoom: 1 } }

export function crearDiapositivaPropia(plantilla: PlantillaPropia = 'una', medioIds: Array<string | null> = []): DiapositivaPropia {
  const celdas = plantillasPropias[plantilla].celdas.length
  return { id: crypto.randomUUID(), plantilla,
    medios: Array.from({ length: celdas }, (_, indice) => ({ medioId: medioIds[indice] ?? null, encuadre: crearEncuadrePropio() })),
    elementos: [] }
}

/** Cambia la plantilla conservando las imágenes ya elegidas y descartando las que sobran. */
export function cambiarPlantillaPropia(diapositiva: DiapositivaPropia, plantilla: PlantillaPropia): DiapositivaPropia {
  const celdas = plantillasPropias[plantilla].celdas.length
  const medios = Array.from({ length: celdas }, (_, indice) => diapositiva.medios[indice] ?? { medioId: null, encuadre: crearEncuadrePropio() })
  return { ...diapositiva, plantilla, medios }
}

export function crearElementoLogo(): ElementoPropio {
  return { id: crypto.randomUUID(), tipo: 'logo', x: 50, y: 10, ancho: 34 }
}
export function crearElementoTexto(texto = 'Escribe aquí tu titular'): ElementoPropio {
  return { id: crypto.randomUUID(), tipo: 'texto', x: 50, y: 82, texto, tamano: 64, color: 'blanco', banda: false, degradado: true }
}

export function crearDocumentoPropio(): DocumentoPropio {
  return { version: 1, formato: 'cuadrado', textos: { facebook: '', instagram: '' }, diapositivas: [crearDiapositivaPropia('una')] }
}

export function crearDocumentoVideoPropio(): DocumentoVideoPropio {
  return { version: 1, tipo: 'video', video: { medioId: null }, textos: { facebook: '', instagram: '' } }
}

export function avisosVideoPropio(documento: DocumentoVideoPropio, destinos: Array<'facebook' | 'instagram'>): string[] {
  const avisos: string[] = []
  if (!documento.video.medioId) avisos.push('Falta elegir el vídeo.')
  for (const red of destinos) if (!documento.textos[red].trim()) avisos.push(`Escribe la descripción de ${red === 'facebook' ? 'Facebook' : 'Instagram'}.`)
  return avisos
}

export function imagenesFaltantesPropias(documento: DocumentoPropio): number {
  return documento.diapositivas.reduce((total, diapositiva) => total + diapositiva.medios.filter(medio => !medio.medioId).length, 0)
}

export function avisosPublicacionPropia(entrada: DocumentoPublicacionPropia, destinos: Array<'facebook' | 'instagram'>): string[] {
  if (esDocumentoVideoPropio(entrada)) return avisosVideoPropio(entrada, destinos)
  const documento = entrada
  const avisos: string[] = []
  const faltan = imagenesFaltantesPropias(documento)
  if (faltan) avisos.push(`Faltan ${faltan} imagen(es) por elegir.`)
  if (destinos.includes('instagram') && documento.formato === 'web') avisos.push('Instagram no admite el formato horizontal en el feed. Elige cuadrado o vertical.')
  if (destinos.includes('instagram') && documento.diapositivas.length > 10) avisos.push('Instagram admite hasta 10 imágenes por carrusel.')
  for (const red of destinos) if (!documento.textos[red].trim()) avisos.push(`Escribe la descripción de ${red === 'facebook' ? 'Facebook' : 'Instagram'}.`)
  return avisos
}
