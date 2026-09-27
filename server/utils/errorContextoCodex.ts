type ErrorRpcContexto = {
  code?: unknown
  message?: unknown
  details?: unknown
  hint?: unknown
} | null | undefined

export function clasificarErrorContextoCodex(error: ErrorRpcContexto) {
  if (error?.code === '22023') {
    return {
      statusCode: 409,
      statusMessage: 'La corrida editorial pertenece a otra fecha.',
      codigo: 'CORRIDA_CODEX_FECHA_DISTINTA'
    } as const
  }

  return {
    statusCode: 502,
    statusMessage: 'No se pudo cargar el contexto editorial actual.',
    codigo: 'CONTEXTO_CODEX_NO_DISPONIBLE'
  } as const
}
