# ConekTa MVP 1.0

## Entrega académica

Consulta el [expediente académico](docs/academico/README.md): requisitos y trazabilidad, diagramas, justificación del matching, verificación técnica y protocolo de evaluación con usuarios. El piloto humano está pendiente; no se presentan resultados simulados como evidencia.

Para colaborar con el equipo, consulta la [guía de contribución](CONTRIBUTING.md).

> Tu talento merece una primera oportunidad.

Base full-stack ejecutable para conectar estudiantes de últimos semestres y profesionales recién graduados con empresas que buscan talento joven. Es un monorepo npm con React/Vite en el cliente y NestJS/Prisma/PostgreSQL en la API.

## Requisitos

- Node.js 20 o superior
- npm 10 o superior
- Docker Desktop con Docker Compose

Antes de ejecutar PostgreSQL en Windows, abre Docker Desktop y espera a que indique que el motor está en ejecución. Puedes comprobarlo con `docker info`.

## Inicio rápido

Desde la raíz del proyecto:

```bash
copy .env.example .env
npm install
docker compose up -d postgres mailpit minio minio-init
npm run db:generate
npm run db:migrate
npm run dev
```

En macOS o Linux, sustituye el primer comando por `cp .env.example .env`.

Servicios disponibles:

- Web: http://localhost:5174
- API: http://localhost:3000
- Health check con verificación real de PostgreSQL: http://localhost:3000/health
- Swagger/OpenAPI: http://localhost:3000/docs
- PostgreSQL: `localhost:5433` (el contenedor usa internamente el puerto `5432`)
- Bandeja SMTP de desarrollo: http://localhost:8025
- API S3/MinIO: http://localhost:9000
- Consola MinIO: http://localhost:9001

## Ejecutar cada servicio

PostgreSQL:

```bash
docker compose up -d postgres
```

Backend (requiere PostgreSQL iniciado y migrado):

```bash
npm run dev:api
```

Frontend:

```bash
npm run dev:web
```

Frontend y backend juntos:

```bash
npm run dev
```

Para detener PostgreSQL sin eliminar sus datos:

```bash
docker compose stop postgres
```

## Variables de entorno

El archivo raíz `.env.example` documenta toda la configuración. Los comandos `db:*` cargan explícitamente el `.env` raíz, incluso cuando npm ejecuta Prisma dentro del workspace `apps/api`. La API también reconoce `apps/api/.env` y la web puede usar `apps/web/.env` para sobrescrituras locales. Nunca se debe versionar un `.env` real.

| Variable                                 | Uso                                                                     |
| ---------------------------------------- | ----------------------------------------------------------------------- |
| `DATABASE_URL`                           | Conexión de Prisma a PostgreSQL                                         |
| `API_PORT`                               | Puerto HTTP de NestJS                                                   |
| `JWT_SECRET`                             | Secreto de firma JWT, mínimo 32 caracteres                              |
| `JWT_EXPIRES_IN`                         | Duración prevista de tokens                                             |
| `JWT_REFRESH_SECRET`                     | Secreto independiente para refresh tokens, mínimo 32 caracteres         |
| `JWT_REFRESH_EXPIRES_IN`                 | Duración de la sesión renovable                                         |
| `CORS_ORIGIN`                            | Orígenes permitidos, separados por coma                                 |
| `VITE_API_URL`                           | URL pública de la API para React                                        |
| `WEB_PORT`                               | Puerto publicado por Nginx en el despliegue Docker                      |
| `WEB_URL`                                | URL base usada en enlaces de verificación y recuperación                |
| `MAIL_ENABLED`, `SMTP_*`, `MAIL_FROM`    | Transporte SMTP real; Mailpit se usa únicamente en desarrollo           |
| `STORAGE_ENABLED`, `S3_*`                | Bucket S3-compatible, credenciales, endpoint opcional y URL pública/CDN |
| `ADMIN_EMAIL`                            | Correo del administrador creado por seed                                |
| `ADMIN_PASSWORD`                         | Contraseña configurable del administrador, entre 12 y 72 caracteres     |
| `DEMO_SEED_ENABLED`                      | Habilitación explícita del seed académico; por defecto `false`          |
| `DEMO_ADMIN_EMAIL`, `DEMO_COMPANY_EMAIL` | Correos configurables de las cuentas demo                               |
| `DEMO_CANDIDATE_EMAILS`                  | Exactamente tres correos demo separados por coma                        |
| `DEMO_PASSWORD`                          | Contraseña común demo configurable; nunca está escrita en el código     |

