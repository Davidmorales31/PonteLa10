# Investigación de proveedores para tablas y datos de fútbol

**Fecha de consulta:** 2026-09-28
**Prioridad propuesta:** P1, después de estabilizar el proveedor y los permisos de publicación.
**Alcance:** Liga BetPlay/Primera A primero; evaluar después Premier League, LaLiga, Serie A, Bundesliga, Ligue 1 y UEFA Champions League.

Esta comparación usa páginas oficiales públicas. No se registró una cuenta, no se
consumió un trial ni se llamó a una API con clave. Los precios, cobertura y
latencias son los que el proveedor publica, no una medición independiente. La
cobertura puede variar por temporada y por campo (standing, estadísticas, logos).

## Resumen ejecutivo

No aparece un proveedor que hoy cumpla simultáneamente el presupuesto de
USD 25/mes del backlog, la cobertura regional + europea completa y un permiso
comercial de publicación suficientemente claro. No conviene desplegar una tabla
pública usando solo que una API devuelva datos: el acceso técnico no concede
necesariamente derechos de publicación, marcas ni escudos.

La ruta de menor esfuerzo técnico sería evaluar primero la API-Sports/API-Football
que ya existe en el proyecto: cubre Primera A colombiana y las competiciones
solicitadas, y el sitio ya consume sus endpoints de marcadores. Pero sus términos
dicen expresamente que el servicio no concede licencia para publicar datos y que
el cliente debe obtener permisos de los titulares. Por eso es un candidato para
una prueba privada, no para producción, hasta obtener autorización escrita.

Para un producto público, pediría una cotización/confirmación de derechos a
Football-Data.org y Sportmonks antes de elegir. Football-Data.org ofrece el
mejor precio transparente con cobertura europea amplia, pero Primera A no está
en su lista gratuita y su permiso de uso comercial no queda explícito en los
términos públicos. Sportmonks muestra una buena amplitud técnica, pero sus
páginas comerciales y términos públicos se contradicen sobre uso comercial y
sus planes actuales exceden el límite confirmado. Sportradar/Opta quedan como
alternativas empresariales si el proyecto crece y el presupuesto cambia.

## Comparación

