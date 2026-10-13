// El destino editorial es independiente del servidor local del worker de fútbol.
export function obtenerBaseUrlEditorial(entorno) {
  return entorno.PONT3LA10_CODEX_EDITORIAL_API_BASE_URL?.trim()
    || entorno.PONT3LA10_CODEX_API_BASE_URL?.trim()
    || ''
}

// Solo códigos conocidos: los mensajes originales pueden contener datos privados.
export function diagnosticarTransporteEditorial(error) {
  const codigo = error?.cause?.code || error?.code
  if (codigo === 'ECONNREFUSED') return 'Conexión rechazada: comprueba el destino editorial y que el servidor esté disponible.'
  if (codigo === 'ENOTFOUND' || codigo === 'EAI_AGAIN') return 'No se pudo resolver el dominio editorial.'
  if (['ETIMEDOUT', 'UND_ERR_CONNECT_TIMEOUT'].includes(codigo)
    || ['TimeoutError', 'AbortError'].includes(error?.name)) return 'Se agotó el tiempo de espera de la API editorial.'
  if (['CERT_HAS_EXPIRED', 'DEPTH_ZERO_SELF_SIGNED_CERT', 'UNABLE_TO_VERIFY_LEAF_SIGNATURE'].includes(codigo)) {
    return 'No se pudo verificar el certificado HTTPS de la API editorial.'
  }
  return 'La API privada no respondió.'
}