## Comandos de calidad y datos

```bash
npm run lint
npm run typecheck
npm run test:unit
npm run test:e2e
npm run test:academic
npm run build
npm run format
npm run db:generate
npm run db:migrate
npm run db:studio
npm run db:seed
npm run db:seed:demo
```

## Autenticación y roles

El registro público admite únicamente `CANDIDATE` (Busco oportunidades) y `COMPANY` (Represento una empresa). Los administradores se crean exclusivamente mediante el seed. Las contraseñas y refresh tokens se almacenan como hashes `scrypt` con salt aleatorio; nunca se persisten en texto plano.

La API entrega un access token JWT y mantiene el refresh token rotatorio en una cookie `HttpOnly`. El logout invalida el refresh token persistido y elimina la cookie. Los endpoints privados comprueban en cada solicitud que el usuario exista y siga activo.

Endpoints principales:

- `POST /auth/register`
- `POST /auth/login`
- `POST /auth/refresh`
- `POST /auth/logout` — requiere Bearer token
- `GET /auth/me` — requiere Bearer token
- `GET/PATCH /profiles/me` — candidatos y empresas
- `GET /users` — solo administradores
- `GET/POST/PATCH/DELETE /skills` — lectura autenticada; escritura solo para administradores
- `GET/PATCH /candidate/profile` — perfil agregado y edición del candidato autenticado
- `/candidate/educations`, `/candidate/skills`, `/candidate/projects`, `/candidate/certifications` — CRUD con ownership
- `GET /candidate/opportunities` y `GET /candidate/applications`
- `POST/DELETE /candidate/applications/:vacancyId` — postularse o retirar la postulación
- `GET/PATCH /company/profile` — perfil de la empresa autenticada
- `GET /company/dashboard` — resumen real de vacantes y postulaciones
- `GET/POST/PATCH/DELETE /company/vacancies` — administración con ownership
- `POST /company/vacancies/:id/publish` y `POST /company/vacancies/:id/close`
- `GET /company/applications` — candidatos y postulaciones recibidas
- `GET /opportunities` y `GET /opportunities/:id` — catálogo público; solo vacantes publicadas

Rutas web:

- `/login`, `/register` y `/onboarding`
- `/candidate`, `/company/*` y `/admin`, protegidas por rol
- `/opportunities` y `/opportunities/:id`, accesibles públicamente

## Perfil del candidato

El dashboard `/candidate` incluye inicio, perfil, formación, habilidades, proyectos, certificaciones, oportunidades y postulaciones. El porcentaje de completitud se calcula en el backend con datos persistidos: información profesional (50%), formación (15%), al menos tres habilidades (15%), proyectos (10%), certificaciones (5%) y disponibilidad/intereses (5%).

El catálogo de habilidades no se llena con datos ficticios. Un administrador crea las habilidades reales desde `POST /skills` en Swagger y luego los candidatos pueden agregarlas a su perfil indicando nivel `BASIC`, `INTERMEDIATE` o `ADVANCED`.

Todas las mutaciones de formación, proyectos, certificaciones y habilidades resuelven primero el perfil desde el JWT. Un candidato no puede consultar ni modificar recursos mediante un identificador que pertenezca a otro candidato.

## Módulo empresarial y oportunidades

El dashboard `/company` incluye resumen, perfil de empresa, vacantes, candidatos y postulaciones. El perfil persiste identidad corporativa, sector, tamaño, ubicación, canales de contacto y estado de verificación. El logo se registra mediante una URL; no se simula una carga de archivos.

Las vacantes tienen ciclo `DRAFT` → `PUBLISHED` → `CLOSED`. Una empresa solo puede consultar y modificar sus propios registros. La experiencia parte de `NO REQUERIDA`, con cero meses como valor predeterminado, y cada habilidad se clasifica como `REQUIRED` o `DESIRED` con peso de 1 a 5. La API valida rangos salariales, fechas, ownership y transiciones de estado.