| Proveedor | Liga BetPlay y competiciones | Tablas, fixtures, resultados y estadísticas | Actualización, límites y confiabilidad | Precio público | Integración y licencia |
|---|---|---|---|---|---|
| **API-Sports / API-Football** | La cobertura oficial enumera Colombia Primera A, Primera B, Copa Colombia, Liga Femenina y Superliga; también lista los seis torneos europeos solicitados. Los campos disponibles cambian por temporada. | Incluye standings, fixtures, resultados/live scores, eventos, alineaciones y estadísticas. El proyecto ya usa API-Sports para resultados y consulta standings en detalle de partido. | Sin SLA ni latencia garantizada en los términos; las cadencias publicadas son orientativas. Free: 100 requests/día y temporadas limitadas; Pro: USD 19/mes, 7.500/día; Ultra USD 29/mes, 75.000/día; Mega USD 39/mes, 150.000/día. | Es el único plan publicado por debajo de USD 25 que cubre todo técnicamente: Pro USD 19/mes. | REST/JSON, API ya integrada. Bloqueo legal crítico: API-Football dice que no concede licencia de uso/publicación en apps o webs; cada cliente debe conseguir los derechos necesarios de las ligas/federaciones. No aprobar para producción solo por precio/cobertura. |
| **Football-Data.org** | Su cobertura actual enumera Primera A de Colombia y los seis torneos europeos; la página distingue free y tiers pagos, pero no deja inequívocamente visible el tier/campos activos para la temporada colombiana. La lista gratuita sí incluye los grandes torneos europeos, no Primera A. | Free incluye fixtures, tablas y calendarios/resultados retrasados; planes pagos añaden marcadores live, fixtures, tablas, alineaciones, goleadores y tarjetas. Estadísticas ampliadas son add-on. | Free: 10 requests/min y resultados/programación retrasados. Free w/ Livescores: 20/min; Standard: 60/min; Advanced: 100/min; Pro: 120/min. No publica SLA o latencia exacta para cada partido. | Free €0 (12 competiciones); Free w/ Livescores €12; Free + Deep Data €29; Standard €49 (30 competiciones); Advanced €99 (50); Pro €199 (100); add-on de estadísticas €15. | REST API v4 documentada, JSON y ejemplos. Exige atribución visible; la suscripción aplica a una aplicación/dominio. Los términos públicos no conceden con claridad una licencia amplia de publicación comercial ni derechos sobre escudos/fotos: pedir autorización escrita y verificar la cobertura de Colombia antes de integrar. |
| **Sportmonks** | Publica cobertura de 2.200+ ligas y página específica de Colombian Primera A; comercialmente deja elegir ligas. Verificar por endpoint/temporada la estructura de Apertura/Finalización y standings de Primera A. | Fixtures, resultados, live scores, standings y estadísticas base; incluye más datos y expansiones por feed/plan. REST/JSON con includes para evitar llamadas N+1. | La empresa publica “99,99% measured uptime” y describe verificación 24/7; son métricas propias, no garantía contractual. Precios muestran 2.000 calls por entidad/hora en Starter, 2.500 Growth y 3.000 Pro; otra sección genérica de su sitio menciona 5.000, por lo que el límite se debe confirmar en la oferta. Trial de 14 días puede cobrar automáticamente al terminar si no se cancela. | Starter €29/mes por 5 ligas; Growth €99 por 30; Pro €249 por 120; Enterprise cotizado para todas. Add-ons extra desde €4. | REST/JSON con documentación amplia. Contradicción legal crítica: los términos publicados dicen uso personal/no comercial, mientras la página Enterprise afirma que permite aplicaciones comerciales y distribución dentro del producto. No integrar a un sitio público sin aclaración/adenda firmada; logos/activos de terceros requieren autorización independiente. |
| **Goalserve** | Su lista de cobertura enumera Colombia Primera A/B y Copa Colombia, además de EPL, LaLiga, Serie A, Bundesliga, Ligue 1 y Champions. Las páginas oscilan entre 400+ ligas live y 1.000+ competiciones totales; confirmar feature por competición (especialmente tabla de Primera A). | Paquetes publican standings, live scores, fixtures/resultados, lineups y stats; algunos campos/ligas se venden por feed separado. | Afirma refresh de 2–5 s y 99% uptime, ambos datos del proveedor. Indica soporte 24/7 y varios centros de datos; no es sustituto de SLA contractual. Feed JSON o XML. | Live scores desde USD 150/mes, fixtures/resultados USD 150, live game stats USD 200, Full Stats sin odds USD 300 y Full Soccer USD 550 (la página ofrece tarifas por 1/6/12 meses; validar moneda/impuestos/alcance en cotización). | Integración REST/feed simple pero XML puede requerir adaptador; trial completo de 30 días anunciado. Licencia comercial/derechos no se pudieron confirmar en términos públicos consultados: pedir contrato y uso permitido antes de exponer datos. Excede el presupuesto de USD 25. |
| **Sportradar Soccer API** | Documentación anuncia 650+ competiciones en el paquete y cobertura por competición/temporada. Sus FAQs actuales mencionan Colombia Primera A y que desde 2026 Apertura/Clausura puede modelarse como etapas de una sola temporada; confirmar standings y campos exactos en la matriz de cobertura para el contrato ofrecido. | Season Standings, schedule/summaries/resultados, eventos y estadísticas por feeds separados; standings soporta tablas por grupo/etapa y live standings según competencia. | Endpoint de standings documenta 10 s TTL; el trial limita cobertura y aproximadamente 1 llamada/s. Estadísticas estacionales se actualizan en tiempo real para Tier 1; la disponibilidad regional depende del torneo. | No se encontró tarifario público; cotización empresarial. | API v4 JSON/XML y documentación detallada (52 feeds). Candidato de escalabilidad/soporte contractual; precio, derechos de exhibición, SLA, límites y Liga BetPlay deben quedar en propuesta y contrato. No cabe presumir cobertura comercial por el solo trial. |
| **Opta / Stats Perform** | Producto profesional con cobertura y feeds contratados; el portal informa que la cartera Global Sports Media ahora se ofrece como Opta. La cobertura específica de Primera A y de cada campo no es públicamente comprobable sin cotización. | Oferta de feeds profesionales; standings, eventos y estadísticas dependen del producto/contrato. | El detalle de actualización, límites y SLA se negocia. | Cotización; no hay tarifa pública de autoservicio encontrada. | Alternativa de alto nivel para una etapa comercial mayor, pero demasiado opaca y presumiblemente sobredimensionada para el MVP. Pedir demo de datos de Liga BetPlay, documentación de integración, licencia web y SLA antes de considerarla. |

