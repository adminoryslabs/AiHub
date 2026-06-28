// Cliente HTTP contra la API del AI Hub.
// Maneja login automático, cacheo del JWT y reintento ante expiración del token.

export interface ArticleSummary {
  id: string;
  slug_uk: string;
  type: string;
  category: string;
  status: string;
  featured: boolean;
  volatility: string;
  [key: string]: unknown;
}

export interface ArticleContent {
  lang: 'es' | 'en';
  slug: string;
  title: string;
  summary: string;
  body: string;
  last_edited_at?: string;
  last_verified_at?: string;
}

export interface ArticleDetail {
  id: string;
  slug_uk: string;
  type: string;
  parent_id: string | null;
  category: string;
  domains: string[];
  status: string;
  contents: ArticleContent[];
  relations: Record<string, string[]>;
  [key: string]: unknown;
}

interface Envelope<T> {
  data: T;
}

interface ApiErrorBody {
  error: { code: string; message: string };
}

/** Error con el código y mensaje devueltos por la API, para reportarlos tal cual al agente. */
export class AiHubApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string
  ) {
    super(message);
    this.name = 'AiHubApiError';
  }
}

export interface ClientConfig {
  baseUrl: string;
  email: string;
  password: string;
}

export class AiHubClient {
  private token: string | null = null;
  private tokenExpiresAt = 0;

  constructor(private readonly config: ClientConfig) {}