El catálogo `/opportunities` admite filtros por palabra clave, ciudad, modalidad y tipo de oportunidad. Tanto el listado como el detalle excluyen borradores y vacantes cerradas. Un candidato autenticado puede postularse desde el detalle; las postulaciones duplicadas son rechazadas por la base de datos y por la API.

Flujo manual recomendado:

1. Registra una cuenta `COMPANY`, inicia sesión y completa `/company/profile`.
2. Si necesitas habilidades, créalas como administrador desde Swagger (`POST /skills`).
3. Crea una vacante en `/company/vacancies`, agrega habilidades y publícala.
4. Abre `/opportunities` en una ventana privada y confirma filtros y detalle.
5. Registra una cuenta `CANDIDATE`, abre la vacante y pulsa **Postularme**.
6. Regresa como empresa y confirma la postulación en Candidatos o Postulaciones.
7. Cierra la vacante y comprueba que deja de aparecer en el catálogo público.

## Crear o actualizar el administrador inicial

Edita exclusivamente tu `.env` local y define valores propios:

```dotenv
ADMIN_EMAIL=admin@tu-dominio.com
ADMIN_PASSWORD=una_clave_larga_y_unica
```

Después ejecuta:

```bash
npm run db:seed
```

El seed es idempotente: crea el administrador si no existe, o actualiza su contraseña, rol y estado si el correo ya existe. Las credenciales son exactamente las variables que configuraste; el proyecto no genera ni incluye una contraseña predeterminada.

## Arquitectura

```text
conekta/
├── apps/
│   ├── api/                 # NestJS, Prisma, Swagger y PostgreSQL
│   │   ├── prisma/          # Esquema y migraciones versionadas
│   │   └── src/
│   │       ├── common/      # Filtros e infraestructura transversal
│   │       ├── config/      # Validación del entorno
│   │       ├── health/      # Estado de API y base de datos
│   │       └── prisma/      # Ciclo de vida del cliente Prisma
│   └── web/                 # React, Vite, Tailwind y shadcn/ui
│       └── src/
│           ├── components/  # Layout y componentes UI reutilizables
│           ├── lib/         # Query Client y utilidades
│           └── pages/       # Rutas de la aplicación
├── docker-compose.yml
└── package.json
```

La API valida el entorno al arrancar, aplica validación global de DTOs, CORS, cabeceras de seguridad y un formato consistente de errores. Prisma incluye usuarios, perfiles, habilidades, proyectos, certificaciones, vacantes y postulaciones con relaciones, índices y borrado en cascada definidos.

La web incluye formularios React Hook Form/Zod, sesión persistente, renovación automática, onboarding real y rutas protegidas con redirección según rol.

## ConekTa Matching Engine

El matching es determinístico, explicable y no utiliza servicios de IA. Se calcula en tiempo real con información persistida del candidato y de cada vacante publicada. Los pesos están centralizados en `DEFAULT_MATCHING_WEIGHTS`, por lo que pueden cambiarse sin modificar la lógica de cada criterio:

| Criterio                   | Peso máximo |
| -------------------------- | ----------: |
| Habilidades técnicas       |   50 puntos |
| Formación relacionada      |   20 puntos |
| Proyectos relacionados     |   15 puntos |
| Habilidades blandas        |   10 puntos |
| Disponibilidad y modalidad |    5 puntos |

Las habilidades se comparan por el identificador del catálogo. Dentro de cada categoría se utiliza el peso configurado por la empresa; una habilidad `REQUIRED` vale el doble que una `DESIRED`. El resultado es la proporción ponderada de habilidades presentes en el perfil. Las habilidades faltantes reportadas son exclusivamente habilidades requeridas registradas en la vacante.

La formación obtiene sus 20 puntos cuando el nombre del programa coincide de forma normalizada con alguna carrera relacionada. Los proyectos comparan únicamente título, descripción y tecnologías realmente registradas contra habilidades técnicas de la vacante. La disponibilidad obtiene sus 5 puntos cuando el candidato está disponible actualmente y acepta la modalidad solicitada.

Si una vacante no define criterios para formación, habilidades técnicas, proyectos o habilidades blandas, esa categoría no aporta puntos y se informa como «Sin criterio definido». Esto evita confundir información ausente con compatibilidad demostrada. Un puntaje bajo con criterios incompletos no significa falta de capacidad; comparar vacantes con distinta cobertura requiere cautela. El motor exige pesos finitos, no negativos y cuya suma sea 100, redondea cada categoría y limita el resultado a `0–100`. La experiencia laboral no participa en la puntuación. Los pesos son una hipótesis académica pendiente de validación: véanse [fórmula, ejemplo y limitaciones](docs/academico/matching.md).

