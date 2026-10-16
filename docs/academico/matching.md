# Matching académico: reglas y justificación

## Propósito y alcance

Ordenar oportunidades mediante coincidencias explícitas entre un perfil y los criterios de una vacante. El resultado es un índice heurístico de 0 a 100, no una probabilidad de contratación ni una certificación de capacidad. No emplea IA.

Esta es una justificación de diseño propia, no una validación científica de los pesos. Se mantienen los pesos existentes para conservar la prioridad de habilidades y proyectos; deberán contrastarse con la evaluación descrita al final.

| Componente                 | Peso | Razón de diseño propuesta                                                   |
| -------------------------- | ---: | --------------------------------------------------------------------------- |
| Habilidades técnicas       |   50 | Dar la mayor importancia a competencias explícitas de la oportunidad.       |
| Formación                  |   20 | Considerar afinidad académica sin convertirla en el único criterio.         |
| Proyectos                  |   15 | Reconocer prácticas y trabajos académicos relevantes para un primer empleo. |
| Habilidades blandas        |   10 | Considerarlas con cautela porque su registro inicial es autodeclarado.      |
| Disponibilidad y modalidad |    5 | Incluir viabilidad operativa sin desplazar las competencias.                |

Los umbrales 60 y 80 y el multiplicador de habilidades requeridas son igualmente hipótesis de diseño, pendientes de calibración. La experiencia laboral en años no suma puntos.

## Fórmula reproducible

Para cada habilidad solicitada: peso efectivo = peso empresarial × 2 si es REQUIRED, o × 1 si es DESIRED. El componente técnico o blando es la suma de pesos efectivos de habilidades presentes dividida entre la suma de pesos efectivos solicitados, multiplicada por 50 o 10.

La formación obtiene 20 si alguna carrera coincide exactamente después de quitar acentos, normalizar mayúsculas y espacios. La empresa puede incluir varias carreras aceptadas. Compartir «ingeniería» no basta. No se infieren equivalencias entre títulos.

Los proyectos obtienen 15 × (suma de pesos de tecnologías coincidentes / suma de pesos técnicos solicitados). Una habilidad cuenta una sola vez aunque figure en varios proyectos. Se busca el nombre o slug completo como secuencia de tokens en tecnologías, título o descripción; JavaScript no equivale a Java y C++ no equivale a C. Una mención textual sigue siendo evidencia declarada, no verificada.

Disponibilidad obtiene 5 si el candidato está disponible y acepta la modalidad; de lo contrario, 0. Cada componente se redondea al entero más cercano y se suman los resultados, limitados a 0–100.

Los pesos deben ser finitos, no negativos y sumar 100.

## Criterios ausentes

Un criterio que la oportunidad no define aporta 0 y se identifica en `unassessedCriteria`. La interfaz lo muestra como «Sin criterio definido». No se redistribuye su peso ni se interpreta ese cero como una carencia del candidato. La recomendación advierte sobre información incompleta.

Por ejemplo, sin habilidades ni carreras definidas, una persona disponible para la modalidad obtiene 5, no 100. Este criterio conservador reduce puntajes de vacantes poco detalladas: **no se deben comparar conclusivamente vacantes con distinta cobertura de criterios**. Es una limitación conocida del índice, no una prueba de menor capacidad. Una mejora futura sería separar cobertura y afinidad en el ordenamiento.

## Niveles y evidencia verificada

Se conserva el mismo crédito por presencia para BASIC, INTERMEDIATE y ADVANCED. Sin un nivel mínimo requerido en la vacante ni una rúbrica de evaluación, convertir autodeclaraciones en multiplicadores añadiría precisión aparente. Los niveles se conservan como información del perfil.

Los servicios de vacantes y experiencias agregan un bono existente de hasta 3 puntos por habilidades coincidentes respaldadas por experiencias verificadas. El motor base no lo incluye. El total se limita a 100; el bono debe interpretarse separadamente del desglose base. Esta revisión no valida la calidad externa de dichas verificaciones.

## Ejemplo manual y prueba

Vacante: React requerido con peso 5, Docker requerido con peso 3 y trabajo en equipo deseado con peso 4. Carrera: Ingeniería de Sistemas. Candidato: React, trabajo en equipo, esa carrera, proyecto con React, disponible en remoto.

| Componente     | Operación                         | Resultado |
| -------------- | --------------------------------- | --------: |
| Técnico        | redondear(50 × 10 / 16)           |        31 |
| Formación      | Coincidencia exacta normalizada   |        20 |
| Proyectos      | redondear(15 × 5 / 8)             |         9 |
| Blandas        | redondear(10 × 4 / 4)             |        10 |
| Disponibilidad | Disponible y modalidad compatible |         5 |
| Total base     | 31 + 20 + 9 + 10 + 5              |        75 |

Falta Docker. El ejemplo se comprueba en `apps/api/test/matching.engine.spec.ts` junto con casos de carreras distintas, tecnologías similares, criterios ausentes y pesos inválidos.

## Validación pendiente

Preparar al menos seis pares perfil–vacante ficticios: coincidencia completa, parcial, ninguna, carrera similar pero distinta, tecnología de nombre parecido y vacante incompleta. Pedir a participantes con rol de empresa que ordenen su pertinencia antes de ver el puntaje. Registrar discrepancias y motivos; no ajustar pesos únicamente para que reproduzcan un caso favorable.

Como análisis de sensibilidad propuesto, comparar los pesos actuales con 45/20/20/10/5 y 55/15/15/10/5 sobre los mismos pares. Registrar cambios en el orden y discutirlos. Este análisis y la evaluación humana aún no se han realizado.

Los puntajes históricos de postulaciones ya guardadas no se recalculan. Las recomendaciones nuevas usan las reglas revisadas; no comparar ambos como si fueran mediciones de una misma versión.
