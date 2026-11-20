import { describe, expect, it } from 'vitest'
import * as modulo from '../../scripts/video-estudio-render.mjs'

type Render = { estado: string, fase: string, registro: string, iniciado: number, terminado: number }
const porcentajeDeRegistro = modulo.porcentajeDeRegistro as (r: string) => number | null
const nuevoRender = modulo.nuevoRender as (ahora?: number) => Render
const terminarRender = modulo.terminarRender as (r: Render, e: string, ahora?: number) => void
const estadoDeRender = modulo.estadoDeRender as (r: Render | undefined, ahora?: number) => null | { estado: string, fase: string, porcentaje: number | null, segundos: number, registro: string }

describe('estado del render en el estudio', () => {
  it('toma el último porcentaje del registro de HyperFrames y descarta valores absurdos', () => {
    expect(porcentajeDeRegistro('')).toBeNull()
    expect(porcentajeDeRegistro('Compilando…')).toBeNull()
    expect(porcentajeDeRegistro('██░░  12%  Capturing\n████░  45%  Capturing')).toBe(45)
    expect(porcentajeDeRegistro('██░░  90%  Assembling\n@hf-progress {"pct":99}\n████  100%  Render complete')).toBe(100)
    expect(porcentajeDeRegistro('cpu 350% bajó a 20%')).toBe(20)
  })

  it('empieza en «armando», cuenta el tiempo y lo congela al terminar', () => {
    const render = nuevoRender(1_000_000)
    expect(estadoDeRender(render, 1_000_000 + 65_000)).toMatchObject({ estado: 'renderizando', fase: 'armando', porcentaje: null, segundos: 65 })
    render.fase = 'renderizando'
    render.registro = '  40%  Capturing'
    expect(estadoDeRender(render, 1_000_000 + 90_000)).toMatchObject({ fase: 'renderizando', porcentaje: 40, segundos: 90 })
    terminarRender(render, 'listo', 1_000_000 + 200_000)
    expect(estadoDeRender(render, 1_000_000 + 999_000)).toMatchObject({ estado: 'listo', fase: 'listo', segundos: 200 })
    expect(estadoDeRender(undefined)).toBeNull()
  })
})