Endpoints para candidatos:

- `GET /candidate/recommendations` — vacantes publicadas ordenadas de mayor a menor compatibilidad.
- `GET /candidate/matches/:vacancyId` — porcentaje, fortalezas, habilidades faltantes, desglose y recomendación.

Pruebas del motor:

```bash
npm run test:unit -w @conekta/api
```

## Sistema de postulaciones

Al postularse, ConekTa guarda candidato, vacante, empresa, fecha, estado y una copia del porcentaje de compatibilidad calculado en ese momento. Esta copia permite explicar la decisión aunque el candidato modifique posteriormente su perfil. La restricción única de PostgreSQL sobre candidato y vacante impide postulaciones duplicadas, incluso ante solicitudes simultáneas.

Estados y transiciones permitidas:

```text
APPLIED → UNDER_REVIEW → INTERVIEW → SELECTED
    └───────────────→ REJECTED ←────────┘
APPLIED / UNDER_REVIEW / INTERVIEW → WITHDRAWN (por el candidato)
```

Después de `SELECTED`, el flujo admite oferta (`OFFER_SENT`), aceptación o rechazo por el candidato y confirmación de contratación (`HIRED`). Los estados finales son `HIRED`, `OFFER_DECLINED`, `CANCELLED`, `REJECTED` y `WITHDRAWN`; consulta el [diagrama completo](docs/academico/diagramas.md). Cada transición crea un registro `ApplicationStatusHistory` con estado anterior, nuevo estado, actor y fecha. La empresa se guarda directamente en la postulación y también se valida contra la cuenta autenticada: una empresa no puede consultar, ordenar, abrir perfiles ni actualizar postulaciones ajenas.

Endpoints principales:

- `GET /candidate/applications` — postulaciones propias con historial.
- `POST /candidate/applications/:vacancyId` — postularse y guardar compatibilidad.
- `DELETE /candidate/applications/:vacancyId` — retirar un proceso activo.
- `GET /company/applications?vacancyId=&sort=` — filtrar y ordenar por `date`, `compatibility` o `name`.
- `GET /company/applications/:id` — detalle con perfil profesional e historial.
- `PATCH /company/applications/:id/status` — transición validada de estado.
- `GET /company/candidates/:candidateId` — perfil accesible solo si existe una postulación para la empresa.

Los dashboards muestran conteos consultados en PostgreSQL: postulaciones y procesos activos para candidatos; total, revisión, entrevistas y seleccionados para empresas.

## Dashboards por rol

- Candidato: `GET /candidate/profile` conserva el perfil y agrega métricas de postulaciones, vacantes con compatibilidad mínima de 60%, cinco mejores oportunidades y habilidades requeridas faltantes. Estas últimas se agregan exclusivamente desde `missingSkills` del motor de matching.
- Empresa: `GET /company/dashboard` entrega vacantes activas/cerradas, postulaciones nuevas/totales, entrevistas, seleccionados y hasta tres candidatos con mayor compatibilidad por vacante.
- Administrador: `GET /users/dashboard` entrega usuarios, candidatos, empresas, vacantes, postulaciones y oportunidades publicadas.

Todas las cifras se consultan en PostgreSQL en cada petición. La web usa carga diferida por ruta para separar los dashboards y reducir el JavaScript inicial.

## Panel de administración

La ruta `/admin/*` y todos los endpoints `/admin/*` exigen un JWT válido con rol `ADMIN`. `JwtAuthGuard` comprueba que la cuenta siga activa y `RolesGuard` devuelve `403` a candidatos y empresas. Ocultar módulos en React nunca sustituye esta validación del backend.

Módulos disponibles: Dashboard, Usuarios, Candidatos, Empresas, Vacantes, Postulaciones y Habilidades. Los listados utilizan búsqueda, filtros y paginación del lado servidor (`page`, `limit`, `search` y filtros propios). Las postulaciones son exclusivamente de consulta y auditoría.

