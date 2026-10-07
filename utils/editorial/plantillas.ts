import type {
  BloqueEditorEditorial,
  FuenteArticuloEditorial,
  IdPlantillaEditorial,
  IntencionBusquedaEditorial
} from '~/types/contenidoEditorial'

export interface PlantillaEditorial {
  id: IdPlantillaEditorial
  nombre: string
  descripcion: string
  intencion: IntencionBusquedaEditorial
  frescuraDias: number
  fuentePrincipal: string
  camposMinimos: string[]
  secciones: string[]
}

export const plantillasEditoriales: PlantillaEditorial[] = [
  {
    id: 'previaPartido',
    nombre: 'Previa de partido',
    descripcion: 'Responde quién juega, cuándo y qué contexto confirmado importa.',
    intencion: 'actualidad',
    frescuraDias: 3,
    fuentePrincipal: 'Fixture oficial de la competición o de los clubes.',
    camposMinimos: ['Equipos y competición', 'Fecha, hora y zona horaria', 'Sede confirmada y contexto reciente'],
    secciones: ['Ficha del partido', 'Claves del encuentro', 'Qué está en juego']
  },
  {
    id: 'dondeVer',
    nombre: 'Dónde ver',
    descripcion: 'Aclara la señal confirmada y las condiciones para seguir el partido.',
    intencion: 'transmision',
    frescuraDias: 1,
    fuentePrincipal: 'Emisor/plataforma oficial y fixture oficial del partido.',
    camposMinimos: ['Partido, fecha, hora y zona horaria', 'Canal o plataforma confirmados', 'Disponibilidad territorial, si está publicada'],
    secciones: ['Horario y zona', 'Dónde verlo', 'Cómo confirmar la transmisión']
  },
  {
    id: 'resultadoPartido',
    nombre: 'Resultado',
    descripcion: 'Presenta el marcador y los hechos decisivos sin añadir eventos no verificados.',
    intencion: 'resultado',
    frescuraDias: 2,
    fuentePrincipal: 'Acta o ficha oficial del encuentro.',
    camposMinimos: ['Marcador final y estado', 'Autores/minutos solo si están confirmados', 'Competición y fecha'],
    secciones: ['Marcador final', 'Momentos clave', 'Qué cambia con el resultado']
  },
  {
    id: 'explicacionTabla',
    nombre: 'Explicación de tabla',
    descripcion: 'Explica posiciones, reglas y escenarios con corte temporal explícito.',
    intencion: 'explicacion',
    frescuraDias: 7,
    fuentePrincipal: 'Tabla oficial y reglamento vigente de la competición.',
    camposMinimos: ['Fecha y hora de corte de la tabla', 'Puntos y diferencia relevantes', 'Regla de desempate o clasificación citada'],
    secciones: ['Tabla actual y puntos', 'Criterios de clasificación', 'Qué escenarios siguen abiertos']
  },
  {
    id: 'proximaFecha',
    nombre: 'Próxima fecha',
    descripcion: 'Ordena el calendario confirmado y distingue lo oficial de lo pendiente.',
    intencion: 'calendario',
    frescuraDias: 3,
    fuentePrincipal: 'Calendario oficial del torneo o de la federación.',
    camposMinimos: ['Partidos confirmados', 'Fecha, hora y zona horaria', 'Sede solo cuando esté publicada'],
    secciones: ['Calendario confirmado', 'Partidos destacados', 'Cómo seguir la fecha']
  },
  {
    id: 'convocatoria',
    nombre: 'Convocatoria',
    descripcion: 'Resume una lista anunciada oficialmente y separa confirmaciones de rumores.',
    intencion: 'actualidad',
    frescuraDias: 7,
    fuentePrincipal: 'Comunicado oficial de la federación o del club.',
    camposMinimos: ['Lista oficial y fecha del anuncio', 'Novedades verificadas', 'Partidos o fechas relacionados'],
    secciones: ['Lista confirmada', 'Novedades de la convocatoria', 'Fechas y próximos compromisos']
  },
  {
    id: 'perfilFutbolista',
    nombre: 'Perfil',
    descripcion: 'Ofrece contexto verificable de trayectoria y situación actual de una persona.',
    intencion: 'perfil',
    frescuraDias: 90,
    fuentePrincipal: 'Ficha oficial del club, liga o federación.',
    camposMinimos: ['Identidad y club actual con fecha', 'Trayectoria con temporadas verificables', 'Estadísticas con fuente y corte'],
    secciones: ['Trayectoria verificada', 'Situación actual', 'Datos y contexto']
  },
  {
    id: 'analisisPospartido',
    nombre: 'Análisis pospartido',
    descripcion: 'Distingue hechos, estadísticas e interpretación táctica propia.',
    intencion: 'analisis',
    frescuraDias: 7,
    fuentePrincipal: 'Ficha o estadísticas oficiales; contrasta y atribuye cada dato.',
    camposMinimos: ['Marcador, alineaciones y contexto confirmados', 'Datos con proveedor y corte', 'Separación explícita entre dato e interpretación'],
    secciones: ['Contexto del partido', 'Claves tácticas', 'Lecturas y límites del análisis']
  },
  {
    id: 'noticiaRapida',
    nombre: 'Noticia rápida',
    descripcion: 'Resuelve qué ocurrió, quién lo confirmó y qué falta por conocerse.',
    intencion: 'actualidad',
    frescuraDias: 3,
    fuentePrincipal: 'Comunicado o registro primario de la noticia.',
    camposMinimos: ['Hecho nuevo y fecha', 'Protagonistas identificados', 'Datos aún no confirmados señalados como tales'],
    secciones: ['Hecho confirmado', 'Contexto esencial', 'Qué falta por confirmar']
  },
  {
    id: 'piezaEvergreen',
    nombre: 'Pieza evergreen',
    descripcion: 'Responde una duda estable y deja claro el alcance y la vigencia.',
    intencion: 'explicacion',
    frescuraDias: 3650,
    fuentePrincipal: 'Reglamento, organismo rector o documento primario vigente.',
    camposMinimos: ['Respuesta directa', 'Alcance y excepciones', 'Fecha de revisión y fuente vigente'],
    secciones: ['Respuesta directa', 'Contexto y reglas', 'Fuentes y vigencia']
  }
]

