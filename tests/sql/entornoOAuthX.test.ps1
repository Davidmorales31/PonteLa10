$ErrorActionPreference = 'Stop'
Import-Module (Join-Path $PSScriptRoot '../../scripts/entorno-oauth-x.psm1') -Force
$clavePruebaX = 'AB' * 32
$casosValidosX = @(
  ('NUXT_SOCIAL_ENCRYPTION_KEY=' + $clavePruebaX),
  ('  NUXT_SOCIAL_ENCRYPTION_KEY="' + $clavePruebaX + '" # comentario'),
  ("export NUXT_SOCIAL_ENCRYPTION_KEY='" + $clavePruebaX + "'")
)
foreach ($casoX in $casosValidosX) { if ((leerClaveCifradoSocial $casoX) -cne $clavePruebaX) { throw 'La clave existente se altero.' } }
foreach ($casoX in @('', 'NUXT_SOCIAL_ENCRYPTION_KEY=', 'NUXT_SOCIAL_ENCRYPTION_KEY=""')) {
  if (leerClaveCifradoSocial $casoX) { throw 'Una clave vacia se interpreto como existente.' }
}
$casosInvalidosX = @('NUXT_SOCIAL_ENCRYPTION_KEY="invalida"', ' export NUXT_SOCIAL_ENCRYPTION_KEY=invalida',
  ('NUXT_SOCIAL_ENCRYPTION_KEY=' + $clavePruebaX + "`nNUXT_SOCIAL_ENCRYPTION_KEY="), 'NUXT_SOCIAL_ENCRYPTION_KEY sin igual')
foreach ($casoX in $casosInvalidosX) {
  $rechazadoX = $false
  try { $null = leerClaveCifradoSocial $casoX } catch { $rechazadoX = $true }
  if (-not $rechazadoX) { throw 'No se rechazo un entorno con riesgo de perder la clave.' }
}
$resultadoX = actualizarVariableEntornoSocial "OTRA=preservada`n  export NUXT_X_CLIENT_SECRET = anterior`n" 'NUXT_X_CLIENT_SECRET' 'prueba-nueva'
if ($resultadoX -notmatch 'OTRA=preservada' -or $resultadoX -notmatch 'NUXT_X_CLIENT_SECRET=prueba-nueva' -or $resultadoX -match 'anterior') { throw 'Actualizacion de variable incorrecta.' }
if (-not (faltaClaveServidorSocial "NUXT_SUPABASE_SERVICE_ROLE_KEY=`nOTRA=conservar`n")) { throw 'Se consumio la variable siguiente.' }
if (faltaClaveServidorSocial "NUXT_SUPABASE_SERVICE_ROLE_KEY=sb_secret_ficticio`r`nOTRA=conservar`r`n") { throw 'No se reconocio CRLF.' }
if (-not (faltaClaveServidorSocial 'export NUXT_SUPABASE_SERVICE_ROLE_KEY="" # vacia')) { throw 'No se reconocio valor vacio quoted.' }
if (faltaClaveServidorSocial '  export NUXT_SUPABASE_SERVICE_ROLE_KEY="sb_secret_ficticio"') { throw 'No se conservo valor existente.' }
Write-Output '15 comprobaciones del configurador pasan; sin leer ni modificar el entorno real.'
