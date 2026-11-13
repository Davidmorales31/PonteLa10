param([string]$rutaEntorno = 'C:\PONTE LA 10\.env')
$ErrorActionPreference = 'Stop'
Import-Module (Join-Path $PSScriptRoot 'entorno-oauth-x.psm1') -Force
# Ejecutar por el responsable en una terminal local. Nunca imprime credenciales.
$rutaPermitida = [System.IO.Path]::GetFullPath('C:\PONTE LA 10\.env')
if ([System.IO.Path]::GetFullPath($rutaEntorno) -ne $rutaPermitida) { throw 'Solo se permite configurar el entorno local principal.' }
if (-not (Test-Path -LiteralPath $rutaPermitida)) { throw 'No existe el entorno local principal.' }
$idClienteX = Read-Host 'Client ID de OAuth 2.0 de X'
if ($idClienteX -notmatch '^[A-Za-z0-9_=/+-]{8,512}$') { throw 'Client ID no valido.' }
$secretoSeguroX = Read-Host 'Client Secret de OAuth 2.0 de X (oculto)' -AsSecureString
$punteroSecretoX = [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($secretoSeguroX)
try {
  $secretoClienteX = [System.Runtime.InteropServices.Marshal]::PtrToStringBSTR($punteroSecretoX)
  if ($secretoClienteX -notmatch '^[A-Za-z0-9_=/+.-]{8,1024}$') { throw 'Client Secret no valido.' }
  $contenidoEntornoX = [System.IO.File]::ReadAllText($rutaPermitida)
  $cambiosX = @{
    NUXT_X_CLIENT_ID = $idClienteX
    NUXT_X_CLIENT_SECRET = $secretoClienteX
    NUXT_X_REDIRECT_URI = 'http://localhost:3001/api/admin/redes/oauth/x/callback'
  }
  $faltaServicioX = faltaClaveServidorSocial $contenidoEntornoX
  if ($faltaServicioX) {
    $servicioSeguroX = Read-Host 'Clave secreta de Supabase del proyecto Pont3la10, solo servidor (oculta)' -AsSecureString
    $punteroServicioX = [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($servicioSeguroX)
    try {
      $claveServicioX = [System.Runtime.InteropServices.Marshal]::PtrToStringBSTR($punteroServicioX)
      if ($claveServicioX -notmatch '^(sb_secret_[A-Za-z0-9_-]+|eyJ[A-Za-z0-9_.-]+)$') { throw 'Usa una clave secreta de servidor de Supabase, no la clave publicable.' }
      if ($claveServicioX.StartsWith('eyJ')) {
        try {
          $segmentoJwtX = $claveServicioX.Split('.')[1].Replace('-','+').Replace('_','/')
          $segmentoJwtX = $segmentoJwtX.PadRight($segmentoJwtX.Length + (4 - $segmentoJwtX.Length % 4) % 4, '=')
          $datosJwtX = [System.Text.Encoding]::UTF8.GetString([Convert]::FromBase64String($segmentoJwtX)) | ConvertFrom-Json
          if ($datosJwtX.role -ne 'service_role') { throw 'Tipo incorrecto.' }
        } catch { throw 'La clave de Supabase no es una clave de servidor reconocida. No se modifico el entorno.' }
      }
      $cambiosX.NUXT_SUPABASE_SERVICE_ROLE_KEY = $claveServicioX
    } finally {
      [System.Runtime.InteropServices.Marshal]::ZeroFreeBSTR($punteroServicioX)
      $claveServicioX = $null
      $servicioSeguroX.Dispose()
    }
  }
  $claveExistenteX = leerClaveCifradoSocial $contenidoEntornoX
  if (-not $claveExistenteX) {
    $bytesClaveX = New-Object byte[] 32
    $generadorClaveX = [System.Security.Cryptography.RandomNumberGenerator]::Create()
    try { $generadorClaveX.GetBytes($bytesClaveX) } finally { $generadorClaveX.Dispose() }
    $cambiosX.NUXT_SOCIAL_ENCRYPTION_KEY = ([BitConverter]::ToString($bytesClaveX)).Replace('-','').ToLowerInvariant()
  }
  foreach ($entradaX in $cambiosX.GetEnumerator()) {
    $contenidoEntornoX = actualizarVariableEntornoSocial $contenidoEntornoX $entradaX.Key $entradaX.Value
  }
  $rutaTemporalX = $rutaPermitida + '.oauth-' + [Guid]::NewGuid().ToString('N')
  [System.IO.File]::WriteAllText($rutaTemporalX, $contenidoEntornoX, (New-Object System.Text.UTF8Encoding($false)))
  [System.IO.File]::Replace($rutaTemporalX, $rutaPermitida, $null)
  Write-Output 'Configuracion de X guardada sin mostrar claves. Reinicia el servidor local para cargarla.'
} finally {
  [System.Runtime.InteropServices.Marshal]::ZeroFreeBSTR($punteroSecretoX)
  $secretoClienteX = $null
  $secretoSeguroX.Dispose()
}
