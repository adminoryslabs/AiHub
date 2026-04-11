// Cliente HTTP para la API Express
// Se usa en server components (SSR) y client components del frontend

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

// Error personalizado para errores de API
export class ApiClientError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string
  ) {
    super(message);
    this.name = 'ApiClientError';
  }
}

// Wrapper de fetch con manejo de errores estándar
async function apiFetch<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_BASE_URL}${path}`;

  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    // Revalidar datos cada 60 segundos en SSR (Next.js cache)
    next: { revalidate: 60 },
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({
      error: { code: 'UNKNOWN', message: 'Error desconocido' },
    }));
    throw new ApiClientError(res.status, body.error?.code || 'UNKNOWN', body.error?.message || 'Error');
  }

  return res.json() as Promise<T>;
}

// --- Endpoints públicos ---

import type { Category, ArticleListItem, Article } from '@ai-hub/shared';

export interface CategoriesResponse {
  data: Category[];
}

export interface ArticlesResponse {
  data: ArticleListItem[];
  pagination: {
    page: number;
    per_page: number;
    total: number;
    total_pages: number;
  };
}

export interface ArticleResponse {
  data: Article;
}

export interface FeaturedResponse {
  data: {
    id: string;
    slug: string;
    localized_slug: string;
    title: string;
    summary: string;
    category: string;
    last_edited_at: string;
  }[];
}

export interface SearchResponse {
  data: {
    query: string;
    results: {
      article_id: string;
      lang: string;
      slug: string;
      title: string;
      summary: string;
      category: string;
      type: string;
      highlight: { title: string; summary: string };
    }[];
    total: number;
    processing_time_ms: number;
  };
}

// Obtener categorías
export async function getCategories(lang: 'es' | 'en'): Promise<Category[]> {
  const res = await apiFetch<CategoriesResponse>(`/api/v1/categories?lang=${lang}`);
  return res.data;
}

// Obtener lista de artículos
export async function getArticles(params: {
  lang: 'es' | 'en';
  category?: string;
  page?: number;
  per_page?: number;
}): Promise<ArticlesResponse> {
  const query = new URLSearchParams({
    lang: params.lang,
    ...(params.category && { category: params.category }),
    ...(params.page && { page: String(params.page) }),
    ...(params.per_page && { per_page: String(params.per_page) }),
  });
  return apiFetch<ArticlesResponse>(`/api/v1/articles?${query}`);
}

// Obtener artículo por slug
export async function getArticle(slug: string, lang: 'es' | 'en'): Promise<Article> {
  const res = await apiFetch<ArticleResponse>(`/api/v1/articles/${slug}?lang=${lang}`);
  return res.data;
}

// Obtener artículos destacados
export async function getFeatured(lang: 'es' | 'en', limit = 6): Promise<FeaturedResponse['data']> {
  const res = await apiFetch<FeaturedResponse>(`/api/v1/featured?lang=${lang}&limit=${limit}`);
  return res.data;
}

// Buscar artículos
export async function searchArticles(params: {
  q: string;
  lang?: string;
  category?: string;
}): Promise<SearchResponse['data']> {
  const query = new URLSearchParams({ q: params.q });
  if (params.lang) query.set('lang', params.lang);
  if (params.category) query.set('category', params.category);

  const res = await apiFetch<SearchResponse>(`/api/v1/search?${query}`, {
    // La búsqueda no se cachea
    next: { revalidate: 0 },
  } as RequestInit);
  return res.data;
}
