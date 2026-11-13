import { z } from 'zod'
export const esquemaProgramacionSocial = z.object({
  operacionId: z.string().uuid(), confirmar: z.literal(true),
  articulos: z.array(z.string().uuid()).min(1).max(50).refine(ids => new Set(ids).size === ids.length),
  destinos: z.array(z.enum(['facebook','instagram'])).min(1).max(2).refine(ids => new Set(ids).size === ids.length),
  inicio: z.string().datetime({ offset: true }), intervaloMinutos: z.number().int().min(1).max(1440)
}).strict()
/** datetime-local del formulario representa siempre Colombia, no la zona del navegador. */
export function inicioProgramacionColombia(valor: string) {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(valor)) return ''
  const fecha = new Date(`${valor}:00-05:00`)
  return Number.isFinite(fecha.getTime()) && new Date(fecha.getTime() - 5 * 3600_000).toISOString().slice(0, 16) === valor ? fecha.toISOString() : ''
}
export function fechasProgramacionSocial(inicio: string, intervalo: number, cantidad: number) {
  return Array.from({ length: cantidad }, (_, posicion) => new Date(Date.parse(inicio) + posicion * intervalo * 60_000).toISOString())
}
