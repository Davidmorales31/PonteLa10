import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'

const contenido = readFileSync(new URL('../../server/api/internal/futbol/liga-resultados.post.ts', import.meta.url), 'utf8')

describe('reconciliación interna de resultados de Liga', () => {
  it('acepta solo una solicitud vacía firmada y no llama proveedores externos', () => {
    expect(contenido).toContain('verificarFirmaCodex(evento, cuerpo, String(config.footballWorkerApiSecret || \'\'))')
    expect(contenido).toContain('esObjetoVacio(decodificarJsonFirmado<unknown>(cuerpo))')
    expect(contenido).toContain("cliente.from('football_fixtures_today')")
    expect(contenido).not.toContain('crearProveedoresFutbolConfigurados')
    expect(contenido).not.toContain('fetch(')
  })

  it('solo proyecta marcadores sobre el calendario que ya es público y tiene derechos confirmados', () => {
    expect(contenido).toContain("cliente.from('colombian_league_fixtures')")
    expect(contenido.match(/\.eq\('is_public', true\)\.eq\('publication_rights_confirmed', true\)/g)).toHaveLength(2)
    expect(contenido).toContain('marcadoresActualizados: guardadas')
  })
})
