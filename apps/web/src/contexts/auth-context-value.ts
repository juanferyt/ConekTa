import { createContext } from 'react';
import type { AuthUser, UserRole } from '@/lib/auth';

export interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  login(email: string, password: string): Promise<AuthUser>;
  register(email: string, password: string, role: Exclude<UserRole, 'ADMIN'>, consent: { termsAccepted: true; privacyAccepted: true; majorityAgeConfirmed: true; marketingConsent: boolean }): Promise<AuthUser>;
  logout(): Promise<void>;
}

export const AuthContext = createContext<AuthContextValue | null>(null);