Las acciones administrativas de activación, verificación, visibilidad y catálogo crean un `AuditLog` dentro de la misma transacción que el cambio. Cada registro conserva administrador, acción, entidad, identificador, fecha y datos operativos no sensibles. Nunca se registran contraseñas, access tokens ni refresh tokens.

Una vacante con `adminHidden=true` deja de estar disponible en catálogo público, matching y postulaciones, sin destruir el registro de la empresa. Una habilidad inactiva permanece relacionada con perfiles históricos, pero deja de ofrecerse a candidatos y empresas.

## Estabilización y seguridad

- Helmet configura cabeceras HTTP defensivas y CORS admite únicamente los orígenes explícitos de `CORS_ORIGIN` con credenciales.
- Los DTOs se procesan con `whitelist`, `forbidNonWhitelisted` y transformación; las URLs públicas requieren protocolo HTTP o HTTPS.
- Login y registro tienen límites independientes por IP y cuenta durante ventanas de 15 minutos. El limitador actual vive en memoria y debe reemplazarse por Redis al ejecutar múltiples instancias.
- Las contraseñas y refresh tokens usan `scrypt` con salt aleatorio y comparación constante. El login realiza una derivación incluso cuando el correo no existe para reducir diferencias temporales.
- El refresh token se almacena únicamente en cookie `HttpOnly`, `SameSite=Lax` y `Secure` en producción. El access token permanece solo en memoria; después de recargar, React restaura la sesión mediante la cookie sin leerla.
- Los errores 500 no exponen excepciones internas. La validación del entorno tampoco incluye valores o secretos en sus mensajes.
- Prisma parametriza las consultas; filtros y ordenamientos dinámicos están restringidos por DTOs y listas permitidas.
- React escapa el contenido textual y no utiliza `dangerouslySetInnerHTML`. Los enlaces aportados por usuarios se validan como HTTP/HTTPS.

Los tests e2e requieren PostgreSQL iniciado y migrado. Crean datos con prefijo `e2e-` y los eliminan al finalizar.

## Correo, recuperación y verificación

Al registrarse, ConekTa genera un token criptográficamente aleatorio, persiste únicamente su hash SHA-256 y envía un enlace de verificación por SMTP. El token expira en 24 horas y solo puede consumirse una vez. El usuario autenticado puede solicitar otro mediante `POST /auth/resend-verification`.

La recuperación usa `POST /auth/forgot-password` y siempre entrega la misma respuesta, exista o no la cuenta, para evitar enumeración de usuarios. El enlace expira en 30 minutos. `POST /auth/reset-password` cambia el hash `scrypt`, consume el token e invalida la sesión renovable existente.

En desarrollo, Mailpit recibe correos reales sin enviarlos a Internet:

```bash
docker compose up -d mailpit
```

Abre `http://localhost:8025`. En producción configura un proveedor SMTP transaccional y establece `MAIL_ENABLED=true`; no uses Mailpit.

Rutas web: `/forgot-password`, `/reset-password?token=...` y `/verify-email?token=...`.

## Archivos e imágenes

Las imágenes y archivos no se almacenan en PostgreSQL ni atraviesan el proceso NestJS. La API valida rol, propósito, MIME y un límite de 10 MB; después entrega una URL `PUT` prefirmada con duración de cinco minutos. Al finalizar, `/files/confirm` consulta el objeto real en S3 y registra solamente metadatos y URL pública.

Propósitos permitidos: fotografía de candidato, logo empresarial, adjuntos de proyecto y adjuntos de chat. Los mensajes solo aceptan adjuntos previamente confirmados y pertenecientes al remitente.

Para desarrollo se incluye MinIO:

```bash
docker compose up -d minio minio-init
```

La consola está en `http://localhost:9001`. En producción puede utilizarse AWS S3, Cloudflare R2, DigitalOcean Spaces u otro servicio S3-compatible mediante las mismas variables.

## Notificaciones, chat y entrevistas

Las notificaciones se persisten en PostgreSQL y, cuando SMTP está habilitado, también se envían por correo. Se generan al recibir una postulación, cambiar su estado, recibir un mensaje y agendar una entrevista. El usuario puede consultarlas y marcarlas como leídas desde su dashboard o `/notifications`.

Cada postulación tiene una conversación única. Solamente el candidato propietario y la empresa receptora pueden abrirla, leerla o enviar mensajes. Las conversaciones rechazadas o retiradas quedan cerradas, los mensajes se consultan mediante polling y los adjuntos deben pertenecer al remitente.

