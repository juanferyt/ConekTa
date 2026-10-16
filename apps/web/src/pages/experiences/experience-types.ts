import type { MatchResult } from '@/components/compatibility-card';
import type { CatalogSkill } from '../candidate/candidate-types';

export type ExperienceStatus = 'DRAFT' | 'PUBLISHED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
export type ExperienceApplicationStatus =
  'APPLIED' | 'ACCEPTED' | 'REJECTED' | 'IN_PROGRESS' | 'SUBMITTED' | 'COMPLETED' | 'CANCELLED';
export interface ExperienceSkill {
  skillId: string;
  priority: 'REQUIRED' | 'DESIRED';
  weight: number;
  skill: CatalogSkill;
}
export interface ExperienceOpportunity {
  id: string;
  title: string;
  description: string;
  objective: string;
  activities: string[];
  professionalArea: string;
  modality: 'PRESENCIAL' | 'HIBRIDO' | 'REMOTO';
  city?: string;
  estimatedDurationWeeks: number;
  startsAt?: string;
  deadline?: string;
  participantLimit: number;
  expectedDeliverables: string[];
  status: ExperienceStatus;
  publishedAt?: string;
  company: { id: string; name?: string; logoUrl?: string; verificationStatus: string };
  skills: ExperienceSkill[];
  _count: { applications: number };
  applications?: ExperienceApplication[];
  compatibility?: MatchResult & { verifiedStrengths?: string[]; verifiedEvidenceBonus?: number };
  developmentSkills?: { name: string; vacancyDemand: number }[];
  recommendationRank?: number;
}
export interface ExperienceSubmission {
  workDescription: string;
  projectUrl: string;
  githubUrl?: string;
  additionalLinks: string[];
  comments?: string;
  submittedAt: string;
}
export interface ExperienceEvaluation {
  compliance: number;
  quality: number;
  responsibility: number;
  communication: number;
  teamwork: number;
  technicalSkills: number;
  finalResult: number;
  companyComment: string;
  recommendation?: string;
  verifiedSkillIds: string[];
}
export interface ExperienceApplication {
  id: string;
  compatibilityScore: number;
  status: ExperienceApplicationStatus;
  motivation?: string;
  createdAt: string;
  candidate?: { id: string; firstName?: string; lastName?: string; headline?: string };
  experience: ExperienceOpportunity;
  submission?: ExperienceSubmission;
  evaluation?: ExperienceEvaluation;
  verifiedExperience?: VerifiedExperience;
}
export interface VerifiedExperience {
  id: string;
  title: string;
  companyName: string;
  summary: string;
  startsAt: string;
  completedAt: string;
  durationWeeks: number;
  public: boolean;
  skills: { skill: CatalogSkill }[];
  certificate?: {
    id: string;
    code: string;
    status: 'ACTIVE' | 'REVOKED';
    issuedAt: string;
    payloadHash?: string | null;
  };
}
export interface CandidateExperiences {
  applications: ExperienceApplication[];
  verifiedExperiences: VerifiedExperience[];
  stats: { completed: number; verifiedSkills: number; certificates: number; durationWeeks: number };
}
