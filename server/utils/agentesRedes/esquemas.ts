import { z } from 'zod/v4'
import { idsPlantillasPropias, plantillasPropias } from '~/utils/editorial/publicacionesPropias'

const uuid = (descripcion: string) => z.uuid().describe(descripcion)
const destinos = z.array(z.enum(['facebook', 'instagram'])).min(1).max(2).default(['facebook', 'instagram'])
  .describe('Redes donde se publicará. Por defecto, Facebook e Instagram.')

export const esquemaImagenAgente = z.strictObject({
  medioId: uuid('Identificador del archivo: el `id` devuelto al subir/importar, o el `id` de la biblioteca editorial.'),
  zoom: z.number().min(1).max(3).default(1).describe('Acercamiento de la imagen dentro de su recuadro (1 = ajustada).'),
  x: z.number().min(-100).max(100).default(0).describe('Desplazamiento horizontal de la imagen dentro del recuadro (-100 a 100).'),
  y: z.number().min(-100).max(100).default(0).describe('Desplazamiento vertical de la imagen dentro del recuadro (-100 a 100).')
}).describe('Imagen de un recuadro de la plantilla.')

export const esquemaLogoAgente = z.strictObject({
  x: z.number().min(0).max(100).default(50).describe('Centro horizontal, en % del ancho.'),
  y: z.number().min(0).max(100).default(10).describe('Centro vertical, en % del alto.'),
  ancho: z.number().min(8).max(80).default(34).describe('Ancho del logo, en % del ancho de la pieza.')
}).describe('Logo de Pont3la10.')

export const esquemaTextoAgente = z.strictObject({
  texto: z.string().trim().min(1).max(220).describe('Titular sobre la imagen. Las palabras entre **dobles asteriscos** salen en amarillo, igual que en las noticias.'),
  x: z.number().min(0).max(100).default(50).describe('Centro horizontal, en %.'),
  y: z.number().min(0).max(100).default(82).describe('Centro vertical, en %. Más de 50 pone el degradado abajo; menos de 50, arriba.'),
  tamano: z.int().min(24).max(140).default(64).describe('Tamaño de la letra (referencia: ancho de 1080 px).'),
  color: z.enum(['blanco', 'amarillo', 'azul']).default('blanco'),
  fondo: z.enum(['degradado', 'banda', 'ninguno']).default('degradado').describe('`degradado` es el mismo oscuro de las noticias automatizadas.')
}).describe('Texto con la tipografía de las noticias.')

export const esquemaDiapositivaAgente = z.strictObject({
  plantilla: z.enum(idsPlantillasPropias).default('una').describe('Disposición de las imágenes. Ver `plantillas` en capacidades.'),
  imagenes: z.array(esquemaImagenAgente).min(1).max(4).describe('Una imagen por recuadro de la plantilla, en orden.'),
  logos: z.array(esquemaLogoAgente).max(2).default([]),
  textos: z.array(esquemaTextoAgente).max(6).default([])
}).superRefine((valor, contexto) => {
  const esperadas = plantillasPropias[valor.plantilla].celdas.length
  if (valor.imagenes.length !== esperadas) {
    contexto.addIssue({ code: 'custom', path: ['imagenes'], message: `La plantilla «${valor.plantilla}» necesita exactamente ${esperadas} imagen(es).` })
  }
})

const descripcion = z.strictObject({
  facebook: z.string().trim().min(1).max(5000).describe('Texto de la publicación en Facebook.'),
  instagram: z.string().trim().min(1).max(2200).optional().describe('Texto para Instagram (máx. 2200). Si se omite, se usa el de Facebook recortado.')
})
const base = {
  titulo: z.string().trim().min(3).max(120).describe('Nombre interno para reconocer la pieza en el panel.'),
  destinos,
  descripcion,
  claveIdempotencia: z.string().regex(/^[A-Za-z0-9_.:-]{8,100}$/).optional()
    .describe('Evita duplicados al reintentar: la misma clave devuelve la pieza ya creada. También acepta el encabezado `Idempotency-Key`.')
}
const imagenes = {
  tipo: z.literal('imagenes'),
  formato: z.enum(['cuadrado', 'vertical', 'web']).default('vertical').describe('`vertical` 1080×1350 (recomendado), `cuadrado` 1080×1080, `web` 1200×628 (no sirve para el feed de Instagram).'),
  diapositivas: z.array(esquemaDiapositivaAgente).min(1).max(10).describe('Más de una diapositiva forma un carrusel (hasta 10).')
}
const video = { tipo: z.literal('video'), videoMedioId: uuid('Identificador del vídeo subido (MP4 o MOV).') }

