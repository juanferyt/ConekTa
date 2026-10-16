import type {
  MatchResult,
  MatchingCandidate,
  MatchingVacancy,
  MatchingWeights,
} from './matching.types';

export const DEFAULT_MATCHING_WEIGHTS: Readonly<MatchingWeights> = Object.freeze({
  skills: 50,
  education: 20,
  projects: 15,
  softSkills: 10,
  availability: 5,
});

const normalize = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ');
const tokens = (value: string) =>
  normalize(value)
    .split(/[^a-z0-9+#.]+/)
    .map((token) => token.replace(/\.+$/, ''))
    .filter(Boolean);

function related(left: string, right: string): boolean {
  const evidence = tokens(left);
  const requirement = tokens(right);
  if (!requirement.length) return false;
  return evidence.some((_, start) =>
    requirement.every((word, offset) => evidence[start + offset] === word),
  );
}

function weightedSkillRatio(
  candidate: MatchingCandidate,
  vacancy: MatchingVacancy,
  type: 'TECHNICAL' | 'SOFT',
) {
  const requested = vacancy.skills.filter(({ skill }) => skill.type === type);
  if (!requested.length) return { ratio: 0, matched: [] as string[], missing: [] as string[] };
  const candidateIds = new Set(
    candidate.skills.filter(({ skill }) => skill.type === type).map(({ skill }) => skill.id),
  );
  const effectiveWeight = (item: (typeof requested)[number]) =>
    item.weight * (item.priority === 'REQUIRED' ? 2 : 1);
  const total = requested.reduce((sum, item) => sum + effectiveWeight(item), 0);
  const matchedItems = requested.filter(({ skill }) => candidateIds.has(skill.id));
  const matched = matchedItems.reduce((sum, item) => sum + effectiveWeight(item), 0);
  return {
    ratio: total ? matched / total : 1,
    matched: matchedItems.map(({ skill }) => skill.name),
    missing: requested
      .filter((item) => item.priority === 'REQUIRED' && !candidateIds.has(item.skill.id))
      .map(({ skill }) => skill.name),
  };
}

function educationRatio(candidate: MatchingCandidate, vacancy: MatchingVacancy): number {
  if (!vacancy.relatedCareers.length) return 0;
  return candidate.educations.some((education) =>
    vacancy.relatedCareers.some(
      (career) =>
        normalize(career).length > 0 && normalize(education.program) === normalize(career),
    ),
  )
    ? 1
    : 0;
}

function projectRatio(candidate: MatchingCandidate, vacancy: MatchingVacancy): number {
  const technical = vacancy.skills.filter(({ skill }) => skill.type === 'TECHNICAL');
  if (!technical.length) return 0;
  const matchedIds = new Set<string>();
  for (const project of candidate.projects) {
    const evidence = [...project.technologies, project.title, project.description];
    for (const requirement of technical)
      if (
        evidence.some(
          (value) =>
            related(value, requirement.skill.name) || related(value, requirement.skill.slug),
        )
      )
        matchedIds.add(requirement.skill.id);
  }
  const total = technical.reduce((sum, item) => sum + item.weight, 0);
  const matched = technical
    .filter(({ skill }) => matchedIds.has(skill.id))
    .reduce((sum, item) => sum + item.weight, 0);
  return total ? matched / total : 1;
}

function availabilityRatio(candidate: MatchingCandidate, vacancy: MatchingVacancy): number {
  return candidate.availableNow && candidate.modalities.includes(vacancy.modality) ? 1 : 0;
}

export function calculateMatch(
  candidate: MatchingCandidate,
  vacancy: MatchingVacancy,
  weights: MatchingWeights = DEFAULT_MATCHING_WEIGHTS,
): MatchResult {
  const totalWeight =
    weights.skills +
    weights.education +
    weights.projects +
    weights.softSkills +
    weights.availability;
  if (Object.values(weights).some((weight) => !Number.isFinite(weight) || weight < 0))
    throw new Error('Los pesos deben ser finitos y no negativos');
  if (totalWeight !== 100) throw new Error('Los pesos del matching deben sumar 100');
  const technical = weightedSkillRatio(candidate, vacancy, 'TECHNICAL');
  const soft = weightedSkillRatio(candidate, vacancy, 'SOFT');
  const ratios = {
    skills: technical.ratio,
    education: educationRatio(candidate, vacancy),
    projects: projectRatio(candidate, vacancy),
    softSkills: soft.ratio,
    availability: availabilityRatio(candidate, vacancy),
  };
  const breakdown = {
    skills: Math.round(ratios.skills * weights.skills),
    education: Math.round(ratios.education * weights.education),
    projects: Math.round(ratios.projects * weights.projects),
    softSkills: Math.round(ratios.softSkills * weights.softSkills),
    availability: Math.round(ratios.availability * weights.availability),
  };
  const score = Math.max(
    0,
    Math.min(
      100,
      Object.values(breakdown).reduce((sum, value) => sum + value, 0),
    ),
  );
  const strengths = [...new Set([...technical.matched, ...soft.matched])];
  const unassessedCriteria: (keyof MatchingWeights)[] = [];
  if (!vacancy.skills.some(({ skill }) => skill.type === 'TECHNICAL'))
    unassessedCriteria.push('skills', 'projects');
  if (!vacancy.skills.some(({ skill }) => skill.type === 'SOFT'))
    unassessedCriteria.push('softSkills');
  if (!vacancy.relatedCareers.length) unassessedCriteria.push('education');
  const recommendation = unassessedCriteria.length
    ? 'La oportunidad no define todos los criterios. Los criterios sin definir no suman puntos; una puntuación baja no implica falta de capacidad. Revisa el desglose antes de comparar.'
    : score >= 80
      ? 'Tu perfil tiene una compatibilidad alta. Te recomendamos postularte.'
      : score >= 60
        ? 'Tienes una base compatible. Revisa las habilidades faltantes antes de postularte.'
        : 'Esta oportunidad puede requerir fortalecer algunas competencias de tu perfil.';
  return {
    score,
    strengths,
    missingSkills: [...new Set([...technical.missing, ...soft.missing])],
    breakdown,
    recommendation,
    unassessedCriteria,
  };
}
