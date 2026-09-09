# Primer mensaje en la nueva cuenta

Continuemos Pont3la10 en `C:\PONTE LA 10`, nunca en la copia vieja de OneDrive.
Lee primero AGENTS.md y docs/CONTINUIDAD_PROYECTO.md; despues la HU de ingesta y
los estandares del repositorio. Revisa git status y la rama antes de editar;
el respaldo esta en codex/enlaces-internos-compartir. No reviertas cambios existentes.

Estamos trabajando en HU-ED-07, ingesta SOLO de TikTok para transcribir y crear
borradores revisables. La implementacion es experimental: aun no hay prueba
completa confirmada, redaccion por IA ni cola duradera. Se corrigio setCookie
en SSR y se preparo la migracion 0012; confirma si fue aplicada antes de probar.

Retoma la validacion con un video publico corto y encuentra en que etapa falla
o tarda. Comprueba estados en Supabase, evita borradores duplicados y no publiques
nada automaticamente. Conserva login/MFA, permisos/RLS, UI aprobada y SEO.
Programa en espanol con camelCase y componentes reutilizables. Reporta solo
pruebas realmente ejecutadas y distingue codigo listo de despliegue validado.
No muestres claves del .env ni las agregues a Git.
