# HU-ED-01 Fundacion Del CMS Editorial

## Estado

Propuesta lista para refinamiento tecnico.

## Historia De Usuario

Como propietario de Pont3la10, quiero disponer de un panel editorial privado,
separado de la experiencia publica y protegido por permisos verificables, para
que el equipo pueda administrar contenido sin exponer datos ni acciones
internas a los usuarios registrados del sitio.

## Objetivo

Construir la base tecnica, visual y de seguridad del CMS editorial. Esta
historia debe establecer:

- La diferencia entre una cuenta publica y un integrante del equipo editorial.
- El control de acceso por roles y permisos.
- La proteccion de rutas, APIs y datos administrativos.
- La estructura principal de navegacion del panel.
- El modelo inicial de publicaciones y flujo editorial.
- La auditoria minima de acciones sensibles.
- Las condiciones que deberan reutilizar las siguientes historias.

Esta HU no entrega todavia el editor avanzado de publicaciones. Su objetivo es
que el CMS tenga una base segura antes de agregar CRUD, multimedia, taxonomias
avanzadas o automatizaciones.

## Contexto

Pont3la10 permite que cualquier lector cree una cuenta para futuras funciones
publicas. Por esta razon, tener una sesion valida no significa pertenecer al
equipo editorial.

La implementacion actual de `/admin` comprueba la sesion en el cliente, pero no
valida un permiso editorial durante el renderizado del servidor. Las politicas
RLS protegen parte de los datos, pero no reemplazan la autorizacion de rutas y
operaciones.

La solucion debe aplicar seguridad en profundidad:

1. Autenticacion de la identidad.
2. Autorizacion editorial en servidor.
3. Autorizacion en cada endpoint.
4. Politicas RLS en PostgreSQL.
5. Auditoria de operaciones sensibles.

## Decisiones De Arquitectura

### Ubicacion Del Panel

El panel vivira dentro del mismo proyecto Nuxt y el mismo dominio:

```text
/                         Sitio publico
/login                    Login general
/admin                    Panel editorial
/api/admin/*              API editorial protegida
```

Esta decision mantiene el monolito modular definido para Pont3la10, reduce
complejidad de despliegue y permite compartir autenticacion, tipos y sistema de
diseno.

El panel usara un layout independiente y no reutilizara el header, footer ni la
navegacion publica.

### Separacion Logica

La aplicacion se organizara por dominios:

```text
auth          Sesiones, MFA, perfiles, roles y permisos
editorial     Publicaciones, revisiones y flujo de aprobacion
media         Archivos y metadatos multimedia
taxonomia     Categorias, vocabularios y terminos
ingestas      Fuentes manuales y automatizadas
socials       Distribucion interna hacia redes
auditoria     Registro de acciones administrativas
```

### Sesion Verificable En Servidor

La sesion editorial debe estar disponible durante SSR. No se considerara
suficiente una sesion almacenada solamente en `localStorage`.

La autenticacion debera usar una estrategia compatible con SSR y cookies, o un
mecanismo equivalente que permita al servidor verificar el token antes de
renderizar `/admin`.

Cada solicitud debera crear su propio cliente Supabase asociado a la sesion del
usuario. Nunca se compartira una sesion entre solicitudes.

## Actores

### Usuario Publico

- Puede registrarse e iniciar sesion.
- Puede usar funciones personales del sitio.
- No recibe roles editoriales automaticamente.
- No puede ver ni consultar recursos del panel.

### Usuario Editorial

- Tiene una cuenta confirmada.
- Fue invitado o promovido por un administrador.
- Tiene al menos un rol editorial activo.
- Sus acciones dependen de permisos explicitos.

## Roles Iniciales

| Rol | Responsabilidad |
| --- | --- |
| `propietario` | Control total y decisiones criticas |
| `administrador` | Equipo, configuracion, integraciones y contenido |
| `editorJefe` | Revisa, aprueba, programa y publica |
| `editor` | Revisa y modifica contenido del equipo |
| `autor` | Crea y edita sus propios borradores |
| `colaborador` | Propone borradores sin capacidad de publicar |

