# Instala lo necesario para que el estudio esté disponible desde el iPhone (fase 2). Córrelo UNA vez en PowerShell:
#   powershell -ExecutionPolicy Bypass -File scripts\instalar-estudio-siempre-activo.ps1
# 1) Tarea programada «Pont3la10 Estudio»: arranca el estudio oculto al iniciar sesión y lo reinicia si se cae.
# 2) Energía: el PC no se suspende ni hiberna mientras esté conectado a la corriente (la pantalla sí se apaga).
# 3) Tailscale: publica el estudio solo en tu red privada (tailscale serve, nunca funnel).
$ErrorActionPreference = 'Stop'
$script = Join-Path $PSScriptRoot 'estudio-siempre-activo.ps1'
$accion = New-ScheduledTaskAction -Execute 'powershell.exe' -Argument "-NoProfile -WindowStyle Hidden -ExecutionPolicy Bypass -File `"$script`""
$disparador = New-ScheduledTaskTrigger -AtLogOn -User $env:USERNAME
$ajustes = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -ExecutionTimeLimit ([TimeSpan]::Zero) -RestartCount 3 -RestartInterval (New-TimeSpan -Minutes 1)
Register-ScheduledTask -TaskName 'Pont3la10 Estudio' -Action $accion -Trigger $disparador -Settings $ajustes -Description 'Estudio de video Ponte la 10 siempre activo' -Force | Out-Null
Write-Host 'Tarea «Pont3la10 Estudio» creada.'

powercfg /change standby-timeout-ac 0
powercfg /change hibernate-timeout-ac 0
Write-Host 'Suspensión e hibernación desactivadas con corriente.'

if (Get-Command tailscale -ErrorAction SilentlyContinue) {
  tailscale serve --bg 4810
  Write-Host 'Estudio publicado en tu red de Tailscale (ver la dirección arriba).'
} else {
  Write-Host 'Tailscale no está instalado: instálalo y vuelve a correr este script.'
}
Write-Host 'Listo. Si ya tenías el estudio abierto, ciérralo; la tarea lo levanta: Start-ScheduledTask "Pont3la10 Estudio"'
