# Plan técnico — HU-ED-07

Actualización: 2026-09-10. Planeación, sin implementación autorizada.
Rama aislada: `codex/hu-ed-07-aislada`. Base: `ff28d4c` (`origin/main`, 2026-09-15).
El diseño local anterior se preservó desde `358f7d6793bf64b188ca51a9300119564c2d5b6d`;
no implica que sus migraciones estén aplicadas en Supabase remoto.

## Alcance confirmado por el propietario

HU-ED-07 entrega metadatos, transcripción original y traducción al español para inglés. Redacción y creación de borrador quedan en HU-ED-08. Esta decisión sustituye el plan anterior hasta artículo. Ningún trabajo de HU-ED-07 escribe artículos ni publica contenido.

Se separa `ingestas.registrar` para colaborador, autor, editor, editorJefe, propietario y administrador. `ingestas.gestionar` conserva reintento/cancelación exclusivamente para propietario y administrador. Colaborador/autor consultan sus ingestas; los demás mantienen la lectura ya concedida. La cuenta técnica no obtiene acceso al panel ni capacidades editoriales humanas.

## Resultado esperado

Registrar un TikTok válido lo encola con respuesta rápida. Un worker Node independiente y secuencial coordina Python para extraer audio temporal, limitar duración a 180 segundos y transcribir es/en. Para inglés persiste original antes de llamar al proveedor de traducción. El cierre atómico deja `evidence_ready` con recibo idempotente. Cerrar el navegador no interrumpe al worker.

El reinicio recupera reservas vencidas de forma acotada; tokens antiguos no pueden mutar resultados. Eliminar audio y temporales, con recuperación tras cierre abrupto. Corroboración independiente queda pendiente de revisión humana posterior.

## Evidencia y diseños

- [Preflight B0](PREFLIGHT_HU_ED_07.md): Git/herramientas comprobados; remoto y línea base completa pendientes.
- [Diseño SQL 0013](DISENO_SQL_0013_HU_ED_07.md): esquema, permisos, RPC, locks, transición legacy y rollback.
- [Contratos JSON](CONTRATOS_HU_ED_07.md): worker/Python/traducción y frontera redacción HU-ED-08, errores y pruebas.
- [Desglose B0–B7](DESGLOSE_HU_ED_07.md): entregas secuenciales y gates.

Son propuestas revisables; parámetros operativos nuevos no se presentan como reglas aprobadas ni como pruebas ejecutadas.

## Diagnóstico del código

| Área | Estado real | Cambio futuro |
|---|---|---|
| Registro | INSERT pending, gestión superior | Capacidad de registro y RPC de encolado |
| Inicio | Botón/endpoint síncrono por ID | Worker y cola |
| Reserva | started_at, 15 min, sin token | Lease/deadline y token privado |
| Python | es forzado, validación superficial | es/en, contrato estricto, límites/limpieza |
| Evidencia | Produce artículo con transcripción | Termina evidence_ready sin artículo |
| Finalización | Artículo y complete separados | Cierre atómico de evidencia; artículo en HU-ED-08 |
| RLS | INSERT autenticado solo pending | Registro por RPC y lectura humana por capacidad/propiedad |
| Recuperación | RPC antiguas sin token | Desactivar protocolo antiguo en corte coordinado |

## Estados y recuperación

Estados: pending legacy, queued, processing, evidence_ready, failed, cancelled; conservar draft_created histórico. Etapas: validating_source, reading_metadata, downloading_audio, transcribing, translating, persisting_evidence, completed. No representar etapas como estados.

Nuevo registro usa protocolo 2. Pending antiguos requieren promoción autorizada. Finalizar evidencia no equivale a draft_created. Checkpoint original confirmado antes de traducir permite recuperación segura.

DB impone reserva única y guarda tokens en schema privado. Cada intento tiene usuario/instancia, token nuevo y deadline. Complete/fail/heartbeat verifican propiedad y tiempo DB después de locks. Replay idéntico devuelve recibo; payload distinto devuelve conflicto. Además del lease, Node debe detener el árbol de procesos al perderlo.

## Implementación futura prevista

Modificar endpoints/repositorio de ingestas, tipos/validaciones/permisos centralizados, panel y transcriptor. Agregar worker Node, dependencias Python fijadas, pruebas y configuración. `0013_ingesta_worker_durable.sql` solo se creará después de autorización y contraste de catálogo. No modificar ahora .env.example, package.json, migraciones ni código.

Proveedor dividido: traducción (B3) y redacción (HU-ED-08). Variables de cuenta técnica y proveedor se configurarán localmente al implementar; no solicitarlas ahora. No crear aún cuenta, .venv ni modelos.

## Orden y validación

B0 → B1 cola/permisos → B2 Python → B3 traducción → B4 worker → B5 evidencia → B6 panel → B7 QA/piloto. B1 requiere remoto contrastado para implementar, aunque la propuesta documental pueda revisarse antes.

Pruebas críticas: claim/cancel/requeue concurrentes, tokens/lease vencidos, replay, aislamiento worker, original conservado tras fallo, límites/SSRF/limpieza, cero escrituras en artículos y regresión roles/editor/SSR. Al implementar: lint, typecheck, test:unit y build según bloque/riesgo, secuenciales. No build junto con Whisper.

## Rollback y gates

0013 conserva datos, pero cambia protocolo: activación coordinada, nunca aislada sobre endpoint síncrono. Detener worker y conservar cola/evidencia ante incidente. No reactivar RPC sin token ni reinterpretar evidence_ready como borrador.

- [x] Rama/commit comprobados, sin cambios locales iniciales.
- [x] Python3.11 y recursos identificados sin instalación.
- [x] Alcance y separación de permisos confirmados.
- [x] SQL/JSON y matriz de pruebas documentados para revisión.
- [ ] Catálogo remoto 0010–0012, RLS/grants/firmas comprobados.
- [ ] Diseño y parámetros operativos aprobados.
- [ ] Línea base completa ejecutada cuando corresponda.
- [ ] Autorización explícita `/IMPLEMENTAR HU-ED-07`.

No solicitar implementación como si B0 estuviera cerrado. Secretos, instalaciones, migraciones remotas y pruebas reales se coordinan en su momento; aprobar documentos no las autoriza.
