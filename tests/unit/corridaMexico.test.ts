import { existsSync, readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { esquemaContextoCodex } from '../../server/utils/esquemasCodexEditorial'
import politicaCo from '../../config/automatizacionEditorial.json'
import politicaMx from '../../config/automatizacionEditorialMx.json'
import fuentesMx from '../../config/fuentesFutbolMexicano.json'
import bancoMx from '../../config/bancoEvergreenMx.json'

const idCorrida = '3f2c1d6e-8c5a-4b7e-9d1a-2f6b7c8d9e0f'

describe('corrida editorial de México', () => {
  it('el contexto acepta el sitio de la corrida solo si es válido', () => {
    expect(esquemaContextoCodex.safeParse({ runId: idCorrida }).success).toBe(true)
    expect(esquemaContextoCodex.safeParse({ runId: idCorrida, site: 'mx' }).success).toBe(true)
    expect(esquemaContextoCodex.safeParse({ runId: idCorrida, site: 'co' }).success).toBe(true)
    expect(esquemaContextoCodex.safeParse({ runId: idCorrida, site: 'ar' }).success).toBe(false)
    expect(esquemaContextoCodex.safeParse({ runId: idCorrida, site: 'mx', otro: 1 }).success).toBe(false)
  })

  it('tiene interruptor explícito y apunta a archivos que existen', () => {
    expect(typeof politicaMx.habilitada).toBe('boolean')
    expect(politicaMx.sitio).toBe('mx')
    for (const ruta of [politicaMx.skill, politicaMx.prompt, politicaMx.fuentes, politicaMx.bancoEvergreen]) {
      expect(existsSync(new URL(`../../${ruta}`, import.meta.url)), ruta).toBe(true)
    }
    expect(readFileSync(new URL('../../docs/agents/prompts/editorial-futbol-mexicano.md', import.meta.url), 'utf8')).toContain('habilitada')
  })

  it('sus horarios no coinciden con los de Colombia ni entre agentes', () => {
    const todosCo = [...politicaCo.horarios.codex, ...politicaCo.horarios.claude]
    const todosMx = [...politicaMx.horarios.codex, ...politicaMx.horarios.claude]
    expect(todosMx.filter(hora => todosCo.includes(hora))).toEqual([])
    expect(new Set(todosMx).size).toBe(todosMx.length)
    expect(politicaMx.zonaHorariaEditorial).toBe('America/Mexico_City')
  })

  it('las fuentes listan los 18 clubes sin repetir y no inventan cuentas', () => {
    expect(fuentesMx.clubes).toHaveLength(18)
    expect(new Set(fuentesMx.clubes).size).toBe(18)
    for (const club of fuentesMx.clubesDeMayorInteres) expect(fuentesMx.clubes).toContain(club)
    expect(fuentesMx.periodistas).toEqual([])
    expect(JSON.stringify(fuentesMx.cuentasOficiales)).not.toMatch(/"(x|instagram|facebook)"/)
  })

  it('el banco evergreen usa plantillas con identificador único y referencia al club', () => {
    const ids = bancoMx.plantillas.map(p => p.id)
    expect(new Set(ids).size).toBe(ids.length)
    for (const plantilla of bancoMx.plantillas.filter(p => p.aplicaA === 'club')) expect(plantilla.titulo).toContain('{club}')
    expect(JSON.stringify(bancoMx)).not.toMatch(/BetPlay|DIMAYOR|colombian/i)
  })

  it('la migración parchea el contexto y la propuesta con el sitio y conserva permisos', () => {
    const sql = readFileSync(new URL('../../supabase/migrations/20261119200000_corridas_editoriales_por_sitio.sql', import.meta.url), 'utf8')
    expect(sql).toContain('p_site text DEFAULT')
    expect(sql).toContain('v_site text :=')
    expect(sql).toContain("and site = p_site")
    expect(sql).toContain('revoke all on function')
  })
})
