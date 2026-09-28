import { mkdtemp, rm, readFile, readdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { describe, expect, it } from 'vitest'
import sharp from 'sharp'
import {
  guardarCheckpoint,
  guardarPortadaCheckpoint,
  guardarPortadaIACheckpoint,
  exportarEtapaCheckpoint,
  leerCheckpoint,
  listarCheckpointsRun,
  prepararPayloadPortadaCheckpoint,
  prepararPayloadPortadaIACheckpoint
} from '../../scripts/codex-editorial-checkpoint.mjs'

const identidad = {
  runId: '14a5f2b0-a9c1-41b2-9b82-729f52c3b4d2',
  categoryId: 'ef3716e2-351e-4bc6-af69-883b17e91111',
  fingerprint: 'a'.repeat(64)
}

const metadatos = {
  titulo: 'Selección Colombia en partido internacional',
  alt: 'Selección Colombia durante un partido de fútbol internacional',
  pie: 'Fotografía de archivo de Colombia durante un encuentro internacional.',
  autorFoto: 'Carlos Pérez',
  licenciaFoto: 'CC BY 4.0',
  urlFuente: 'https://commons.wikimedia.org/wiki/File:Colombia_football_team.jpg'
}
const metadatosIA = {
  titulo: 'Ilustración editorial de un estadio',
  alt: 'Estadio genérico iluminado antes del inicio de un partido'
}

function crearPngPrueba() {
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    Buffer.alloc(100, 1)
  ])
}

