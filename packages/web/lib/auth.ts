// Utilidades de autenticación para el panel de admin (client-side)
// El token se guarda en localStorage según el diseño del MVP

const TOKEN_KEY = 'aihub_admin_token';

// Guardar token en localStorage
export function saveToken(token: string): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem(TOKEN_KEY, token);
  }
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
  }
}

// Verificar si hay un token guardado
export function isAuthenticated(): boolean {
  return Boolean(getToken());
}