  /** Autentica contra /admin/auth/login y cachea el JWT con su expiración. */
  private async login(): Promise<void> {
    const res = await fetch(`${this.config.baseUrl}/admin/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: this.config.email, password: this.config.password }),
    });

    if (!res.ok) {
      const body = (await res.json().catch(() => null)) as ApiErrorBody | null;
      throw new AiHubApiError(
        res.status,
        body?.error?.code ?? 'LOGIN_FAILED',
        body?.error?.message ?? 'No se pudo autenticar contra la API del AI Hub'
      );
    }

    const body = (await res.json()) as Envelope<{ token: string; expires_at: string }>;
    this.token = body.data.token;
    // Renovamos 60s antes de la expiración real para evitar carreras.
    this.tokenExpiresAt = new Date(body.data.expires_at).getTime() - 60_000;
  }

  private async ensureToken(): Promise<string> {
    if (!this.token || Date.now() >= this.tokenExpiresAt) {
      await this.login();
    }
    return this.token!;
  }

  /** Realiza una petición autenticada. Reintenta una vez si el token expiró (401). */
  private async request<T>(
    method: string,
    path: string,
    body?: unknown,
    retry = true
  ): Promise<T> {
    const token = await this.ensureToken();
    const res = await fetch(`${this.config.baseUrl}${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${token}`,
        ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });

    if (res.status === 401 && retry) {
      // Token inválido o expirado: forzamos re-login y reintentamos una vez.
      this.token = null;
      return this.request<T>(method, path, body, false);
    }

    if (!res.ok) {
      const errBody = (await res.json().catch(() => null)) as ApiErrorBody | null;
      throw new AiHubApiError(
        res.status,
        errBody?.error?.code ?? 'API_ERROR',
        errBody?.error?.message ?? `Error HTTP ${res.status} en ${method} ${path}`
      );
    }

    if (res.status === 204) return undefined as T;
    const json = (await res.json()) as Envelope<T>;
    return json.data;
  }

  // --- Operaciones editoriales ---

  listArticles(params: {
    status?: string;
    category?: string;
    type?: string;
    search?: string;
    page?: number;
    per_page?: number;
  }): Promise<{ items: ArticleSummary[] } | ArticleSummary[]> {
    const qs = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined && v !== null && v !== '') qs.set(k, String(v));
    }
    const query = qs.toString();
    return this.request('GET', `/admin/articles${query ? `?${query}` : ''}`);
  }

  getArticle(id: string): Promise<ArticleDetail> {
    return this.request('GET', `/admin/articles/${id}`);
  }

  /** Crea la cáscara de un artículo (nace en estado draft, sin contenido). */
  createArticle(input: {
    slug_uk: string;
    type: 'concept' | 'tool-branch';
    category: string;
    parent_id?: string | null;
    domains?: string[];
    volatility?: 'low' | 'medium' | 'high';
    featured?: boolean;
  }): Promise<{ id: string; slug_uk: string; type: string; category: string; status: string }> {
    return this.request('POST', '/admin/articles', input);
  }

  /** Reemplaza el contenido completo de un idioma (la API exige slug, title, summary y body). */
  putContent(id: string, content: ArticleContent): Promise<unknown> {
    return this.request('POST', `/admin/articles/${id}/content`, content);
  }

  /**
   * Aplica ediciones parciales seguras al body de un idioma: cada `find` debe aparecer
   * exactamente una vez. Lee el contenido actual, reemplaza en memoria y reescribe el body
   * completo — así el resto del artículo (código, tablas) queda byte-idéntico.
   * Si algún `find` no aparece exactamente una vez, lanza error y NO escribe nada.
   */
  async patchContent(
    id: string,
    lang: 'es' | 'en',
    edits: { find: string; replace: string }[]
  ): Promise<{ applied: number }> {
    const article = await this.getArticle(id);
    const content = article.contents?.find((c) => c.lang === lang);
    if (!content) {
      throw new AiHubApiError(404, 'NO_CONTENT', `El idioma "${lang}" no tiene contenido.`);
    }

    let body = content.body;
    for (const { find, replace } of edits) {
      const count = body.split(find).length - 1;
      if (count !== 1) {
        throw new AiHubApiError(
          409,
          'PATCH_AMBIGUOUS',
          `El texto a buscar apareció ${count} veces (se requiere exactamente 1). No se aplicó ningún cambio. Texto: "${find.slice(0, 80)}…"`
        );
      }
      body = body.replace(find, replace);
    }

    await this.putContent(id, {
      lang,
      slug: content.slug,
      title: content.title,
      summary: content.summary,
      body,
    });
    return { applied: edits.length };
  }

  updateMetadata(
    id: string,
    metadata: {
      category?: string;
      volatility?: string;
      domains?: string[];
      applicable_as_of?: string | null;
    }
  ): Promise<unknown> {
    return this.request('PUT', `/admin/articles/${id}`, metadata);
  }

  verify(id: string, lang: 'es' | 'en'): Promise<unknown> {
    return this.request('POST', `/admin/articles/${id}/verify`, { lang });
  }

  setStatus(id: string, status: string): Promise<unknown> {
    return this.request('PUT', `/admin/articles/${id}/status`, { status });
  }

  // --- Relaciones ---

  addRelation(id: string, toArticleId: string, type: string): Promise<unknown> {
    return this.request('POST', `/admin/articles/${id}/relations`, {
      to_article_id: toArticleId,
      type,
    });
  }

  removeRelation(id: string, toArticleId: string, type: string): Promise<unknown> {
    return this.request(
      'DELETE',
      `/admin/articles/${id}/relations/${toArticleId}?type=${encodeURIComponent(type)}`
    );
  }

  // --- Recursos ---

  /** Crea la entidad recurso (independiente del artículo). */
  createResource(input: {
    title: string;
    type: string;
    url: string;
    description?: string | null;
  }): Promise<{ id: string; title: string; type: string; url: string }> {
    return this.request('POST', '/admin/resources', input);
  }

  /** Vincula un recurso ya existente a un artículo en un idioma. */
  linkResource(id: string, resourceId: string, lang: 'es' | 'en'): Promise<unknown> {
    return this.request('POST', `/admin/articles/${id}/resources`, {
      resource_id: resourceId,
      lang,
    });
  }

  /** Desvincula un recurso de un artículo en un idioma (no borra la entidad recurso). */
  unlinkResource(id: string, resourceId: string, lang: 'es' | 'en'): Promise<unknown> {
    return this.request(
      'DELETE',
      `/admin/articles/${id}/resources/${resourceId}?lang=${lang}`
    );
  }
}
