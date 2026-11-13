function leerClaveCifradoSocial([string]$contenido) {
  $lineasClave = @($contenido -split '\r?\n' | Where-Object { $_ -match '^\s*(?:export\s+)?NUXT_SOCIAL_ENCRYPTION_KEY\b' })
  if ($lineasClave.Count -gt 1) { throw 'Hay claves de cifrado duplicadas. No se modifico el entorno.' }
  if ($lineasClave.Count -eq 0) { return $null }
  $asignacion = [regex]::Match($lineasClave[0], '^\s*(?:export\s+)?NUXT_SOCIAL_ENCRYPTION_KEY\s*=\s*(?<valor>.*)$')
  if (-not $asignacion.Success) { throw 'Asignacion de clave de cifrado no reconocida.' }
  $valorClave = $asignacion.Groups['valor'].Value.Trim()
  if ($valorClave.StartsWith('"') -or $valorClave.StartsWith("'")) {
    $entreComillas = [regex]::Match($valorClave, '^(?:"(?<dobles>[^"]*)"|''(?<simples>[^'']*)'')\s*(?:#.*)?$')
    if (-not $entreComillas.Success) { throw 'Clave de cifrado entre comillas no reconocida.' }
    if ($entreComillas.Groups['dobles'].Success) { $valorClave = $entreComillas.Groups['dobles'].Value }
    else { $valorClave = $entreComillas.Groups['simples'].Value }
  } else { $valorClave = ($valorClave -split '#',2)[0].Trim() }
  if ($valorClave -eq '') { return $null }
  if ($valorClave -notmatch '^[a-fA-F0-9]{64}$') { throw 'La clave de cifrado existente no es valida; no se reemplazo.' }
  return $valorClave
}
function actualizarVariableEntornoSocial([string]$contenido,[string]$nombre,[string]$valor) {
  if ($valor -match '[\r\n]' -or $nombre -notmatch '^NUXT_[A-Z_]+$') { throw 'Variable no valida.' }
  $patron = '(?m)^[ \t]*(?:export[ \t]+)?' + [regex]::Escape($nombre) + '[ \t]*=[^\r\n]*'
  $coincidencias = [regex]::Matches($contenido, $patron)
  if ($coincidencias.Count -gt 1) { throw ('Variable duplicada: ' + $nombre) }
  $lineaNueva = $nombre + '=' + $valor
  if ($coincidencias.Count -eq 1) {
    return [regex]::Replace($contenido, $patron, [System.Text.RegularExpressions.MatchEvaluator]{ param($coincidencia) $lineaNueva })
  }
  return $contenido.TrimEnd() + [Environment]::NewLine + $lineaNueva + [Environment]::NewLine
}
function faltaClaveServidorSocial([string]$contenido) {
  $asignaciones = [regex]::Matches($contenido, '(?m)^[ \t]*(?:export[ \t]+)?NUXT_SUPABASE_SERVICE_ROLE_KEY[ \t]*=[ \t]*(?<valor>[^\r\n]*)\r?$')
  if ($asignaciones.Count -gt 1) { throw 'Hay claves privadas de Supabase duplicadas. No se modifico el entorno.' }
  if ($asignaciones.Count -eq 0) { return $true }
  return $asignaciones[0].Groups['valor'].Value -match '^[ \t]*(?:""|'''')?[ \t]*(?:#.*)?$'
}
Export-ModuleMember -Function leerClaveCifradoSocial, actualizarVariableEntornoSocial, faltaClaveServidorSocial