export function esIdPlantillaEditorial(valor: unknown): valor is IdPlantillaEditorial {
  return typeof valor === 'string'
    && plantillasEditoriales.some(plantilla => plantilla.id === valor)
}

export function obtenerPlantillaEditorial(
  id: IdPlantillaEditorial | null
): PlantillaEditorial | null {
  return id ? plantillasEditoriales.find(plantilla => plantilla.id === id) || null : null
}

export function normalizarTextoPlantilla(texto: string): string {
  return texto
    .replace(/^ +| +$/g, '')
    .toLocaleLowerCase('es')
}

export interface ResultadoCalidadPlantilla {
  completa: boolean
  seccionesCompletas: number
  totalSecciones: number
  camposCompletos: number
  totalCampos: number
  faltantes: string[]
}

export function evaluarCalidadPlantilla(entrada: {
  plantillaId: IdPlantillaEditorial | null
  camposCompletos: string[]
  bloques: BloqueEditorEditorial[]
  fuente: FuenteArticuloEditorial | null
}): ResultadoCalidadPlantilla {
  const plantilla = obtenerPlantillaEditorial(entrada.plantillaId)
  if (!plantilla) {
    return {
      completa: true,
      seccionesCompletas: 0,
      totalSecciones: 0,
      camposCompletos: 0,
      totalCampos: 0,
      faltantes: []
    }
  }

  const faltantes: string[] = []
  const fuenteValida = Boolean(
    entrada.fuente?.nombre.trim()
    && (() => {
      try {
        return new URL(entrada.fuente.url).protocol === 'https:'
      } catch {
        return false
      }
    })()
  )

  if (!fuenteValida) {
    faltantes.push('Agrega una fuente principal con nombre y enlace HTTPS.')
  }

  const camposConfirmados = new Set(entrada.camposCompletos)
  for (const campo of plantilla.camposMinimos) {
    if (!camposConfirmados.has(campo)) {
      faltantes.push(`Confirma que cubriste «${campo}».`)
    }
  }

  let seccionesCompletas = 0
  for (const seccion of plantilla.secciones) {
    const tituloNormalizado = normalizarTextoPlantilla(seccion)
    const indice = entrada.bloques.findIndex(bloque =>
      bloque.tipo === 'encabezado2'
      && normalizarTextoPlantilla(bloque.texto) === tituloNormalizado
    )

    if (indice < 0) {
      faltantes.push(`Agrega la sección «${seccion}».`)
      continue
    }

    const siguienteEncabezado = entrada.bloques.findIndex((bloque, indiceBloque) =>
      indiceBloque > indice && bloque.tipo === 'encabezado2'
    )
    const finSeccion = siguienteEncabezado < 0
      ? entrada.bloques.length
      : siguienteEncabezado
    const tieneDesarrollo = entrada.bloques
      .slice(indice + 1, finSeccion)
      .some(bloque => bloque.tipo === 'parrafo' && bloque.texto.trim().length >= 30)

    if (!tieneDesarrollo) {
      faltantes.push(`Desarrolla «${seccion}» con al menos 30 caracteres.`)
      continue
    }

    seccionesCompletas += 1
  }

  return {
    completa: faltantes.length === 0,
    seccionesCompletas,
    totalSecciones: plantilla.secciones.length,
    camposCompletos: plantilla.camposMinimos.filter(campo => camposConfirmados.has(campo)).length,
    totalCampos: plantilla.camposMinimos.length,
    faltantes
  }
}