## Encaje con Pont3la10 y decisión propuesta

1. **No reemplazar ni exponer el proveedor actual todavía.** El código ya usa
   API-Sports para resultados; aprovechar ese adaptador sería el piloto más
   pequeño, pero solo tras aclarar derechos de publicación con el proveedor y,
   cuando aplique, el titular de datos/logos.
2. **Consulta comercial antes de elegir:** enviar el caso exacto (sitio editorial
   público, país, monetización potencial, caché/retención y uso de logos) a
   API-Football, Football-Data.org y Sportmonks. Pedir respuesta escrita que
   cubra publicación web comercial, territorios, atribución, retención/cache,
   logo/escudos, garantía/SLA, cobertura de standings Primera A/2026 y coste
   total. No activar trials que soliciten tarjeta o se conviertan en pago.
3. **Criterio de selección:** el proveedor debe devolver standings oficiales de
   Primera A 2026 con su etapa correcta (Apertura/Finalización), fixtures y
   resultados conciliables, latencia/límites compatibles con caché servidor,
   autorización comercial expresa, derechos de marcas separados y coste
   mensual aceptable. Luego validar con un set de jornadas de DIMAYOR antes de
   desplegar.
4. **Modelo de integración sugerido:** mantener proveedor solo en servidor;
   normalizar temporada/etapas/grupos/filas en un contrato interno; cachear la
   tabla y renovarla ante cambio de partido, no por visitante; registrar origen
   y hora de actualización; mostrar estado “actualizado” y degradación sin
   datos inventados. No persistir ni publicar escudos sin permiso verificable.
5. **Conclusión sobre precio:** bajo el presupuesto vigente de USD 25/mes no hay
   opción confirmada de cobertura total + licencia de publicación. API-Football
   Pro es el encaje técnico/precio, no el encaje legal; Sportmonks Starter no
   cubre las siete competiciones y tiene contradicción de licencia; proveedores
   con licencia comercial clara o contrato requieren cotización y exceden el
   tope conocido. Se deja selección en espera de respuesta escrita, no de
   preferencia de marca.

## Fuentes oficiales consultadas

- API-Football: [precios](https://www.api-football.com/pricing),
  [cobertura](https://www.api-football.com/coverage),
  [términos](https://www.api-football.com/terms),
  [documentación](https://www.api-football.com/documentation-v3).
- Sportmonks: [planes](https://www.sportmonks.com/football-api/plans-pricing/),
  [cobertura](https://www.sportmonks.com/football-api/coverage/),
  [Colombian Primera A](https://www.sportmonks.com/glossary/colombian-primera-a-colombia/),
  [documentación de standings](https://docs.sportmonks.com/v3/endpoints-and-entities/endpoints/standings/get-all-standings),
  [términos](https://www.sportmonks.com/terms-of-service/),
  [resumen contractual Enterprise](https://www.sportmonks.com/football-api/enterprise-plan-v2/).
- Football-Data.org: [precios](https://www.football-data.org/pricing),
  [cobertura](https://www.football-data.org/coverage),
  [condiciones/atribución](https://www.football-data.org/about),
  [quickstart v4](https://www.football-data.org/documentation/quickstart).
- Goalserve: [precios](https://goalserve.com/en/sport-data-feeds/football-api/prices),
  [cobertura del paquete](https://www.goalserve.com/ru/sport-data-feeds/full-package-api/coverage),
  [API de fútbol](https://www.goalserve.com/es/sport-data-feeds/football-api/prices).
- Sportradar: [overview/cobertura Soccer API](https://developer.sportradar.com/soccer/docs/soccer-ig-overview),
  [endpoint Season Standings](https://developer.sportradar.com/soccer/reference/soccer-season-standings),
  [guía de standings](https://developer.sportradar.com/soccer/docs/soccer-ig-tracking-standings),
  [FAQ de temporadas Apertura/Clausura](https://developer.sportradar.com/soccer/reference/soccer-extended-faq).
- Opta / Stats Perform: [portal de cliente Opta Core](https://client.core.optasports.com/login).

**Nota:** los términos y tarifas cambian. Esta investigación orienta el
backlog; no constituye asesoría legal ni sustituye una autorización escrita del
proveedor o de los dueños de derechos de competición/imagen.
