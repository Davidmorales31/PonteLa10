/**
 * Sitios que sirve la misma aplicación. Colombia es el predeterminado: todo lo que
 * existe hoy pertenece a `co`. México (`mx`) vive en un subdominio y comparte código,
 * base de datos, panel y cuenta; solo cambia el contenido, la marca y las tareas.
 */
export const idsSitio = ['co', 'mx'] as const
export type IdSitio = typeof idsSitio[number]

export const sitioPredeterminado: IdSitio = 'co'

export interface ConfiguracionSitio {
  id: IdSitio
  nombre: string
  /** Otras formas con las que se escribe o se busca el nombre (para que Google las asocie). */
  nombresAlternos: readonly string[]
  pais: string
  origen: string
  /** Nombres de host (sin puerto) que atienden este sitio. */
  hosts: readonly string[]
  zonaHoraria: string
  /** Etiqueta BCP 47 para formatear fechas y números. */
  locale: string
  /** Valor de hreflang. */
  idioma: string
  /** Valor de og:locale. */
  ogLocale: string
  /** Descripción corta del pie de página. */
  lema: string
  /**
   * Mientras sea `false` el sitio se sirve con noindex, robots que bloquea todo y mapas
   * vacíos: así no se indexa contenido a medio construir. Se activa al lanzar.
   */
  indexable: boolean
}

export const configuracionSitios: Record<IdSitio, ConfiguracionSitio> = {
  co: {
    id: 'co',
    nombre: 'Ponte la 10',
    nombresAlternos: ['Pont3la10', 'Pontela10', 'Ponte la diez', 'Ponte la 10 Colombia'],
    pais: 'Colombia',
    origen: 'https://www.pont3la10.com',
    hosts: ['www.pont3la10.com', 'pont3la10.com'],
    zonaHoraria: 'America/Bogota',
    locale: 'es-CO',
    idioma: 'es-CO',
    ogLocale: 'es_CO',
    lema: 'Deportes, tecnología y tendencias con la jugada clara.',
    indexable: true
  },
  mx: {
    id: 'mx',
    nombre: 'Ponte la 10 México',
    nombresAlternos: ['Pont3la10 México', 'Pontela10 México', 'Ponte la 10 Liga MX'],
    pais: 'México',
    origen: 'https://mx.pont3la10.com',
    hosts: ['mx.pont3la10.com'],
    // México no usa horario de verano desde 2022: UTC−6 todo el año.
    zonaHoraria: 'America/Mexico_City',
    locale: 'es-MX',
    idioma: 'es-MX',
    ogLocale: 'es_MX',
    lema: 'Liga MX, Selección Mexicana, deportes y tendencias con la jugada clara.',
    indexable: false
  }
}

/** Cookie con el sitio que el panel editorial está administrando (la elige la persona). */
export const cookieSitioPanel = 'pont3la10_sitio_panel'

export function esIdSitio(valor: unknown): valor is IdSitio {
  return typeof valor === 'string' && (idsSitio as readonly string[]).includes(valor)
}

/** Acepta un valor externo (consulta, cabecera, variable) y devuelve un sitio válido. */
export function normalizarIdSitio(valor: unknown, respaldo: IdSitio = sitioPredeterminado): IdSitio {
  const texto = typeof valor === 'string' ? valor.trim().toLowerCase() : ''
  return esIdSitio(texto) ? texto : respaldo
}

function hostnameDe(host: unknown): string {
  if (typeof host !== 'string') return ''
  const limpio = host.trim().toLowerCase().split(',')[0]!.trim()
  if (!limpio || limpio.length > 255) return ''
  // Un host con puerto o con punto final ("mx.pont3la10.com.:443") se reduce al nombre.
  return limpio.replace(/:\d+$/, '').replace(/\.$/, '')
}

/**
 * Decide el sitio según el host de la petición. Lo desconocido cae en Colombia, de modo
 * que un host inesperado nunca muestra México por error. En desarrollo, `mx.localhost`
 * también abre México; el cambio explícito con `?sitio=mx` lo resuelve quien llama.
 */
export function sitioDesdeHost(host: unknown): IdSitio {
  const nombre = hostnameDe(host)
  if (!nombre) return sitioPredeterminado
  for (const id of idsSitio) {
    if (configuracionSitios[id].hosts.includes(nombre)) return id
  }
  if (nombre === 'mx.localhost') return 'mx'
  return sitioPredeterminado
}

export function configuracionDelSitio(id: unknown): ConfiguracionSitio {
  return configuracionSitios[normalizarIdSitio(id)]
}

/**
 * Origen público del sitio. Colombia conserva el origen configurado (así los entornos
 * locales y de vista previa siguen funcionando); México usa el de su subdominio.
 */
export function origenDelSitio(id: IdSitio, origenConfigurado: string): string {
  return id === 'mx' ? configuracionSitios.mx.origen : origenConfigurado.replace(/\/+$/, '')
}
