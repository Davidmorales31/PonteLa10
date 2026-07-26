import { z } from 'zod'

export const tiposImagenEditorialPermitidos = [
  'image/jpeg',
  'image/png',
  'image/webp'
] as const

export const limiteBytesImagenEditorial = 12 * 1024 * 1024
export const limitePixelesImagenEditorial = 40_000_000
export const anchoMaximoImagenEditorial = 2400

const esquemaUrlOpcional = z.union([
  z.literal(''),
  z.string().url().max(2048)
])

export const esquemaMetadatosMedioEditorial = z.object({
  titulo: z.string().trim().min(2).max(160),
  textoAlternativo: z.string().trim().max(240),
  esDecorativa: z.boolean().default(false),
  pieDeFoto: z.string().trim().max(500),
  credito: z.string().trim().max(300),
  urlFuente: esquemaUrlOpcional
}).superRefine((datos, contexto) => {
  if (!datos.esDecorativa && datos.textoAlternativo.length < 5) {
    contexto.addIssue({
      code: 'custom',
      path: ['textoAlternativo'],
      message: 'Describe la imagen o márcala como decorativa.'
    })
  }
})

export const esquemaConsultaMediosEditoriales = z.object({
  pagina: z.coerce.number().int().min(1).default(1),
  limite: z.coerce.number().int().min(6).max(48).default(24),
  busqueda: z.string().trim().max(100).default('')
})

export const esquemaIdMedioEditorial = z.string().uuid()

export function limpiarNombreArchivoEditorial(nombre: string): string {
  return nombre
    .split(/[\\/]/)
    .at(-1)
    ?.replace(/[^\p{L}\p{N}._ -]+/gu, '')
    .trim()
    .slice(0, 180)
    || 'imagen'
}

export function crearTituloDesdeArchivo(nombre: string): string {
  return nombre
    .replace(/\.[^.]+$/, '')
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 160)
    || 'Imagen editorial'
}

export function formatearTamanoArchivo(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}
