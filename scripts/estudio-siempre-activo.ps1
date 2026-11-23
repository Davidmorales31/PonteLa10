# Mantiene el estudio de video encendido (fase 2 del plan del iPhone, docs/PLAN_ESTUDIO_IPHONE.md).
# Lo arranca, y si se cae o pide reinicio (código 75, cuando hay código nuevo) lo vuelve a levantar.
# Lo lanza la tarea programada «Pont3la10 Estudio» al iniciar sesión (ver instalar-estudio-siempre-activo.ps1).
$ErrorActionPreference = 'Continue'
$raiz = Split-Path -Parent $PSScriptRoot
$registro = Join-Path $env:USERPROFILE '.pont3la10\estudio\servicio.log'
New-Item -ItemType Directory -Force -Path (Split-Path $registro) | Out-Null
$env:PONT3LA10_ESTUDIO_REINICIABLE = '1'
$espera = 5
while ($true) {
  $inicio = Get-Date
  Add-Content $registro "$(Get-Date -Format o) Iniciando estudio"
  Push-Location $raiz
  & node scripts/video-estudio.mjs *>> $registro
  $codigo = $LASTEXITCODE
  Pop-Location
  Add-Content $registro "$(Get-Date -Format o) Estudio terminó con código $codigo"
  if ($codigo -eq 75) { $espera = 2 }
  elseif (((Get-Date) - $inicio).TotalMinutes -gt 10) { $espera = 5 }
  else { $espera = [Math]::Min($espera * 2, 300) }
  Start-Sleep -Seconds $espera
}
