import type { CatalogSkill } from '../candidate/candidate-types';
import type { MatchResult } from '@/components/compatibility-card';
export interface CompanyProfile {
  id: string;
  name?: string;
  logoUrl?: string;
  nit?: string;
  sector?: string;
  description?: string;
  size?: 'MICRO' | 'SMALL' | 'MEDIUM' | 'LARGE';
  country?: string;
  city?: string;
  address?: string;
  website?: string;
  linkedinUrl?: string;
  contactEmail?: string;
  phone?: string;
  verificationStatus: 'UNVERIFIED' | 'PENDING' | 'VERIFIED' | 'REJECTED';
  verificationDocumentUrl?: string;
  verificationDocumentName?: string;
  verificationReason?: string;
  verificationRequestedAt?: string;
}
export interface VacancySkill {
  skillId: string;
  priority: 'REQUIRED' | 'DESIRED';
  weight: number;
  skill: CatalogSkill;
}
export interface Vacancy {
  id: string;
  title: string;
  description: string;
  responsibilities: string[];
  requirements: string[];
  city: string;
  department?: string;
  workSchedule: 'FULL_TIME' | 'PART_TIME' | 'FLEXIBLE';
  weeklyHours?: number;
  benefits: string[];
  requiresUniversityAgreement: boolean;
  modality: 'PRESENCIAL' | 'HIBRIDO' | 'REMOTO';
  opportunityType: 'FIRST_JOB' | 'INTERNSHIP' | 'APPRENTICESHIP' | 'TRAINEE';
  contractType: string;
  salaryMin?: number;
  salaryMax?: number;
  currency: string;
  showSalary: boolean;
  deadline?: string;
  relatedCareers: string[];
  maxExperienceMonths: number;
  experienceRequired: boolean;
  status: 'DRAFT' | 'PUBLISHED' | 'CLOSED';
  publishedAt?: string;
  company: Pick<
    CompanyProfile,
    'id' | 'name' | 'logoUrl' | 'city' | 'sector' | 'verificationStatus'
  >;
  skills: VacancySkill[];
  _count: { applications: number };
}
export interface MatchedVacancy extends Vacancy {
  compatibility: MatchResult;
}
export interface CompanyDashboard {
  company: CompanyProfile;
  metrics: {
    vacancies: number;
    published: number;
    active: number;
    closed: number;
    applications: number;
    newApplications: number;
    underReview: number;
    interviews: number;
    selected: number;
  };
  topCandidatesByVacancy: {
    vacancy: { id: string; title: string };
    candidates: {
      id: string;
      compatibilityScore: number;
      status: ApplicationStatus;
      candidate: { id: string; firstName?: string; lastName?: string; headline?: string };
    }[];
  }[];
}
export type ApplicationStatus =
  'APPLIED' | 'UNDER_REVIEW' | 'INTERVIEW' | 'SELECTED' | 'OFFER_SENT' | 'OFFER_ACCEPTED' | 'OFFER_DECLINED' | 'HIRED' | 'CANCELLED' | 'REJECTED' | 'WITHDRAWN';
export interface ApplicationHistory {
  id: string;
  fromStatus?: ApplicationStatus;
  toStatus: ApplicationStatus;
  changedAt: string;
}
export interface CompanyApplication {
  id: string;
  status: ApplicationStatus;
  compatibilityScore: number;
  createdAt: string;
  offerSalary?: number;
  offerCurrency: string;
  offeredStartDate?: string;
  offerNotes?: string;
  vacancy: { id: string; title: string };
  statusHistory: ApplicationHistory[];
  candidate: {
    id: string;
    firstName?: string;
    lastName?: string;
    headline?: string;
    city?: string;
    educations: { id: string; program: string; institution: string; status: string }[];
    skills: { skill: CatalogSkill; level: string }[];
    projects: { id: string; title: string; description: string; technologies: string[] }[];
    certifications: { id: string; name: string; issuingEntity: string }[];
    verifiedExperiences: {
      id: string;
      title: string;
      companyName: string;
      durationWeeks: number;
      skills: { skill: CatalogSkill }[];
      certificate?: { code: string; status: string };
    }[];
  };
}