En la primera entrega solo se asignara `propietario` al usuario fundador. Los
demas roles quedaran definidos y probados para crecimiento futuro.

## Permisos Iniciales

Los roles agruparan capacidades. El codigo no dependera de condicionales
dispersos como `rol === 'admin'`.

```text
panel.acceder
contenido.verBorradores
contenido.crear
contenido.editarPropio
contenido.editarTodos
contenido.enviarRevision
contenido.revisar
contenido.aprobar
contenido.programar
contenido.publicar
contenido.archivar
media.ver
media.subir
media.editar
media.eliminar
taxonomia.ver
taxonomia.gestionar
ingestas.ver
ingestas.gestionar
equipo.ver
equipo.gestionar
configuracion.ver
configuracion.gestionar
auditoria.ver
```

Toda autorizacion sera denegada cuando el permiso no exista, el rol este
inactivo o la sesion no sea valida.

## Matriz De Acceso Resumida

| Accion | Propietario | Administrador | Editor jefe | Editor | Autor | Colaborador |
| --- | --- | --- | --- | --- | --- | --- |
| Acceder al panel | Si | Si | Si | Si | Si | Si |
| Crear borrador | Si | Si | Si | Si | Si | Si |
| Editar contenido ajeno | Si | Si | Si | Si | No | No |
| Aprobar contenido | Si | Si | Si | No | No | No |
| Publicar | Si | Si | Si | No | No | No |
| Gestionar taxonomia | Si | Si | Si | No | No | No |
| Gestionar equipo | Si | Si | No | No | No | No |
| Configurar integraciones | Si | Si | No | No | No | No |
| Consultar auditoria | Si | Si | No | No | No | No |

La matriz completa debera existir como datos o constantes tipadas y contar con
pruebas unitarias.

## Estructura Del Panel

El panel tendra una navegacion lateral estable y un area central de trabajo.

```text
Centro editorial
Ingestas
Contenidos
Medios
Taxonomias
Calendario
Redes
Equipo
Configuracion
Auditoria
```

En esta HU se implementaran:

- Layout administrativo independiente.
- Dashboard base en `/admin`.
- Identidad del usuario y rol activo.
- Navegacion responsive.
- Cierre de sesion.
- Estado de acceso denegado.
- Ocultamiento de secciones sin permiso.

No se mostraran enlaces hacia modulos que todavia no tengan una pantalla
funcional. Las siguientes HUs agregaran las entradas progresivamente.

## Modelo Editorial Inicial

La fundacion debe reconocer una entidad comun de publicacion. Noticias, blogs,
analisis e informes no se modelaran como sistemas desconectados.

### Tipos De Contenido

```text
breve
noticia
analisis
opinion
informe
especial
```

### Campos Comunes

- Identificador.
- Tipo de contenido.
- Titulo.
- Slug.
- Bajada o resumen.
- Estado editorial.
- Autor principal.
- Categoria principal.
- Origen del borrador.
- Fecha de creacion y actualizacion.
- Fecha de publicacion o programacion.
- Version actual.
- Configuracion SEO basica.

### Origen Del Borrador

```text
manual
ingesta
importacion
asistenteIa
```

Un borrador manual y uno generado desde Telegram terminaran en el mismo flujo
editorial. El origen solo aporta trazabilidad.

## Flujo Editorial Base

```text
borrador
  -> enRevision
  -> cambiosSolicitados
  -> aprobado
  -> programado
  -> publicado
  -> archivado
```

Reglas:

- Un colaborador o autor puede enviar un borrador a revision.
- Un editor puede solicitar cambios.
- Solo un usuario con `contenido.aprobar` puede aprobar.
- Solo un usuario con `contenido.publicar` puede publicar.
- Una publicacion visible no se sobrescribe directamente.
- La edicion de contenido publicado genera una nueva revision.
- La version publica permanece estable hasta aprobar la nueva revision.