describe('checkpoints locales reanudables de contenido Codex', () => {
  it('serializa las portadas concurrentes y rechaza cambios posteriores', async () => {
    const raiz = await mkdtemp(join(tmpdir(), 'pont3la10-checkpoint-portada-concurrente-'))
    try {
      await guardarCheckpoint(raiz, identidad, 'expediente', { claims: ['Dos fuentes respaldan el hecho.'] })
      await guardarCheckpoint(raiz, identidad, 'borrador', { title: 'Borrador con portada' })
      const imagenes = [join(raiz, 'imagen-a.png'), join(raiz, 'imagen-b.png')]
      const metadata = join(raiz, 'portada-ia.json')
      await Promise.all([
        sharp({ create: { width: 1200, height: 675, channels: 3, background: '#102238' } }).png().toFile(imagenes[0]),
        sharp({ create: { width: 1200, height: 675, channels: 3, background: '#204060' } }).png().toFile(imagenes[1]),
        writeFile(metadata, JSON.stringify(metadatosIA))
      ])

      const resultados = await Promise.allSettled(imagenes.map(imagen =>
        guardarPortadaIACheckpoint(raiz, identidad, imagen, metadata)))
      expect(resultados.filter(resultado => resultado.status === 'fulfilled')).toHaveLength(1)
      expect(resultados.filter(resultado => resultado.status === 'rejected')).toHaveLength(1)

      const checkpoint = await leerCheckpoint(raiz, identidad) as Record<string, unknown>
      expect(checkpoint.portadaIA).toBeDefined()
      expect(checkpoint.portada).toBeUndefined()
      const carpeta = join(raiz, '.codex', 'editorial-runs', identidad.runId, identidad.categoryId, identidad.fingerprint)
      expect((await readdir(carpeta)).filter(nombre => nombre.startsWith('portadaIA.'))).toEqual(['portadaIA.001.json'])
      await expect(guardarCheckpoint(raiz, identidad, 'portadaIA', { hash: 'cambio' }))
        .rejects.toThrow('Las portadas solo se guardan mediante el flujo validado de imagen.')
    } finally {
      await rm(raiz, { recursive: true, force: true })
    }
  })

  it('guarda una portada IA optimizada una sola vez y reutiliza su payload', async () => {
    const raiz = await mkdtemp(join(tmpdir(), 'pont3la10-checkpoint-portada-ia-'))
    try {
      await guardarCheckpoint(raiz, identidad, 'expediente', { claims: ['Dos fuentes respaldan el hecho.'] })
      await guardarCheckpoint(raiz, identidad, 'borrador', { title: 'Un borrador completo con portada IA' })
      const imagen = join(raiz, 'imagen-generada.png')
      const metadata = join(raiz, 'portada-ia.json')
      await Promise.all([
        sharp({ create: { width: 1200, height: 675, channels: 3, background: '#102238' } })
          .png().toFile(imagen),
        writeFile(metadata, JSON.stringify(metadatosIA))
      ])

      expect(await guardarPortadaIACheckpoint(raiz, identidad, imagen, metadata))
        .toMatchObject({ guardado: true, repetido: false, etapa: 'portadaIA', mime: 'image/webp' })
      expect(await guardarPortadaIACheckpoint(raiz, identidad, imagen, metadata))
        .toMatchObject({ guardado: true, repetido: true, etapa: 'portadaIA' })

      const checkpoint = await leerCheckpoint(raiz, identidad) as Record<string, unknown>
      const portada = checkpoint.portadaIA as { assetPath: string, mime: string, metadatos: typeof metadatosIA }
      expect(portada).toMatchObject({ mime: 'image/webp', metadatos: metadatosIA })
      await expect(guardarCheckpoint(raiz, identidad, 'media', { mediaId: 'sin-portada' }))
        .resolves.toMatchObject({ guardado: true })

      expect(await prepararPayloadPortadaIACheckpoint(raiz, identidad, 'media-ia.payload.json'))
        .toMatchObject({ preparado: true, mime: 'image/webp' })
      const carpeta = join(
        raiz, '.codex', 'editorial-runs', identidad.runId, identidad.categoryId,
        identidad.fingerprint
      )
      const payload = JSON.parse(await readFile(join(carpeta, 'media-ia.payload.json'), 'utf8'))
      expect(payload).toMatchObject({
        tipoMime: 'image/webp',
        titulo: metadatosIA.titulo,
        alt: metadatosIA.alt
      })
      expect(payload).not.toHaveProperty('credito')
      expect(payload).not.toHaveProperty('urlFuente')
    } finally {
      await rm(raiz, { recursive: true, force: true })
    }
  })

  it('permite entregar una propuesta sin portada ni etapa de media', async () => {
    const raiz = await mkdtemp(join(tmpdir(), 'pont3la10-checkpoint-sin-portada-'))
    try {
      await guardarCheckpoint(raiz, identidad, 'expediente', { claims: ['Dos fuentes respaldan el hecho.'] })
      await guardarCheckpoint(raiz, identidad, 'borrador', { title: 'Un borrador completo sin portada' })
      await guardarCheckpoint(raiz, identidad, 'propuesta', {
        idempotencyKey: 'sin-foto',
        coverMediaId: null,
        editorialFlags: []
      })
      await guardarCheckpoint(raiz, identidad, 'entrega', { articleId: 'pendiente-de-aprobacion' })

      expect(await leerCheckpoint(raiz, identidad)).toMatchObject({
        propuesta: { coverMediaId: null, editorialFlags: [] },
        entrega: { articleId: 'pendiente-de-aprobacion' }
      })
    } finally {
      await rm(raiz, { recursive: true, force: true })
    }
  })

  it('persiste etapas en orden, conserva revisiones y lee el último resultado', async () => {
    const raiz = await mkdtemp(join(tmpdir(), 'pont3la10-checkpoint-'))
    try {
      const expediente = { claims: ['El informe oficial confirma el dato.'] }
      expect(await guardarCheckpoint(raiz, identidad, 'expediente', expediente))
        .toMatchObject({ guardado: true, repetido: false, revision: 1 })
      expect(await guardarCheckpoint(raiz, identidad, 'expediente', expediente))
        .toMatchObject({ guardado: true, repetido: true, etapa: 'expediente' })

      await expect(guardarCheckpoint(raiz, identidad, 'media', { mediaId: 'x' }))
        .rejects.toThrow('Primero guarda una portada licenciada o generada con IA.')
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
