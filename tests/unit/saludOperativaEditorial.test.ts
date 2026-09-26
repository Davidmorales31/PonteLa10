import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { normalizarSaludOperativaEditorial } from '../../server/utils/saludOperativaEditorial'

describe('vista segura de salud editorial', () => {
  it('proyecta solo estados, conteos y fechas permitidos', () => {
    const resultado = normalizarSaludOperativaEditorial({
      consultadoEn: '2026-09-26T12:00:00Z',
      worker: {
        estado: 'activo', instancia: 'no-exponer', ultimaSenalEn: '2026-09-26T11:59:00Z',
        antiguedadSegundos: 60, secreto: 'no-exponer'
      },
      ingestas: {
        enCola: 2, edadColaMasAntiguaSegundos: 90, procesando: 1,
        procesamientoConLeaseVencido: 0, evidenciaLista: 3,
        edadEvidenciaMasAntiguaSegundos: 300, ultimoFalloEn: null, fallidas: 0,
        detalle: 'no-exponer'
      },
      codex: {
        ultimaCorrida: {
          id: 'no-exponer', estado: 'partial', iniciadaEn: '2026-09-26T11:00:00Z',
          actualizadaEn: null, terminadaEn: null, raw: 'no-exponer'
        },
        corridasFallidas: 0, corridasParciales: 1, propuestasEnRevision: 4
      },
      publicacion: { programadasVencidas: 0, atrasoMasAntiguoSegundos: null },
      cron: { estado: 'succeeded', disponible: true, configurado: true, iniciadaEn: null, terminadaEn: null, return_message: 'no-exponer' }
    })

    expect(resultado.worker).toEqual({
      estado: 'activo', ultimaSenalEn: '2026-09-26T11:59:00.000Z', antiguedadSegundos: 60
    })
    expect(JSON.stringify(resultado)).not.toContain('no-exponer')
    expect(JSON.stringify(resultado)).not.toContain('secret')
  })

  it('sanea valores inesperados y fechas inválidas sin exponer campos originales', () => {
    const resultado = normalizarSaludOperativaEditorial({
      consultadoEn: 'mañana',
      worker: { estado: 'token-secret', antiguedadSegundos: -20, instancia: 'id' },
      codex: { ultimaCorrida: { estado: 'unknown-state', iniciadaEn: 'bad-date' } },
      cron: { estado: 'succeeded; select *', disponible: 1 }
    })

    expect(resultado.consultadoEn).toBeNull()
    expect(resultado.worker.estado).toBe('desconocido')
    expect(resultado.worker.antiguedadSegundos).toBe(0)
    expect(resultado.codex.ultimaCorrida?.estado).toBe('desconocido')
    expect(resultado.codex.ultimaCorrida?.iniciadaEn).toBeNull()
    expect(resultado.cron.estado).toBe('desconocido')
    expect(resultado.cron.disponible).toBe(false)
  })

  it('no eleva privilegios para consultar Cron cuando service_role no tiene acceso al esquema', () => {
    const migracion = readFileSync(new URL(
      '../../supabase/migrations/20260926151000_hu_ed_13_cron_privilege_guard.sql',
      import.meta.url
    ), 'utf8')
    const guardia = migracion.indexOf("has_schema_privilege(current_user, 'cron', 'USAGE')")
    const consultaCatalogo = migracion.indexOf("to_regclass('cron.job_run_details')")

    expect(guardia).toBeGreaterThanOrEqual(0)
    expect(consultaCatalogo).toBeGreaterThan(guardia)
    expect(migracion).toContain("jsonb_build_object('estado', 'desconocido', 'disponible', false)")
  })
})