export const esquemaCrearPublicacion = z.discriminatedUnion('tipo', [z.strictObject({ ...base, ...imagenes }), z.strictObject({ ...base, ...video })])
export const esquemaActualizarPublicacion = z.discriminatedUnion('tipo', [
  z.strictObject({ id: uuid('Identificador de la publicación.'), revision: z.int().positive().describe('Revisión que leíste; si cambió, la operación falla con conflicto.'), ...base, ...imagenes }),
  z.strictObject({ id: uuid('Identificador de la publicación.'), revision: z.int().positive().describe('Revisión que leíste; si cambió, la operación falla con conflicto.'), ...base, ...video })
])

export const esquemaId = z.strictObject({ id: uuid('Identificador de la publicación.') })
export const esquemaListar = z.strictObject({
  estado: z.enum(['draft', 'scheduled', 'publishing', 'published', 'failed']).optional(),
  ambito: z.enum(['mias', 'todas']).default('mias').describe('`mias`: creadas con esta llave. `todas`: también las de personas.'),
  limite: z.coerce.number().int().min(1).max(50).default(20)
})
export const esquemaPrevisualizar = z.strictObject({
  id: uuid('Identificador de la publicación.'),
  diapositiva: z.coerce.number().int().min(1).max(10).default(1).describe('Número de diapositiva (1 = primera).'),
  formato: z.enum(['json', 'jpg']).default('json').describe('`json`: imagen en base64. `jpg`: devuelve la imagen binaria (solo REST).')
})
export const esquemaSolicitarAprobacion = z.strictObject({
  id: uuid('Identificador de la publicación.'),
  revision: z.int().positive(),
  nota: z.string().trim().max(500).optional().describe('Mensaje para la persona que aprobará (por qué, contexto, fuentes).'),
  horaSugerida: z.iso.datetime({ offset: true }).optional().describe('Hora sugerida de publicación (ISO 8601 con zona). La persona decide la final.')
})
export const esquemaProgramar = z.strictObject({
  id: uuid('Identificador de la publicación.'),
  revision: z.int().positive(),
  fecha: z.iso.datetime({ offset: true }).describe('Instante de publicación (ISO 8601 con zona, p. ej. 2026-11-20T15:00:00-05:00). Entre 10 minutos y 30 días desde ahora.')
})
export const esquemaIniciarSubida = z.strictObject({
  nombre: z.string().trim().min(1).max(200),
  tipoMime: z.enum(['image/jpeg', 'image/png', 'image/webp', 'video/mp4', 'video/quicktime']),
  tamano: z.int().positive().describe('Tamaño exacto en bytes.'),
  publicacionId: z.uuid().optional()
})
export const esquemaConfirmarSubida = z.strictObject({ id: uuid('Identificador devuelto al iniciar la subida.') })
export const esquemaImportarUrl = z.strictObject({
  url: z.url().max(2000).describe('Enlace HTTPS público a una imagen JPG, PNG o WebP (máx. 15 MB). No se admiten direcciones privadas.'),
  publicacionId: z.uuid().optional()
})
export const esquemaBiblioteca = z.strictObject({
  busqueda: z.string().trim().max(80).optional().describe('Texto a buscar en título, nombre de archivo y texto alternativo.'),
  limite: z.coerce.number().int().min(1).max(30).default(12)
})
export const esquemaVacio = z.strictObject({})

export type EntradaCrearPublicacion = z.infer<typeof esquemaCrearPublicacion>
export type EntradaActualizarPublicacion = z.infer<typeof esquemaActualizarPublicacion>
