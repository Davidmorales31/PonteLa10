# Lanzamiento de `mx.pont3la10.com`

Estado al 2026-11-19: el sitio de México está construido y recibe contenido (corrida de Claude activa, datos de Liga MX
públicos), pero **no está lanzado**: no tiene dominio y está bloqueado a buscadores (`indexable: false`).
Los pasos de «Tú» requieren tu cuenta del dominio, de Vercel o de Google; los de «Código» los hace el agente.

## Ya hecho
- Derechos de datos de Liga MX confirmados y worker de México habilitado en el `.env` local.
- Corrida editorial de México activa (`habilitada: true`; tarea 9:30 y 17:30 Bogotá).
- Mapas del sitio, feed y `robots.txt` de México listos (se activan al pasar `indexable` a `true`).
- URLs absolutas y datos estructurados usan el origen de cada sitio (#198).

## Antes del lanzamiento
1. **Tú · DNS.** En el proveedor del dominio `pont3la10.com`, crea el registro `mx` (CNAME) hacia el mismo destino que usa `www`.
   Comprueba con `nslookup mx.pont3la10.com`.
2. **Tú · Vercel.** Proyecto `ponte-la10` → Settings → Domains → agrega `mx.pont3la10.com` (sin redirección).
3. **Tú · Comprobación con el sitio aún bloqueado.** Con `indexable: false` debe cumplirse:
   - `https://mx.pont3la10.com/` responde 200 con cabecera `X-Robots-Tag: noindex, nofollow`.
   - `https://mx.pont3la10.com/robots.txt` dice `Disallow: /`.
   - `https://mx.pont3la10.com/liga-mx` responde 200 y `/liga-colombiana` responde 404.
   - `https://www.pont3la10.com/liga-mx` sigue en 404.
4. **Tú · Search Console.** Si ya tienes la propiedad de dominio `pont3la10.com`, ya cubre el subdominio. Si no, agrega la
   propiedad de prefijo `https://mx.pont3la10.com/`.
5. **Tú · GA4.** El ID de medición (`G-PHNWBM2D7X`) es el mismo para los dos sitios: no hay que tocar código. En los informes,
   segmenta por nombre de host (`mx.pont3la10.com`). Si prefieres otra propiedad, hay que cambiar el ID por sitio (pídelo).
6. **Tú · Redes.** No publiques ninguna pieza de México hasta que el paso 3 pase, porque los enlaces apuntan a `mx.pont3la10.com`.
7. **Tú · Legales.** Privacidad y términos citan la ley colombiana; decide si se añade la mexicana antes de abrir.

## El día del lanzamiento
8. **Código.** Cambiar `indexable: true` en `utils/sitio.ts` (sitio `mx`) y confirmar `sites.is_active = true` para `mx`.
   Pídelo al agente: prepara el PR y lo fusiona cuando el paso 3 esté verde.
9. **Tú · Search Console.** Envía `https://mx.pont3la10.com/sitemap.xml` y el mapa de noticias
   (`https://mx.pont3la10.com/news-sitemap.xml`).
10. **Prueba de redes de punta a punta** con un artículo real de México (hoy sin probar).

## Después
- Vigilar el bloque «México» de Operación (frescura de Liga MX) y las corridas de las 9:30 y 17:30.
- Crear la automatización de Codex de México (12:30 y 20:30) cuando quien administre Codex lo decida.
