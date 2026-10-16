export const evaluationCriteria = [
  ['compliance', 'Cumplimiento de los entregables'],
  ['quality', 'Calidad del trabajo'],
  ['responsibility', 'Responsabilidad'],
  ['communication', 'Comunicación'],
  ['teamwork', 'Trabajo en equipo'],
  ['technicalSkills', 'Habilidades técnicas'],
  ['finalResult', 'Resultado final'],
] as const;
export type EvaluationCriterion = (typeof evaluationCriteria)[number][0];
export const ratingLabels = [
  '1 — Insuficiente',
  '2 — Requiere mejoras',
  '3 — Cumple lo esperado',
  '4 — Supera lo esperado',
  '5 — Excelente',
];
