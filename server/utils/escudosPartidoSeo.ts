import sharp from 'sharp'

const archivosEscudos = new Set([
  'aguilas-doradas', 'alianza-valledupar', 'america-de-cali', 'atletico-bucaramanga',
  'atletico-fc', 'atletico-nacional', 'barranquilla-fc', 'boca-juniors-de-cali',
  'bogota-fc', 'boyaca-chico', 'cucuta-deportivo', 'deportes-quindio', 'deportes-tolima',
  'deportivo-cali', 'deportivo-pasto', 'deportivo-pereira', 'envigado', 'fortaleza-ceif',
  'independiente-medellin', 'independiente-santa-fe', 'independiente-valle-del-cauca',
  'internacional-de-bogota', 'internacional-fc-de-palmira', 'jaguares-de-cordoba',
  'junior', 'leones', 'llaneros', 'millonarios', 'once-caldas', 'orsomarso', 'patriotas',
  'real-cartagena', 'real-cundinamarca', 'real-santander', 'tigres', 'union-magdalena'
])

const aliasEquipo: Record<string, string> = {
  bogota: 'bogota-fc',
  'envigado-fc': 'envigado',
  fortaleza: 'fortaleza-ceif',
  'fortaleza-fc': 'fortaleza-ceif',
  'deportivo-pereira-fc': 'deportivo-pereira',
  jaguares: 'jaguares-de-cordoba',
  'jaguares-fc': 'jaguares-de-cordoba',
  'jaguares-de-cordoba-fc': 'jaguares-de-cordoba',
  'ind-medellin': 'independiente-medellin',
  'santa-fe': 'independiente-santa-fe',
  patriotas: 'patriotas',
  'patriotas-boyaca': 'patriotas',
  barranquilla: 'barranquilla-fc',
  'internacional-palmira': 'internacional-fc-de-palmira',
  'ind-yumbo': 'independiente-valle-del-cauca',
  'independiente-yumbo': 'independiente-valle-del-cauca',
  'tigres-fc': 'tigres',
  'leones-fc': 'leones',
  alianza: 'alianza-valledupar',
  'alianza-fc': 'alianza-valledupar',
  'junior-fc': 'junior',
  'junior-f-c': 'junior',
  'america-de-cali-fc': 'america-de-cali'
}

interface AlmacenEscudos {
  getItem(clave: string): Promise<string | Uint8Array | Buffer | null>
}
const escudosConvertidos = new Map<string, Promise<string | null>>()

/** Lee únicamente archivos incluidos como server assets; no solicita URLs del fixture. */
export async function obtenerEscudoPartidoSeo(
  nombreEquipo: string,
  almacen: AlmacenEscudos
): Promise<string | null> {
  const nombreArchivo = resolverNombreArchivoEscudo(nombreEquipo)
  if (!nombreArchivo) return null

  let conversion = escudosConvertidos.get(nombreArchivo)
  if (!conversion) {
    conversion = (async () => {
      const contenido = await almacen.getItem(`escudos-liga-colombiana/${nombreArchivo}.webp`)
      if (!contenido) return null

      const png = await sharp(Buffer.from(contenido)).png().toBuffer()
      return `data:image/png;base64,${png.toString('base64')}`
    })()
    escudosConvertidos.set(nombreArchivo, conversion)
  }

  return conversion
}

/** Usa solo escudos locales incluidos explícitamente en la lista pública del torneo. */
export function obtenerRutaPublicaEscudoPartidoSeo(nombreEquipo: string): string | null {
  const nombreArchivo = resolverNombreArchivoEscudo(nombreEquipo)
  return nombreArchivo ? `/images/escudos/liga-colombiana/${nombreArchivo}.png` : null
}

function resolverNombreArchivoEscudo(nombreEquipo: string): string | null {
  const nombreNormalizado = slugEquipo(nombreEquipo)
  const nombreArchivo = aliasEquipo[nombreNormalizado] || nombreNormalizado
  return archivosEscudos.has(nombreArchivo) ? nombreArchivo : null
}

function slugEquipo(nombre: string): string {
  return nombre.normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('es-CO')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}