Las transiciones se validaran en servidor y base de datos, no solo en la UI.

## Modelo De Datos Propuesto

La migracion debera conservar y evolucionar las tablas existentes:

```text
user_profiles
roles
permissions
user_roles
role_permissions
articles
article_versions
editorial_audit_logs
```

Los nombres definitivos de tablas respetaran las convenciones PostgreSQL del
proyecto. Los nombres de dominio en TypeScript se expresaran en espanol y
`camelCase`.

### Auditoria Minima

Cada registro de auditoria incluira:

- Usuario.
- Accion.
- Recurso y su identificador.
- Estado anterior y nuevo cuando aplique.
- Fecha.
- IP resumida o identificador de solicitud.
- Resultado exitoso o denegado.
- Metadatos tecnicos sin secretos.

Se auditaran como minimo:

- Inicio y cierre de sesion editorial.
- Accesos denegados.
- Asignacion o retiro de roles.
- Cambios de permisos.
- Cambios de configuracion.
- Aprobacion, publicacion y archivado cuando esas funciones existan.

## Requisitos De Seguridad

- RLS activa en todas las tablas editoriales.
- Ninguna `serviceRoleKey` disponible en frontend.
- Verificacion de permisos en cada endpoint.
- Registro publico sin asignacion editorial.
- Alta editorial solo mediante invitacion o accion administrativa.
- MFA obligatorio para `propietario`, `administrador` y usuarios con permiso de publicar.
- Reautenticacion para cambiar roles, permisos o integraciones.
- Respuestas de `/admin` con `Cache-Control: no-store`.
- Metadatos `noindex`, `nofollow` y `noarchive`.
- Header `X-Robots-Tag` para rutas administrativas.
- Proteccion contra redirecciones abiertas en el parametro `redirigir`.
- Validacion de entradas con Zod.
- Mensajes de error sin detalles de infraestructura.
- Rate limiting en autenticacion y endpoints sensibles.
- Revocacion efectiva de sesiones cuando un integrante sea suspendido.

Ocultar el enlace al panel no se considerara una medida de seguridad.

## Comportamiento Esperado

### Visitante Sin Sesion

Al solicitar `/admin`, el servidor redirige a:

```text
/login?redirigir=/admin
```

### Usuario Publico Autenticado

Al solicitar `/admin`, recibe una pantalla de acceso denegado o una respuesta
HTTP `403`. No puede consultar datos internos.

### Usuario Editorial Sin MFA Requerido

Puede acceder si posee `panel.acceder`.

### Usuario Editorial Con MFA Pendiente

Es dirigido al flujo de verificacion MFA antes de acceder a acciones que
requieran nivel `aal2`.

### Usuario Editorial Autorizado

Ve el dashboard, su identidad, rol activo y solamente las opciones permitidas.

## Criterios De Aceptacion

- Una cuenta publica no obtiene roles editoriales al registrarse.
- `/admin` se protege durante SSR y navegacion cliente.
- Una sesion valida sin `panel.acceder` recibe `403` o acceso denegado.
- Un usuario sin sesion es redirigido al login.
- El parametro de retorno solo acepta rutas internas permitidas.
- Cada endpoint `/api/admin/*` verifica sesion y permiso.
- Una llamada directa a Supabase sin permiso es rechazada por RLS.
- Un autor no puede publicar ni editar contenido ajeno.
- Un editor jefe puede aprobar y publicar.
- Solo propietario o administrador pueden gestionar el equipo.
- La UI oculta acciones no autorizadas, sin usar ese ocultamiento como unica barrera.
- Los cambios de rol quedan registrados en auditoria.
- Los roles sensibles exigen MFA.
- El panel no aparece en sitemap ni puede indexarse.
- Las respuestas administrativas no se almacenan en cache compartida.
- El panel funciona en escritorio, tableta y movil.
- Las rutas publicas existentes siguen funcionando.

