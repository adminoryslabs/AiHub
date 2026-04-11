// Tipos de respuesta de la API compartidos entre frontend y backend

// Estructura de error estándar
export interface ApiError {
  error: {
    code: string;
    message: string;
  };
}

// Respuesta con datos simples
export interface ApiResponse<T> {
  data: T;
}

// Respuesta con paginación
export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    per_page: number;
    total: number;
    total_pages: number;
  };
}

// Respuesta de login
export interface LoginResponse {
  data: {
    token: string;
    expires_at: string;
  };
}

// Resultado de búsqueda
export interface SearchResult {
  article_id: string;
  lang: string;
  slug: string;
  title: string;
  summary: string;
  category: string;
  type: string;
  highlight: {
    title: string;
    summary: string;
  };
}

// Respuesta de búsqueda
export interface SearchResponse {
  data: {
    query: string;
    results: SearchResult[];
    total: number;
    processing_time_ms: number;
  };
}

// Respuesta de upload de imagen
export interface ImageUploadResponse {
  data: {
    url: string;
    key: string;
    size: number;
    mime_type: string;
  };
}
