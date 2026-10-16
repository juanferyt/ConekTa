import * as assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { calculateMatch } from '../src/matching/matching.engine';
import type { MatchingCandidate, MatchingVacancy } from '../src/matching/matching.types';

const skill = (id: string, name: string, type: 'TECHNICAL' | 'SOFT') => ({
  id,
  name,
  slug: name.toLowerCase().replaceAll(' ', '-'),
  type,
});
const react = skill('react', 'React', 'TECHNICAL');
const docker = skill('docker', 'Docker', 'TECHNICAL');
const teamwork = skill('team', 'Trabajo en equipo', 'SOFT');
const vacancy: MatchingVacancy = {
  modality: 'REMOTO',
  relatedCareers: ['Ingeniería de sistemas'],
  skills: [
    { skill: react, priority: 'REQUIRED', weight: 5 },
    { skill: docker, priority: 'REQUIRED', weight: 3 },
    { skill: teamwork, priority: 'DESIRED', weight: 4 },
  ],
};
const candidate: MatchingCandidate = {
  availableNow: true,
  modalities: ['REMOTO'],
  skills: [
    { skill: react, level: 'INTERMEDIATE' },
    { skill: teamwork, level: 'ADVANCED' },
  ],
  educations: [{ program: 'Ingeniería de Sistemas', academicLevel: 'Universitaria' }],
  projects: [
    {
      title: 'Portal académico',
      description: 'Frontend web',
      technologies: ['React', 'TypeScript'],
      universityProject: true,
    },
  ],
};

void describe('calculateMatch', () => {
  void it('calcula y explica un resultado usando únicamente evidencias registradas', () => {
    const result = calculateMatch(candidate, vacancy);
    assert.equal(result.score, 75);
    assert.deepEqual(result.strengths, ['React', 'Trabajo en equipo']);
    assert.deepEqual(result.missingSkills, ['Docker']);
    assert.deepEqual(result.breakdown, {
      skills: 31,
      education: 20,
      projects: 9,
      softSkills: 10,
      availability: 5,
    });
  });
  void it('prioriza una habilidad requerida sobre una deseada con el mismo peso', () => {
    const result = calculateMatch(
      { ...candidate, skills: [{ skill: docker, level: 'BASIC' }] },
      {
        ...vacancy,
        relatedCareers: [],
        skills: [
          { skill: react, priority: 'REQUIRED', weight: 5 },
          { skill: docker, priority: 'DESIRED', weight: 5 },
        ],
      },
    );
    assert.equal(result.breakdown.skills, 17);
  });
  void it('no inventa evidencia cuando la vacante no define criterios', () => {
    const result = calculateMatch(
      { ...candidate, skills: [], educations: [], projects: [] },
      { ...vacancy, skills: [], relatedCareers: [] },
    );
    assert.equal(result.score, 5);
    assert.deepEqual(result.unassessedCriteria, ['skills', 'projects', 'softSkills', 'education']);
    assert.match(result.recommendation, /no define/);
  });
  void it('no confunde carreras que solo comparten una palabra genérica', () => {
    const result = calculateMatch(
      {
        ...candidate,
        educations: [{ program: 'Ingeniería Civil', academicLevel: 'Universitaria' }],
      },
      vacancy,
    );
    assert.equal(result.breakdown.education, 0);
  });
  void it('normaliza acentos, mayúsculas y espacios de la carrera', () => {
    const result = calculateMatch(
      {
        ...candidate,
        educations: [{ program: '  INGENIERIA   DE SISTEMAS ', academicLevel: 'Universitaria' }],
      },
      vacancy,
    );
    assert.equal(result.breakdown.education, 20);
  });
  void it('JavaScript no demuestra Java y C++ no demuestra C', () => {
    for (const [required, declared] of [
      ['Java', 'JavaScript'],
      ['C', 'C++'],
    ]) {
      const result = calculateMatch(
        {
          ...candidate,
          projects: [
            {
              title: 'Proyecto',
              description: 'Entrega',
              technologies: [declared],
              universityProject: true,
            },
          ],
        },
        {
          ...vacancy,
          skills: [
            { skill: skill(required, required, 'TECHNICAL'), weight: 1, priority: 'REQUIRED' },
          ],
        },
      );
      assert.equal(result.breakdown.projects, 0);
    }
  });
  void it('reconoce una tecnología completa dentro de una descripción', () => {
    const result = calculateMatch(
      {
        ...candidate,
        projects: [
          {
            title: 'Proyecto',
            description: 'Construido con React y pruebas',
            technologies: [],
            universityProject: true,
          },
        ],
      },
      vacancy,
    );
    assert.equal(result.breakdown.projects, 9);
  });
  void it('reconoce tecnologías al final de una oración y conserva puntos internos', () => {
    for (const name of ['React', 'Node.js', '.NET']) {
      const result = calculateMatch(
        {
          ...candidate,
          projects: [
            {
              title: 'Proyecto',
              description: `Construido con ${name}.`,
              technologies: [],
              universityProject: true,
            },
          ],
        },
        {
          ...vacancy,
          skills: [{ skill: skill(name, name, 'TECHNICAL'), weight: 1, priority: 'REQUIRED' }],
        },
      );
      assert.equal(result.breakdown.projects, 15);
    }
  });
  void it('mantiene el mismo peso para niveles autodeclarados sin rúbrica', () => {
    const basic = calculateMatch(
      { ...candidate, skills: [{ skill: react, level: 'BASIC' }] },
      vacancy,
    );
    const advanced = calculateMatch(
      { ...candidate, skills: [{ skill: react, level: 'ADVANCED' }] },
      vacancy,
    );
    assert.equal(basic.score, advanced.score);
  });
  void it('rechaza pesos negativos aunque sumen cien', () => {
    assert.throws(() =>
      calculateMatch(candidate, vacancy, {
        skills: -10,
        education: 80,
        projects: 15,
        softSkills: 10,
        availability: 5,
      }),
    );
  });
  void it('rechaza configuraciones cuyos pesos no suman cien', () => {
    assert.throws(() =>
      calculateMatch(candidate, vacancy, {
        skills: 1,
        education: 1,
        projects: 1,
        softSkills: 1,
        availability: 1,
      }),
    );
  });
});
