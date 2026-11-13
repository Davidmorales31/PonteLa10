import { z } from 'zod'

export const formatosSociales = {
  cuadrado: { nombre: 'Feed cuadrado', ancho: 1080, alto: 1080 },
  vertical: { nombre: 'Feed vertical', ancho: 1080, alto: 1350 },
  historia: { nombre: 'Historia', ancho: 1080, alto: 1920 },
  web: { nombre: 'Vista previa web', ancho: 1200, alto: 628 },
  miniatura: { nombre: 'Miniatura', ancho: 1280, alto: 720 }
} as const
export const redesSociales = ['facebook', 'instagram', 'x', 'whatsapp'] as const
export const rutaImagenCtaSocial = '/brand/cta-pont3la10-generada-v2.png'
export const esquemaEncuadreSocial = z.object({
  x: z.number().min(-100).max(100), y: z.number().min(-100).max(100),
  zoom: z.number().min(1).max(3), degradado: z.number().min(35).max(90),
  tamanoTexto: z.number().min(42).max(120)
}).strict()
export const esquemaDiapositivaSocial = z.object({
  id: z.string().uuid(), tipo: z.enum(['noticia', 'cta']),
  medioId: z.string().uuid().nullable(), titular: z.string().trim().min(1).max(220),
  varianteCta: z.enum(['promocional', 'minimalista', 'deportivo', 'editorial']),
  encuadres: z.object({ cuadrado: esquemaEncuadreSocial, vertical: esquemaEncuadreSocial,
    historia: esquemaEncuadreSocial, web: esquemaEncuadreSocial, miniatura: esquemaEncuadreSocial }).strict()
}).strict()
export const esquemaPropuestaSocial = z.object({
  objetivo: z.string().min(1).max(80), titular: z.string().min(1).max(180),
  gancho: z.string().min(1).max(350), contexto: z.string().min(1).max(600),
  razonParaLeer: z.string().min(1).max(350),
  sustento: z.array(z.string().min(1).max(500)).min(1).max(4)
}).strict()
export const esquemaDocumentoSocial = z.object({
  version: z.literal(1), tipo: z.enum(['unica', 'carrusel']),
  formato: z.enum(['cuadrado', 'vertical', 'historia', 'web', 'miniatura']),
  red: z.enum(redesSociales), variante: z.string().max(80),
  textos: z.object({ facebook: z.string().max(5000), instagram: z.string().max(2200),
    x: z.string().max(5000), whatsapp: z.string().max(5000) }).strict(),
  diapositivas: z.array(esquemaDiapositivaSocial).min(1).max(8),
  propuestas: z.array(esquemaPropuestaSocial).max(5)
}).strict().superRefine((valor, contexto) => {
  if (valor.tipo === 'unica' && valor.diapositivas.length !== 1) {
    contexto.addIssue({ code: 'custom', path: ['diapositivas'], message: 'Una publicación única debe tener una imagen.' })
  }
  if (valor.tipo === 'carrusel' && valor.diapositivas.length < 2) {
    contexto.addIssue({ code: 'custom', path: ['diapositivas'], message: 'El carrusel necesita al menos dos imágenes.' })
  }
  if (new Set(valor.diapositivas.map(actual => actual.id)).size !== valor.diapositivas.length) {
    contexto.addIssue({ code: 'custom', path: ['diapositivas'], message: 'Las diapositivas deben tener identidades distintas.' })
  }
  if (valor.diapositivas.some(actual => actual.tipo === 'noticia' && !actual.medioId)) {
    contexto.addIssue({ code: 'custom', path: ['diapositivas'], message: 'Selecciona una fotografía para cada diapositiva informativa.' })
  }
})
export type DocumentoSocial = z.infer<typeof esquemaDocumentoSocial>
export type DiapositivaSocial = z.infer<typeof esquemaDiapositivaSocial>
export type EncuadreSocial = z.infer<typeof esquemaEncuadreSocial>
export type PropuestaSocial = z.infer<typeof esquemaPropuestaSocial>
export type RedSocial = typeof redesSociales[number]
export type FormatoSocial = keyof typeof formatosSociales

