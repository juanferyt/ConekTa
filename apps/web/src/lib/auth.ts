export type UserRole = 'CANDIDATE' | 'COMPANY' | 'ADMIN';

export interface AuthUser {
  id: string;
  email: string;
  role: UserRole;
  active: boolean;
  emailVerified: boolean;
}

export interface AuthResponse { accessToken: string; user: AuthUser }

export const dashboardFor = (role: UserRole): string => ({ CANDIDATE: '/candidate', COMPANY: '/company', ADMIN: '/admin' })[role];