La empresa puede agendar una entrevista cuando la postulación está en `INTERVIEW`, indicando inicio, fin, zona horaria, lugar o videollamada. Candidato y empresa comparten la misma agenda; solamente la empresa propietaria puede editar, cancelar o completar el evento.

Rutas web por rol: `/candidate|company/messages`, `/candidate|company/interviews` y `/candidate|company/notifications`.

### Web Push nativo

ConekTa utiliza el estándar Web Push del navegador, Service Worker y claves VAPID. Cada dispositivo registra una suscripción independiente y las suscripciones expiradas se eliminan automáticamente al recibir respuestas `404/410` del proveedor push.

Genera un par de claves una sola vez por entorno:

```bash
npm run push:keys
```

Copia el resultado en `VAPID_PUBLIC_KEY` y `VAPID_PRIVATE_KEY`, configura `VAPID_SUBJECT=mailto:...` y activa `PUSH_ENABLED=true`. La clave privada solo pertenece al backend. Web Push exige HTTPS en producción; `localhost` se considera contexto seguro durante desarrollo.

### Chat WebSocket y videollamada ConekTa

El namespace Socket.IO `/realtime` autentica el access token durante el handshake, vuelve a consultar que la cuenta esté activa y valida acceso a la postulación antes de unir el socket a una sala. Los eventos soportados son mensajes nuevos, presencia, escritura y señalización de llamadas. Los mensajes continúan persistidos en PostgreSQL; Socket.IO solo agrega entrega inmediata.

La videollamada propia usa WebRTC peer-to-peer. Cámara y micrófono viajan cifrados directamente entre los navegadores y no atraviesan NestJS; el gateway transmite únicamente `offer`, `answer`, candidatos ICE y finalización. Para una red doméstica suele bastar STUN. En producción configura `TURN_URL`, `TURN_USERNAME` y `TURN_CREDENTIAL` para garantizar conexión detrás de NAT o firewalls corporativos.

Nginx o el balanceador debe permitir upgrade WebSocket en `/realtime`. Cámara, micrófono, Service Worker y Web Push requieren HTTPS salvo en `localhost`.

## ConekTa Experiencia

La [experiencia verificable](docs/academico/experiencia-verificable.md) incluye evaluación individual de siete criterios, emisor empresarial verificado, copia fija de evidencia, comprobación de integridad, auditoría y revocación. Los certificados nuevos son privados hasta que el candidato habilita su consulta pública en `/verify`.

“Construye experiencia mientras llega tu primera oportunidad.” Este módulo permite que una empresa publique retos y proyectos reales y que un candidato convierta una entrega evaluada en experiencia práctica verificable. No se presenta como relación laboral contractual ni como certificación laboral.

Flujo protegido:

1. La empresa crea un borrador en `/company/experiences`, define objetivo, actividades, entregables, duración, cupos y habilidades del catálogo.
2. Al publicarlo aparece en `/candidate/experiences`, ordenado por matching determinístico.
3. El candidato se postula una sola vez; la compatibilidad queda guardada en ese momento.
4. La empresa acepta e inicia la participación. Solo ese candidato puede registrar la entrega mediante URL, repositorio y metadatos.
5. La empresa evalúa de 1 a 5 y únicamente puede verificar habilidades asociadas al reto.
6. Completar exige candidato aceptado, entrega y evaluación. Una transacción crea `VerifiedExperience`, `VerifiedSkill` y `ExperienceCertificate`.
7. `/verify/CNK-EXP-XXXXXXXXXXXXXXXX` muestra una verificación pública mínima con QR, vigencia, participante, empresa, proyecto, fechas, evaluación y competencias.
8. El candidato controla si la experiencia aparece en su perfil. El administrador puede auditarla y revocar el certificado; la revocación conserva el registro y crea un `AuditLog`.

El matching de retos reutiliza los cinco componentes existentes: habilidades 50 %, formación 20 %, proyectos 15 %, habilidades blandas 10 % y disponibilidad/modalidad 5 %. Las competencias verificadas coincidentes aportan un bono conservador de máximo 3 puntos. El mismo límite se aplica a vacantes laborales: refuerza la confianza sin inflar de forma desproporcionada el cálculo base. No se inventan habilidades ni se usan años de experiencia como criterio principal.

