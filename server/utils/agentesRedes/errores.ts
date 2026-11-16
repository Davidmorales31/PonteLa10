/** Error de la API para agentes: estado HTTP, código estable para máquinas y mensaje en español para personas. */
export class ErrorAgente extends Error {
  constructor(public estado: number, public codigo: string, mensaje: string, public detalles?: unknown) {
    super(mensaje)
    this.name = 'ErrorAgente'
  }
}

export const errores = {
  noAutenticado: () => new ErrorAgente(401, 'no_autenticado', 'Falta la llave o no es válida. Envía Authorization: Bearer <llave>.'),
  alcance: (alcance: string) => new ErrorAgente(403, 'alcance_insuficiente', `La llave no tiene el alcance «${alcance}». Pide a la persona responsable que lo habilite.`),
  propietario: () => new ErrorAgente(403, 'propietario_sin_permiso', 'La persona dueña de la llave ya no tiene permisos para operar este módulo.'),
  noEsTuya: () => new ErrorAgente(403, 'no_es_tuya', 'Solo puedes modificar las publicaciones creadas con esta misma llave.'),
  noEncontrado: (que = 'El recurso') => new ErrorAgente(404, 'no_encontrado', `${que} no existe.`),
  conflicto: (mensaje: string, codigo = 'conflicto_revision') => new ErrorAgente(409, codigo, mensaje),
  validacion: (mensaje: string, detalles?: unknown) => new ErrorAgente(422, 'validacion', mensaje, detalles),
  limite: (mensaje: string) => new ErrorAgente(429, 'limite_excedido', mensaje),
  interno: (mensaje = 'No se pudo completar la operación. Inténtalo de nuevo.') => new ErrorAgente(503, 'no_disponible', mensaje)
}

/** Convierte cualquier error en la forma estable { estado, cuerpo }. Nunca expone trazas ni secretos. */
export function normalizarError(problema: unknown): { estado: number, cuerpo: { error: { codigo: string, mensaje: string, detalles?: unknown } } } {
  if (problema instanceof ErrorAgente) {
    return { estado: problema.estado, cuerpo: { error: { codigo: problema.codigo, mensaje: problema.message, ...(problema.detalles ? { detalles: problema.detalles } : {}) } } }
  }
  if (problema && typeof problema === 'object' && 'statusCode' in problema) {
    const h3 = problema as { statusCode: number, statusMessage?: string }
    const codigos: Record<number, string> = { 400: 'solicitud_invalida', 404: 'no_encontrado', 409: 'conflicto', 413: 'demasiado_grande', 422: 'validacion', 429: 'limite_excedido' }
    return { estado: h3.statusCode, cuerpo: { error: { codigo: codigos[h3.statusCode] || (h3.statusCode >= 500 ? 'no_disponible' : 'error'), mensaje: h3.statusMessage || 'No se pudo completar la operación.' } } }
  }
  return { estado: 500, cuerpo: { error: { codigo: 'error_interno', mensaje: 'Error interno. Inténtalo de nuevo; si persiste, avisa a la persona responsable.' } } }
}
