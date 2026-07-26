# HU-ED-03 - Editor de borradores

## Estado

Implementada y validada contra Supabase con la migración
`0005_editorial_draft_editor.sql`.

## Objetivo

Permitir que una persona autorizada abra un borrador, construya su contenido,
complete metadatos editoriales y SEO, recupere cambios no guardados y conserve
un historial verificable sin habilitar todavía la publicación.

## Alcance funcional

- Edición de título, resumen, slug, tipo y sección.
- Cuerpo estructurado por bloques:
  - párrafo;
  - encabezados H2 y H3;
  - cita;
  - lista;
  - lista numerada.
- Asignación de temas públicos y etiquetas internas.
- Registro de URL, medio, autor original y créditos.
- Metadatos SEO y texto base para redes.
- Vista previa privada de lectura.
- Conteo de palabras y tiempo estimado de lectura.
- Autoguardado por usuario sin crear versiones editoriales.
- Recuperación o descarte explícito del autoguardado.
- Guardado manual atómico.
- Historial de versiones con nota de cambio.
- Control optimista mediante `lock_version`.

## Arquitectura

### Documento

El cuerpo se guarda como un documento JSON estructurado compatible con una
evolución posterior hacia un editor basado en ProseMirror:

```json
{
  "type": "doc",
  "content": [
    {
      "type": "paragraph",
      "content": [
        {
          "type": "text",
          "text": "Contenido editorial"
        }
      ]
    }
  ]
}
```

La columna `body` conserva una versión de texto plano derivada en servidor para
búsqueda, migraciones y compatibilidad.

### Persistencia

- `article_autosaves` conserva un snapshot temporal por artículo y usuario.
- `article_versions` se actualiza solamente con guardados manuales y
  transiciones editoriales.
- `save_editorial_article` actualiza artículo, temas, etiquetas, versión y
  eliminación del autoguardado dentro de una sola transacción.
- La función usa `security invoker`: nunca evita RLS ni utiliza `service_role`.

### Concurrencia

Cada guardado envía la versión que abrió el editor. La actualización solamente
continúa si coincide con `articles.lock_version`. Cuando otra sesión guardó
primero, la API responde con conflicto y exige recargar.

## Endpoints privados

| Método | Ruta | Responsabilidad |
| --- | --- | --- |
| `GET` | `/api/admin/contenidos/:id/editor` | Cargar detalle, taxonomías e historial en una sola solicitud |
| `GET` | `/api/admin/contenidos/:id` | Cargar detalle y autoguardado propio |
| `PUT` | `/api/admin/contenidos/:id` | Guardar versión manual |
| `PUT` | `/api/admin/contenidos/:id/autoguardado` | Guardar snapshot temporal |
| `DELETE` | `/api/admin/contenidos/:id/autoguardado` | Descartar snapshot |
| `GET` | `/api/admin/contenidos/:id/versiones` | Consultar historial |

Todos los endpoints validan sesión, rol, permiso, identificadores y payload en
servidor. RLS replica la autorización sobre las tablas.

## Rendimiento y bloqueo de interfaz

- La carga inicial del editor agrupa artículo, taxonomías e historial en un
  endpoint de arranque y ejecuta las consultas independientes en paralelo.
- La autorización consulta perfil, roles y nivel MFA en paralelo.
- El contexto de navegación se conserva durante 60 segundos en cliente; los
  endpoints siguen verificando permisos en servidor en cada operación.
- Las navegaciones y mutaciones pesadas muestran un bloqueo global accesible
  para impedir dobles solicitudes.
- El autoguardado permanece en segundo plano y usa un bloqueo lógico propio
  para no congelar el trabajo cada vez que se ejecuta.

## Seguridad

- El editor permanece bajo `noindex, nofollow`.
- Los documentos aceptan únicamente nodos conocidos y texto plano.
- La vista previa no interpreta HTML ni usa `v-html`.
- URLs, longitudes, UUID, slug y taxonomías se validan antes de persistir.
- Un autor solamente puede modificar contenido propio.
- Los estados distintos de `draft` y `changes_requested` quedan bloqueados para
  edición en esta HU.
- Publicar, programar y aprobar siguen fuera del editor base.

## Criterios de aceptación

- El borrador puede abrirse desde la bandeja.
- El editor muestra datos persistidos, taxonomías e historial.
- Los cambios activan autoguardado después de una pausa.
- Recargar permite recuperar o descartar cambios temporales.
- Guardar manualmente incrementa `lock_version` y crea una versión.
- Una versión desactualizada no sobrescribe cambios de otra sesión.
- La vista previa refleja el contenido sin publicar.
- La interfaz no genera desbordamiento horizontal en móvil.
- `lint`, `typecheck`, pruebas unitarias y build finalizan correctamente.

## Fuera de alcance

- Publicación y programación.
- Flujo de revisión y aprobación.
- Restauración de versiones históricas.
- Biblioteca de medios y portada.
- Ingesta desde TikTok, YouTube o automatizaciones.
- Generación asistida por IA.