Endpoints principales, también documentados en Swagger:

- Empresa: `GET/POST /experiences/company`, edición, publicación, estados, evaluación y finalización.
- Candidato: catálogo compatible, postulaciones propias, entrega y visibilidad pública.
- Público: `GET /experience-opportunities`, detalle y `GET /verify/:certificateCode`.
- Administración: consulta de experiencias, postulaciones y certificados; revocación auditada.

Para descargar el certificado abre su verificación y utiliza **Descargar / imprimir PDF**. El navegador genera el PDF desde una hoja optimizada para impresión; el QR se genera localmente y apunta a la URL pública actual. En producción usa la URL canónica HTTPS del frontend para que el QR sea estable.

## ConekTa Talent Intelligence

Esta capa convierte información declarada en evidencia profesional explicable.

### SkillEvidence

Cada habilidad obtiene una puntuación de 0 a 100 recalculada desde PostgreSQL:

- Nivel declarado: máximo 20 puntos.
- Uso en proyectos y contribuciones confirmadas: máximo 25 puntos.
- Experiencias y evaluaciones empresariales: máximo 40 puntos.
- Consistencia entre fuentes: máximo 15 puntos.

El candidato no puede editar la puntuación. `GET /talent/candidate/evidence` actualiza el snapshot `SkillEvidence` y devuelve los componentes, cantidades y explicación. Una evidencia con 100 puntos significa evidencia fuerte dentro de ConekTa, no una garantía absoluta de dominio profesional.

### Ruta para mejorar compatibilidad

`GET /talent/candidate/improvement-route/:vacancyId` identifica habilidades faltantes reales, busca experiencias publicadas que puedan demostrarlas y calcula el impacto potencial sobre el matching. Si no existe un reto adecuado propone construir un proyecto documentado. La proyección no modifica el perfil ni promete selección.

### Índice de Primera Oportunidad

El índice empresarial utiliza solamente comportamiento real:

- Respuesta a postulaciones: 25 %.
- Cierre trazable de procesos: 25 %.
- Retroalimentación y evaluaciones: 15 %.
- Vacantes apropiadas para perfiles junior: 25 %.
- Selección efectiva: 10 %.

Una empresa sin muestra recibe 50 puntos provisionales y confianza `LOW`. La API devuelve siempre el tamaño de muestra para evitar presentar como concluyente una puntuación estadísticamente débil.

### Pasaporte ConekTa y Open Badges

El candidato genera un pasaporte público `CNK-PASS-XXXXXXXXXXXXXXXX` con habilidades evidenciadas, proyectos, contribuciones confirmadas y experiencias prácticas públicas. Puede desactivarlo en cualquier momento. El endpoint `/passport/:code/open-badge` exporta una estructura JSON-LD `OpenBadgeCredential` alineada con Open Badges 3.0 y W3C Verifiable Credentials 2.0.

Esta exportación ofrece interoperabilidad estructural, estado público y alineación de competencias. ConekTa no declara conformidad certificada por 1EdTech ni agrega una firma criptográfica de una entidad acreditada. Para producción configura `PUBLIC_WEB_URL` y `PUBLIC_API_URL` con dominios HTTPS canónicos.

### Contribuciones grupales

El propietario de un proyecto solicita validación por correo indicando rol, aporte y habilidades. ConekTa guarda únicamente el hash SHA-256 del token. El validador puede confirmar o rechazar una sola vez; el enlace expira en siete días. Solo las confirmaciones `VERIFIED` alimentan `SkillEvidence` y aparecen en el pasaporte.

## Datos de demostración opcionales

El seed administrativo (`npm run db:seed`) y el seed académico son comandos separados. Para cargar el escenario académico, completa en tu `.env` las variables `DEMO_*`, usa una contraseña propia de 12 a 72 caracteres y habilítalo explícitamente:

```dotenv
NODE_ENV=development
DEMO_SEED_ENABLED=true
DEMO_PASSWORD=define_aqui_una_clave_demo_segura
```

```bash
npm run db:seed:demo
```

Se crean o actualizan un administrador, una empresa verificada, tres candidatos, siete habilidades, tres proyectos universitarios y tres vacantes publicadas. Las cuentas utilizan los correos y la contraseña definidos por ti en `.env`; el README no contiene credenciales válidas. El script es idempotente para esas cuentas y se niega a ejecutarse cuando `NODE_ENV=production`.

