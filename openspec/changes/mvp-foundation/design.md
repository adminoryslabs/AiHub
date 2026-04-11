# Design — MVP Foundation

> Documento de diseño técnico para el MVP de AI Hub.
> Generado: 2026-04-06
> Estado: draft — pendiente de aprobación

---

## Índice

1. [Fundación compartida](#1-fundación-compartida)
    1. [Schema de base de datos](#11-schema-de-base-de-datos)
    2. [Contratos de API](#12-contratos-de-api)
    3. [Modelo de autenticación](#13-modelo-de-autenticación)
    4. [Integración con Meilisearch](#14-integración-con-meilisearch)
    5. [Integración con Cloudflare R2](#15-integración-con-cloudflare-r2)
2. [Sistema de diseño (Stitch)](#2-sistema-de-diseño-stitch)
    1. [Paleta de colores](#21-paleta-de-colores)
    2. [Tipografía](#22-tipografía)
    3. [Espaciado y bordes](#23-espaciado-y-bordes)
    4. [Layout](#24-layout)
    5. [Componentes clave](#25-componentes-clave)
    6. [Iconografía](#26-iconografía)
    7. [Configuración de Tailwind](#27-configuración-de-tailwind)
    8. [Referencias visuales de Stitch](#28-referencias-visuales-de-stitch)
3. [Módulo: Sitio público](#3-módulo-sitio-público)
    1. [Arquitectura del frontend](#31-arquitectura-del-frontend)
    2. [Rutas y mapeo a la API](#32-rutas-y-mapeo-a-la-api)
    3. [Mapeo de categorías (i18n)](#33-mapeo-de-categorías-i18n)
    4. [Renderizado de markdown](#34-renderizado-de-markdown)
    5. [SEO](#35-seo)
    6. [Layout público](#36-layout-público)
    7. [Búsqueda](#37-búsqueda)
    8. [Tema (dark/light)](#38-tema-darklight)
4. [Módulo: Panel de admin](#4-módulo-panel-de-admin)
    1. [Arquitectura del panel](#41-arquitectura-del-panel)
    2. [Autenticación en el frontend](#42-autenticación-en-el-frontend)
    3. [Páginas del panel](#43-páginas-del-panel)
    4. [Cambio de estado](#44-cambio-de-estado)
    5. [Marcado como verificado](#45-marcado-como-verificado)
5. [Estructura del monorepo](#5-estructura-del-monorepo)
    1. [Migraciones](#51-migraciones)
    2. [Variables de entorno](#52-variables-de-entorno)
6. [Flujos de datos](#6-flujos-de-datos)
    1. [Flujo: Publicar un artículo nuevo](#61-flujo-publicar-un-artículo-nuevo)
    2. [Flujo: Leer un artículo (sitio público)](#62-flujo-leer-un-artículo-sitio-público)
    3. [Flujo: Búsqueda](#63-flujo-búsqueda)
7. [Consideraciones de despliegue](#7-consideraciones-de-despliegue)
    1. [Entorno de desarrollo](#71-entorno-de-desarrollo)
    2. [Producción](#72-producción)
    3. [CI/CD](#73-cicd)
    4. [Preparación para fases futuras](#74-preparación-para-fases-futuras)

---

## 1. Fundación compartida

> Esta sección define los cimientos que ambos módulos comparten: el schema de base de datos, los contratos de API, el modelo de autenticación y las integraciones con servicios externos. Ningún módulo puede funcionar sin estos contratos.

### 1.1 Schema de base de datos

Base de datos PostgreSQL en NeonDB. Todas las tablas usan `uuid` como tipo de clave primaria. Los timestamps usan `TIMESTAMPTZ`.

#### Diagrama ER

```mermaid
erDiagram
    categories ||--o{ articles : "categorizes"
    articles ||--o{ article_contents : "has"
    articles ||--o{ article_relations : "originates"
    articles ||--o{ article_relations : "receives"
    articles }o--o| articles : "parent-child"
    articles ||--o{ article_resources : "links"
    resources ||--o{ article_resources : "links"

    categories {
        varchar slug PK
        varchar name_es
        varchar name_en
        integer display_order
    }

    articles {
        uuid id PK
        varchar slug_uk
        varchar type "concept | tool-branch"
        uuid parent_id FK "-> articles.id"
        varchar category FK "-> categories.slug"
        _text domains "string[]"
        varchar status "draft | published | deprecated"
        boolean featured
        varchar volatility "low | medium | high"
        varchar applicable_as_of "solo tool-branch"
        timestamptz created_at
        timestamptz updated_at
    }

    article_contents {
        uuid id PK
        uuid article_id FK
        varchar lang "es | en"
        varchar slug "por idioma"
        varchar title
        text summary
        text body "markdown"
        timestamptz last_edited_at
        timestamptz last_verified_at
    }

    article_relations {
        uuid from_article_id FK
        uuid to_article_id FK
        varchar type "related | prerequisite | next"
    }

    resources {
        uuid id PK
        varchar title
        varchar type "doc | video | course | article"
        varchar url
        text description
        timestamptz created_at
    }

    article_resources {
        uuid article_id FK
        uuid resource_id FK
    }

    admin_users {
        uuid id PK
        varchar email
        varchar password_hash
        timestamptz created_at
    }
```

#### Tabla: `categories`

Categorías de navegación del Hub. Registradas en base de datos para permitir agregar nuevas sin cambios de código.

| Columna | Tipo | Restricciones | Descripción |
|---------|------|---------------|-------------|
| `slug` | VARCHAR(30) | PK | Identificador canónico. Ej: `"fundamentals"`, `"agents"` |
| `name_es` | VARCHAR(100) | NOT NULL | Nombre en español |
| `name_en` | VARCHAR(100) | NOT NULL | Nombre en inglés |
| `display_order` | INTEGER | NOT NULL, default `0` | Orden de aparición en sidebar y homepage |

El ícono de cada categoría en la UI se resuelve en el frontend mediante un diccionario estático que mapea `slug → Material Symbol`. Es una decisión de interfaz, no de datos.

---

#### Tabla: `articles`

Metadatos estructurales compartidos entre idiomas.

| Columna | Tipo | Restricciones | Descripción |
|---------|------|---------------|-------------|
| `id` | UUID | PK, default `gen_random_uuid()` | Identificador único |
| `slug_uk` | VARCHAR(200) | UNIQUE, NOT NULL | Slug canónico en inglés. Referencia interna entre artículos |
| `type` | VARCHAR(20) | NOT NULL, CHECK | `"concept"` o `"tool-branch"` |
| `parent_id` | UUID | FK → `articles.id`, NULLABLE | Null para conceptos principales. Apunta al artículo padre para ramas |
| `category` | VARCHAR(30) | NOT NULL, FK → `categories.slug` | Categoría del artículo |
| `domains` | TEXT[] | NOT NULL, default `'{programming}'` | Etiquetas transversales. MVP: siempre `['programming']` |
| `status` | VARCHAR(15) | NOT NULL, CHECK, default `'draft'` | `"draft"`, `"published"`, `"deprecated"` |
| `featured` | BOOLEAN | NOT NULL, default `false` | Selección manual para homepage |
| `volatility` | VARCHAR(10) | NOT NULL, CHECK, default `'low'` | `"low"`, `"medium"`, `"high"` |
| `applicable_as_of` | VARCHAR(100) | NULLABLE | Solo para tool-branch. Versión/fecha de validación |
| `created_at` | TIMESTAMPTZ | NOT NULL, default `now()` | Fecha de creación |
| `updated_at` | TIMESTAMPTZ | NOT NULL, default `now()` | Fecha de última modificación |

**Índices:**
- `idx_articles_status` — `(status)` — filtrar publicados
- `idx_articles_category_status` — `(category, status)` — navegación por categoría
- `idx_articles_parent` — `(parent_id)` — buscar ramas de un concepto
- `idx_articles_featured` — `(featured, status)` — homepage destacados
- `idx_articles_type` — `(type)` — filtrar por tipo

#### Tabla: `article_contents`

Contenido por idioma. Cada artículo tiene 0, 1 o 2 filas (una por idioma).

| Columna | Tipo | Restricciones | Descripción |
|---------|------|---------------|-------------|
| `id` | UUID | PK, default `gen_random_uuid()` | Identificador único |
| `article_id` | UUID | FK → `articles.id`, NOT NULL | Artículo al que pertenece |
| `lang` | VARCHAR(2) | NOT NULL, CHECK | `"es"` o `"en"` |
| `slug` | VARCHAR(200) | NOT NULL | Slug localizado para la URL |
| `title` | VARCHAR(500) | NOT NULL | Título del artículo en este idioma |
| `summary` | TEXT | NOT NULL | Resumen corto (1-2 párrafos) |
| `body` | TEXT | NOT NULL, default `''` | Cuerpo del artículo en markdown |
| `last_edited_at` | TIMESTAMPTZ | NOT NULL, default `now()` | Última edición de este idioma |
| `last_verified_at` | TIMESTAMPTZ | NULLABLE | Última verificación de vigencia |

**Restricciones únicas:**
- `uq_article_lang` — `(article_id, lang)` — un contenido por idioma por artículo

**Índices:**
- `idx_article_contents_article` — `(article_id)` — buscar contenidos de un artículo
- `idx_article_contents_slug` — `(slug)` — lookup por slug para URLs
- `idx_article_contents_lang_slug` — `(lang, slug)` — búsqueda por idioma + slug (rutas públicas)

#### Tabla: `article_relations`

Relaciones entre artículos.

| Columna | Tipo | Restricciones | Descripción |
|---------|------|---------------|-------------|
| `from_article_id` | UUID | FK → `articles.id`, NOT NULL | Artículo origen |
| `to_article_id` | UUID | FK → `articles.id`, NOT NULL | Artículo destino |
| `type` | VARCHAR(20) | NOT NULL, CHECK | `"related"`, `"prerequisite"`, `"next"` |

**Restricciones únicas:**
- `uq_article_relation` — `(from_article_id, to_article_id, type)` — evitar duplicados

**Índices:**
- `idx_relations_from` — `(from_article_id, type)` — relaciones salientes por tipo
- `idx_relations_to` — `(to_article_id)` — relaciones entrantes

#### Tabla: `resources`

Recursos externos curados.

| Columna | Tipo | Restricciones | Descripción |
|---------|------|---------------|-------------|
| `id` | UUID | PK, default `gen_random_uuid()` | Identificador único |
| `title` | VARCHAR(500) | NOT NULL | Título del recurso |
| `type` | VARCHAR(15) | NOT NULL, CHECK | `"doc"`, `"video"`, `"course"`, `"article"` |
| `url` | VARCHAR(2000) | NOT NULL | URL del recurso |
| `description` | TEXT | NULLABLE | Descripción breve |
| `created_at` | TIMESTAMPTZ | NOT NULL, default `now()` | Fecha de creación |

**Índices:**
- `idx_resources_type` — `(type)` — filtrar por tipo de recurso

#### Tabla: `article_resources`

Relación muchos-a-muchos entre artículos y recursos.

| Columna | Tipo | Restricciones | Descripción |
|---------|------|---------------|-------------|
| `article_id` | UUID | FK → `articles.id`, NOT NULL | Artículo |
| `resource_id` | UUID | FK → `resources.id`, NOT NULL | Recurso |

**Restricciones únicas:**
- `uq_article_resource` — `(article_id, resource_id)` — evitar duplicados

#### Tabla: `admin_users`

Usuarios con acceso al panel de administración.

| Columna | Tipo | Restricciones | Descripción |
|---------|------|---------------|-------------|
| `id` | UUID | PK, default `gen_random_uuid()` | Identificador único |
| `email` | VARCHAR(255) | UNIQUE, NOT NULL | Email del admin |
| `password_hash` | VARCHAR(255) | NOT NULL | Hash bcrypt de la contraseña |
| `created_at` | TIMESTAMPTZ | NOT NULL, default `now()` | Fecha de creación |

#### Trigger de `updated_at`

```sql
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_articles_updated_at
  BEFORE UPDATE ON articles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
```

#### SQL de creación completo

```sql
-- categories (debe crearse antes que articles por la FK)
CREATE TABLE categories (
  slug VARCHAR(30) PRIMARY KEY,
  name_es VARCHAR(100) NOT NULL,
  name_en VARCHAR(100) NOT NULL,
  display_order INTEGER NOT NULL DEFAULT 0
);

-- articles
CREATE TABLE articles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug_uk VARCHAR(200) NOT NULL UNIQUE,
  type VARCHAR(20) NOT NULL CHECK (type IN ('concept', 'tool-branch')),
  parent_id UUID REFERENCES articles(id) ON DELETE SET NULL,
  category VARCHAR(30) NOT NULL REFERENCES categories(slug),
  domains TEXT[] NOT NULL DEFAULT '{programming}',
  status VARCHAR(15) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'deprecated')),
  featured BOOLEAN NOT NULL DEFAULT false,
  volatility VARCHAR(10) NOT NULL DEFAULT 'low' CHECK (volatility IN ('low', 'medium', 'high')),
  applicable_as_of VARCHAR(100),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- article_contents
CREATE TABLE article_contents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id UUID NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
  lang VARCHAR(2) NOT NULL CHECK (lang IN ('es', 'en')),
  slug VARCHAR(200) NOT NULL,
  title VARCHAR(500) NOT NULL,
  summary TEXT NOT NULL,
  body TEXT NOT NULL DEFAULT '',
  last_edited_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_verified_at TIMESTAMPTZ,
  CONSTRAINT uq_article_lang UNIQUE (article_id, lang)
);

-- article_relations
CREATE TABLE article_relations (
  from_article_id UUID NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
  to_article_id UUID NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
  type VARCHAR(20) NOT NULL CHECK (type IN ('related', 'prerequisite', 'next')),
  CONSTRAINT uq_article_relation UNIQUE (from_article_id, to_article_id, type),
  CONSTRAINT no_self_relation CHECK (from_article_id != to_article_id)
);

-- resources
CREATE TABLE resources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(500) NOT NULL,
  type VARCHAR(15) NOT NULL CHECK (type IN ('doc', 'video', 'course', 'article')),
  url VARCHAR(2000) NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- article_resources
CREATE TABLE article_resources (
  article_id UUID NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
  resource_id UUID NOT NULL REFERENCES resources(id) ON DELETE CASCADE,
  CONSTRAINT uq_article_resource UNIQUE (article_id, resource_id)
);

-- admin_users
CREATE TABLE admin_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Índices
CREATE INDEX idx_articles_status ON articles(status);
CREATE INDEX idx_articles_category_status ON articles(category, status);
CREATE INDEX idx_articles_parent ON articles(parent_id);
CREATE INDEX idx_articles_featured ON articles(featured, status);
CREATE INDEX idx_articles_type ON articles(type);

CREATE INDEX idx_article_contents_article ON article_contents(article_id);
CREATE INDEX idx_article_contents_slug ON article_contents(slug);
CREATE INDEX idx_article_contents_lang_slug ON article_contents(lang, slug);

CREATE INDEX idx_relations_from ON article_relations(from_article_id, type);
CREATE INDEX idx_relations_to ON article_relations(to_article_id);

CREATE INDEX idx_resources_type ON resources(type);

-- Trigger updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_articles_updated_at
  BEFORE UPDATE ON articles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
```

#### Seed: `categories`

Datos iniciales de las 5 categorías del MVP. Agregar una nueva categoría = insertar una fila, sin cambios de código.

```sql
INSERT INTO categories (slug, name_es, name_en, display_order) VALUES
  ('fundamentals', 'Fundamentos',  'Fundamentals', 1),
  ('agents',       'Agentes',      'Agents',       2),
  ('prompting',    'Prompting',    'Prompting',    3),
  ('patterns',     'Patrones',     'Patterns',     4),
  ('tools',        'Herramientas', 'Tools',        5)
ON CONFLICT (slug) DO NOTHING;
```

---

### 1.2 Contratos de API

La API Express es la fuente de verdad para ambos módulos. Todas las respuestas son JSON. Los errores siguen el formato:

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Descripción legible del error"
  }
}
```

Códigos de error comunes:
- `NOT_FOUND` — recurso no existe (HTTP 404)
- `UNAUTHORIZED` — sin credenciales o inválidas (HTTP 401)
- `FORBIDDEN` — credenciales válidas pero sin permiso (HTTP 403)
- `VALIDATION_ERROR` — datos de entrada inválidos (HTTP 400)
- `CONFLICT` — conflicto de estado (HTTP 409)
- `INTERNAL_ERROR` — error del servidor (HTTP 500)

#### 1.2.1 Endpoints públicos (sitio público)

Consumidos por el frontend Next.js (SSR). No requieren autenticación.

---

**`GET /api/v1/health`**

Health check del servicio.

Respuesta 200:
```json
{
  "status": "ok",
  "timestamp": "2026-04-06T12:00:00Z",
  "services": {
    "database": "connected",
    "meilisearch": "connected"
  }
}
```

---

**`GET /api/v1/articles`**

Lista de artículos publicados con paginación y filtros.

Query params:
| Param | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| `lang` | string | Sí | `"es"` o `"en"` |
| `category` | string | No | Filtrar por categoría |
| `domain` | string | No | Filtrar por dominio |
| `type` | string | No | `"concept"` o `"tool-branch"` |
| `parent_id` | UUID | No | Filtrar ramas de un artículo padre |
| `page` | number | No | Página (default: 1) |
| `per_page` | number | No | Items por página (default: 20, max: 50) |

Respuesta 200:
```json
{
  "data": [
    {
      "id": "uuid",
      "slug": "slug-en-ingles",
      "localized_slug": "slug-en-espanol",
      "title": "Título del artículo",
      "summary": "Resumen corto",
      "type": "concept",
      "category": "agents",
      "domains": ["programming"],
      "volatility": "low",
      "featured": false,
      "last_edited_at": "2026-04-01T10:00:00Z",
      "last_verified_at": "2026-04-05T08:00:00Z",
      "children_count": 3
    }
  ],
  "pagination": {
    "page": 1,
    "per_page": 20,
    "total": 45,
    "total_pages": 3
  }
}
```

Lógica del backend:
- Solo devuelve artículos con `status = 'published'`
- JOIN con `article_contents` filtrando por `lang`
- `children_count` = COUNT de artículos hijos con `parent_id = article.id` y `status = 'published'`

---

**`GET /api/v1/articles/:slug`**

Detalle completo de un artículo por idioma.

Query params:
| Param | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| `lang` | string | Sí | `"es"` o `"en"` |

Path params:
| Param | Tipo | Descripción |
|-------|------|-------------|
| `slug` | string | Slug localizado del artículo (no el canónico) |

Respuesta 200:
```json
{
  "data": {
    "id": "uuid",
    "slug": "canonical-slug",
    "localized_slug": "slug-en-espanol",
    "title": "Título del artículo",
    "summary": "Resumen corto",
    "body": "## Qué es\n\nContenido markdown...",
    "type": "concept",
    "category": "agents",
    "domains": ["programming"],
    "volatility": "low",
    "applicable_as_of": null,
    "last_edited_at": "2026-04-01T10:00:00Z",
    "last_verified_at": "2026-04-05T08:00:00Z",
    "tool_branches": [
      {
        "id": "uuid",
        "slug": "tool-branch-slug",
        "localized_slug": "slug-rama-es",
        "title": "Herramienta X - Implementación",
        "category": "tools"
      }
    ],
    "parent": null,
    "relations": {
      "related": [
        {
          "id": "uuid",
          "slug": "related-slug",
          "localized_slug": "slug-relacionado-es",
          "title": "Artículo relacionado",
          "category": "prompting"
        }
      ],
      "prerequisite": [],
      "next": []
    },
    "resources": [
      {
        "id": "uuid",
        "title": "Documentación oficial",
        "type": "doc",
        "url": "https://...",
        "description": "Descripción breve"
      }
    ],
    "alternate_lang": {
      "lang": "en",
      "slug": "english-slug",
      "url": "/en/agents/english-slug"
    }
  }
}
```

Lógica del backend:
- Solo devuelve artículos con `status = 'published'`
- Si `type = 'concept'`, incluir `tool_branches` (hijos publicados con su contenido en el idioma solicitado)
- Incluir `parent` si `parent_id` no es null
- Incluir `relations` agrupadas por tipo
- Incluir `resources` vía `article_resources`
- `alternate_lang`: buscar `article_contents` del otro idioma para el mismo `article_id`

Respuesta 404 si el artículo no existe, no está publicado, o no tiene contenido en el idioma solicitado.

---

**`GET /api/v1/categories`**

Lista de categorías con conteo de artículos publicados.

Query params:
| Param | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| `lang` | string | Sí | `"es"` o `"en"` |

Respuesta 200:
```json
{
  "data": [
    {
      "slug": "fundamentals",
      "name": "Fundamentals",
      "article_count": 5
    },
    {
      "slug": "agents",
      "name": "Agents",
      "article_count": 8
    }
  ]
}
```

El campo `name` se resuelve según el parámetro `lang` (`name_es` o `name_en` de la tabla `categories`). El ícono de cada categoría se resuelve en el frontend mediante un mapa estático `slug → Material Symbol` — es una decisión de UI, no de datos.

Lógica del backend:
- `SELECT c.slug, c.name_es, c.name_en, c.display_order, COUNT(a.id) AS article_count FROM categories c LEFT JOIN articles a ON a.category = c.slug AND a.status = 'published' GROUP BY c.slug ORDER BY c.display_order`
- Devolver `name_es` o `name_en` según `lang`

---

**`GET /api/v1/featured`**

Artículos destacados para la homepage.

Query params:
| Param | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| `lang` | string | Sí | `"es"` o `"en"` |
| `limit` | number | No | Máximo de artículos (default: 6, max: 12) |

Respuesta 200:
```json
{
  "data": [
    {
      "id": "uuid",
      "slug": "canonical-slug",
      "localized_slug": "slug-es",
      "title": "Título destacado",
      "summary": "Resumen",
      "category": "agents",
      "last_edited_at": "2026-04-01T10:00:00Z"
    }
  ]
}
```

Lógica del backend:
- Filtrar `featured = true AND status = 'published'`
- JOIN con `article_contents` por `lang`
- Ordenar por `last_edited_at DESC`

---

**`GET /api/v1/search`**

Búsqueda full-text con Meilisearch.

Query params:
| Param | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| `q` | string | Sí | Término de búsqueda |
| `lang` | string | No | Filtrar por idioma. Sin filtro = ambos idiomas |
| `category` | string | No | Filtrar por categoría |

Respuesta 200:
```json
{
  "data": {
    "query": "agente",
    "results": [
      {
        "article_id": "uuid",
        "lang": "es",
        "slug": "que-es-un-agente",
        "title": "Qué es un agente",
        "summary": "Un agente es básicamente un LLM con...",
        "category": "agents",
        "type": "concept",
        "highlight": {
          "title": "Qué es un <em>agente</em>",
          "summary": "Un <em>agente</em> es básicamente..."
        }
      }
    ],
    "total": 12,
    "processing_time_ms": 5
  }
}
```

Lógica del backend:
- Delegar búsqueda a Meilisearch
- Mapear resultados de Meilisearch al formato de respuesta
- Para cada resultado, obtener metadata adicional de PostgreSQL si es necesario

---

**`GET /api/v1/sitemap`**

Sitemap XML para SEO.

Query params:
| Param | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| `lang` | string | No | `"es"` o `"en"`. Sin filtro = ambos |

Respuesta 200 (`Content-Type: application/xml`):
```xml
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xhtml="http://www.w3.org/1999/xhtml">
  <url>
    <loc>https://aihub.example.com/es/fundamentos/que-es-un-llm</loc>
    <lastmod>2026-04-01T10:00:00Z</lastmod>
    <xhtml:link rel="alternate" hreflang="en"
                href="https://aihub.example.com/en/fundamentals/what-is-an-llm"/>
    <xhtml:link rel="alternate" hreflang="es"
                href="https://aihub.example.com/es/fundamentos/que-es-un-llm"/>
  </url>
</urlset>
```

Lógica del backend:
- Solo artículos con `status = 'published'`
- Incluir todas las combinaciones de idioma disponibles
- Incluir tags `xhtml:link` con hreflang para cada par de idiomas
- `lastmod` = `last_edited_at` del contenido

---

#### 1.2.2 Endpoints de administración (requieren auth)

Todos los endpoints bajo `/api/v1/admin/*` requieren header `Authorization: Bearer <jwt_token>`.

---

**`POST /api/v1/admin/auth/login`**

Autenticación del admin.

Body:
```json
{
  "email": "admin@aihub.com",
  "password": "contraseña-segura"
}
```

Respuesta 200:
```json
{
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIs...",
    "expires_at": "2026-04-07T12:00:00Z"
  }
}
```

Respuesta 401:
```json
{
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Credenciales inválidas"
  }
}
```

---

**`GET /api/v1/admin/articles`**

Lista completa de artículos (todos los estados) con filtros.

Query params:
| Param | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| `status` | string | No | Filtrar por estado |
| `category` | string | No | Filtrar por categoría |
| `type` | string | No | Filtrar por tipo |
| `page` | number | No | Página (default: 1) |
| `per_page` | number | No | Items por página (default: 20, max: 100) |

Respuesta 200:
```json
{
  "data": [
    {
      "id": "uuid",
      "slug_uk": "canonical-slug",
      "type": "concept",
      "category": "agents",
      "status": "published",
      "featured": true,
      "volatility": "low",
      "domains": ["programming"],
      "created_at": "2026-03-15T10:00:00Z",
      "updated_at": "2026-04-01T10:00:00Z",
      "content_status": {
        "es": {
          "title": "Título en español",
          "has_body": true,
          "last_edited_at": "2026-04-01T10:00:00Z",
          "last_verified_at": "2026-04-05T08:00:00Z"
        },
        "en": {
          "title": "English Title",
          "has_body": true,
          "last_edited_at": "2026-03-28T14:00:00Z",
          "last_verified_at": null
        }
      },
      "children_count": 3
    }
  ],
  "pagination": {
    "page": 1,
    "per_page": 20,
    "total": 45,
    "total_pages": 3
  }
}
```

Nota: `content_status` incluye el estado de completitud por idioma. `has_body` indica si el body markdown tiene contenido (no está vacío).

---

**`POST /api/v1/admin/articles`**

Crear un nuevo artículo (solo metadatos).

Body:
```json
{
  "slug_uk": "what-is-an-agent",
  "type": "concept",
  "parent_id": null,
  "category": "agents",
  "domains": ["programming"],
  "volatility": "low",
  "featured": false
}
```

Respuesta 201:
```json
{
  "data": {
    "id": "uuid",
    "slug_uk": "what-is-an-agent",
    "type": "concept",
    "category": "agents",
    "status": "draft",
    "created_at": "2026-04-06T12:00:00Z"
  }
}
```

Validaciones:
- `slug_uk` debe ser único
- `category` debe ser válido
- Si `type = 'tool-branch'`, `parent_id` es requerido y debe existir
- Si `type = 'concept'`, `parent_id` debe ser null

---

**`PUT /api/v1/admin/articles/:id`**

Actualizar metadatos de un artículo.

Body (todos los campos opcionales):
```json
{
  "category": "patterns",
  "volatility": "medium",
  "featured": true,
  "domains": ["programming"],
  "applicable_as_of": "v2.1.0"
}
```

Respuesta 200: el artículo actualizado.

Validaciones:
- No se puede cambiar `slug_uk` ni `type` después de creado
- Si `type = 'tool-branch'` y se cambia `parent_id`, el nuevo padre debe existir

---

**`POST /api/v1/admin/articles/:id/content`**

Importar o actualizar contenido de un artículo para un idioma específico.

Body:
```json
{
  "lang": "es",
  "slug": "que-es-un-agente",
  "title": "Qué es un agente",
  "summary": "Un agente es básicamente un LLM con permiso para tomar acciones.",
  "body": "## Qué es\n\nContenido del artículo en markdown..."
}
```

Respuesta 200:
```json
{
  "data": {
    "article_id": "uuid",
    "lang": "es",
    "slug": "que-es-un-agente",
    "title": "Qué es un agente",
    "last_edited_at": "2026-04-06T12:00:00Z"
  }
}
```

Lógica del backend:
- Si ya existe contenido para ese `article_id + lang`, actualizar (upsert)
- Si no existe, crear nueva fila en `article_contents`
- Actualizar `last_edited_at` al timestamp actual
- Si es la primera vez que se publica contenido en ambos idiomas y el estado es `draft`, el artículo sigue en `draft` (el admin debe cambiar el estado explícitamente)

---

**`PUT /api/v1/admin/articles/:id/status`**

Cambiar el estado de un artículo.

Body:
```json
{
  "status": "published"
}
```

Respuesta 200: el artículo actualizado.

Validaciones:
- Transiciones válidas: `draft → published`, `published → deprecated`, `deprecated → draft`
- No se puede publicar si no tiene contenido en al menos un idioma (warning, no bloqueo)

---

**`POST /api/v1/admin/articles/:id/verify`**

Marcar un artículo como verificado en un idioma específico.

Body:
```json
{
  "lang": "es"
}
```

Respuesta 200:
```json
{
  "data": {
    "article_id": "uuid",
    "lang": "es",
    "last_verified_at": "2026-04-06T12:00:00Z"
  }
}
```

---

**`GET /api/v1/admin/articles/:id`**

Detalle completo de un artículo para edición en admin.

Respuesta 200:
```json
{
  "data": {
    "id": "uuid",
    "slug_uk": "canonical-slug",
    "type": "concept",
    "parent_id": null,
    "category": "agents",
    "domains": ["programming"],
    "status": "draft",
    "featured": false,
    "volatility": "low",
    "applicable_as_of": null,
    "created_at": "2026-03-15T10:00:00Z",
    "updated_at": "2026-04-01T10:00:00Z",
    "contents": [
      {
        "lang": "es",
        "slug": "que-es-un-agente",
        "title": "Qué es un agente",
        "summary": "Resumen...",
        "body": "## Qué es\n\n...",
        "last_edited_at": "2026-04-01T10:00:00Z",
        "last_verified_at": "2026-04-05T08:00:00Z"
      },
      {
        "lang": "en",
        "slug": "what-is-an-agent",
        "title": "What is an agent",
        "summary": "Summary...",
        "body": "## What is it\n\n...",
        "last_edited_at": "2026-03-28T14:00:00Z",
        "last_verified_at": null
      }
    ],
    "relations": {
      "related": ["uuid"],
      "prerequisite": ["uuid"],
      "next": ["uuid"]
    },
    "resources": [
      {
        "id": "uuid",
        "title": "Official docs",
        "type": "doc",
        "url": "https://...",
        "description": "..."
      }
    ],
    "children": [
      {
        "id": "uuid",
        "slug_uk": "agent-in-claude-code",
        "title_es": "Agente en Claude Code",
        "title_en": "Agent in Claude Code",
        "status": "published"
      }
    ]
  }
}
```

---

**`POST /api/v1/admin/resources`**

Crear un recurso externo.

Body:
```json
{
  "title": "Documentación oficial de LangChain",
  "type": "doc",
  "url": "https://python.langchain.com/docs/",
  "description": "Documentación oficial del framework"
}
```

Respuesta 201: el recurso creado.

---

**`PUT /api/v1/admin/resources/:id`**

Actualizar un recurso.

Body (campos opcionales):
```json
{
  "title": "Nuevo título",
  "description": "Nueva descripción"
}
```

Respuesta 200: el recurso actualizado.

---

**`DELETE /api/v1/admin/resources/:id`**

Eliminar un recurso. Se elimina también la relación con artículos.

Respuesta 204 (sin body).

---

**`POST /api/v1/admin/articles/:id/resources`**

Vincular un recurso existente a un artículo.

Body:
```json
{
  "resource_id": "uuid"
}
```

Respuesta 201: confirmación del vínculo.

---

**`DELETE /api/v1/admin/articles/:id/resources/:resource_id`**

Desvincular un recurso de un artículo.

Respuesta 204 (sin body).

---

**`POST /api/v1/admin/articles/:id/relations`**

Agregar una relación entre artículos.

Body:
```json
{
  "to_article_id": "uuid",
  "type": "related"
}
```

Respuesta 201:
```json
{
  "data": {
    "from_article_id": "uuid",
    "to_article_id": "uuid",
    "type": "related"
  }
}
```

Validaciones:
- `type` debe ser `"related"`, `"prerequisite"` o `"next"`
- `to_article_id` debe existir
- No se puede crear una relación consigo mismo
- No se permiten duplicados (`uq_article_relation`)

---

**`DELETE /api/v1/admin/articles/:id/relations/:to_id`**

Eliminar una relación entre artículos.

Query params:
| Param | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| `type` | string | Sí | Tipo de relación a eliminar |

Respuesta 204 (sin body).

Lógica del backend:
- `DELETE FROM article_relations WHERE from_article_id = :id AND to_article_id = :to_id AND type = :type`
- 404 si la relación no existe

---

**`POST /api/v1/admin/images/upload`**

Subir una imagen a Cloudflare R2.

Content-Type: `multipart/form-data`

Form fields:
| Campo | Tipo | Descripción |
|-------|------|-------------|
| `file` | File | Archivo de imagen (png, jpg, webp, svg) |

Respuesta 200:
```json
{
  "data": {
    "url": "https://images.aihub.example.com/articles/2026/04/abc123.webp",
    "key": "articles/2026/04/abc123.webp",
    "size": 245000,
    "mime_type": "image/webp"
  }
}
```

Validaciones:
- Tamaño máximo: 5MB
- Tipos permitidos: `image/png`, `image/jpeg`, `image/webp`, `image/svg+xml`
- El nombre del archivo se genera como UUID + extensión original

---

### 1.3 Modelo de autenticación

#### Mecanismo

- Email + contraseña
- Hash de contraseña con **bcrypt** (coste 12)
- JWT (JSON Web Token) para sesiones
- Token expiry: **24 horas**
- Sin refresh tokens en el MVP
- Sin registro público
- Sin recuperación de contraseña
- Un único usuario admin

#### Flujo de login

```mermaid
sequenceDiagram
    participant Admin as Panel Admin
    participant API as Express API
    participant DB as PostgreSQL

    Admin->>API: POST /admin/auth/login {email, password}
    API->>DB: SELECT * FROM admin_users WHERE email = ?
    DB-->>API: user row
    API->>API: bcrypt.compare(password, password_hash)
    alt credenciales válidas
        API->>API: jwt.sign({userId, email}, secret, {expiresIn: 24h})
        API-->>Admin: 200 {token, expires_at}
    else credenciales inválidas
        API-->>Admin: 401 {error: UNAUTHORIZED}
    end
```

#### Middleware de autenticación

Todos los endpoints `/api/v1/admin/*` (excepto `/admin/auth/login`) pasan por un middleware `authenticateAdmin`:

```typescript
// Pseudocódigo del middleware
function authenticateAdmin(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Token requerido' } });
  }

  const token = header.split(' ')[1];
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.adminUser = { id: payload.userId, email: payload.email };
    next();
  } catch (err) {
    return res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Token inválido o expirado' } });
  }
}
```

#### Variables de entorno

| Variable | Descripción | Ejemplo |
|----------|-------------|---------|
| `JWT_SECRET` | Clave secreta para firmar tokens | generada con `openssl rand -hex 32` |
| `JWT_EXPIRES_IN` | Duración del token | `24h` |
| `ADMIN_EMAIL` | Email del único admin (seed) | `admin@aihub.com` |
| `ADMIN_PASSWORD` | Contraseña inicial del admin (se hashea al seedear) | `contraseña-segura` |

#### Seed inicial

Al primer despliegue, un script de seed crea el usuario admin si no existe:

```sql
INSERT INTO admin_users (email, password_hash)
VALUES (
  'admin@aihub.com',
  '$2b$12$...' -- bcrypt hash de la contraseña
)
ON CONFLICT (email) DO NOTHING;
```

---

### 1.4 Integración con Meilisearch

#### Índice de artículos

Un único índice `articles` que contiene contenido de ambos idiomas. Cada documento representa una combinación artículo + idioma.

```json
{
  "document_id": "article-uuid--es",
  "article_id": "uuid",
  "lang": "es",
  "slug": "que-es-un-agente",
  "title": "Qué es un agente",
  "summary": "Un agente es básicamente un LLM con...",
  "body": "Contenido completo en markdown...",
  "category": "agents",
  "type": "concept",
  "status": "published",
  "domains": ["programming"],
  "last_edited_at": "2026-04-01T10:00:00Z"
}
```

#### Configuración del índice

```javascript
// Configuración de Meilisearch
client.index('articles').updateSettings({
  searchableAttributes: [
    'title',
    'summary',
    'body'
  ],
  filterableAttributes: [
    'lang',
    'category',
    'type',
    'status',
    'domains'
  ],
  sortableAttributes: [
    'last_edited_at',
    'title'
  ],
  rankingRules: [
    'words',
    'typo',
    'proximity',
    'attribute',
    'sort',
    'exactness'
  ]
});
```

#### Sincronización

En el MVP, la sincronización es **push-based**: cada vez que el admin crea, actualiza o publica un artículo, el backend actualiza el índice de Meilisearch.

```mermaid
sequenceDiagram
    participant Admin
    participant API
    participant DB
    participant Meili as Meilisearch

    Admin->>API: POST /admin/articles/:id/content
    API->>DB: UPSERT article_contents
    API->>Meili: addDocument / updateDocument
    Meili-->>API: 200 OK
    API-->>Admin: 200 {data: ...}
```

Flujos de sincronización:

| Evento | Acción en Meilisearch |
|--------|----------------------|
| Crear contenido (ES o EN) | `addDocument` con `document_id = "{article_id}--{lang}"` |
| Actualizar contenido | `updateDocument` con el mismo `document_id` |
| Cambiar estado a `published` | `updateDocument` con `status: "published"` |
| Cambiar estado a `draft` o `deprecated` | `updateDocument` con nuevo status (Meilisearch filtra por `status = 'published'` en búsquedas públicas) |
| Eliminar artículo | `deleteDocument` para ambos `document_id` (`{id}--es` y `{id}--en`) |

#### Búsqueda pública

La búsqueda pública filtra siempre por `status = 'published'`:

```javascript
// Sin filtros opcionales (solo status)
client.index('articles').search(query, {
  filter: 'status = published',
  limit: 20,
  attributesToHighlight: ['title', 'summary'],
  highlightPreTag: '<em>',
  highlightPostTag: '</em>'
});

// Con filtros opcionales (lang y/o category)
client.index('articles').search(query, {
  filter: 'status = published AND lang = es AND category = agents',
  limit: 20,
  attributesToHighlight: ['title', 'summary'],
  highlightPreTag: '<em>',
  highlightPostTag: '</em>'
});
```

#### Inicialización del índice

Al primer despliegue, un script sincroniza todos los artículos publicados existentes:

```sql
-- Query para poblar Meilisearch desde PostgreSQL
SELECT
  a.id AS article_id,
  ac.lang,
  ac.slug,
  ac.title,
  ac.summary,
  ac.body,
  a.category,
  a.type,
  a.status,
  a.domains,
  ac.last_edited_at
FROM articles a
JOIN article_contents ac ON ac.article_id = a.id
WHERE a.status = 'published';
```

---

### 1.5 Integración con Cloudflare R2

#### Configuración

- Compatible con la API de S3 (usar `@aws-sdk/client-s3`)
- Bucket: `aihub-images`
- Endpoint: URL proporcionada por Cloudflare
- Credentials: `accessKeyId` + `secretAccessKey`

#### Estructura de claves

```
articles/{year}/{month}/{uuid}.{ext}
```

Ejemplo: `articles/2026/04/a1b2c3d4-e5f6.webp`

#### URL pública

Las imágenes se sirven desde un dominio personalizado configurado en Cloudflare:

```
https://images.aihub.example.com/articles/2026/04/a1b2c3d4-e5f6.webp
```

#### Variables de entorno

| Variable | Descripción |
|----------|-------------|
| `R2_ACCOUNT_ID` | Account ID de Cloudflare |
| `R2_ACCESS_KEY_ID` | Access key |
| `R2_SECRET_ACCESS_KEY` | Secret key |
| `R2_BUCKET` | Nombre del bucket |
| `R2_PUBLIC_URL` | URL base pública |

---

## 2. Sistema de diseño (Stitch)

> Este sistema de diseño se basa en los mockups de referencia creados en Stitch (proyecto "AI Wiki - Article Page", ID: 415770912252477009). Las pantallas son referencia visual — no son spec definitiva — pero los tokens de diseño (colores, tipografía, espaciado, layout) deben seguirse para mantener coherencia visual desde el MVP.

### 2.1 Paleta de colores

Sistema derivado de Material Design 3 con tonos azul como primario.

**Colores principales:**

| Token | Light | Uso |
|-------|-------|-----|
| `primary` | `#294fdb` | Links, botones, acentos, estados activos |
| `primary-dim` | `#1541cf` | Gradientes, hover states |
| `primary-container` | `#dde1ff` | Fondos suaves de elementos primarios |
| `primary-fixed-dim` | `#cbd2ff` | Badges, backgrounds de iconos |
| `on-primary` | `#f9f7ff` | Texto sobre primario |
| `surface` | `#f7f9ff` | Fondo general de la página |
| `surface-container` | `#e7eff8` | Cards, secciones secundarias |
| `surface-container-low` | `#eff4fc` | Cards elevadas, inputs |
| `surface-container-lowest` | `#ffffff` | Cards principales, contenido |
| `surface-container-high` | `#dfe9f5` | Separadores, bordes |
| `surface-container-highest` | `#d7e4f2` | Icon backgrounds |
| `on-surface` | `#28343e` | Texto principal |
| `on-surface-variant` | `#54606c` | Texto secundario, descripciones |
| `outline` | `#6f7c88` | Bordes, iconos |
| `outline-variant` | `#a6b3c1` | Bordes sutiles, separadores |
| `inverse-surface` | `#0b0f12` | Fondo dark mode, secciones oscuras |
| `inverse-primary` | `#6d88ff` | Primario en fondos oscuros |
| `error` | `#9e3f4e` | Errores, "cuándo no usarlo" |
| `error-container` | `#ff8b9a` | Background de errores |

**Dark mode:** Los colores se invierten usando la convención Tailwind `dark:`. El fondo pasa a `slate-900`/`slate-950`, el texto a blanco/gris claro, y `primary` se mantiene legible con `inverse-primary`.

### 2.2 Tipografía

| Rol | Fuente | Pesos | Uso |
|-----|--------|-------|-----|
| Headline | **Manrope** | 400, 600, 700, 800 | Títulos, headings, navegación |
| Body | **Inter** | 300, 400, 500, 600 | Texto de artículo, descripciones |
| Mono | **JetBrains Mono** | 400 | Bloques de código, inline code |
| Label | **Inter** | 400, 500 | Badges, labels, breadcrumbs |

**Jerarquía tipográfica:**

| Nivel | Tamaño | Peso | Interlineado | Uso |
|-------|--------|------|--------------|-----|
| Display | `text-5xl` / `text-6xl` (48-60px) | 800 | 1.1 | Hero de homepage |
| H1 | `text-5xl` (48px) | 800 | 1.2 | Título de artículo |
| H2 | `text-2xl` (24px) | 700 | 1.3 | Secciones de artículo |
| H3 | `text-xl` (20px) | 700 | 1.3 | Subsecciones, cards |
| Body-lg | `text-lg` (18px) | 400 | 1.75 | Cuerpo de artículo |
| Body | `text-base` (16px) | 400 | 1.6 | Texto general |
| Small | `text-sm` (14px) | 400-500 | 1.5 | Descripciones, metadata |
| XSmall | `text-xs` (12px) | 400-700 | 1.4 | Badges, breadcrumbs |

### 2.3 Espaciado y bordes

**Border radius:**
| Token | Valor | Uso |
|-------|-------|-----|
| `DEFAULT` | `0.125rem` (2px) | Botones pequeños, inputs |
| `lg` | `0.25rem` (4px) | Icon containers, badges |
| `xl` | `0.5rem` (8px) | Cards, botones, secciones |
| `full` | `0.75rem` (12px) | Pills, language selector, avatares |

**Espaciado:** Tailwind default scale (4px base). Los gaps entre secciones usan `mb-20` (80px) para separación clara entre bloques de contenido.

### 2.4 Layout

**Estructura de 3 columnas (desktop):**

```
┌──────────────────────────────────────────────────────────────┐
│  Navbar (h-16, fixed, glass: bg-white/80 + backdrop-blur-xl) │
├──────────┬───────────────────────────────┬───────────────────┤
│          │                               │                   │
│ Sidebar  │   Contenido principal         │   Sidebar derecha │
│ 256px    │   max-w-4xl, centrado         │   320px (xl+)     │
│ fixed    │   md:pl-72 md:pr-[320px]      │   fixed           │
│          │                               │                   │
│ Nav:     │   - Breadcrumbs               │   - Tabla de      │
│ Categorías│   - Header del artículo      │     contenidos    │
│ con      │   - Secciones del artículo    │   - Recursos      │
│ iconos   │   - Código, imágenes, etc.    │     externos      │
│ Material │                               │   - CTA feedback  │
│ Symbols  │                               │                   │
└──────────┴───────────────────────────────┴───────────────────┘
```

**Navbar:**
- Altura: `h-16` (64px), fixed, z-50
- Fondo: `bg-white/80` + `backdrop-blur-xl` (efecto glass)
- Borde inferior: `border-b border-slate-200/15`
- Contenido: Logo (izq) + Búsqueda (centro) + Idioma/Tema/Avatar (der)

**Sidebar izquierda:**
- Ancho: `w-64` (256px), fixed, `top-16`, `h-[calc(100vh-64px)]`
- Fondo: `bg-slate-50/50` + `backdrop-blur-xl`
- Items: Icono Material Symbols + texto Manrope sm
- Item activo: texto `blue-600`, `font-bold`, `border-r-2` azul, `bg-blue-50/30`, `translate-x-1`
- Hover: `hover:text-blue-500`, `transition-all`
- Se oculta en móvil (`hidden md:flex`)

**Sidebar derecha (solo artículo):**
- Ancho: `w-80` (320px), fixed, `top-16`
- Visible solo en `xl+` (`hidden xl:flex`)
- Contenido: Tabla de contenidos (scroll-spy), recursos externos, CTA

**Contenido principal:**
- Padding top: `pt-24` (para compensar navbar fixed)
- Ancho máximo: `max-w-4xl` centrado
- En desktop: `md:pl-72 md:pr-[320px]`

**Móvil:**
- Sidebar izquierda se oculta, se reemplaza con menú hamburger
- Sidebar derecha se oculta completamente
- Bottom nav bar fija con 4 items (Home, Search, Saved, Profile)

### 2.5 Componentes clave

#### Cards de categoría (Homepage)
- Fondo: `bg-surface-container-lowest` (blanco)
- Borde: `border border-outline-variant/5`
- Padding: `p-8`
- Hover: `hover:bg-white`, `hover:shadow-2xl hover:shadow-primary/5`
- Icono: `w-12 h-12`, `bg-primary/10`, `text-primary`, `rounded-lg`
- Hover icon: `group-hover:scale-110`

#### Featured concepts list (Homepage)
- Items en lista con borde sutil: `bg-surface-container-low p-1 rounded-xl`
- Interior: `bg-white p-6 rounded-lg`
- Número: `text-2xl font-bold text-outline-variant`
- Hover: `hover:bg-primary-container/20`
- Chevron: `group-hover:translate-x-2`

#### Bloques de código
- Fondo oscuro: `bg-inverse-surface` (`#0b0f12`)
- Texto: `text-blue-100/90`
- Font: `JetBrains Mono`, `text-sm`
- Header con filename + botón copiar
- Padding: `p-6`

#### Secciones de artículo
- Cada sección tiene un icono con fondo: `w-8 h-8 rounded-lg bg-surface-container-highest` con icono `text-primary`
- Separación entre secciones: `mb-20`
- Título de sección: `text-2xl font-bold` con icono alineado

#### Comparativa (Cuándo usar / Cuándo no)
- Grid de 2 columnas
- Header: `bg-surface-container-low`, texto `primary` (izq) / `error` (der)
- Items con iconos: `check_circle` (primary) / `cancel` (error)

#### Bento grid (Modelo mental)
- Grid `md:grid-cols-3`, item principal `md:col-span-2` + item lateral `bg-primary`
- Fondo: `bg-surface-container-low`
- Icono decorativo grande en background: `opacity-5`, `text-[160px]`

#### Language selector
- Pill: `bg-surface-container-low p-1 rounded-full border border-outline-variant/15`
- Botón activo: `bg-white text-primary rounded-full shadow-sm`
- Botón inactivo: texto `on-surface-variant`, hover cambia

#### Badges de estado
- Publicado: `bg-primary/10 text-primary px-3 py-1 rounded-full text-xs font-bold`
- Categoría de recurso: badge con color según tipo (doc=primary, video=error)

### 2.6 Iconografía

**Material Symbols Outlined** (Google Fonts):
- `menu_book` — Fundamentos
- `smart_toy` — Agentes
- `terminal` — Prompting
- `extension` — Patrones
- `construction` — Herramientas
- `search` — Búsqueda
- `dark_mode` / `light_mode` — Toggle de tema
- `language` — Selector de idioma
- `help_center` — Sección "Qué es"
- `bolt` — Highlight/capacidad core
- `check_circle` / `cancel` — Cuándo usar / no usar
- `chevron_right` / `arrow_forward` — Navegación
- `content_copy` — Copiar código
- `open_in_new` — Link externo
- `expand_more` — Accordion

### 2.7 Configuración de Tailwind

```typescript
// tailwind.config.ts
export default {
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: '#294fdb',
        'primary-dim': '#1541cf',
        'primary-container': '#dde1ff',
        'primary-fixed-dim': '#cbd2ff',
        'on-primary': '#f9f7ff',
        surface: '#f7f9ff',
        'surface-container': '#e7eff8',
        'surface-container-low': '#eff4fc',
        'surface-container-lowest': '#ffffff',
        'surface-container-high': '#dfe9f5',
        'surface-container-highest': '#d7e4f2',
        'on-surface': '#28343e',
        'on-surface-variant': '#54606c',
        outline: '#6f7c88',
        'outline-variant': '#a6b3c1',
        'inverse-surface': '#0b0f12',
        'inverse-primary': '#6d88ff',
        error: '#9e3f4e',
        'error-container': '#ff8b9a',
      },
      borderRadius: {
        DEFAULT: '0.125rem',
        lg: '0.25rem',
        xl: '0.5rem',
        full: '0.75rem',
      },
      fontFamily: {
        headline: ['Manrope', 'sans-serif'],
        body: ['Inter', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
        label: ['Inter', 'sans-serif'],
      },
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
    require('@tailwindcss/forms'),
    require('@tailwindcss/container-queries'),
  ],
};
```

### 2.8 Referencias visuales de Stitch

Los mockups de referencia están disponibles en el proyecto Stitch:
- **Homepage**: Screen ID `354a5cdcd86f495d9624483bca1a7caf`
- **Article Page**: Screen ID `0e1ddf3b9f1644be96692b76548cc8a0`

Estos mockups guían la estructura visual, pero el contenido real (textos, categorías, artículos) se alimenta dinámicamente de la API.

---

## 3. Módulo: Sitio público

> Este módulo consume los contratos definidos en la [Fundación compartida](#1-fundación-compartida) y sigue el [Sistema de diseño](#2-sistema-de-diseño-stitch). Todas las páginas son SSR a través de Next.js. No hay client-side only routes para contenido.

### 3.1 Arquitectura del frontend

```
Frontend (Next.js)
├── Páginas SSR (app router)
│   ├── / → Homepage
│   ├── /[lang]/ → Landing por idioma
│   ├── /[lang]/[category]/ → Listado de categoría
│   ├── /[lang]/[category]/[slug] → Artículo
│   └── /api/* → NO USAR (toda la lógica está en Express)
├── Componentes
│   ├── Layout (nav, sidebar, footer)
│   ├── ArticleRenderer (markdown → HTML)
│   ├── SearchBar
│   ├── CategorySidebar
│   ├── LanguageSwitcher
│   ├── ThemeToggle
│   └── ResourceList
└── Lib
    ├── api-client.ts (fetch wrapper hacia Express)
    ├── i18n.ts (diccionario de categorías, rutas)
    └── markdown.ts (config de remark/rehype)
```

### 3.2 Rutas y mapeo a la API

#### Homepage: `/`

Redirige a `/es` o `/en` según `Accept-Language` del navegador (con fallback a `/es`).

**Datos necesarios** (de la fundación compartida):
- `GET /api/v1/categories?lang={lang}` — para las cards de categorías
- `GET /api/v1/featured?lang={lang}&limit=6` — para artículos destacados

#### Landing por idioma: `/[lang]`

Misma estructura que la homepage pero con idioma fijo.

**Datos necesarios:**
- `GET /api/v1/categories?lang={lang}`
- `GET /api/v1/featured?lang={lang}&limit=6`

#### Listado de categoría: `/[lang]/[category]`

Lista de artículos de una categoría.

**Datos necesarios:**
- `GET /api/v1/articles?lang={lang}&category={category}` — artículos de la categoría
- `GET /api/v1/categories?lang={lang}` — para el sidebar

#### Artículo: `/[lang]/[category]/[slug]`

Página de lectura del artículo.

**Datos necesarios:**
- `GET /api/v1/articles/{slug}?lang={lang}` — contenido completo del artículo
- `GET /api/v1/categories?lang={lang}` — para el sidebar

Si el artículo no tiene contenido en el idioma solicitado → 404.

### 3.3 Categorías — datos desde API, íconos en frontend

Los nombres localizados de las categorías se obtienen de `GET /api/v1/categories?lang={lang}`. No hay diccionario estático de nombres — agregar una nueva categoría es insertar una fila en DB sin cambios de código ni de frontend.

Los **íconos** de cada categoría son una decisión de UI y se resuelven en el frontend mediante un mapa estático `slug → Material Symbol`:

```typescript
const CATEGORY_ICONS: Record<string, string> = {
  fundamentals: 'menu_book',
  agents:       'smart_toy',
  prompting:    'terminal',
  patterns:     'extension',
  tools:        'construction',
};
```

Para la navegación por URL, el frontend necesita mapear el slug canónico al slug localizado en la ruta. Este mapeo se construye en runtime a partir de los datos de la API:

```typescript
// Construido desde la respuesta de GET /api/v1/categories (ambos idiomas)
// Ejemplo de estructura en runtime:
const categoryUrlMap = {
  fundamentals: { es: 'fundamentos', en: 'fundamentals' },
  agents:       { es: 'agentes',     en: 'agents' },
  prompting:    { es: 'prompting',   en: 'prompting' },
  patterns:     { es: 'patrones',    en: 'patterns' },
  tools:        { es: 'herramientas',en: 'tools' },
};
```

Este mapa se construye en el servidor (SSR) en cada request o se cachea en build time (ISR). La API devuelve `name_es` y `name_en` que se usan también para construir el slug de URL localizado.

### 3.4 Renderizado de markdown

El body markdown se convierte a HTML en el servidor (SSR) usando remark/rehype.

**Plugins requeridos:**
- `remark-parse` — parsear markdown
- `remark-gfm` — tablas, strikethrough, task lists
- `remark-rehype` — convertir a HTML AST
- `rehype-highlight` — syntax highlighting para bloques de código
- `rehype-raw` — permitir HTML inline (para captions de imágenes)
- `rehype-sanitize` — sanitizar HTML (seguridad)
- Plugin custom para Mermaid: detectar bloques `mermaid` y renderizarlos como `<div class="mermaid">` con el código como data attribute

**Imágenes en markdown:**
- El renderer detecta imágenes inline y aplica clases CSS según el atributo:
  - `![desc](url)` → `<img class="img-contained" src="url" alt="desc">`
  - `![desc](url){.full}` → `<img class="img-full" src="url" alt="desc">`
- Los captions en cursiva debajo de imágenes se renderizan como `<figcaption>`

**Mermaid:**
- Los bloques ` ```mermaid ` se convierten a `<div class="mermaid" data-code="...">`
- El cliente carga `mermaid.js` y hace `mermaid.run()` en `useEffect` para renderizar los diagramas
- Fallback: mostrar el código raw si mermaid falla

### 3.5 SEO

Cada página SSR genera meta tags dinámicos:

**Artículo:**
```html
<title>{title} — AI Hub</title>
<meta name="description" content="{summary}" />
<link rel="canonical" href="https://aihub.example.com/{lang}/{category}/{slug}" />
<link rel="alternate" hreflang="es" href="https://aihub.example.com/es/..." />
<link rel="alternate" hreflang="en" href="https://aihub.example.com/en/..." />
<meta property="og:title" content="{title}" />
<meta property="og:description" content="{summary}" />
<meta property="og:type" content="article" />
<meta property="og:url" content="https://aihub.example.com/..." />
```

**Homepage:**
```html
<title>AI Hub — Conocimiento práctico sobre IA generativa</title>
<meta name="description" content="..." />
<link rel="alternate" hreflang="es" href="https://aihub.example.com/es" />
<link rel="alternate" hreflang="en" href="https://aihub.example.com/en" />
```

### 3.6 Layout público

```
┌─────────────────────────────────────────────────┐
│  [Logo]  [Búsqueda]           [ES/EN] [🌙/☀️]  │  ← Navbar
├──────────┬──────────────────────────┬───────────┤
│          │                          │           │
│ Sidebar  │   Contenido principal    │ Sidebar   │
│ Categorías│                         │ Derecha   │
│ colapsable│   (artículo / listado   │ Relacionados│
│          │    / homepage)           │ Recursos  │
│          │                          │           │
├──────────┴──────────────────────────┴───────────┤
│  Footer: links legales, copyright              │
└─────────────────────────────────────────────────┘
```

**Sidebar izquierda:**
- Categorías colapsables (obtenidas de `GET /api/v1/categories`)
- Dentro de cada categoría, lista de artículos publicados
- El artículo actual se resalta
- Se colapsa en móvil (hamburger menu)

**Sidebar derecha (solo en páginas de artículo):**
- Conceptos relacionados (de `relations.related` en la respuesta de la API)
- Recursos externos (de `resources` en la respuesta de la API)
- Se oculta en móvil

### 3.7 Búsqueda

La búsqueda se implementa como:
- Input en la navbar que al hacer focus abre un overlay/modal
- Al escribir, debounce de 300ms → `GET /api/v1/search?q={query}&lang={lang}`
- Resultados se muestran en el overlay con título, snippet, categoría y badge de idioma
- Click en resultado → navegación a la página del artículo
- Soporte para teclado: flechas arriba/abajo para navegar, Enter para seleccionar, Escape para cerrar

### 3.8 Tema (dark/light)

- Toggle en la navbar
- Preferencia guardada en `localStorage`
- Respeta `prefers-color-scheme` del sistema como valor inicial
- Implementación con CSS variables o Tailwind `dark:` classes
- El toggle es client-side (no afecta SSR)

---

## 4. Módulo: Panel de admin

> Este módulo consume los contratos definidos en la [Fundación compartida](#1-fundación-compartida) y sigue el [Sistema de diseño](#2-sistema-de-diseño-stitch). El panel vive dentro del mismo frontend Next.js, bajo rutas `/admin/*` protegidas por middleware que verifica el JWT.

### 4.1 Arquitectura del panel

```
Panel de Admin (Next.js)
├── Rutas
│   ├── /admin/login → Login
│   ├── /admin → Dashboard (lista de artículos)
│   ├── /admin/articles → Lista completa
│   ├── /admin/articles/new → Crear artículo
│   ├── /admin/articles/:id → Editar metadatos + contenido
│   ├── /admin/articles/:id/content/:lang → Importar markdown por idioma
│   ├── /admin/resources → Gestión de recursos
│   └── /admin/images → Subida de imágenes
├── Componentes
│   ├── AdminLayout
│   ├── ArticleList (tabla con estado, categoría, completitud)
│   ├── ArticleEditor (metadatos)
│   ├── MarkdownImporter (drag & drop de .md)
│   ├── ResourceForm
│   ├── ImageUploader
│   └── StatusBadge
└── Lib
    ├── admin-api-client.ts (fetch con token JWT)
    └── auth.ts (guardar/verificar token)
```

### 4.2 Autenticación en el frontend

**Login:**
- Formulario con email + contraseña
- `POST /api/v1/admin/auth/login`
- Token guardado en `localStorage` (en el MVP, sin httpOnly cookies para simplificar)
- Redirige a `/admin` tras login exitoso

**Protección de rutas:**
- Middleware de Next.js en `/admin/*` (excepto `/admin/login`)
- Verifica existencia del token en `localStorage`
- Si no hay token → redirige a `/admin/login`
- Nota: la protección real está en el backend (middleware `authenticateAdmin`). El frontend solo hace UX redirect.

**Logout:**
- Eliminar token de `localStorage`
- Redirigir a `/admin/login`

### 4.3 Páginas del panel

#### `/admin/login`

Formulario simple:
- Campo email
- Campo contraseña
- Botón "Iniciar sesión"
- Mensaje de error si las credenciales son inválidas

#### `/admin` — Dashboard

Vista principal del panel. Muestra:
- Resumen: total de artículos, publicados, borradores, deprecados
- Artículos recientes (últimos 10 modificados)
- Indicador de artículos pendientes de verificación (`last_verified_at` null o > 30 días)

#### `/admin/articles` — Lista de artículos

Tabla con columnas:
| Columna | Contenido |
|---------|-----------|
| Título | Título en el idioma principal (ES si existe, sino EN) |
| Categoría | Badge con categoría |
| Tipo | `concept` o `tool-branch` |
| Estado | Badge de color: draft (gris), published (verde), deprecated (rojo) |
| ES | Indicador: ✅ con body, ⚠️ sin body, 🕐 desactualizado |
| EN | Igual que ES |
| Última edición | Fecha relativa |
| Acciones | Botones: editar, cambiar estado |

Filtros en la parte superior:
- Por estado (dropdown)
- Por categoría (dropdown)
- Por tipo (dropdown)
- Búsqueda por título

#### `/admin/articles/new` — Crear artículo

Formulario de metadatos:
- Slug en inglés (canónico) — requerido, único
- Tipo (concept / tool-branch) — requerido
- Padre (solo si type = tool-branch) — dropdown de artículos tipo concept
- Categoría — dropdown poblado desde `GET /api/v1/categories` (datos dinámicos desde DB)
- Volatilidad — dropdown (low / medium / high)
- Dominios — checkboxes (MVP: solo "programming")
- Destacado — toggle

Tras crear, redirige a `/admin/articles/:id` para importar contenido.

#### `/admin/articles/:id` — Editar artículo

Pestañas:
1. **Metadatos** — editar categoría, volatilidad, destacado, dominios, applicable_as_of
2. **Contenido ES** — importar/update markdown en español
3. **Contenido EN** — importar/update markdown en inglés
4. **Relaciones** — gestionar related, prerequisite, next
5. **Recursos** — gestionar recursos vinculados

**Pestaña de contenido (importación de markdown):**
- Área de drag & drop para archivos `.md`
- Opción de pegar el contenido directamente en un textarea
- Preview del título y resumen extraídos del markdown (si sigue la estructura esperada)
- Botón "Importar" → `POST /api/v1/admin/articles/:id/content`
- Indicador visual de última edición y última verificación
- Comparación visual: si un idioma fue editado más recientemente que el otro, mostrar aviso "ES actualizado, EN pendiente"

**Pestaña de relaciones:**
- Selectores para agregar artículos relacionados, prerrequisitos y "siguiente"
- Búsqueda de artículos para seleccionar
- Lista de relaciones actuales con opción de eliminar

**Pestaña de recursos:**
- Lista de recursos vinculados
- Botón "Agregar recurso" → modal con formulario (título, tipo, URL, descripción)
- Opción de vincular recurso existente
- Botón de desvincular

#### `/admin/resources` — Gestión de recursos

Lista de todos los recursos externos:
- Tabla: título, tipo, URL, artículos vinculados
- Botón "Nuevo recurso"
- Editar / Eliminar

#### `/admin/images` — Subida de imágenes

- Área de drag & drop
- Múltiples archivos
- Tras subir, mostrar la URL pública para copiar y pegar en el markdown
- Historial de imágenes subidas (opcional en MVP)

### 4.4 Cambio de estado

Desde la lista de artículos o la página de edición:
- Dropdown con transiciones válidas
- Confirmación antes de publicar o deprecar
- Al publicar: verificar que al menos un idioma tiene contenido (warning si no)

### 4.5 Marcado como verificado

Desde la página de edición del artículo:
- Botón "Verificar ES" y "Verificar EN" independientes
- Al hacer click → `POST /api/v1/admin/articles/:id/verify` con el idioma
- Actualiza `last_verified_at` del contenido correspondiente

---

## 5. Estructura del monorepo

```
ai-hub/
├── packages/
│   ├── web/                    # Next.js frontend
│   │   ├── app/
│   │   │   ├── (public)/       # Sitio público
│   │   │   │   ├── page.tsx    # / → redirect
│   │   │   │   ├── [lang]/
│   │   │   │   │   ├── page.tsx
│   │   │   │   │   ├── [category]/
│   │   │   │   │   │   ├── page.tsx
│   │   │   │   │   │   └── [slug]/
│   │   │   │   │   │       └── page.tsx
│   │   │   ├── (admin)/        # Panel de admin
│   │   │   │   ├── admin/
│   │   │   │   │   ├── login/
│   │   │   │   │   │   └── page.tsx
│   │   │   │   │   ├── page.tsx
│   │   │   │   │   ├── articles/
│   │   │   │   │   │   ├── page.tsx
│   │   │   │   │   │   ├── new/
│   │   │   │   │   │   │   └── page.tsx
│   │   │   │   │   │   └── [id]/
│   │   │   │   │   │       └── page.tsx
│   │   │   │   │   ├── resources/
│   │   │   │   │   │   └── page.tsx
│   │   │   │   │   └── images/
│   │   │   │   │       └── page.tsx
│   │   │   └── layout.tsx
│   │   ├── components/
│   │   ├── lib/
│   │   ├── styles/
│   │   └── package.json
│   │
│   ├── api/                    # Express backend
│   │   ├── src/
│   │   │   ├── index.ts        # Entry point
│   │   │   ├── routes/
│   │   │   │   ├── public/
│   │   │   │   │   ├── articles.ts
│   │   │   │   │   ├── categories.ts
│   │   │   │   │   ├── featured.ts
│   │   │   │   │   ├── search.ts
│   │   │   │   │   ├── sitemap.ts
│   │   │   │   │   └── health.ts
│   │   │   │   └── admin/
│   │   │   │       ├── auth.ts
│   │   │   │       ├── articles.ts
│   │   │   │       ├── resources.ts
│   │   │   │       └── images.ts
│   │   │   ├── middleware/
│   │   │   │   ├── auth.ts
│   │   │   │   ├── validation.ts
│   │   │   │   └── error-handler.ts
│   │   │   ├── services/
│   │   │   │   ├── db.ts         # Pool de PostgreSQL
│   │   │   │   ├── meilisearch.ts
│   │   │   │   ├── storage.ts    # R2/S3
│   │   │   │   └── articles.ts   # Lógica de negocio
│   │   │   └── types/
│   │   ├── migrations/
│   │   │   └── 001_initial_schema.sql
│   │   ├── seeds/
│   │   │   └── 001_admin_user.sql
│   │   └── package.json
│   │
│   └── shared/                 # Tipos compartidos
│       ├── types/
│       │   ├── article.ts
│       │   ├── resource.ts
│       │   └── api.ts
│       └── package.json
│
├── docker-compose.yml          # Dev: PostgreSQL + Meilisearch
├── .env.example
├── turbo.json                  # Turborepo (si se usa monorepo)
└── package.json
```

### 5.1 Migraciones

Las migraciones se gestionan con un tool simple (ej. `node-pg-migrate` o scripts SQL manuales).

```
migrations/
├── 001_initial_schema.sql      # Creación de todas las tablas (incluye categories)
└── 002_seed_categories.sql     # INSERT de las 5 categorías iniciales
```

### 5.2 Variables de entorno

**Backend (`packages/api/.env`):**
```
DATABASE_URL=postgresql://user:pass@host:5432/aihub
JWT_SECRET=<generado>
JWT_EXPIRES_IN=24h
ADMIN_EMAIL=admin@aihub.com
ADMIN_PASSWORD=<contraseña>
MEILISEARCH_HOST=https://xxx.meilisearch.cloud
MEILISEARCH_API_KEY=<key>
R2_ACCOUNT_ID=<account>
R2_ACCESS_KEY_ID=<key>
R2_SECRET_ACCESS_KEY=<key>
R2_BUCKET=aihub-images
R2_PUBLIC_URL=https://images.aihub.example.com
NODE_ENV=development
PORT=3001
```

**Frontend (`packages/web/.env`):**
```
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_SITE_URL=https://aihub.example.com
NEXT_PUBLIC_MEILISEARCH_HOST=https://xxx.meilisearch.cloud
NEXT_PUBLIC_MEILISEARCH_SEARCH_KEY=<search-only key>
```

---

## 6. Flujos de datos

### 6.1 Flujo: Publicar un artículo nuevo

```mermaid
sequenceDiagram
    participant Admin
    participant Web as Next.js Admin
    participant API as Express API
    participant DB as PostgreSQL
    participant Meili as Meilisearch

    Admin->>Web: Login (email + password)
    Web->>API: POST /admin/auth/login
    API->>DB: Verificar credenciales
    API-->>Web: JWT token
    Web-->>Admin: Dashboard

    Admin->>Web: Crear artículo (metadatos)
    Web->>API: POST /admin/articles
    API->>DB: INSERT articles (status = draft)
    API-->>Web: Article created
    Web-->>Admin: Redirect to edit

    Admin->>Web: Importar markdown ES
    Web->>API: POST /admin/articles/:id/content {lang: es}
    API->>DB: INSERT article_contents (es)
    API->>Meili: addDocument (status = draft)
    API-->>Web: Content saved
    Web-->>Admin: Preview + success

    Admin->>Web: Importar markdown EN
    Web->>API: POST /admin/articles/:id/content {lang: en}
    API->>DB: INSERT article_contents (en)
    API->>Meili: addDocument (status = draft)
    API-->>Web: Content saved

    Admin->>Web: Cambiar estado a published
    Web->>API: PUT /admin/articles/:id/status {status: published}
    API->>DB: UPDATE articles SET status = 'published'
    API->>Meili: updateDocument (status = published) x2
    API-->>Web: Status updated
    Web-->>Admin: Article published
```

### 6.2 Flujo: Leer un artículo (sitio público)

```mermaid
sequenceDiagram
    participant User
    participant Next as Next.js (SSR)
    participant API as Express API
    participant DB as PostgreSQL

    User->>Next: GET /es/agentes/que-es-un-agente
    Next->>API: GET /api/v1/articles/que-es-un-agente?lang=es
    API->>DB: SELECT article + content + relations + resources
    API-->>Next: Article data
    Next->>API: GET /api/v1/categories?lang=es
    API-->>Next: Categories
    Next->>Next: Render SSR (HTML + meta tags)
    Next-->>User: Página completa (SSR)
```

### 6.3 Flujo: Búsqueda

```mermaid
sequenceDiagram
    participant User
    participant Next as Next.js (SSR/Client)
    participant API as Express API
    participant Meili as Meilisearch

    User->>Next: Escribe en barra de búsqueda
    Next->>Next: Debounce 300ms
    Next->>API: GET /api/v1/search?q=agente&lang=es
    API->>Meili: search("agente", {filter: status=published AND lang=es})
    Meili-->>API: Results
    API-->>Next: Formatted results
    Next-->>User: Overlay con resultados
```

---

## 7. Consideraciones de despliegue

### 7.1 Entorno de desarrollo

`docker-compose.yml` para servicios locales:

```yaml
services:
  postgres:
    image: postgres:16
    environment:
      POSTGRES_DB: aihub
      POSTGRES_USER: aihub
      POSTGRES_PASSWORD: aihub
    ports:
      - "5432:5432"
    volumes:
      - pgdata:/var/lib/postgresql/data

  meilisearch:
    image: getmeili/meilisearch:v1.11
    environment:
      MEILI_MASTER_KEY: dev-master-key
      MEILI_NO_ANALYTICS: true
    ports:
      - "7700:7700"
    volumes:
      - meilidata:/meili_data

volumes:
  pgdata:
  meilidata:
```

### 7.2 Producción

| Servicio | Plataforma | Notas |
|----------|-----------|-------|
| Frontend | Vercel | Next.js SSR, dominio personalizado |
| Backend | Fly.io | Express, 256MB RAM mínimo |
| PostgreSQL | NeonDB | Free tier (0.5GB) |
| Meilisearch | Meilisearch Cloud | Free tier (10k docs) |
| Storage | Cloudflare R2 | Free tier (10GB, sin egress) |

### 7.3 CI/CD

- **Frontend:** deploy automático en Vercel al hacer push a `main`
- **Backend:** deploy automático en Fly.io al hacer push a `main`
- **Migraciones:** ejecutar manualmente o como parte del deploy del backend (`fly ssh console` para ejecutar scripts SQL)
- **Seed:** script de seed del admin user ejecutado una vez al primer despliegue

### 7.4 Preparación para fases futuras

El diseño deja preparados los siguientes puntos de extensión:

| Capacidad futura | Preparación en el diseño |
|-----------------|------------------------|
| Roles (editor, revisor) | Tabla `admin_users` puede extenderse con `role` y permissions |
| Background jobs | Express en Fly.io soporta procesos de larga duración |
| Embeddings vectoriales | Meilisearch permite añadir campos de embedding sin cambiar el índice |
| Feedback de lectores | Se puede añadir tabla `article_feedback` sin modificar el schema actual |
| Learning paths | Nueva tabla `learning_paths` con relación many-to-many a `articles` |
| Score de obsolescencia | Los campos `volatility`, `last_verified_at` y `last_edited_at` ya existen |
| Contribuciones abiertas | Se puede añadir tabla `article_drafts` con `author_id` externo |

---

## 8. Testing

### 8.1 Framework

**Backend únicamente en el MVP.** El frontend no tiene testing configurado en esta fase.

| Herramienta | Rol |
|-------------|-----|
| **Vitest** | Runner principal, unit tests y tests de integración |
| **supertest** | Tests HTTP sobre el servidor Express sin levantar puerto real |
| **@vitest/coverage-v8** | Cobertura de código |

### 8.2 Estructura de tests

```
packages/api/
├── src/
│   └── ...
├── tests/
│   ├── unit/
│   │   ├── middleware/
│   │   │   ├── auth.test.ts
│   │   │   └── error-handler.test.ts
│   │   └── services/
│   │       ├── articles.service.test.ts
│   │       └── meilisearch.service.test.ts
│   └── integration/
│       ├── public/
│       │   ├── health.test.ts
│       │   ├── categories.test.ts
│       │   ├── articles.test.ts
│       │   └── featured.test.ts
│       └── admin/
│           ├── auth.test.ts
│           └── articles.test.ts
└── vitest.config.ts
```

### 8.3 Configuración de Vitest

```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      include: ['src/**/*.ts'],
      exclude: ['src/index.ts'],
    },
    // Tests de integración usan una DB de test separada
    setupFiles: ['./tests/setup.ts'],
  },
});
```

### 8.4 Base de datos de test

Los tests de integración usan una base de datos PostgreSQL separada (`aihub_test`) que se recrea en cada ejecución:

```typescript
// tests/setup.ts
// beforeAll: crear tablas (ejecutar migrations)
// afterAll: dropear tablas o cerrar pool
// beforeEach: limpiar datos de tablas relevantes
```

La `DATABASE_URL` de test se configura en `packages/api/.env.test`:
```
DATABASE_URL=postgresql://user:pass@localhost:5432/aihub_test
```

### 8.5 Convención de tests

- Los tests unitarios **no** tocan la DB — usan mocks de los servicios de datos
- Los tests de integración usan DB real (aihub_test) y supertest para llamadas HTTP
- Meilisearch y R2 se mockean en todos los tests (no se conecta a servicios externos)
- Cada test de integración limpia sus propios datos en `afterEach` o `beforeEach`

---

> **Fin del documento de diseño.**
> Este documento es la referencia técnica para la fase de implementación del MVP.
> Cualquier cambio en los contratos de API o el schema de base de datos debe ser discutido antes de implementar.
