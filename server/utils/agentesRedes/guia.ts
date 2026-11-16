/** Guía breve para agentes: la sirve el endpoint `/guia.md` y el MCP como `instructions`. */
export const guiaAgentes = `# API de agentes · Contenido para redes de Pont3la10

Prepara publicaciones propias (imágenes con plantilla, logo y texto, carruseles o vídeos) para Facebook e Instagram.

## Reglas de oro
- **Nunca publicas tú**: dejas borradores y pides la aprobación de una persona con \`solicitarAprobacion\` (nota + hora sugerida). Solo si tu llave tiene el alcance \`programar\` puedes programar directamente.
- **Mira antes de pedir**: usa \`previsualizar\` (imagen real) y \`validar\` hasta que no haya motivos pendientes.
- **Veracidad y derechos**: no inventes datos. Acredita la fuente de cada imagen en la descripción. Solo imágenes que tengas derecho a usar.
- **Reintentos seguros**: manda \`claveIdempotencia\` al crear; si repites la llamada, no se duplica.
- **Concurrencia**: lee la \`revision\` y envíala al actualizar/pedir aprobación; si cambió (409), lee de nuevo.

## Flujo
1. \`capacidades\` → límites, plantillas, formatos y tu alcance.
2. Archivos: \`importarImagenDesdeUrl\` (imágenes públicas), \`iniciarSubida\` + PUT + \`confirmarSubida\` (archivos locales y vídeos) o \`buscarBiblioteca\` (CMS).
3. \`crearPublicacion\` con la composición (ver esquema).
4. \`previsualizar\` y \`validar\`; corrige con \`actualizarPublicacion\`.
5. \`solicitarAprobacion\`. La persona la ve como pendiente en su panel.

## Composición de imágenes
- \`formato\`: \`vertical\` (1080×1350, recomendado), \`cuadrado\`, \`web\` (no sirve en Instagram).
- Cada \`diapositiva\` tiene una \`plantilla\` (\`una\`, \`dos-lado\`, \`dos-pila\`, \`tres-izquierda\`, \`tres-arriba\`, \`cuatro\`) y exactamente una imagen por recuadro.
- Posiciones en % del lienzo (x: 0 izquierda → 100 derecha; y: 0 arriba → 100 abajo). Texto: \`**palabra**\` sale en amarillo; fondo \`degradado\` = el mismo de las noticias.
- Varias diapositivas = carrusel (hasta 10).

## Subir un archivo local
\`iniciarSubida\` devuelve una URL firmada. Súbelo con \`PUT\`, cuerpo binario y los encabezados indicados, p. ej.:
\`curl -X PUT -H "content-type: image/jpeg" -H "x-upsert: false" --data-binary @foto.jpg "<url>"\` y luego \`confirmarSubida\`.

## Errores
Siempre \`{ "error": { "codigo", "mensaje", "detalles?" } }\`. Códigos: \`no_autenticado\`, \`alcance_insuficiente\`, \`propietario_sin_permiso\`, \`no_es_tuya\`, \`no_encontrado\`, \`validacion\`, \`conflicto_revision\`, \`estado_no_editable\`, \`limite_excedido\` (429), \`programador_inactivo\`, \`no_disponible\`.
`
