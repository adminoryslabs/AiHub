// Tipos de artículos compartidos entre API y Web

export type ArticleType = 'concept' | 'tool-branch';
export type ArticleStatus = 'draft' | 'in_review' | 'published' | 'deprecated';
export type Volatility = 'low' | 'medium' | 'high';
export type Lang = 'es' | 'en';
export type RelationType = 'related' | 'prerequisite' | 'next';
export type ResourceType = 'doc' | 'video' | 'course' | 'article';

// Referencia resumida de artículo (para listas y relaciones)
export interface ArticleRef {
  id: string;
  slug: string;
  localized_slug: string;
  title: string;
  category: string;
}

// Artículo en lista pública
export interface ArticleListItem {
  id: string;
  slug: string;
  localized_slug: string;
  title: string;
  summary: string;
  type: ArticleType;
  category: string;
  domains: string[];
  volatility: Volatility;
  featured: boolean;
  last_edited_at: string;
  last_verified_at: string | null;
  children_count: number;
}

// Recurso externo
export interface Resource {
  id: string;
  title: string;
  type: ResourceType;
  url: string;
  description: string | null;
  created_at?: string;
}

export interface LocalizedResources {
  es: Resource[];
  en: Resource[];
}

// Relaciones agrupadas por tipo
export interface ArticleRelations {
  related: ArticleRef[];
  prerequisite: ArticleRef[];
  next: ArticleRef[];
}

// Enlace al idioma alternativo
export interface AlternateLang {
  lang: Lang;
  slug: string;
  url: string;
}

// Artículo completo (detalle público)
export interface Article {
  id: string;
  slug: string;
  localized_slug: string;
  title: string;
  summary: string;
  body: string;
  type: ArticleType;
  category: string;
  domains: string[];
  volatility: Volatility;
  applicable_as_of: string | null;
  last_edited_at: string;
  last_verified_at: string | null;
  tool_branches: ArticleRef[];
  parent: ArticleRef | null;
  relations: ArticleRelations;
  resources: Resource[];
  alternate_lang: AlternateLang | null;
}

// Contenido de artículo por idioma (admin)
export interface ArticleContent {
  lang: Lang;
  slug: string;
  title: string;
  summary: string;
  body: string;
  last_edited_at: string;
  last_verified_at: string | null;
}

// Estado del contenido por idioma (en vista admin)
export interface ContentStatus {
  title: string;
  has_body: boolean;
  last_edited_at: string;
  last_verified_at: string | null;
}

// Artículo en lista de admin
export interface AdminArticleListItem {
  id: string;
  slug_uk: string;
  type: ArticleType;
  category: string;
  status: ArticleStatus;
  featured: boolean;
  volatility: Volatility;
  domains: string[];
  created_at: string;
  updated_at: string;
  content_status: {
    es?: ContentStatus;
    en?: ContentStatus;
  };
  children_count: number;
}

// Artículo completo en admin (para edición)
export interface AdminArticle {
  id: string;
  slug_uk: string;
  type: ArticleType;
  parent_id: string | null;
  category: string;
  domains: string[];
  status: ArticleStatus;
  featured: boolean;
  volatility: Volatility;
  applicable_as_of: string | null;
  created_at: string;
  updated_at: string;
  contents: ArticleContent[];
  relations: {
    related: string[];
    prerequisite: string[];
    next: string[];
  };
  resources: LocalizedResources;
  children: {
    id: string;
    slug_uk: string;
    title_es: string | null;
    title_en: string | null;
    status: ArticleStatus;
  }[];
}

// Categoría
export interface Category {
  slug: string;
  name: string;
  article_count: number;
}

// Rol interno del panel
export interface Role {
  id: string;
  slug: string;
  name: string;
  is_system?: boolean;
}

// Usuario interno del panel
export interface AdminUser {
  id: string;
  email: string;
  is_active?: boolean;
  role?: Role;
  created_at: string;
}

export interface AdminSessionUser {
  id: string;
  email: string;
  role: Role;
  permissions: string[];
}
