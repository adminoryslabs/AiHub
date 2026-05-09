// Cliente HTTP para la API admin (incluye token JWT)
import type { AccessRolesResponse, AccessUsersResponse, LoginResponse, SessionResponse } from '@ai-hub/shared';
import { getToken } from './auth';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export class AdminApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string
  ) {
    super(message);
    this.name = 'AdminApiError';
  }
}

// Fetch con token JWT automático
async function adminFetch<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getToken();
  const url = `${API_BASE_URL}${path}`;

  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options.headers,
    },
    cache: 'no-store',
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({
      error: { code: 'UNKNOWN', message: 'Error desconocido' },
    }));
    throw new AdminApiError(
      res.status,
      body.error?.code || 'UNKNOWN',
      body.error?.message || 'Error'
    );
  }

  if (res.status === 204) return null as T;
  return res.json() as Promise<T>;
}

// --- Autenticación ---

export async function login(email: string, password: string) {
  const res = await adminFetch<LoginResponse>(
    '/api/v1/admin/auth/login',
    {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }
  );
  return res.data;
}

export async function getAdminSession() {
  const res = await adminFetch<SessionResponse>('/api/v1/admin/auth/session');
  return res.data.user;
}

// --- Artículos admin ---

export async function listAdminArticles(params: {
  status?: string;
  category?: string;
  type?: string;
  search?: string;
  page?: number;
  per_page?: number;
}) {
  const query = new URLSearchParams();
  if (params.status) query.set('status', params.status);
  if (params.category) query.set('category', params.category);
  if (params.type) query.set('type', params.type);
  if (params.search) query.set('search', params.search);
  if (params.page) query.set('page', String(params.page));
  if (params.per_page) query.set('per_page', String(params.per_page));

  return adminFetch<{ data: unknown[]; pagination: unknown }>(
    `/api/v1/admin/articles?${query}`
  );
}

export async function getAdminArticle(id: string) {
  return adminFetch<{ data: unknown }>(`/api/v1/admin/articles/${id}`);
}

export async function createArticle(data: {
  slug_uk: string;
  type: string;
  parent_id?: string | null;
  category: string;
  domains?: string[];
  volatility?: string;
  featured?: boolean;
}) {
  return adminFetch<{ data: unknown }>('/api/v1/admin/articles', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateArticle(
  id: string,
  data: {
    category?: string;
    volatility?: string;
    featured?: boolean;
    domains?: string[];
    applicable_as_of?: string | null;
  }
) {
  return adminFetch<{ data: unknown }>(`/api/v1/admin/articles/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function updateArticleContent(
  id: string,
  data: {
    lang: string;
    slug: string;
    title: string;
    summary: string;
    body: string;
  }
) {
  return adminFetch<{ data: unknown }>(`/api/v1/admin/articles/${id}/content`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateArticleStatus(id: string, status: string) {
  return adminFetch<{ data: unknown }>(`/api/v1/admin/articles/${id}/status`, {
    method: 'PUT',
    body: JSON.stringify({ status }),
  });
}

export async function verifyArticle(id: string, lang: string) {
  return adminFetch<{ data: unknown }>(`/api/v1/admin/articles/${id}/verify`, {
    method: 'POST',
    body: JSON.stringify({ lang }),
  });
}

export async function addRelation(
  id: string,
  data: { to_article_id: string; type: string }
) {
  return adminFetch<{ data: unknown }>(`/api/v1/admin/articles/${id}/relations`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function removeRelation(id: string, toId: string, type: string) {
  return adminFetch<null>(
    `/api/v1/admin/articles/${id}/relations/${toId}?type=${type}`,
    { method: 'DELETE' }
  );
}

// --- Recursos ---

export async function listResources() {
  return adminFetch<{ data: unknown[] }>('/api/v1/admin/resources');
}

export async function createResource(data: {
  title: string;
  type: string;
  url: string;
  description?: string | null;
}) {
  return adminFetch<{ data: unknown }>('/api/v1/admin/resources', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateResource(
  id: string,
  data: {
    title?: string;
    type?: string;
    url?: string;
    description?: string | null;
  }
) {
  return adminFetch<{ data: unknown }>(`/api/v1/admin/resources/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function deleteResource(id: string) {
  return adminFetch<null>(`/api/v1/admin/resources/${id}`, { method: 'DELETE' });
}

export async function linkResourceByLang(articleId: string, resourceId: string, lang: 'es' | 'en') {
  return adminFetch<{ data: unknown }>(`/api/v1/admin/articles/${articleId}/resources`, {
    method: 'POST',
    body: JSON.stringify({ resource_id: resourceId, lang }),
  });
}

export async function unlinkResourceByLang(articleId: string, resourceId: string, lang: 'es' | 'en') {
  return adminFetch<null>(
    `/api/v1/admin/articles/${articleId}/resources/${resourceId}?lang=${lang}`,
    { method: 'DELETE' }
  );
}

// --- Imágenes ---

export async function uploadImage(file: File) {
  const token = getToken();
  const formData = new FormData();
  formData.append('file', file);

  const res = await fetch(`${API_BASE_URL}/api/v1/admin/images/upload`, {
    method: 'POST',
    headers: {
      ...(token && { Authorization: `Bearer ${token}` }),
    },
    body: formData,
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: { code: 'UNKNOWN', message: 'Error' } }));
    throw new AdminApiError(res.status, body.error?.code || 'UNKNOWN', body.error?.message || 'Error');
  }

  return res.json() as Promise<{ data: { url: string; key: string; size: number; mime_type: string } }>;
}

// --- Gestión de accesos ---

export async function listAccessUsers() {
  return adminFetch<AccessUsersResponse>('/api/v1/admin/access/users');
}

export async function updateAccessUserRole(id: string, roleId: string) {
  return adminFetch<{ data: unknown }>(`/api/v1/admin/access/users/${id}/role`, {
    method: 'PATCH',
    body: JSON.stringify({ role_id: roleId }),
  });
}

export async function listAccessRoles() {
  return adminFetch<AccessRolesResponse>('/api/v1/admin/access/roles');
}

export async function updateAccessRolePermissions(id: string, permissions: string[]) {
  return adminFetch<{ data: unknown }>(`/api/v1/admin/access/roles/${id}/permissions`, {
    method: 'PUT',
    body: JSON.stringify({ permissions }),
  });
}
