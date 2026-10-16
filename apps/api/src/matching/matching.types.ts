export interface MatchingWeights {
  skills: number;
  education: number;
  projects: number;
  softSkills: number;
  availability: number;
}

export interface MatchSkill {
  id: string;
  name: string;
  slug: string;
  type: 'TECHNICAL' | 'SOFT';
}

export interface MatchingCandidate {
  availableNow: boolean;
  modalities: string[];
  skills: { level: 'BASIC' | 'INTERMEDIATE' | 'ADVANCED'; skill: MatchSkill }[];
  educations: { program: string; academicLevel: string }[];
  projects: {
    title: string;
    description: string;
    technologies: string[];
    universityProject: boolean;
  }[];
}

export interface MatchingVacancy {
  modality: string;
  relatedCareers: string[];
  skills: { priority: 'REQUIRED' | 'DESIRED'; weight: number; skill: MatchSkill }[];
}

export interface MatchBreakdown {
  skills: number;
  education: number;
  projects: number;
  softSkills: number;
  availability: number;
}

export interface MatchResult {
  unassessedCriteria?: (keyof MatchingWeights)[];
  score: number;
  strengths: string[];
  missingSkills: string[];
  breakdown: MatchBreakdown;
  recommendation: string;
}
