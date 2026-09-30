import { describe, expect, it } from 'vitest'
import {
  analizarCsvSearchConsole,
  MAX_BYTES_CSV_SEARCH_CONSOLE,
  MAX_FILAS_CSV_SEARCH_CONSOLE
} from '~/utils/searchConsoleCsv'

const sitio = 'https://www.pont3la10.com'
const encabezado = 'Date,Query,Page,Clicks,Impressions,CTR,Position'

describe('importación CSV de Search Console', () => {
  it('normaliza export en inglés, CTR decimal y página del dominio', () => {
    const resultado = analizarCsvSearchConsole(
      `${encabezado}\n2026-09-20,la seleccion,https://www.pont3la10.com/articulos/noticia?utm_source=x,12,100,0.12,3.5`,
      sitio
    )

    expect(resultado.incidencias).toEqual([])
    expect(resultado.filas).toEqual([{
      fecha: '2026-09-20',
      consulta: 'la seleccion',
      pagina: 'https://www.pont3la10.com/articulos/noticia',
      clics: 12,
      impresiones: 100,
      ctr: 0.12,
      posicion: 3.5,
      estimada: false
    }])
  })

  it('admite encabezados y números en español con separador punto y coma', () => {
    const resultado = analizarCsvSearchConsole(
      'Fecha;Consulta;Página;Clics;Impresiones;CTR;Posición\n2026-09-20;"Bogotá, fútbol";https://pont3la10.com/noticias;1.234;2.000;12,5%;4,25',
      sitio
    )

    expect(resultado.incidencias).toEqual([])
    expect(resultado.filas[0]).toMatchObject({
      consulta: 'bogotá, fútbol',
      clics: 1234,
      impresiones: 2000,
      ctr: 0.125,
      posicion: 4.25
    })
  })

  it('maneja BOM, comillas escapadas, saltos de línea y deduplica filas exactas', () => {
    const resultado = analizarCsvSearchConsole(
      `\uFEFF${encabezado}\r\n2026-09-20,"el equipo dijo ""vamos""\ny ganó",https://pont3la10.com/hoy,2,40,5%,4\r\n2026-09-20,"el equipo dijo ""vamos""\ny ganó",https://pont3la10.com/hoy,2,40,5%,4\r\n`,
      sitio
    )

    expect(resultado.incidencias).toEqual([])
    expect(resultado.filas).toHaveLength(1)
    expect(resultado.filas[0]?.consulta).toBe('el equipo dijo "vamos" y ganó')
    expect(resultado.duplicados).toBe(1)
  })

  it('rechaza filas duplicadas con valores contradictorios', () => {
    const resultado = analizarCsvSearchConsole(
      `${encabezado}\n2026-09-20,consulta,https://pont3la10.com/hoy,2,40,5%,4\n2026-09-20,consulta,https://pont3la10.com/hoy,3,40,7.5%,4`,
      sitio
    )

    expect(resultado.filas).toHaveLength(1)
    expect(resultado.incidencias).toContainEqual(expect.objectContaining({ campo: 'duplicado' }))
  })

  it.each([
    'correo persona@ejemplo.com',
    'llamar al +57 300 123 4567',
    'cedula 1020304050',
    'vivir en calle 45 12 30'
  ])('rechaza señales de datos personales en la consulta (%s)', (consulta) => {
    const resultado = analizarCsvSearchConsole(
      `${encabezado}\n2026-09-20,"${consulta}",https://pont3la10.com/hoy,1,10,10%,2`,
      sitio
    )

    expect(resultado.incidencias).toContainEqual(expect.objectContaining({ campo: 'consulta' }))
  })

  it('conserva fechas de eventos, pero elimina parámetros y fragmentos que podrían identificar al usuario', () => {
    const resultado = analizarCsvSearchConsole(
      `${encabezado}\n2026-09-20,"mundial 2026 partido 20/09/2026",https://pont3la10.com/hoy?user=123456789#privado,1,10,10%,2`,
      sitio
    )

    expect(resultado.incidencias).toEqual([])
    expect(resultado.filas[0]?.pagina).toBe('https://www.pont3la10.com/hoy')
  })

  it('rechaza URL externa, credenciales, consultas vacías y métricas inconsistentes', () => {
    const resultado = analizarCsvSearchConsole(
      `${encabezado}\n2026-09-20,,https://otro.example/hoy,4,3,110%,0`,
      sitio
    )

    expect(resultado.incidencias.length).toBeGreaterThan(0)
    expect(resultado.filas).toHaveLength(0)
  })

  it('rechaza una fecha ISO que no existe en el calendario', () => {
    const resultado = analizarCsvSearchConsole(
      `${encabezado}\n2026-02-30,consulta,https://pont3la10.com/hoy,1,10,10%,2`,
      sitio
    )

    expect(resultado.incidencias).toContainEqual(expect.objectContaining({ campo: 'fecha' }))
  })

  it('rechaza fechas futuras y rutas que parecen incluir un correo personal', () => {
    const fechaFutura = new Date()
    fechaFutura.setUTCDate(fechaFutura.getUTCDate() + 1)
    const fechaTexto = fechaFutura.toISOString().slice(0, 10)
    const resultado = analizarCsvSearchConsole(
      `${encabezado}\n${fechaTexto},consulta,https://www.pont3la10.com/hoy,1,10,10%,2\n2026-09-20,otra,https://www.pont3la10.com/usuarios/ana%40correo.example,1,10,10%,2`,
      sitio
    )

    expect(resultado.incidencias).toContainEqual(expect.objectContaining({ campo: 'fecha' }))
    expect(resultado.incidencias).toContainEqual(expect.objectContaining({ campo: 'página' }))
  })

  it('marca toda incidencia y no valida filas parcialmente para persistencia', () => {
    const resultado = analizarCsvSearchConsole(
      `${encabezado}\n2026-09-20,consulta,https://pont3la10.com/buena,1,10,10%,2\nfecha-mala,otra,https://pont3la10.com/mala,1,10,10%,2`,
      sitio
    )

    expect(resultado.filas).toHaveLength(1)
    expect(resultado.incidencias).toContainEqual(expect.objectContaining({ campo: 'fecha' }))
    expect(resultado.incidencias.length).toBeGreaterThan(0)
  })

  it('expone topes de tamaño y filas para el endpoint', () => {
    expect(MAX_BYTES_CSV_SEARCH_CONSOLE).toBe(5 * 1024 * 1024)
    expect(MAX_FILAS_CSV_SEARCH_CONSOLE).toBe(10_000)
  })
})
