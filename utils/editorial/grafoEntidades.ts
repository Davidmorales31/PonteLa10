import { z } from 'zod'

const tipoEntidadSeo = z.enum(['article', 'match', 'team', 'player', 'competition'])
const tipoRelacionSeo = z.enum(['about', 'mentions', 'related'])

export const esquemaDecisionesRelacionesSeo = z.object({
  decisiones: z.array(z.object({
    tipo: tipoEntidadSeo,
    slug: z.string().min(1).max(120).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
    relacion: tipoRelacionSeo,
    estado: z.enum(['confirmed', 'rejected'])
  }).strict()).max(40)
}).strict().superRefine(({ decisiones }, contexto) => {
  const claves = new Set<string>()
  const principalesConfirmadas = decisiones.filter(decision =>
    decision.estado === 'confirmed' && decision.relacion === 'about'
  )
  if (principalesConfirmadas.length > 1) {
    contexto.addIssue({
      code: 'custom',
      path: ['decisiones'],
      message: 'Solo se permite una entidad principal confirmada por artículo.'
    })
  }
  decisiones.forEach((decision, indice) => {
    const clave = `${decision.tipo}:${decision.slug}`
    if (claves.has(clave)) {
      contexto.addIssue({
        code: 'custom',
        path: ['decisiones', indice, 'slug'],
        message: 'No repitas la misma entidad en una decisión.'
      })
    }
    claves.add(clave)
  })
})
