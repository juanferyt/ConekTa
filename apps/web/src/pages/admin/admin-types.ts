export interface PageResult<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  pages: number;
}
export interface AdminMetrics {
  users: number;
  candidates: number;
  companies: number;
  activeCompanies: number;
  publishedVacancies: number;
  applications: number;
  selectedCandidates: number;
}
export interface AdminUser {
  id: string;
  email: string;
  role: 'CANDIDATE' | 'COMPANY' | 'ADMIN';
  active: boolean;
  emailVerified: boolean;
  createdAt: string;
  updatedAt: string;
}
export interface AdminCandidate {
  id: string;
  firstName?: string;
  lastName?: string;
  headline?: string;
  city?: string;
  user: { email: string; active: boolean; createdAt: string };
  _count: { skills: number; projects: number; applications: number };
}
export interface AdminCompany {
  id: string;
  name?: string;
  nit?: string;
  sector?: string;
  city?: string;
  verificationStatus: 'UNVERIFIED' | 'PENDING' | 'VERIFIED' | 'REJECTED';
  verificationDocumentUrl?: string;
  verificationDocumentName?: string;
  verificationReason?: string;
  verificationRequestedAt?: string;
  user: { email: string; active: boolean; createdAt: string };
  _count: { vacancies: number; applications: number };
}
export interface AdminVacancy {
  id: string;
  title: string;
  status: string;
  adminHidden: boolean;
  createdAt: string;
  city: string;
  company: { id: string; name?: string; user: { email: string; active: boolean } };
  _count: { applications: number };
}
export interface AdminApplication {
  id: string;
  status: string;
  compatibilityScore: number;
  createdAt: string;
  candidate: { firstName?: string; lastName?: string; user: { email: string } };
  vacancy: { title: string };
  company: { name?: string };
  statusHistory: { id: string; toStatus: string; changedAt: string }[];
}
export interface AdminSkill {
  id: string;
  name: string;
  category: string;
  type: 'TECHNICAL' | 'SOFT';
  active: boolean;
  createdAt: string;
}
