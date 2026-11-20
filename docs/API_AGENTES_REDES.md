# API para agentes de IA · Contenido para redes

Interfaz especializada para que agentes de IA (Claude, Codex, scripts) preparen
publicaciones del editor propio —imágenes con plantilla, logo y texto, carruseles
y vídeo— para Facebook e Instagram. Existe en dos formas que comparten el mismo
registro de operaciones: **REST** y **MCP** (Model Context Protocol).

| Recurso | Ruta |
| --- | --- |
| REST | `/api/agentes/redes/v1` |
| OpenAPI 3.1 (pública) | `/api/agentes/redes/v1/openapi.json` |
| Guía para agentes (pública) | `/api/agentes/redes/v1/guia.md` |
| MCP (HTTP, JSON-RPC 2.0, solo POST) | `/api/agentes/redes/mcp` |
| Gestión de llaves (humanos) | Panel → Contenido para redes → Agentes IA |

## Modelo de confianza

1. **El agente prepara, la persona decide.** Por defecto un agente no puede
   publicar ni programar: crea borradores y llama a `solicitarAprobacion` (nota +
   hora sugerida). La pieza aparece en el panel como «Pide tu aprobación»; la
   persona la revisa y publica/programa con su MFA (flujo humano existente).
2. **Publicar de inmediato no existe para agentes.** No hay operación para ello.
3. **Delegación explícita opcional.** Una persona con `configuracion.gestionar` y
   MFA puede dar a una llave el alcance `programar`: puede programar *sus propias*
   piezas entre 10 minutos y 30 días, con cuota móvil de 24 h por llave. Queda
   auditado y la persona puede cancelar. Es una decisión humana por llave
   (misma lógica que la delegación editorial documentada en
   `AUTOMATIZACION_EDITORIAL_IA.md`); no cambia permisos ni MFA humanos.
4. **Aprobar lo que se ve.** Editar una pieza invalida cualquier solicitud o
   programación previa (el SQL borra la solicitud al guardar).

## Autenticación y límites

- `Authorization: Bearer p3l_…` (256 bits). La llave se muestra **una sola vez**;
  en la base solo existe su huella SHA-256 (`social_agent_keys`).
- Alcances: `leer`, `borradores`, `medios`, `programar` (solo `leer`, `borradores`
  y `medios` por defecto). Cada alcance se comprueba antes de validar la entrada.
- En **cada** llamada se revalida que la llave siga vigente (no revocada ni vencida)
  y que su dueño conserve `panel.acceder` + `contenido.editarTodos`.
- Límite por minuto por llave (defecto 60) → `429 limite_excedido` + `Retry-After`.
- Una llave solo modifica, elimina, pide aprobación y programa piezas **creadas
  con esa misma llave** (`no_es_tuya`). Puede *leer* las demás (`ambito=todas`).
- Cuerpos JSON ≤ 256 KB; los archivos se suben aparte (URL firmada).
- Toda acción de agente queda en `editorial_audit_log` (`social.agent.*`) con
  `agentKeyId`; la creación y revocación de llaves, en `social.agent_key.*`.

## Operaciones

| Operación (REST) | Alcance | Herramienta MCP |
| --- | --- | --- |
| `GET /` capacidades | cualquiera | `redes_capacidades` |
| `GET /publicaciones?estado&ambito&limite` | leer | `redes_listar_publicaciones` |
| `POST /publicaciones` | borradores | `redes_crear_publicacion` |
| `GET /publicaciones/{id}` | leer | `redes_leer_publicacion` |
| `PUT /publicaciones/{id}` | borradores | `redes_actualizar_publicacion` |
| `DELETE /publicaciones/{id}` | borradores | `redes_eliminar_publicacion` |
| `GET /publicaciones/{id}/previsualizacion?diapositiva&formato=json\|jpg` | leer | `redes_previsualizar` |
| `POST /publicaciones/{id}/validar` | leer | `redes_validar` |
| `POST /publicaciones/{id}/solicitar-aprobacion` | borradores | `redes_solicitar_aprobacion` |
| `POST /publicaciones/{id}/programar` | **programar** | `redes_programar` |
| `POST /publicaciones/{id}/cancelar-programacion` | **programar** | `redes_cancelar_programacion` |
| `POST /medios/subidas` · `POST /medios/subidas/{id}/confirmar` | medios | `redes_iniciar_subida` · `redes_confirmar_subida` |
| `POST /medios/desde-url` | medios | `redes_importar_imagen_url` |
| `GET /biblioteca?busqueda&limite` | leer | `redes_buscar_biblioteca` |

`previsualizar` devuelve la imagen real que se publicaría (en MCP como contenido
`image`, para que un modelo multimodal la inspeccione antes de pedir aprobación).

## Composición

