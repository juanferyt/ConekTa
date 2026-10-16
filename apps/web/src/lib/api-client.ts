import type { AuthResponse } from './auth';

export const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';
let accessToken: string | null = null;
let refreshPromise: Promise<AuthResponse | null> | null = null;

export const tokenStorage = {
  get: () => accessToken,
  set: (token: string) => { accessToken = token; },
  clear: () => { accessToken = null; },
};

export class ApiError extends Error {
  constructor(public readonly status: number, message: string) { super(message); }
}

async function parseError(response: Response): Promise<ApiError> {
  const body = await response.json().catch(() => null) as { message?: string | string[] } | null;
  const message = Array.isArray(body?.message) ? body.message.join('. ') : body?.message;
  return new ApiError(response.status, message ?? 'No fue posible completar la solicitud');
}

export async function restoreSession(): Promise<AuthResponse | null> {
  if (refreshPromise) return refreshPromise;
  refreshPromise = (async () => {
    const response = await fetch(`${API_URL}/auth/refresh`, { method: 'POST', credentials: 'include' });
    if (!response.ok) { tokenStorage.clear(); return null; }
    const session = await response.json() as AuthResponse;
    tokenStorage.set(session.accessToken);
    return session;
  })();
  try { return await refreshPromise; } finally { refreshPromise = null; }
}

export async function apiFetch<T>(path: string, options: RequestInit = {}, retry = true): Promise<T> {
  const token = tokenStorage.get();
  const headers = new Headers(options.headers);
  if (options.body) headers.set('Content-Type', 'application/json');
  if (token) headers.set('Authorization', `Bearer ${token}`);
  const response = await fetch(`${API_URL}${path}`, { ...options, headers, credentials: 'include' });
  const canRefresh = !['/auth/login', '/auth/register', '/auth/refresh'].includes(path);
  if (response.status === 401 && retry && canRefresh) {
    if (await restoreSession()) return apiFetch<T>(path, options, false);
  }
  if (!response.ok) throw await parseError(response);
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}
