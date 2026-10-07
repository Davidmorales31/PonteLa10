import { existsSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'
import { describe, expect, it } from 'vitest'
import { obtenerSrcsetEscudoPublico } from '~/utils/imagenesPublicas'

describe('srcset de escudos públicos', () => {
  it('genera variantes WebP solo para escudos locales permitidos', () => {
    expect(obtenerSrcsetEscudoPublico('/images/escudos/liga-colombiana/atletico-nacional.png'))
      .toBe([
        '/images/escudos/liga-colombiana/atletico-nacional-48.webp 48w',
        '/images/escudos/liga-colombiana/atletico-nacional-96.webp 96w',
        '/images/escudos/liga-colombiana/atletico-nacional-192.webp 192w',
        '/images/escudos/liga-colombiana/atletico-nacional-384.webp 384w'
      ].join(', '))
  })

  it.each([
    'https://media.example.com/team.png',
    '/images/escudos/liga-colombiana/../../secreto.png',
    '/images/escudos/liga-colombiana/atletico-nacional.webp',
    null,
    undefined
  ])('no inventa variantes para una ruta no administrada: %s', ruta => {
    expect(obtenerSrcsetEscudoPublico(ruta)).toBeUndefined()
  })

  it('incluye variantes WebP de todos los escudos locales y de los recursos de mayor peso', async () => {
    const directorioEscudos = fileURLToPath(new URL('../../public/images/escudos/liga-colombiana/', import.meta.url))
    const nombres = readdirSync(directorioEscudos).filter(nombre => nombre.endsWith('.png'))

    expect(nombres.length).toBeGreaterThan(0)
    for (const nombre of nombres) {
      const base = nombre.slice(0, -'.png'.length)
      for (const ancho of [48, 96, 192, 384]) {
        const ruta = join(directorioEscudos, `${base}-${ancho}.webp`)
        expect(existsSync(ruta), `${base} debe tener variante ${ancho}px`).toBe(true)
        const metadatos = await sharp(ruta).metadata()
        expect(metadatos.format).toBe('webp')
        expect(metadatos.width).toBe(ancho)
      }
    }

    for (const rutaRelativa of [
      '../../public/publicidad/pont3la10-labs-640.webp',
      '../../public/publicidad/pont3la10-labs-1024.webp',
      '../../public/publicidad/pont3la10-labs-1672.webp',
      '../../public/editorial/pagina_404_jugador_estadio-640.webp',
      '../../public/editorial/pagina_404_jugador_estadio-1024.webp',
      '../../public/editorial/pagina_404_jugador_estadio-1536.webp',
      '../../public/editorial/estado_sin_datos_resultados-320.webp',
      '../../public/editorial/estado_sin_datos_resultados-640.webp',
      '../../public/editorial/login_pont3la10_tunel_estadio-480.webp',
      '../../public/editorial/login_pont3la10_tunel_estadio-768.webp',
      '../../public/editorial/login_pont3la10_tunel_estadio-1024.webp',
      '../../public/brand/pont3la10_logo_login_blanco-180.webp',
      '../../public/brand/pont3la10_logo_login_blanco-360.webp',
      '../../public/brand/pont3la10_logo_login_blanco-598.webp',
      '../../public/brand/pont3la10_logo_modo_blanco-180.webp',
      '../../public/brand/pont3la10_logo_modo_blanco-360.webp',
      '../../public/brand/pont3la10_logo_modo_blanco-598.webp',
      '../../public/brand/pont3la10_logo_real_blanco_transparente-180.webp',
      '../../public/brand/pont3la10_logo_real_blanco_transparente-360.webp',
      '../../public/brand/pont3la10_logo_real_blanco_transparente-598.webp'
    ]) {
      const ruta = fileURLToPath(new URL(rutaRelativa, import.meta.url))
      expect(existsSync(ruta), rutaRelativa).toBe(true)
      expect((await sharp(ruta).metadata()).format).toBe('webp')
    }
  })
})