## Producción con Docker

Los Dockerfiles son multi-stage. La API se ejecuta como usuario sin privilegios y expone un health check; la web se sirve con Nginx, fallback para React Router y caché inmutable de assets.

1. Define secretos únicos y URLs públicas en `.env`. En producción, `DATABASE_URL` la construye Compose usando el host interno `postgres`; `CORS_ORIGIN` debe ser la URL exacta de la web y `VITE_API_URL` la URL pública HTTPS de la API.
2. Construye e inicia primero PostgreSQL:

```bash
docker compose -f docker-compose.prod.yml build
docker compose -f docker-compose.prod.yml up -d postgres
docker compose -f docker-compose.prod.yml run --rm migrate
docker compose -f docker-compose.prod.yml up -d api web
```

3. Comprueba `http://localhost:3000/health`, `http://localhost:3000/docs` y `http://localhost:8080` (o los puertos configurados).

No ejecutes `prisma migrate dev`, el seed demo ni Docker Compose de desarrollo en producción. Termina TLS y límites de petición en el proxy/plataforma de alojamiento, conserva el volumen de PostgreSQL y configura copias de seguridad.

También es posible compilar y arrancar sin Docker:

```bash
npm ci
npm run db:generate
npm run build
npm run start:prod -w @conekta/api
npm run preview -w @conekta/web -- --host 0.0.0.0
```

## Demo para sustentación (aproximadamente 5 minutos)

Prepara PostgreSQL, migraciones y el seed demo antes de presentar. Abre tres ventanas: candidato, empresa (ventana privada) y administrador (otro perfil del navegador). Usa únicamente las credenciales que definiste en las variables `DEMO_*`.

1. **0:00–0:35 — Propuesta de valor.** Abre `/`, presenta “Tu talento merece una primera oportunidad” y los cinco pasos. Explica que conocimientos, habilidades, proyectos y potencial sustituyen los años de experiencia como criterio principal.
2. **0:35–1:25 — Evidencia del candidato.** Inicia sesión con el primer correo de `DEMO_CANDIDATE_EMAILS`. En `/candidate` muestra completitud, formación, habilidades y el proyecto universitario; agrega o edita un dato para demostrar persistencia real.
3. **1:25–2:25 — Vacante junior real.** Entra con `DEMO_COMPANY_EMAIL`, abre Vacantes y enseña una vacante publicada con cero experiencia requerida, carrera relacionada y habilidades `REQUIRED`/`DESIRED` ponderadas.
4. **2:25–3:20 — Matching transparente.** Como candidato, abre `/opportunities`, filtra una vacante y muestra porcentaje, fortalezas, faltantes y desglose. Señala que el cálculo es determinístico y guarda solo datos registrados.
5. **3:20–4:15 — Postulación y trazabilidad.** Pulsa **Postularme**. Como empresa, abre Postulaciones, localiza el candidato por compatibilidad y cambia `APPLIED → UNDER_REVIEW → INTERVIEW`.
6. **4:15–4:40 — Confirmación del candidato.** Regresa a `/candidate/applications` y muestra el nuevo estado y su línea de tiempo.
7. **4:40–5:00 — Auditoría.** Entra con `DEMO_ADMIN_EMAIL`, muestra métricas reales, la postulación y los módulos de usuarios, empresas, vacantes y habilidades. Cierra en Swagger `/docs` y health `/health`.

Si el candidato demo ya está postulado a la vacante elegida, utiliza otra de las tres vacantes o registra una cuenta nueva. No borres el volumen ni ejecutes nuevamente el seed durante la exposición.

## Alcance que queda para ConekTa V2

No forman parte de esta V1: grabación o transcodificación de videollamadas, llamadas grupales, fondos virtuales, sincronización bidireccional con Google/Outlook Calendar, CV en PDF, matching con IA, pruebas técnicas, analítica avanzada, multiempresa por cuenta, SSO, internacionalización, moderación automatizada, aplicación móvil, pagos y facturación. Antes de tráfico distribuido también corresponde mover rate limiting y presencia del chat a Redis, desplegar TURN administrado, añadir observabilidad centralizada y automatizar backups/restores y CI/CD.