```json
{
  "tipo": "imagenes",
  "titulo": "Final del torneo",
  "formato": "vertical",
  "destinos": ["facebook", "instagram"],
  "descripcion": { "facebook": "Texto… Foto: Fuente.", "instagram": "Versión corta…" },
  "claveIdempotencia": "final-2026-11-20-a",
  "diapositivas": [{
    "plantilla": "dos-lado",
    "imagenes": [{ "medioId": "<id>" }, { "medioId": "<id>", "zoom": 1.4, "x": 10, "y": 0 }],
    "logos": [{ "x": 50, "y": 10, "ancho": 34 }],
    "textos": [{ "texto": "Gran **final** en Bogotá", "y": 82, "tamano": 64, "color": "blanco", "fondo": "degradado" }]
  }]
}
```

- Posiciones en % del lienzo. `fondo: degradado` reproduce el degradado y la
  tipografía de las noticias automatizadas; `**palabra**` sale en amarillo.
- Una imagen por recuadro de la plantilla (`una`, `dos-lado`, `dos-pila`,
  `tres-izquierda`, `tres-arriba`, `cuatro`). Varias diapositivas = carrusel (≤ 10).
- Vídeo: `{ "tipo": "video", "videoMedioId": "<id>", … }` (MP4/MOV).
- `GET /publicaciones/{id}` devuelve la misma forma en `composicion`: lo leído se puede reenviar con `PUT` y la `revision` actual.

## Subir archivos

1. `POST /medios/subidas` con `{nombre, tipoMime, tamano}` → URL firmada (2 h).
2. `PUT <url>` con el cuerpo binario y `content-type`/`x-upsert: false`.
3. `POST /medios/subidas/{id}/confirmar` → verifica tamaño y contenido (imágenes con `sharp`; vídeo con cabecera MP4/MOV) y devuelve el archivo listo. Usa su `id` como `medioId`.

Alternativa para imágenes públicas: `POST /medios/desde-url` (solo HTTPS, puerto
443, sin credenciales, ≤ 3 redirecciones **revalidadas**, DNS validado en la
conexión real, bloqueo de redes privadas/metadatos/IPv4-mapeadas, ≤ 15 MB,
JPG/PNG/WebP). Los archivos temporales se borran al publicar y por retención
(`SOCIAL_TEMP_*`, ver `PLAN_MODULO_REDES.md`).

## Errores

`{ "error": { "codigo", "mensaje", "detalles?" } }`. Códigos: `no_autenticado` (401),
`alcance_insuficiente`/`propietario_sin_permiso`/`no_es_tuya` (403), `no_encontrado`
(404), `conflicto_revision`/`estado_no_editable`/`programador_inactivo`/`no_eliminable`/`no_programada` (409),
`validacion` (422, con `detalles`), `limite_excedido` (429), `no_disponible` (503).

## Conectar un cliente MCP

```json
{ "mcpServers": { "pont3la10-redes": { "type": "http", "url": "https://www.pont3la10.com/api/agentes/redes/mcp",
  "headers": { "Authorization": "Bearer p3l_…" } } } }
```

`tools/list` solo muestra las herramientas permitidas por el alcance de la llave.
Los errores de herramienta vuelven como `isError: true` con el mismo cuerpo de error.

## Validación

`tests/unit/agentesRedes.test.ts` (esquemas, mapeo reversible, SSRF, enrutamiento,
alcances, OpenAPI, MCP, contrato de seguridad) y
`tests/sql/agentesRedes.integration.mjs` (46 comprobaciones PGlite: llaves,
límite, idempotencia, aprobación, cuota, propiedad, permisos de funciones).
Migración: `20261117100000_api_agentes_redes.sql` (aplicar **antes** del código).

## Pendiente / ideas

Webhooks de estado (hoy se consulta), rotación de llaves con solape, cuota diaria
de creación por llave, vídeo por URL (hoy solo subida firmada), publicación
inmediata delegada (deliberadamente fuera de alcance).

## Publicación social de artículos pendientes (2026-11-20)

`node scripts/redes-publicar-articulo.mjs --pendientes [--borrador | --programar-desde <ISO> | --auto]` completa los
artículos publicados en las últimas 24 h que no tienen publicación social. Cambios del 2026-11-20:

- El crédito de la foto sale de la portada del artículo (API pública); `--creditos` solo lo sobrescribe.
- La carpeta de previsualización se crea sola (antes fallaba con `ENOENT` y la corrida no programaba nada).
- `--auto` programa cada pieza en la primera hora libre: más de 12 minutos desde ahora, después de lo ya programado, una cada
  15 minutos y fuera de la madrugada de Bogotá (23:00–05:30).

Causa del hueco del 2026-11-20: las corridas editoriales programan las notas para publicarse minutos después de cerrar, así que
sus redes quedaban «para la siguiente activación»; si esa corrida fallaba antes de llegar al paso de redes (422/500 en la API
editorial), las notas del día se quedaban sin imagen en Facebook e Instagram durante horas. El paso de pendientes debe correr
con su propio disparador, no solo al final de una corrida.
