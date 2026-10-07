import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import {
  evaluarCalidadPlantilla,
  normalizarTextoPlantilla,
  plantillasEditoriales
} from '~/utils/editorial/plantillas'

describe('plantillas editoriales', () => {
  it('ofrece las diez estructuras y requisitos de la historia de usuario', () => {
    expect(plantillasEditoriales).toHaveLength(10)
    for (const plantilla of plantillasEditoriales) {
      expect(plantilla.camposMinimos.length).toBeGreaterThanOrEqual(3)
      expect(plantilla.fuentePrincipal.trim()).not.toBe('')
      expect(plantilla.secciones).toHaveLength(3)
    }
  })

  it('bloquea una pieza con plantilla si falta fuente o no se desarrolló cada sección', () => {
    const resultado = evaluarCalidadPlantilla({
      plantillaId: 'resultadoPartido',
      camposCompletos: [],
      fuente: { nombre: '', url: '', autor: '', creditos: '' },
      bloques: [
        { id: 'a', tipo: 'encabezado2', texto: 'Marcador final' },
        { id: 'b', tipo: 'parrafo', texto: 'Desarrollo de la primera sección con información respaldada.' }
      ]
    })

    expect(resultado.completa).toBe(false)
    expect(resultado.seccionesCompletas).toBe(1)
    expect(resultado.faltantes).toContain('Agrega una fuente principal con nombre y enlace HTTPS.')
    expect(resultado.faltantes).toContain('Agrega la sección «Momentos clave».')
  })

  it('acepta secciones desarrolladas y una fuente HTTPS registrada', () => {
    const plantilla = plantillasEditoriales.find(item => item.id === 'previaPartido')!
    const bloques = plantilla.secciones.flatMap((seccion, indice) => [
      { id: `h${indice}`, tipo: 'encabezado2' as const, texto: seccion },
      { id: `p${indice}`, tipo: 'parrafo' as const, texto: 'Contexto contrastado y respaldado para explicar este punto del encuentro.' }
    ])

    expect(evaluarCalidadPlantilla({
      plantillaId: plantilla.id,
      camposCompletos: plantilla.camposMinimos,
      bloques,
      fuente: {
        nombre: 'Federación oficial',
        url: 'https://example.com/fixture',
        autor: '',
        creditos: ''
      }
    }).completa).toBe(true)
  })

  it('mantiene los campos mínimos como requisito explícito de la plantilla', () => {
    const plantilla = plantillasEditoriales.find(item => item.id === 'dondeVer')!
    const bloques = plantilla.secciones.flatMap((seccion, indice) => [
      { id: `h${indice}`, tipo: 'encabezado2' as const, texto: seccion },
      { id: `p${indice}`, tipo: 'parrafo' as const, texto: 'La sección contiene desarrollo suficiente, contrastado y comprensible para la audiencia.' }
    ])
    const entrada = {
      plantillaId: plantilla.id,
      camposCompletos: plantilla.camposMinimos.slice(0, 2),
      bloques,
      fuente: {
        nombre: 'Federación oficial',
        url: 'https://example.com/fixture',
        autor: '',
        creditos: ''
      }
    }

    const incompleta = evaluarCalidadPlantilla(entrada)
    expect(incompleta.completa).toBe(false)
    expect(incompleta.camposCompletos).toBe(2)
    expect(incompleta.faltantes).toContain(`Confirma que cubriste «${plantilla.camposMinimos[2]}».`)
    expect(evaluarCalidadPlantilla({
      ...entrada,
      camposCompletos: plantilla.camposMinimos
    }).completa).toBe(true)
  })

  it('compara encabezados sin borrar tildes para coincidir con lower() de PostgreSQL', () => {
    expect(normalizarTextoPlantilla(' DÓNDE verlo ')).toBe('dónde verlo')
    expect(normalizarTextoPlantilla('Donde verlo')).not.toBe(normalizarTextoPlantilla('Dónde verlo'))
    expect(normalizarTextoPlantilla('\tDÓNDE verlo\t')).not.toBe(normalizarTextoPlantilla('DÓNDE verlo'))
  })

  it('reinicia campos al cambiar plantilla y bloquea retirarla durante revisión en la base', () => {
    const migracion = readFileSync(new URL(
      '../../supabase/migrations/20261007105053_hu_ed22_plantillas_intencion.sql',
      import.meta.url
    ), 'utf8')

    expect(migracion).toContain('add column template_fields_complete text[] not null')
    expect(migracion).toContain("new.template_fields_complete := '{}'::text[]")
    expect(migracion).toContain("article_status = 'review'")
    expect(migracion).toContain('No se puede retirar una plantilla mientras el artículo está en revisión.')
    expect(migracion).toContain('campos_requeridos <@ coalesce(campos_verificados')
    expect(migracion).toContain('^https://([[:alnum:]]')
    const briefPut = readFileSync(new URL(
      '../../server/api/admin/contenidos/[id]/brief-seo.put.ts',
      import.meta.url
    ), 'utf8')
    expect(briefPut.slice(briefPut.indexOf('const valores ='), briefPut.indexOf('const columnasBrief =')))
      .not.toContain('template_fields_complete:')
  })

  it('mantiene el contrato de encabezados del cliente y del quality gate de base de datos alineados', () => {
    const migracion = readFileSync(new URL(
      '../../supabase/migrations/20261007105053_hu_ed22_plantillas_intencion.sql',
      import.meta.url
    ), 'utf8')
    const componente = readFileSync(new URL(
      '../../components/admin/PanelPlantillaEditorial.vue',
      import.meta.url
    ), 'utf8')

    for (const plantilla of plantillasEditoriales) {
      expect(migracion).toContain(`when '${plantilla.id}'`)
      for (const seccion of plantilla.secciones) expect(migracion).toContain(seccion)
      for (const campo of plantilla.camposMinimos) expect(migracion).toContain(campo)
    }
    expect(migracion).toContain("from public, anon, authenticated, service_role")
    expect(migracion).toContain('char_length(pg_catalog.btrim')
    expect(migracion).toContain('camposPlantillaCompletos')
    expect(componente).toContain('solo se agregan encabezados vacíos')
    expect(componente).toContain('La plantilla nunca redacta hechos')
    expect(componente).toContain('Marca cada elemento solo después de cubrirlo')
  })
})
