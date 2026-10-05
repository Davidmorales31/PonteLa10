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
  fortaleza: 'fortaleza-ceif',
  'fortaleza-fc': 'fortaleza-ceif',
  'junior-fc': 'junior',
  'junior-f-c': 'junior',
  'america-de-cali-fc': 'america-de-cali'
}

interface AlmacenEscudos {
  getItemRaw(clave: string): Promise<string | Uint8Array | Buffer | null>
}

/** Lee únicamente archivos incluidos como server assets; no solicita URLs del fixture. */
export async function obtenerEscudoPartidoSeo(
  nombreEquipo: string,
  almacen: AlmacenEscudos
): Promise<string | null> {
  const nombreNormalizado = slugEquipo(nombreEquipo)
  const nombreArchivo = aliasEquipo[nombreNormalizado] || nombreNormalizado
  if (!archivosEscudos.has(nombreArchivo)) return null

  const contenido = await almacen.getItemRaw(`escudos-liga-colombiana/${nombreArchivo}.webp`)
  if (!contenido) return null

  return `data:image/webp;base64,${Buffer.from(contenido).toString('base64')}`
}

function slugEquipo(nombre: string): string {
  return nombre.normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('es-CO')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}
