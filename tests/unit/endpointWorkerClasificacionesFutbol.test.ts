import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'

const ruta = new URL('../../server/api/internal/futbol/clasificaciones.post.ts', import.meta.url)

describe('endpoint interno de clasificaciones de fútbol', () => {
  it('requiere firma, no acepta objetivos del cuerpo y usa allowlist privada', () => {
    const contenido = readFileSync(ruta, 'utf8')
    expect(contenido).toContain('verificarFirmaCodex(evento, cuerpo, String(config.footballWorkerApiSecret || \'\'))')
    expect(contenido).toContain('esObjetoVacio(entrada)')
    expect(contenido).toContain('leerAllowlistClasificacionesFutbol(config.footballStandingsAllowlist)')
    expect(contenido).not.toContain('readBody(')
  })

  it('no añade cron ni expone la clave privilegiada al navegador', () => {
    const contenido = readFileSync(ruta, 'utf8')
    expect(contenido).toContain('obtenerClienteSupabasePrivado(evento)')
    expect(contenido).not.toContain('service_role')
    expect(contenido).not.toContain('schedule')
    expect(contenido).toContain("puedeConsumir: crearGateReservaClasificaciones(provider => repositorio.reclamarVentanaWorker(provider, 'standings'))")
  })
})
