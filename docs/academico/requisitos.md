# Alcance y requisitos propuestos

## Problema y objetivos

Problema de diseño: facilitar que estudiantes y recién graduados presenten formación, habilidades y proyectos en un proceso de oportunidades de entrada, con criterios de compatibilidad visibles. La magnitud social del problema y su incidencia en la población local requieren fuentes y trabajo de campo; este documento no inventa esas cifras.

Objetivo general: desarrollar y evaluar un prototipo web que conecte candidatos de primer empleo con empresas mediante perfiles, oportunidades y seguimiento de postulaciones con compatibilidad explicable.

- O1: gestionar identidad, roles y perfiles académicos/profesionales.
- O2: permitir publicación, consulta y postulación a oportunidades.
- O3: calcular y explicar compatibilidad con reglas reproducibles.
- O4: mantener trazabilidad del proceso entre candidato y empresa.
- O5: evaluar funcionamiento y comprensión mediante pruebas técnicas y un piloto con usuarios.

Alcance principal: registro → perfil → vacante → matching → postulación → revisión → entrevista → selección → oferta → contratación. Experiencias, certificados, chat y pasaporte son módulos complementarios existentes. Pagos, aplicación móvil, IA e infraestructura empresarial quedan fuera de esta entrega.

## Requisitos y trazabilidad

La columna «verificación» indica el mecanismo disponible o propuesto, no certifica que se haya ejecutado. Consultar el reporte técnico.

| ID / objetivo | Requisito                           | Criterio de aceptación                                                                                               | Implementación | Verificación                                                |
| ------------- | ----------------------------------- | -------------------------------------------------------------------------------------------------------------------- | -------------- | ----------------------------------------------------------- |
| RF01 / O1     | Registro e inicio de sesión por rol | Candidato y empresa se registran; credenciales inválidas se rechazan; registro público no crea administradores.      | auth           | Unitarias auth y flujo integral                             |
| RF02 / O1     | Perfil académico                    | Candidato guarda formación, habilidades y proyectos y los recupera desde su cuenta.                                  | candidate      | Flujo integral y tarea U1                                   |
| RF03 / O2     | Vacantes propias                    | Empresa crea y publica vacantes; otra empresa no puede modificarlas.                                                 | company        | Flujo integral y tarea U2                                   |
| RF04 / O2     | Catálogo                            | Lista oportunidades publicadas y permite abrir su detalle.                                                           | opportunities  | Flujo integral parcial; revisión manual de filtros y cierre |
| RF05 / O3     | Compatibilidad explicable           | Devuelve total, desglose, fortalezas y faltantes; no confunde Java con JavaScript ni carreras por una palabra común. | matching       | matching.engine.spec.ts y tarea U3                          |
| RF06 / O2     | Postulación única                   | Una segunda postulación a la misma vacante devuelve conflicto.                                                       | applications   | Unitarias applications y flujo integral                     |
| RF07 / O4     | Seguimiento                         | Transiciones válidas actualizan el estado; cambios inválidos se rechazan y se conserva historial.                    | applications   | application-state.spec.ts; flujo integral; tarea U4         |
| RF08 / O4     | Oferta y contratación               | Empresa emite oferta; candidato responde; empresa confirma contratación desde un estado permitido.                   | applications   | Flujo integral y revisión manual                            |
| RF09 / O1     | Administración protegida            | Candidato y empresa reciben 403 en recursos administrativos.                                                         | admin / guards | Flujo integral                                              |
| RF10 / O4     | Comunicación complementaria         | Participantes intercambian mensajes; terceros no pueden leerlos.                                                     | communications | Flujo integral HTTP y WebSocket                             |
| RF11 / O3     | Experiencia complementaria          | Empresa evalúa entrega; se genera certificado consultable por código.                                                | experiences    | Flujo integral                                              |
| RF12 / O5     | Evidencia de evaluación             | Cada sesión registra tarea, resultado, dificultad y observación sin inventar participantes.                          | docs/academico | Protocolo y registro pendientes de aplicación               |

## Requisitos no funcionales

| ID    | Requisito y criterio de aceptación                                                                  | Comprobación                                                   |
| ----- | --------------------------------------------------------------------------------------------------- | -------------------------------------------------------------- |
| RNF01 | Acceso: autenticar y comprobar rol/propiedad en servidor para operaciones privadas.                 | Casos negativos de la API; no equivale a auditoría exhaustiva. |
| RNF02 | Integridad: impedir postulaciones duplicadas y persistir estados e historial.                       | Restricción de base de datos y flujo integral.                 |
| RNF03 | Explicabilidad: mismo perfil, vacante y pesos producen igual resultado base y desglose sumable.     | Pruebas del motor y cálculo manual.                            |
| RNF04 | Reproducibilidad: documentar dependencias, variables, migraciones y comandos de ejecución.          | README raíz y reporte técnico.                                 |
| RNF05 | Usabilidad propuesta: al menos 80 % de tareas completadas sin ayuda en el piloto.                   | Registro de tareas; umbral exploratorio, no resultado.         |
| RNF06 | Comprensión propuesta: al menos 4 de 5 participantes distinguen puntaje y garantía de contratación. | Pregunta U3; pendiente.                                        |
| RNF07 | Calidad estática: typecheck y lint sin errores.                                                     | Comandos del repositorio.                                      |

## Casos de uso centrales

**CU1 — Postularse.** Actor: candidato. Precondiciones: cuenta activa, perfil y vacante publicada. Flujo: consulta → detalle → revisa compatibilidad → postula. Resultado: postulación única con puntaje histórico. Alternos: vacante inexistente/oculta, postulación repetida o sesión inválida.

**CU2 — Gestionar selección.** Actor: empresa propietaria. Precondición: postulación recibida. Flujo: revisión → entrevista → selección → oferta; candidato acepta; empresa confirma contratación. Alternos: rechazo, retiro en estados permitidos, oferta rechazada o cancelación. La matriz de estados del código es la fuente de verdad.

**CU3 — Revisar compatibilidad.** Actor: candidato. Flujo: abre oportunidad, consulta desglose, identifica faltantes y criterios sin definir. Resultado: explicación orientativa; la puntuación no decide automáticamente la contratación.
