# Plan del módulo de contenido para redes

Fecha: 2026-11-16 · Pedido del responsable. Estado: Facebook e Instagram verificados
en producción; el resto está pendiente.

## Hecho (producción)

- Bandeja de pendientes: oculta lo ya publicado en Facebook e Instagram y las
  noticias anteriores al corte 2026-11-15 21:00 COT (PR #149).
- Configuración Meta desde Vault, programador por `pg_cron` cada minuto (activo) y
  bloqueo de republicación por destino.
- Token de página de Facebook de larga duración (no vence) guardado en Vault el
  2026-11-16; Instagram (@pont3ladiez) verificado.

## Pedidos del responsable

| # | Pedido | Estado |
| --- | --- | --- |
| 1 | No listar lo ya publicado | Hecho |
| 2 | No listar noticias anteriores al cambio | Hecho |
| 3 | Redes inactivas en producción | Hecho (Facebook e Instagram OK) |
| 4 | Publicación automática | Programador activo; falta encolar desde las corridas |
| 5 | Botón «Nuevo»: subir imágenes y videos propios | Pendiente |
| 6 | Carrusel de varias imágenes | Pendiente |
| 7 | Arrastrar el logo de Pont3la10 y el texto | Pendiente |
| 8 | Formatos virales de Facebook (2 y 3 imágenes, etc.) | Pendiente |
| 9 | Conectar X sin costo | Pendiente (ver riesgos) |
| 10 | Conectar TikTok | Pendiente (ver riesgos) |

## Funcionalidades recomendadas (aprobadas por el responsable)

11. Conexión de Facebook que no venza: botón «Conectar Facebook» que obtenga un
    token de página permanente sin pasar por el explorador de Meta.
12. Alerta de vencimiento o fallo de tokens en el panel y por correo.
13. Cola automática: cada noticia nueva de las corridas entra sola a la cola social
    con horarios espaciados y el responsable solo revisa.
14. Historial de envíos: publicado, fallido y enlace a cada post, por red.
15. Reintento seguro por red, sin duplicar la que ya salió.
16. Video (Reels) para Instagram y Facebook.

## API para agentes de IA (REST + MCP)

Operaciones, llaves con alcances, aprobación humana y modelo de seguridad:
`docs/API_AGENTES_REDES.md`. Gestión de llaves en Panel → Contenido para redes → Agentes IA.

## Fases propuestas

1. **Cola automática (#4, #13):** al aprobar una corrida, crear el lote social con
   la plantilla predeterminada; horarios espaciados; sin intervención.
2. **Contenido propio (#5–#8):** nuevo documento social con medios propios
   (subida a la biblioteca existente), carrusel ordenable, capa de logo y texto
   arrastrable y plantillas de 1, 2, 3 y 4 imágenes. Reutiliza el render del
   servidor de la Vista rápida.
3. **Operación (#11, #12, #14, #15):** estado de conexiones, alertas e historial.
4. **Video (#16):** subida y publicación como Reel.
5. **X y TikTok (#9, #10).**

## Riesgos y datos que debe aportar el responsable

- **X:** el nivel gratuito está cerrado a cuentas nuevas; la publicación por API es
  de pago por uso (~0,01–0,015 USD por post, dato de terceros a verificar en la
  consola de X). Hay claves de X en el entorno: primero revisar qué plan tienen.
- **TikTok:** publicar por API exige app de desarrollador y auditoría; sin ella solo
  se publica en privado. La cuenta y la solicitud las hace el responsable.
- **Meta:** el token de Instagram debe vigilarse; la alerta de vencimiento (#12) lo
  cubre. Reels requiere permisos adicionales de la app.
