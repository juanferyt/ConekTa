import type { CatalogSkill, Project } from '../candidate/candidate-types';
export interface SkillEvidence {
  skillId: string;
  totalScore: number;
  declaredScore: number;
  projectScore: number;
  verifiedScore: number;
  consistencyScore: number;
  projectCount: number;
  verifiedCount: number;
  averageRating?: number;
  skill: CatalogSkill;
  explanation: Record<string, string>;
}
export interface Contribution {
  id: string;
  validatorName: string;
  validatorEmail: string;
  contributionRole: string;
  contributionSummary: string;
  status: 'PENDING' | 'VERIFIED' | 'REJECTED' | 'CANCELLED';
  expiresAt: string;
  project: { id: string; title: string };
}
export interface PassportPayload {
  passport: { publicCode: string; active: boolean; issuedAt: string; updatedAt: string };
  candidate: {
    name: string;
    headline?: string;
    city?: string;
    country?: string;
    portfolioUrl?: string;
  };
  skillEvidence: SkillEvidence[];
  projects: (Project & {
    verifiedContributions: {
      id: string;
      validatorName: string;
      contributionRole: string;
      contributionSummary: string;
    }[];
  })[];
  verifiedExperiences: {
    id: string;
    title: string;
    companyName: string;
    durationWeeks: number;
    skills: { skill: CatalogSkill }[];
    certificate?: { code: string };
  }[];
}
export interface ImprovementRoute {
  vacancy: { id: string; title: string; company: { id: string; name?: string } };
  current: { score: number };
  targetScore: number;
  steps: {
    order: number;
    skill: CatalogSkill;
    priority: string;
    action: 'COMPLETE_EXPERIENCE' | 'BUILD_PROJECT';
    experience?: { id: string; title: string; company?: string };
    guidance: string;
    potentialGain: number;
    projectedScore: number;
  }[];
  disclaimer: string;
}
export interface OpportunityIndex {
  score: number;
  responseRate: number;
  processCompletionRate: number;
  feedbackRate: number;
  juniorFriendlyRate: number;
  selectionRate: number;
  sampleSize: number;
  confidence: 'LOW' | 'MEDIUM' | 'HIGH';
  explanation: string;
  company: { id: string; name?: string; verificationStatus: string };
}