## Pruebas Requeridas

### Unitarias

- Matriz de roles y permisos.
- Evaluacion de `tienePermiso`.
- Transiciones validas e invalidas del flujo editorial.
- Validacion del parametro `redirigir`.
- Mensajes de acceso denegado.

### Integracion

- Sesion publica contra endpoint editorial.
- Sesion editorial con y sin permiso.
- Politicas RLS por rol.
- Asignacion y retiro de rol.
- Registro de auditoria.
- Exigencia de `aal2` en operaciones sensibles.

### E2E

- Visitante entra a `/admin`.
- Lector autenticado intenta entrar.
- Propietario entra al dashboard.
- Autor intenta ejecutar una accion de publicacion.
- Administrador suspende el acceso de un integrante.
- Navegacion responsive del panel.

### Validacion Tecnica

```bash
npm.cmd run lint
npm.cmd run test:unit
npm.cmd run typecheck
npm.cmd run build
```

## Fuera De Alcance

- Editor visual por bloques.
- CRUD completo de publicaciones.
- Biblioteca multimedia funcional.
- Administracion avanzada de taxonomias.
- Ingesta desde Telegram, TikTok o WhatsApp.
- Transcripcion.
- Generacion de contenido con IA.
- Programacion real de publicaciones.
- Distribucion automatica a redes.
- Analitica editorial.

Estas capacidades dependeran de la fundacion creada en esta HU.

## Entregables

- Migraciones versionadas de roles, permisos y auditoria.
- Sesion compatible con validacion SSR.
- Middleware editorial de servidor y cliente.
- Helper global de autorizacion.
- Proteccion de APIs administrativas.
- Politicas RLS actualizadas.
- Layout administrativo responsive.
- Dashboard base.
- Pantalla de acceso denegado.
- Flujo MFA para roles sensibles.
- Pruebas unitarias, de integracion y E2E definidas.
- Documentacion de asignacion del primer propietario.

## Definicion De Terminado

La HU se considera terminada cuando:

- Ningun usuario publico puede acceder a recursos editoriales.
- La autorizacion se aplica en UI, servidor y base de datos.
- El propietario puede acceder al panel con MFA.
- Los roles y permisos tienen pruebas automatizadas.
- El panel tiene layout y navegacion base funcional.
- Las acciones sensibles generan auditoria.
- No se introducen secretos en el repositorio.
- Lint, pruebas, typecheck y build finalizan correctamente.
- La implementacion fue revisada desde seguridad y accesibilidad.

## Riesgos

| Riesgo | Mitigacion |
| --- | --- |
| Confundir usuario registrado con editor | Rol editorial explicito y denegacion por defecto |
| Confiar solo en middleware cliente | Verificacion SSR, API y RLS |
| Permisos dispersos por componentes | Helper central y matriz tipada |
| Exponer claves privilegiadas | Secretos exclusivos de servidor |
| Bloquear al propietario por MFA | Flujo documentado de recuperacion |
| Cambios de rol sin trazabilidad | Auditoria obligatoria |
| Crecimiento desordenado del panel | Layout modular y rutas por dominio |

## Historias Dependientes

Despues de completar esta fundacion, el orden recomendado es:

1. `HU-ED-02` Modelo editorial, revisiones y taxonomia.
2. `HU-ED-03` Creacion manual y editor de publicaciones.
3. `HU-ED-04` Biblioteca multimedia.
4. `HU-ED-05` Revision, aprobacion y programacion.
5. `HU-ED-06` Publicacion web y SEO editorial.
6. `HU-ED-07` Bandeja de ingestas.
7. `HU-ED-08` Telegram y generacion asistida de borradores.

## Referencias

- WordPress: roles y capacidades.
- Ghost: permisos del equipo editorial.
- Drupal: moderacion y revisiones.
- Contentful: taxonomias y permisos granulares.
- Supabase: Auth, MFA, RLS y Storage.
- OWASP: autorizacion, XSS, uploads y auditoria.
