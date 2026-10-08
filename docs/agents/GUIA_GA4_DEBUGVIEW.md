# Verificación de analítica pública en GA4 DebugView

## Antes de empezar

1. En el selector de propiedades de Google Analytics, confirma que abriste la
   propiedad de Pont3la10 y el flujo web cuyo ID de medición es
   `G-PHNWBM2D7X`. No ejecutes la prueba sobre una propiedad de demostración u
   otro sitio.
2. Usa Google Tag Assistant para conectar tu navegador personal con
   `https://www.pont3la10.com`. Tag Assistant activa el modo de depuración para
   ese dispositivo. No agregues `debug_mode` global al código de producción.
3. Si esa instalación guardó previamente “rechazar analítica”, reactiva la
   analítica desde las preferencias del sitio. Sin permiso, los eventos no
   deben enviarse; el consentimiento publicitario es independiente.
4. Si el equipo quiere excluir las pruebas de los informes ordinarios, un
   editor de la propiedad debe revisar primero el filtro de tráfico de
   desarrolladores en modo de prueba. Activar un filtro de exclusión descarta
   esos datos permanentemente y no se debe hacer como parte de esta guía.

## Recorrido de prueba

Abre GA4 → **Administrar** → **Visualización de datos** → **DebugView** y, en
el mismo navegador conectado con Tag Assistant, visita estas rutas:

| Acción | Evento esperado | Parámetros a revisar |
| --- | --- | --- |
| Abrir `/` | `page_view` | `page_type=home` |
| Abrir un artículo publicado | `page_view`, `article_view` | `page_type=article`, `content_id`, `category` y `primary_entity` cuando existan |
| Abrir `/partidos/<slug>` | `page_view`, `match_page_view` | `page_type=match`, `match_id`, `competition` y `match_status` cuando estén disponibles |
| Pulsar un enlace interno a otro partido | `internal_match_link_click` y el `page_view` de destino | No debe aparecer texto de búsqueda, correo, nombre de cuenta ni query string |
| Abrir `/resultados/futbol` | `page_view` | `page_type=results` |
| Abrir un hub como `/liga-colombiana` | `page_view` | `page_type=hub`, `hub_type=liga_colombiana` |

Selecciona un evento reciente para inspeccionar sus parámetros. El `page_view`
se envía de forma manual para evitar duplicados y su `page_location`/`page_path`
omiten query string y fragmento. El término de búsqueda nunca se adjunta al
evento. Los eventos de canal solo se registran al hacer clic en una fuente o
programación confirmada; no debe abrirse un anuncio para probar analítica.

## Registro del resultado

Marca cada ruta/evento como recibido o ausente, anota fecha y zona horaria, y
guarda una captura sin datos personales. Si no aparece nada, comprueba primero
la propiedad y el flujo web, Tag Assistant, el consentimiento de analítica y el
bloqueo de scripts del navegador; no actives debug para todos los visitantes.

Esta comprobación requiere una propiedad real de Pont3la10. En la sesión
disponible al preparar esta guía no apareció esa propiedad, por lo que no se
envió tráfico de prueba ni se declaró cumplido DebugView.

## Documentación oficial

- [Supervisar eventos en DebugView](https://support.google.com/analytics/answer/7201382?hl=es-419)
- [Excluir tráfico de desarrolladores](https://support.google.com/analytics/answer/13296662?hl=es)
