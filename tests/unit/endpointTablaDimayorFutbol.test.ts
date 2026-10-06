import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'

const ruta = new URL('../../server/api/internal/futbol/tabla-dimayor.post.ts', import.meta.url)

describe('endpoint interno de posiciones DIMAYOR', () => {
  it('requiere firma, gate de derechos y el paquete íntegro de tablas oficiales', () => {
    const contenido = readFileSync(ruta, 'utf8')
    expect(contenido).toContain('verificarFirmaCodex(evento, cuerpo, String(config.footballWorkerApiSecret || \'\'))')
    expect(contenido).toContain('config.futbolDerechosPublicacionConfirmados !== true')
    expect(contenido).toContain("cliente.rpc('claim_dimayor_standings_sync')")
    expect(contenido).toContain('proyectarTablasDimayorAutorizadas(')
    expect(contenido).toContain("cliente.rpc('actualizar_posiciones_liga_dimayor'")
    expect(contenido).toContain('p_claim_token: tokenReserva')
    expect(contenido).toContain("cliente.rpc('release_dimayor_standings_sync'")
  })

  it('publica solo con la credencial privada, informa cuota cero y no usa proveedores', () => {
    const contenido = readFileSync(ruta, 'utf8')
    expect(contenido).toContain('obtenerClienteSupabasePrivado(evento)')
    expect(contenido).toContain("fuente: 'DIMAYOR'")
    expect(contenido).toContain('solicitudes: 0')
    expect(contenido).not.toContain('service_role')
    expect(contenido).not.toContain('crearProveedor')
  })
})
