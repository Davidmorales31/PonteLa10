import { mkdtemp, rm, readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { describe, expect, it } from 'vitest'
import {
  guardarCheckpoint,
  guardarPortadaCheckpoint,
  exportarEtapaCheckpoint,
  leerCheckpoint,
  listarCheckpointsRun,
  prepararPayloadPortadaCheckpoint
} from '../../scripts/codex-editorial-checkpoint.mjs'

const identidad = {
  runId: '14a5f2b0-a9c1-41b2-9b82-729f52c3b4d2',
  categoryId: 'ef3716e2-351e-4bc6-af69-883b17e91111',
  fingerprint: 'a'.repeat(64)
}

const metadatos = {
  titulo: 'Ilustración editorial de fútbol nocturno',
  alt: 'Ilustración editorial de una cancha iluminada de noche',
  pie: 'Ilustración editorial generada con IA para esta noticia deportiva.',
  credito: 'Pont3la10 · Imagen generada con IA'
}

function crearPngPrueba() {
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    Buffer.alloc(100, 1)
  ])
}

describe('checkpoints locales reanudables de contenido Codex', () => {
  it('persiste etapas en orden, conserva revisiones y lee el último resultado', async () => {
    const raiz = await mkdtemp(join(tmpdir(), 'pont3la10-checkpoint-'))
    try {
      const expediente = { claims: ['El informe oficial confirma el dato.'] }
      expect(await guardarCheckpoint(raiz, identidad, 'expediente', expediente))
        .toMatchObject({ guardado: true, repetido: false, revision: 1 })
      expect(await guardarCheckpoint(raiz, identidad, 'expediente', expediente))
        .toMatchObject({ guardado: true, repetido: true, etapa: 'expediente' })

      await expect(guardarCheckpoint(raiz, identidad, 'media', { mediaId: 'x' }))
        .rejects.toThrow('Primero guarda las etapas requeridas: portada.')
      await guardarCheckpoint(raiz, identidad, 'borrador', { title: 'Un título verificable' })

      const imagen = join(raiz, 'cover.png')
      const metadata = join(raiz, 'cover.json')
      const png = crearPngPrueba()
      await Promise.all([
        writeFile(imagen, png),
        writeFile(metadata, JSON.stringify(metadatos))
      ])
      await guardarPortadaCheckpoint(raiz, identidad, imagen, metadata)

      const checkpoint = await leerCheckpoint(raiz, identidad) as Record<string, unknown>
      const portadaGuardada = checkpoint.portada as {
        assetPath: string
        mime: string
        bytes: number
        metadatos: typeof metadatos
      }
      expect(portadaGuardada).toMatchObject({ mime: 'image/png', bytes: png.length, metadatos })
      const imagenPersistida = join(raiz, portadaGuardada.assetPath)
      expect(await readFile(imagenPersistida)).toEqual(png)

      const payloadRelativo = 'media.payload.json'
      expect(await prepararPayloadPortadaCheckpoint(raiz, identidad, payloadRelativo))
        .toMatchObject({ preparado: true, mime: 'image/png', bytes: png.length })
      const payloadPortada = JSON.parse(await readFile(join(
        raiz,
        '.codex', 'editorial-runs', identidad.runId, identidad.categoryId,
        identidad.fingerprint, payloadRelativo
      ), 'utf8'))
      expect(payloadPortada.imagenBase64).toBe(png.toString('base64'))
      expect(await prepararPayloadPortadaCheckpoint(raiz, identidad, payloadRelativo))
        .toMatchObject({ preparado: true, repetido: true, mime: 'image/png', bytes: png.length })
      await expect(prepararPayloadPortadaCheckpoint(raiz, identidad, '../escape.json'))
        .rejects.toThrow('El payload debe guardarse dentro del directorio de este candidato.')
      await writeFile(join(
        raiz, '.codex', 'editorial-runs', identidad.runId, identidad.categoryId,
        identidad.fingerprint, payloadRelativo
      ), '{"imagenBase64":"distinta"}')
      await expect(prepararPayloadPortadaCheckpoint(raiz, identidad, payloadRelativo))
        .rejects.toThrow('El payload de portada existente no coincide con el checkpoint guardado.')

      await guardarCheckpoint(raiz, identidad, 'media', { mediaId: 'ed2af2d4-533e-4dab-9e9d-a48268297220' })
      await guardarCheckpoint(raiz, identidad, 'propuesta', { idempotencyKey: 'fija', coverMediaId: 'ed2af2d4-533e-4dab-9e9d-a48268297220' })
      await guardarCheckpoint(raiz, identidad, 'entrega', { articleId: 'publicado-en-review' })
      await guardarCheckpoint(raiz, identidad, 'borrador', { title: 'Corrección editorial posterior' })

      const reanudado = await leerCheckpoint(raiz, identidad) as Record<string, unknown>
      expect(reanudado.borrador).toEqual({ title: 'Corrección editorial posterior' })
      expect(reanudado.entrega).toEqual({ articleId: 'publicado-en-review' })
      expect(await listarCheckpointsRun(raiz, identidad.runId)).toEqual([{
        categoryId: identidad.categoryId,
        fingerprint: identidad.fingerprint,
        etapas: ['expediente', 'borrador', 'portada', 'media', 'propuesta', 'entrega']
      }])
      await expect(listarCheckpointsRun(raiz, '../escape'))
        .rejects.toThrow('La corrida no es válida.')
      await expect(exportarEtapaCheckpoint(raiz, identidad, 'propuesta', '../proposal.json'))
        .rejects.toThrow('La exportación debe permanecer dentro del directorio del candidato.')
      expect(await exportarEtapaCheckpoint(raiz, identidad, 'propuesta', 'replay.json'))
        .toEqual({ exportada: true, repetida: false, etapa: 'propuesta' })
      expect(await exportarEtapaCheckpoint(raiz, identidad, 'propuesta', 'replay.json'))
        .toEqual({ exportada: true, repetida: true, etapa: 'propuesta' })
      expect(JSON.parse(await readFile(join(
        raiz, '.codex', 'editorial-runs', identidad.runId, identidad.categoryId,
        identidad.fingerprint, 'replay.json'
      ), 'utf8'))).toEqual({
        idempotencyKey: 'fija', coverMediaId: 'ed2af2d4-533e-4dab-9e9d-a48268297220'
      })
      const archivoReplay = join(
        raiz, '.codex', 'editorial-runs', identidad.runId, identidad.categoryId,
        identidad.fingerprint, 'replay.json'
      )
      await writeFile(archivoReplay, '{"different":true}')
      await expect(exportarEtapaCheckpoint(raiz, identidad, 'propuesta', 'replay.json'))
        .rejects.toThrow('El archivo de exportación existente no coincide con la etapa guardada.')
    } finally {
      await rm(raiz, { recursive: true, force: true })
    }
  })

  it('rechaza identidad inválida, campos de secretos y una imagen sin contrato editorial', async () => {
    const raiz = await mkdtemp(join(tmpdir(), 'pont3la10-checkpoint-'))
    try {
      await expect(guardarCheckpoint(raiz, { ...identidad, runId: '../escape' }, 'expediente', {}))
        .rejects.toThrow('La identidad del candidato no es válida.')
      await expect(guardarCheckpoint(raiz, identidad, 'expediente', { api_key: 'no' }))
        .rejects.toThrow('El checkpoint parece incluir credenciales; no se guardó.')
      await expect(guardarCheckpoint(raiz, identidad, 'desconocida', {}))
        .rejects.toThrow('La etapa de checkpoint no es válida.')
    } finally {
      await rm(raiz, { recursive: true, force: true })
    }
  })
})
