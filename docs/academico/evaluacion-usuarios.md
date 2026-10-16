# Piloto de evaluación con usuarios

**Estado: preparado, no ejecutado.** No hay participantes reclutados ni resultados humanos registrados. Este protocolo sirve para observar problemas de uso y comprensión; no permite generalizar efectividad laboral.

## Participantes y condiciones

Propuesta: cinco personas adultas voluntarias, tres con perfil de estudiante/recién graduado y dos que puedan evaluar el flujo empresarial. Registrar si estas últimas representan una empresa o solamente simulan ese rol. El administrador lo opera el facilitador y no cuenta como participante independiente.

Duración prevista: 20–30 minutos por persona. Preparar cuentas y datos ficticios, una vacante con criterios completos y otra incompleta. Usar los mismos escenarios para participantes del mismo rol y anotar dispositivo, versión y fecha.

Consentimiento verbal propuesto: «Esta sesión evalúa un prototipo académico, no tus capacidades. Tu participación es voluntaria y puedes detenerte. Registraremos un código anónimo, resultados de tareas y observaciones. No usaremos tu hoja de vida ni datos de empresas reales. ¿Aceptas participar?». Si no acepta, no realizar ni registrar la sesión. No grabar sin autorización específica.

## Tareas

| ID  | Actor     | Instrucción para el participante                                                                             | Éxito observable                                                                             |
| --- | --------- | ------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------- |
| U1  | Candidato | Completa el perfil ficticio con carrera, dos habilidades y un proyecto. Sal y vuelve a abrirlo.              | Datos guardados y recuperados correctamente.                                                 |
| U2  | Empresa   | Crea y publica una vacante junior con carrera y habilidades requeridas/deseadas.                             | Vacante visible en el catálogo público.                                                      |
| U3  | Todos     | Compara el desglose de una vacante completa y otra incompleta. Explica el puntaje y un criterio sin definir. | Distingue afinidad de garantía de contratación y ausencia de criterio de falta de capacidad. |
| U4  | Candidato | Postúlate y localiza el estado después de que el facilitador lo cambie como empresa.                         | Postulación creada una vez y estado actualizado localizado.                                  |
| U5  | Empresa   | Localiza una postulación, pásala a revisión, entrevista y selección; emite una oferta.                       | Completa secuencia permitida y encuentra el historial.                                       |

Todos realizan U3; cada rol realiza las otras dos tareas que le corresponden: 15 tareas previstas en total. El facilitador prepara la contraparte necesaria. Para U3 en rol empresa, puede mostrar la vista de candidato sin modificar permisos del sistema.

## Registro

Usar `registro-sesiones.csv`: una fila por tarea. Registrar resultado como `sin_ayuda`, `con_ayuda`, `fallida` o `no_realizada`; anotar duración en segundos, dificultad declarada (1 muy fácil, 5 muy difícil), errores y observaciones literales anonimizadas.

No orientar durante el primer intento. Si solicita ayuda, darla y marcarla. Interrumpir si desea abandonar o después de cinco minutos sin progreso; registrar la causa. No sustituir un fallo por un éxito asistido.

Al finalizar preguntar: ¿qué parte fue confusa?, ¿qué significa 75 puntos?, ¿qué significa «Sin criterio definido»?, ¿qué cambiarías primero? No sugerir respuestas.

## Análisis y criterios propuestos

- Éxito sin ayuda: tareas `sin_ayuda` / tareas intentadas × 100. Informar también intentadas / 15 y causas de tareas no realizadas.
- Duración: mediana por tarea, separando intentos exitosos y fallidos; publicar cantidad de observaciones.
- Comprensión: respuestas correctas de U3 / participantes que la intentaron; meta exploratoria de 4/5.
- Usabilidad: meta exploratoria de 80 % de éxito sin ayuda; no es un estándar validado.
- Problemas: frecuencia, efecto y prioridad. Prioridad alta si impide una tarea; media si exige ayuda; baja si afecta claridad sin impedir completar.

## Plantilla de informe final

Fecha y versión: pendiente. Participantes efectivos y roles: pendiente. Tareas intentadas: pendiente. Éxito sin ayuda: pendiente. Comprensión: pendiente. Problemas observados: pendiente. Cambios realizados a partir de evidencia: pendiente. Limitaciones y conclusiones: pendiente.

Para concluir, relacionar hallazgos con O1–O5 y distinguir pruebas del software, opiniones y comportamiento observado. Mantener los registros anónimos como anexo. No afirmar que el sistema mejora la empleabilidad a partir de este piloto.