export function extraerTextoParaRedes(nodo: unknown): string {
  if (!nodo || typeof nodo !== 'object') return ''
  const datos = nodo as { text?: unknown, content?: unknown }
  if (typeof datos.text === 'string') return datos.text
  return Array.isArray(datos.content) ? datos.content.map(extraerTextoParaRedes).join(' ') : ''
}

export function crearDiapositivaSocial(titular: string, medioId: string | null, tipo: 'noticia' | 'cta' = 'noticia'): DiapositivaSocial {
  const encuadre = () => ({ x: 0, y: 0, zoom: 1, degradado: 90, tamanoTexto: 60 })
  return { id: crypto.randomUUID(), tipo, titular, medioId, varianteCta: tipo === 'cta' ? 'promocional' : 'deportivo', encuadres: {
    cuadrado: encuadre(), vertical: encuadre(), historia: encuadre(), web: encuadre(), miniatura: encuadre()
  } }
}

export function crearDocumentoSocial(titulo: string, medioId: string | null, texto: string): DocumentoSocial {
  return { version: 1, tipo: 'unica', formato: 'cuadrado', red: 'facebook', variante: 'original',
    textos: { facebook: texto, instagram: texto, x: texto, whatsapp: texto },
    diapositivas: [crearDiapositivaSocial(titulo.slice(0, 220), medioId)], propuestas: [] }
}

export function crearDocumentoSocialPredeterminado(
  titulo: string, medioId: string | null, texto: string, urlCanonica: string, articuloId: string
): DocumentoSocial {
  const documento = crearDocumentoSocial(titulo, medioId, texto)
  // Sin borrador persistido, la misma noticia debe conservar su identidad visual
  // entre la aprobación del lote y su ejecución posterior.
  documento.diapositivas[0]!.id = articuloId
  for (const red of redesSociales.filter(destino => destino !== 'instagram')) {
    if (!documento.textos[red].includes(urlCanonica)) {
      documento.textos[red] += `\n\nLa historia completa: ${enlaceSocial(urlCanonica, red, articuloId, 'original')}`
    }
  }
  return documento
}

export function enlaceSocial(urlCanonica: string, red: RedSocial, articuloId: string, variante: string): string {
  const url = new URL(urlCanonica)
  url.searchParams.set('utm_source', red)
  url.searchParams.set('utm_medium', 'organic_social')
  url.searchParams.set('utm_campaign', `noticia_${articuloId}`)
  url.searchParams.set('utm_content', variante || 'original')
  return url.toString()
}

export function componerTextoSocial(propuesta: PropuestaSocial, red: RedSocial, url: string): string {
  const cta = red === 'instagram'
    ? 'La historia completa está en Pont3la10. Busca el titular en nuestro portal.'
    : `Lee la historia completa: ${url}`
  return `${propuesta.gancho}\n\n${propuesta.contexto}\n\n${propuesta.razonParaLeer}\n\n${cta}`
}

export function avisosCompatibilidadSocial(documento: DocumentoSocial): string[] {
  const avisos: string[] = []
  if (documento.red === 'x' && documento.diapositivas.length > 4) avisos.push('X admite hasta cuatro fotografías por publicación. Reduce la selección antes de enviarla.')
  if (documento.red === 'instagram') avisos.push('El enlace escrito en la descripción no garantiza acceso clicable. Configura una ruta real desde tu perfil o publica el enlace con las herramientas disponibles de tu cuenta.')
  if (documento.red === 'whatsapp') avisos.push('Contenido preparado para compartir manualmente en el canal. No hay conexión oficial de Canales verificada en este módulo.')
  if (documento.formato === 'historia') avisos.push('Esta exportación es una imagen estática; no es un Reel ni un video.')
  return avisos
}
