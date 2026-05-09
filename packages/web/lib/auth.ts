// Utilidades de autenticación para el panel de admin (client-side)
// El token se guarda en localStorage según el diseño del MVP

import type { AdminSessionUser } from '@ai-hub/shared';

const TOKEN_KEY = 'aihub_admin_token';
const SESSION_KEY = 'aihub_admin_session';

// Guardar token en localStorage
export function saveToken(token: string): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem(TOKEN_KEY, token);
  }
}

export function saveSession(user: AdminSessionUser): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem(SESSION_KEY, JSON.stringify(user));
  }
}

export function saveAuth(token: string, user: AdminSessionUser): void {
  saveToken(token);
  saveSession(user);
}

// Obtener token de localStorage
export function getToken(): string | null {
  if (typeof window !== 'undefined') {
    return localStorage.getItem(TOKEN_KEY);
  }
  return null;
}

// Eliminar token (logout)
export function removeToken(): void {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(SESSION_KEY);
  }
}

export function getSession(): AdminSessionUser | null {
  if (typeof window === 'undefined') {
    return null;
  }

  const raw = localStorage.getItem(SESSION_KEY);
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as AdminSessionUser;
  } catch {
    localStorage.removeItem(SESSION_KEY);
    return null;
  }
}

// Verificar si hay un token guardado
export function isAuthenticated(): boolean {
  return Boolean(getToken());
}

export function hasPermission(permission: string): boolean {
  return Boolean(getSession()?.permissions.includes(permission));
}
