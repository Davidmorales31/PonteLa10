type RegistroDesconocido = Record<string, unknown>

function registro(valor: unknown): RegistroDesconocido {
  return valor && typeof valor === 'object' && !Array.isArray(valor)
    ? valor as RegistroDesconocido
    : {}
}

function cantidad(valor: unknown): number {
  return typeof valor === 'number' && Number.isFinite(valor) && valor >= 0
    ? Math.floor(valor)
    : 0
}

function fecha(valor: unknown): string | null {
  if (typeof valor !== 'string' || !Number.isFinite(Date.parse(valor))) return null
  return new Date(valor).toISOString()
}

function estado(valor: unknown, permitidos: readonly string[]): string {
  return typeof valor === 'string' && permitidos.includes(valor) ? valor : 'desconocido'
}

export function normalizarSaludOperativaEditorial(valor: unknown) {
  const raiz = registro(valor)
  const trabajador = registro(raiz.worker)
  const ingestas = registro(raiz.ingestas)
  const codex = registro(raiz.codex)
  const corrida = registro(codex.ultimaCorrida)
  const publicacion = registro(raiz.publicacion)
  const cron = registro(raiz.cron)

  return {
    consultadoEn: fecha(raiz.consultadoEn),
    worker: {
      estado: estado(trabajador.estado, ['activo', 'desconectado', 'detenido', 'deteniendose']),
      ultimaSenalEn: fecha(trabajador.ultimaSenalEn),
      antiguedadSegundos: trabajador.antiguedadSegundos == null
        ? null
        : cantidad(trabajador.antiguedadSegundos)
    },
    ingestas: {
      enCola: cantidad(ingestas.enCola),
      edadColaMasAntiguaSegundos: ingestas.edadColaMasAntiguaSegundos == null
        ? null
        : cantidad(ingestas.edadColaMasAntiguaSegundos),
      procesando: cantidad(ingestas.procesando),
      procesamientoConLeaseVencido: cantidad(ingestas.procesamientoConLeaseVencido),
      evidenciaLista: cantidad(ingestas.evidenciaLista),
      edadEvidenciaMasAntiguaSegundos: ingestas.edadEvidenciaMasAntiguaSegundos == null
        ? null
        : cantidad(ingestas.edadEvidenciaMasAntiguaSegundos),
      ultimoFalloEn: fecha(ingestas.ultimoFalloEn),
      fallidas: cantidad(ingestas.fallidas)
    },
    codex: {
      ultimaCorrida: raiz.codex && codex.ultimaCorrida
        ? {
            estado: estado(corrida.estado, ['in_progress', 'completed', 'partial', 'failed']),
            iniciadaEn: fecha(corrida.iniciadaEn),
            actualizadaEn: fecha(corrida.actualizadaEn),
            terminadaEn: fecha(corrida.terminadaEn)
          }
        : null,
      corridasFallidas: cantidad(codex.corridasFallidas),
      corridasParciales: cantidad(codex.corridasParciales),
      propuestasEnRevision: cantidad(codex.propuestasEnRevision)
    },
    publicacion: {
      programadasVencidas: cantidad(publicacion.programadasVencidas),
      atrasoMasAntiguoSegundos: publicacion.atrasoMasAntiguoSegundos == null
        ? null
        : cantidad(publicacion.atrasoMasAntiguoSegundos)
    },
    cron: {
      estado: estado(cron.estado, [
        'desconocido', 'sin_ejecuciones', 'succeeded', 'failed', 'running',
        'extension_no_disponible', 'job_no_configurado'
      ]),
      disponible: cron.disponible === true,
      configurado: typeof cron.configurado === 'boolean' ? cron.configurado : null,
      iniciadaEn: fecha(cron.iniciadaEn),
      terminadaEn: fecha(cron.terminadaEn)
    }
  }
}
