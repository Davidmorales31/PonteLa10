---
name: pont3la10-redes-agente
description: Cómo un agente de IA prepara publicaciones propias (imágenes con plantilla, logo y texto, carruseles, vídeo) en el módulo Contenido para redes de Pont3la10 mediante la API/MCP de agentes, sin publicar por su cuenta.
---

# Redes de Pont3la10 desde un agente

Fuente de verdad: `docs/API_AGENTES_REDES.md`, `GET /api/agentes/redes/v1/openapi.json` y `/guia.md`.
Conexión: REST `…/api/agentes/redes/v1` o MCP `…/api/agentes/redes/mcp` con `Authorization: Bearer p3l_…`.
La llave la crea una persona en Panel → Contenido para redes → Agentes IA. No la imprimas ni la guardes en archivos del repositorio.

## Reglas
1. Empieza con `capacidades`: confirma tu alcance y los límites.
2. **No publicas.** Prepara el borrador y llama a `solicitarAprobacion` con nota (fuentes, por qué) y hora sugerida. Solo con alcance `programar` puedes programar directamente.
3. Antes de pedir aprobación: `previsualizar` (mira la imagen) y `validar` sin motivos pendientes.
4. Veracidad: no inventes datos ni citas. El crédito de la imagen es opcional (decisión del responsable, 2026-11-20) y las imágenes pueden ser fotos reales, editadas o generadas.
5. Usa `claveIdempotencia` al crear; lee la `revision` antes de actualizar y relee ante un 409.
6. Archivos: `importarImagenDesdeUrl` (públicas), `iniciarSubida` → PUT → `confirmarSubida` (locales/vídeo) o `buscarBiblioteca` (CMS).
7. Texto sobre imagen: `fondo: "degradado"`, `**palabra**` para amarillo, posiciones en % del lienzo.
