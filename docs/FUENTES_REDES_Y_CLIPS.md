# Fotos y clips de redes para el video diario

Decisiones de Juan (2026-11-20): (1) ninguna imagen ni clip más de 3 veces por video; (2) más fuentes de imágenes,
incluidas las redes de clubes, protagonistas, la liga y periodistas; (3) que el video largo lleve clips de video.

## Regla de repetición
- `MAXIMO_USOS_FOTO = 3` en `scripts/video-generar-proyecto.mjs` cuenta las apariciones en todo el video: intro y cierre
  (la foto de portada), gancho, presentación, bloques, pregunta y cierre.
- Las partes compartidas (gancho, presentación, pregunta y cierre) usan cada foto como máximo 2 veces, para que cada
  noticia conserve una aparición de su propia foto.
- Si faltan fotos, los planos se alargan en vez de repetir; sin «repetir fotos» el espacio queda vacío para Juan.
- En los Reels: igual (tope por Reel); si una foto ya salió 3 veces, el beat usa su versión desenfocada con la palabra
  clave encima (los fondos desenfocados no cuentan como aparición).

## De dónde salen las fotos y clips de redes (`scripts/video-redes-fuentes.mjs`)
- **X:** publicaciones incrustadas en las notas de los medios (la fuente del artículo y las de `fuentesFotos`) y las URLs de
  publicaciones que el agente ponga en `fuentesFotos`. Se leen con la API pública de
  [FxTwitter](https://github.com/FixTweet/FxTwitter) (MIT): sin cuenta, sin llave y sin la API de pago de X.
- **Filtro de relevancia:** las publicaciones incrustadas en notas de otros medios solo entran si su texto o su cuenta
  nombran algo de la noticia (las barras laterales traen publicaciones ajenas). Las de la nota fuente y las elegidas por el
  agente entran sin ese filtro.
- **Canales de TV:** de cuentas con derechos de transmisión (Win Sports, ESPN, DSports, Caracol, RCN…) no se toman
  clips: son imágenes de partido y Content ID los reclama.
- **No se usa:** Instagram (sus imágenes ya no se entregan sin iniciar sesión; los scrapers como Instaloader exigen cuenta y
  los bloquean), Facebook, ni descargas de YouTube (lo prohíben sus términos).

## Clips en el video largo
- El buscador baja hasta 2 clips por noticia: sin sonido, máximo 15 s, 1920×1080 (los verticales con fondo desenfocado),
  con póster para el estudio y la hoja de contactos (`[VIDEO]`).
- Cada clip ocupa un espacio de la galería con la escena `clip` del pack (acercamiento lento, crédito «Video: @cuenta en X
  (vía Medio)» y logo). Si se vuelve a usar, arranca más adelante en el clip.

## Riesgos que quedan
- Las fotos y clips de redes siguen siendo de sus autores: se usan con crédito y criterio de licencia bajo (decisión de
  Juan), pero un club o medio puede pedir retirarlos.
- Content ID puede reclamar un clip aunque no venga de un canal de TV (por ejemplo, si el club publicó una jugada de la
  transmisión). Revisa los `[VIDEO]` de la hoja antes de publicar en YouTube.
- La API de FxTwitter es un servicio de terceros: si deja de responder, el buscador sigue con las demás fuentes.
