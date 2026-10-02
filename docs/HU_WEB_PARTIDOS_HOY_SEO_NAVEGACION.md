# HU-WEB-01: Rediseño de Partidos de hoy, navegación y SEO

## Estado

En desarrollo.

## Objetivo

Ofrecer una agenda de fútbol de hoy fácil de recorrer, ordenada por hora y con
una estructura clara para las personas y los buscadores.

## Alcance

`/partidos-hoy` se enfoca en fútbol y deja accesos a `/resultados` para otros
deportes. Mantiene la fecha de negocio Bogotá en el servidor y adapta las horas
al dispositivo en cliente.

## Reglas de presentación

- La sección En vivo aparece solo si hay al menos un partido en vivo; no deja
  una tarjeta vacía de gran tamaño.
- Los partidos próximos y finalizados se ordenan por hora de inicio ascendente
  dentro de la selección visible. El estado en vivo puede mostrarse primero.
- La API pública no aplica el límite genérico de 32 resultados a fútbol: entrega
  los fixtures únicos elegibles del día (hasta el techo defensivo de 1.000 filas
  de lectura de Supabase) antes de construir filtros y datos estructurados.
- La navegación ofrece filtros accesibles para En vivo, Colombia, Europa,
  cinco grandes ligas y Todos. No hay categorías vacías ni etiquetas engañosas.
- Los encuentros colombianos mantienen el acceso más directo; la prioridad de
  captura no reemplaza el orden cronológico del calendario completo.
- El estado vacío de toda la jornada es compacto, honesto y conserva un enlace a
  resultados; no inventa partidos ni promete actualización en tiempo real.
- Las tarjetas duplicadas nunca aparecen dos veces y cada una lleva a un detalle
  que corresponde al snapshot seleccionado.

## Reglas de SEO y accesibilidad

- Se conserva un único H1, título, descripción, canonical, BreadcrumbList,
  CollectionPage e ItemList con enlaces rastreables a detalles válidos.
- El JSON-LD se construye solo con partidos únicos devueltos en el HTML SSR.
- La navegación usa encabezados/etiquetas accesibles, foco visible y botones o
  enlaces con nombres claros.
- Diseño comprobado en móvil y escritorio, sin desbordes horizontales; fechas y
  horarios son estables durante la hidratación.

## Criterios de aceptación

- Si no hay partidos en vivo, no se renderiza encabezado, contenedor ni estado
  vacío de esa sección.
- Si hay partidos en vivo, aparecen una sola vez y su marcador/estado corresponde
  a la fuente escogida.
- Los fixtures elegibles del día se muestran en hora ascendente; filtros
  conservan este orden y actualizan el conteo anunciado.
- `/partidos-hoy` no mezcla deportes por accidente; hay navegación explícita a
  los demás deportes.
- Canonical y datos estructurados no incluyen parámetros de filtro, IDs
  duplicados ni enlaces rotos.
- La ruta pasa verificación manual accesible y responsive y responde HTTP 200.

## Validación

Pruebas de página/SEO/orden, suite, typecheck, build y comprobación manual
responsive de la ruta local y luego de Production.
