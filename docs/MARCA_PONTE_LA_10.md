# Marca: «Ponte la 10» (antes «Pont3la10»)

Decisión del responsable (2026-11-19): el nombre visible pasa a escribirse **Ponte la 10**, porque la grafía con «3» impide
que Google asocie las búsquedas del nombre con el sitio.

## Qué cambió
- Nombre visible en títulos, descripciones, `og:site_name`, RSS, mapa de noticias, pie de página, textos legales y panel.
- Datos estructurados: `name: «Ponte la 10»` y `alternateName` con las variantes (`Pont3la10`, `Pontela10`, `Ponte la diez`)
  para que Google las una (`utils/sitio.ts` → `nombresAlternos`, usado en `app.vue`).
- Logos regenerados con el isotipo de la camiseta y el texto nuevo: `node scripts/generar-logos-marca.mjs`
  (cabecera, pie, pantalla de bloqueo y logo de datos estructurados). Las tipografías son Montserrat Bold engrosada e inclinada:
  es una primera propuesta; un logo definitivo de diseñador puede reemplazar los PNG/WebP del mismo nombre.

## Qué NO cambió (a propósito)
- Dominio `pont3la10.com` y subdominios, cuentas sociales (`@Pont3la10`), correos y `labs.pont3la10.com`.
- «Pont3la10 Labs» (nombre del titular del producto).
- Identificadores internos: cookies, variables de entorno, nombres de código, `equipo-pont3la10` (slug del autor),
  cifrado de tokens de X, User-Agents y migraciones históricas.
- Ícono de app/favicon y la imagen CTA de redes (`cta-pont3la10-generada-v2.png`): no incluyen o no se tocaron; revisar.

## Pendiente de decisión
- Un dominio con la grafía correcta (`pontela10.com`) ayudaría más que cualquier cambio de texto: comprarlo y redirigir 301.
