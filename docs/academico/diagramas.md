# Diseño del prototipo

Los diagramas Mermaid describen el núcleo del código existente. El modelo de datos está simplificado; `apps/api/prisma/schema.prisma` contiene todos los campos y relaciones.

## Arquitectura

```mermaid
flowchart LR
  C[Candidato] --> W[React / Vite]
  E[Empresa] --> W
  A[Administrador] --> W
  W -->|HTTP y JWT| API[NestJS: controladores y servicios]
  W <-->|WebSocket| RT[Gateway de comunicaciones]
  RT --> API
  API --> M[Motor de matching determinista]
  API --> P[Prisma]
  P --> DB[(PostgreSQL)]
  API --> MAIL[SMTP / Mailpit local]
  API --> S3[Archivos S3 / MinIO local]
```

El control de acceso y las reglas de negocio se aplican en la API. React presenta resultados; Prisma administra consultas y relaciones. El matching calcula sobre datos recibidos de los servicios, sin proveedor de IA.

## Modelo entidad-relación central

```mermaid
erDiagram
  User ||--o| CandidateProfile : tiene
  User ||--o| CompanyProfile : tiene
  CandidateProfile ||--o{ Education : registra
  CandidateProfile ||--o{ Project : presenta
  CandidateProfile ||--o{ CandidateSkill : declara
  Skill ||--o{ CandidateSkill : identifica
  CompanyProfile ||--o{ Vacancy : publica
  Vacancy ||--o{ VacancySkill : solicita
  Skill ||--o{ VacancySkill : identifica
  CandidateProfile ||--o{ Application : realiza
  Vacancy ||--o{ Application : recibe
  CompanyProfile ||--o{ Application : gestiona
  Application ||--o{ ApplicationStatusHistory : conserva
```

Restricciones centrales: correo único de usuario, perfil único por usuario y postulación única por candidato/vacante. Los roles condicionan el uso de perfiles; el diagrama no representa esa exclusión como una restricción adicional de base de datos.

## Secuencia de postulación

```mermaid
sequenceDiagram
  actor C as Candidato
  participant W as Web
  participant API as API NestJS
  participant M as Matching
  participant DB as PostgreSQL
  C->>W: Abrir oportunidad
  W->>API: Consultar compatibilidad autenticada
  API->>DB: Obtener perfil y vacante publicada
  DB-->>API: Datos persistidos
  API->>M: Calcular criterios y desglose
  M-->>API: Resultado base explicable
  API-->>W: Compatibilidad y bono verificado, si aplica
  W-->>C: Mostrar puntaje, faltantes y criterios ausentes
  C->>W: Postularme
  W->>API: POST postulación
  API->>DB: Verificar oportunidad y postulación previa
  API->>M: Calcular puntaje actual
  API->>DB: Guardar postulación y puntaje histórico
  API-->>W: Confirmación o conflicto por duplicado
```

## Estados del proceso principal

```mermaid
stateDiagram-v2
  [*] --> APPLIED
  APPLIED --> UNDER_REVIEW
  UNDER_REVIEW --> INTERVIEW
  INTERVIEW --> SELECTED
  SELECTED --> OFFER_SENT
  OFFER_SENT --> OFFER_ACCEPTED: candidato acepta
  OFFER_SENT --> OFFER_DECLINED: candidato rechaza
  OFFER_ACCEPTED --> HIRED
  APPLIED --> REJECTED
  UNDER_REVIEW --> REJECTED
  INTERVIEW --> REJECTED
  APPLIED --> WITHDRAWN: candidato
  UNDER_REVIEW --> WITHDRAWN: candidato
  INTERVIEW --> WITHDRAWN: candidato
  SELECTED --> CANCELLED
  OFFER_SENT --> CANCELLED
  OFFER_ACCEPTED --> CANCELLED
```

Estados terminales: HIRED, OFFER_DECLINED, CANCELLED, REJECTED y WITHDRAWN. Referencia: `apps/api/src/applications/application-state.ts`.
