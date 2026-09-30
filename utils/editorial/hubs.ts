import { z } from 'zod'
import type { TipoHubPublicoEditorial } from '~/types/contenidoEditorial'

export const tiposHubPublicoEditorial: TipoHubPublicoEditorial[] = [
  'topic',
  'competition',
  'player_collection',
  'technology',
  'gaming'
]

const esquemaSlugHub = z.string().trim().min(3).max(100)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)

const esquemaModuloHub = z.discriminatedUnion('tipo', [
  z.object({
    id: z.string().trim().min(1).max(64),
    tipo: z.literal('texto'),
    titulo: z.string().trim().min(2).max(120),
    contenido: z.string().trim().min(20).max(5000)
  }),
  z.object({
    id: z.string().trim().min(1).max(64),
    tipo: z.literal('enlaces'),
    titulo: z.string().trim().min(2).max(120),
    enlaces: z.array(z.object({
      etiqueta: z.string().trim().min(2).max(80),
      ruta: z.string().trim().min(2).max(240)
        .refine(ruta => ruta.startsWith('/') && !ruta.startsWith('//') && !ruta.includes('\\'))
    })).min(1).max(12)
  }),
  z.object({
    id: z.string().trim().min(1).max(64),
    tipo: z.literal('articulos'),
    titulo: z.string().trim().min(2).max(120),
    filtro: z.object({
      tipo: z.enum(['categoria', 'tema']),
      slug: esquemaSlugHub
    }),
    limite: z.coerce.number().int().min(1).max(12)
  })
])

export const esquemaDatosHubPublico = z.object({
  slug: esquemaSlugHub,
  tipo: z.enum(tiposHubPublicoEditorial as [
    TipoHubPublicoEditorial,
    ...TipoHubPublicoEditorial[]
  ]),
  titulo: z.string().trim().min(8).max(140),
  descripcion: z.string().trim().min(2).max(320),
  cuerpo: z.string().trim().max(20000).default(''),
  modulos: z.array(esquemaModuloHub).max(12).default([]),
  tituloSeo: z.string().trim().max(160).default(''),
  descripcionSeo: z.string().trim().max(320).default('')
})

export const esquemaCrearHubPublico = esquemaDatosHubPublico
export const esquemaActualizarHubPublico = esquemaDatosHubPublico

export type DatosHubPublico = z.infer<typeof esquemaDatosHubPublico>
export type ModuloHub = z.infer<typeof esquemaModuloHub>

export function evaluarHubIndexable(
  hub: Pick<DatosHubPublico, 'descripcion' | 'cuerpo' | 'modulos'>,
  cantidadArticulosFeed: number
): { indexable: boolean, motivos: string[] } {
  const motivos: string[] = []
  const textoUtil = [
    hub.descripcion,
    hub.cuerpo,
    ...hub.modulos.flatMap(modulo => modulo.tipo === 'texto' ? [modulo.contenido] : [])
  ].join(' ').replace(/\s+/g, ' ').trim()

  if (hub.descripcion.trim().length < 80) motivos.push('description_too_short')
  if (textoUtil.length < 300) motivos.push('useful_content_too_short')
  if (!hub.modulos.some(modulo => modulo.tipo === 'articulos')) {
    motivos.push('article_feed_required')
  } else if (cantidadArticulosFeed < 1) {
    motivos.push('article_feed_empty')
  }

  return { indexable: motivos.length === 0, motivos }
}
