import type { UserRole } from '@prisma/client';
import type { Request } from 'express';

export interface AuthUser {
  id: string;
  email: string;
  role: UserRole;
  active: boolean;
  emailVerified: boolean;
}

export interface JwtPayload {
  sub: string;
  role: UserRole;
  type: 'access' | 'refresh';
  iat?: number;
  exp?: number;
}

export interface AuthenticatedRequest extends Request {
  user: AuthUser;
}
